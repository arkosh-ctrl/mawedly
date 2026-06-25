// Pure availability logic — no I/O, easy to unit-test.
//
// Given the business's daily working window (read from businesses.work_start /
// work_end — NOT a hardcoded constant), a service duration, and the provider's
// already-booked time ranges for one date, it returns the bookable start times.

export type MinuteRange = { start: number; end: number }; // minutes from midnight

// Slot grid granularity. Slots are offered every STEP_MINUTES; a slot is valid
// only if the service fits before closing time and overlaps nothing booked.
export const DEFAULT_STEP_MINUTES = 30;

// "09:00" / "09:00:00" -> minutes from midnight.
export function timeToMinutes(time: string): number {
  const [h, m] = time.slice(0, 5).split(":").map(Number);
  return h * 60 + m;
}

// minutes from midnight -> "HH:MM".
export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function computeAvailableSlots(params: {
  workStart: string; // "09:00"
  workEnd: string; // "21:00"
  durationMinutes: number;
  booked: MinuteRange[]; // existing blocking appointments for the provider/date
  stepMinutes?: number;
}): string[] {
  const { workStart, workEnd, durationMinutes, booked } = params;
  const step = params.stepMinutes ?? DEFAULT_STEP_MINUTES;

  const windowStart = timeToMinutes(workStart);
  const windowEnd = timeToMinutes(workEnd);

  const slots: string[] = [];
  for (let start = windowStart; start + durationMinutes <= windowEnd; start += step) {
    const end = start + durationMinutes;
    // Half-open overlap test: [start,end) overlaps [b.start,b.end) iff
    // start < b.end AND end > b.start. Back-to-back slots do not collide —
    // this matches the DB EXCLUSION constraint's tsrange [) semantics.
    const overlaps = booked.some((b) => start < b.end && end > b.start);
    if (!overlaps) slots.push(minutesToTime(start));
  }
  return slots;
}
