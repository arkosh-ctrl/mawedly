import type {
  AnalyticsAppointmentRow,
  AnalyticsData,
  DailyTrendPoint,
  HeatCell,
  KPIResult,
  Trend,
} from "./types";

const GULF_OFFSET_MS = 3 * 60 * 60 * 1000;
const DAY_MS = 86_400_000;

export type SlotContext = {
  workStartMinutes: number;
  workEndMinutes: number;
  providerCount: number;
};

// --- small helpers -------------------------------------------------------

function pct(numerator: number, denominator: number): number {
  return denominator > 0 ? (numerator / denominator) * 100 : 0;
}

function trendOf(current: number, previous: number): Trend {
  const d = current - previous;
  if (Math.abs(d) < 1e-9) return "same";
  return d > 0 ? "up" : "down";
}

function changePercent(current: number, previous: number): number {
  if (previous <= 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

function kpi(current: number, previous: number, hasData: boolean): KPIResult {
  return {
    value: current,
    previousValue: previous,
    changePercent: changePercent(current, previous),
    trend: trendOf(current, previous),
    hasData,
  };
}

/** Absolute epoch ms for a Gulf-local date + time. */
function gulfInstantMs(date: string, time: string): number {
  const hhmm = time.slice(0, 5);
  return Date.parse(`${date}T${hhmm}:00Z`) - GULF_OFFSET_MS;
}

/** Gulf weekday index: 0 = Saturday .. 6 = Friday. */
function gulfWeekday(date: string): number {
  const utcDay = new Date(`${date}T00:00:00Z`).getUTCDay(); // 0=Sun..6=Sat
  return (utcDay + 1) % 7;
}

const BLOCKING = ["pending_verification", "confirmed", "completed"];

type Counts = {
  total: number;
  confirmed: number;
  completed: number;
  canceled: number;
  noShow: number;
  depositVerified: number;
  completedRevenue: number;
  leadDaysSum: number;
  leadDaysCount: number;
  blockingMinutes: number;
};

function tally(rows: AnalyticsAppointmentRow[]): Counts {
  const c: Counts = {
    total: 0,
    confirmed: 0,
    completed: 0,
    canceled: 0,
    noShow: 0,
    depositVerified: 0,
    completedRevenue: 0,
    leadDaysSum: 0,
    leadDaysCount: 0,
    blockingMinutes: 0,
  };
  for (const r of rows) {
    c.total++;
    if (r.status === "confirmed") c.confirmed++;
    else if (r.status === "completed") c.completed++;
    else if (r.status === "canceled") c.canceled++;
    else if (r.status === "no_show") c.noShow++;

    if (r.deposit_verified) c.depositVerified++;
    if (r.status === "completed" && r.services)
      c.completedRevenue += Number(r.services.price) || 0;

    if (BLOCKING.includes(r.status) && r.services)
      c.blockingMinutes += Number(r.services.duration_minutes) || 0;

    if (r.created_at) {
      const lead =
        (gulfInstantMs(r.appointment_date, r.start_time) -
          Date.parse(r.created_at)) /
        DAY_MS;
      if (Number.isFinite(lead) && lead >= 0) {
        c.leadDaysSum += lead;
        c.leadDaysCount++;
      }
    }
  }
  return c;
}

// Metric definitions (documented, defensible denominators):
//   decided        = confirmed + completed + canceled + no_show (excludes pending)
//   bookingRate    = (confirmed + completed) / decided        — booking success
//   cancellRate    = canceled / decided
//   noShowRate     = no_show / (completed + no_show)          — of those that arrived
//   depositRate    = deposit_verified / total                — collection health
//   revenue/sess   = completedRevenue / completed
//   leadTime       = avg(appointment − created_at) in days
//   slotUtil       = blockingMinutes / availableMinutes       — capacity used

function metrics(c: Counts, availableMinutes: number) {
  const decided = c.confirmed + c.completed + c.canceled + c.noShow;
  const arrived = c.completed + c.noShow;
  return {
    bookingRate: pct(c.confirmed + c.completed, decided),
    cancellationRate: pct(c.canceled, decided),
    noShowRate: pct(c.noShow, arrived),
    depositCollectionRate: pct(c.depositVerified, c.total),
    revenuePerSession: c.completed > 0 ? c.completedRevenue / c.completed : 0,
    leadTime: c.leadDaysCount > 0 ? c.leadDaysSum / c.leadDaysCount : 0,
    slotUtilization: Math.min(100, pct(c.blockingMinutes, availableMinutes)),
    decided,
    arrived,
  };
}

function buildDailyTrends(
  rows: AnalyticsAppointmentRow[],
  periodDays: number,
): DailyTrendPoint[] {
  const map = new Map<string, DailyTrendPoint>();
  // Seed every date in the window so the line has no gaps.
  const todayGulf = new Date(Date.now() + GULF_OFFSET_MS)
    .toISOString()
    .slice(0, 10);
  const end = Date.parse(`${todayGulf}T00:00:00Z`);
  for (let i = periodDays - 1; i >= 0; i--) {
    const d = new Date(end - i * DAY_MS).toISOString().slice(0, 10);
    map.set(d, { date: d, bookings: 0, revenue: 0, completed: 0 });
  }
  for (const r of rows) {
    const p = map.get(r.appointment_date);
    if (!p) continue;
    p.bookings++;
    if (r.status === "completed") {
      p.completed++;
      p.revenue += Number(r.services?.price) || 0;
    }
  }
  return [...map.values()];
}

function buildHeatmap(rows: AnalyticsAppointmentRow[]): HeatCell[] {
  const key = (d: number, h: number) => d * 24 + h;
  const counts = new Map<number, number>();
  for (const r of rows) {
    const day = gulfWeekday(r.appointment_date);
    const hour = Number(r.start_time.slice(0, 2));
    if (!Number.isFinite(hour)) continue;
    counts.set(key(day, hour), (counts.get(key(day, hour)) ?? 0) + 1);
  }
  const cells: HeatCell[] = [];
  counts.forEach((count, k) => {
    cells.push({ day: Math.floor(k / 24), hour: k % 24, count });
  });
  return cells;
}

/**
 * Pure KPI computation. `current`/`previous` are the appointment rows for the
 * current and preceding window; `heatmapRows` is a wider set (e.g. 90 days) of
 * completed appointments for the peak map. All revenue comes from the joined
 * service price (appointments has no price column).
 */
export function calculateKPIs(
  current: AnalyticsAppointmentRow[],
  previous: AnalyticsAppointmentRow[],
  periodDays: number,
  heatmapRows: AnalyticsAppointmentRow[],
  slot: SlotContext,
): AnalyticsData {
  const workMinutes = Math.max(0, slot.workEndMinutes - slot.workStartMinutes);
  const providers = Math.max(1, slot.providerCount);
  const availableCurrent = workMinutes * providers * periodDays;
  const availablePrevious = availableCurrent; // same-length window

  const cCur = tally(current);
  const cPrev = tally(previous);
  const mCur = metrics(cCur, availableCurrent);
  const mPrev = metrics(cPrev, availablePrevious);

  const curHasDecided = mCur.decided > 0;
  const curHasArrived = mCur.arrived > 0;
  const curHasTotal = cCur.total > 0;
  const curHasCompleted = cCur.completed > 0;

  return {
    periodDays,
    bookingRate: kpi(mCur.bookingRate, mPrev.bookingRate, curHasDecided),
    noShowRate: kpi(mCur.noShowRate, mPrev.noShowRate, curHasArrived),
    cancellationRate: kpi(
      mCur.cancellationRate,
      mPrev.cancellationRate,
      curHasDecided,
    ),
    depositCollectionRate: kpi(
      mCur.depositCollectionRate,
      mPrev.depositCollectionRate,
      curHasTotal,
    ),
    revenuePerSession: kpi(
      mCur.revenuePerSession,
      mPrev.revenuePerSession,
      curHasCompleted,
    ),
    leadTime: kpi(mCur.leadTime, mPrev.leadTime, cCur.leadDaysCount > 0),
    slotUtilization: kpi(
      mCur.slotUtilization,
      mPrev.slotUtilization,
      workMinutes > 0,
    ),
    totalRevenue: kpi(
      cCur.completedRevenue,
      cPrev.completedRevenue,
      cCur.total > 0,
    ),
    noShowCount: cCur.noShow,
    dailyTrends: buildDailyTrends(current, periodDays),
    heatmap: buildHeatmap(heatmapRows),
  };
}
