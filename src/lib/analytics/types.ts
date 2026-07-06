// Domain types for the merchant performance analytics page.

export type Trend = "up" | "down" | "same";

export type KPIResult = {
  value: number;
  previousValue: number;
  changePercent: number; // signed, relative to previousValue
  trend: Trend;
  // Whether the current period had enough data to be meaningful. When false,
  // the card shows the value muted and hides the trend comparison.
  hasData: boolean;
};

export type DailyTrendPoint = {
  date: string; // YYYY-MM-DD (Gulf)
  bookings: number;
  revenue: number;
  completed: number;
};

export type HeatCell = {
  day: number; // 0 = Saturday .. 6 = Friday (Gulf week)
  hour: number; // 0-23
  count: number;
};

export type AnalyticsData = {
  periodDays: number;
  bookingRate: KPIResult;
  noShowRate: KPIResult;
  cancellationRate: KPIResult;
  depositCollectionRate: KPIResult;
  revenuePerSession: KPIResult;
  leadTime: KPIResult; // days
  slotUtilization: KPIResult; // percent
  dailyTrends: DailyTrendPoint[];
  heatmap: HeatCell[];
};

// Minimal row shape the calculator consumes (a superset row is accepted).
export type AnalyticsAppointmentRow = {
  status: string;
  appointment_date: string; // YYYY-MM-DD (Gulf local)
  start_time: string; // HH:MM[:SS] (Gulf local)
  created_at: string | null; // UTC timestamptz
  deposit_verified: boolean | null;
  services: { price: number; duration_minutes: number } | null;
};
