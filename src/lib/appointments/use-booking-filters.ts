"use client";

import { useMemo, useState } from "react";
import type { AppointmentStatus } from "@/lib/appointments/status";

/** Minimal shape the filter logic needs — a superset row is accepted. */
export type FilterableAppointment = {
  appointment_date: string; // YYYY-MM-DD
  status: AppointmentStatus;
  customers: { name: string; phone: string } | null;
  services: { name: string } | null;
  providers: { name: string } | null;
};

export type StatusFilter = "all" | AppointmentStatus;

export type DatePreset = "today" | "week" | "month" | "custom" | "all";

export type DateRange = {
  preset: DatePreset;
  /** Only meaningful when preset === "custom". */
  from?: string;
  to?: string;
};

export type SearchKind = "empty" | "name" | "phone" | "reference";

/** Local YYYY-MM-DD (avoids UTC drift from toISOString). */
function ymd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Strip non-digits and the Saudi country/trunk prefixes for partial matching. */
export function normalizePhone(input: string): string {
  return input.replace(/\D/g, "").replace(/^966/, "").replace(/^0/, "");
}

/** Guess what the user is typing so the UI can hint (name / phone / ref). */
export function classifySearch(query: string): SearchKind {
  const q = query.trim();
  if (!q) return "empty";
  if (/^(mw[-\s]?)?\d{2,}$/i.test(q) && /[a-z-]/i.test(q)) return "reference";
  if (/^\d[\d\s+]*$/.test(q)) return "phone";
  return "name";
}

function inRange(dateStr: string, range: DateRange): boolean {
  if (range.preset === "all") return true;

  const now = new Date();
  const today = ymd(now);

  if (range.preset === "today") return dateStr === today;

  if (range.preset === "week") {
    // Week window: today .. +6 days (rolling, locale-agnostic).
    const start = new Date(now);
    const end = new Date(now);
    end.setDate(end.getDate() + 6);
    return dateStr >= ymd(start) && dateStr <= ymd(end);
  }

  if (range.preset === "month") {
    const start = ymd(new Date(now.getFullYear(), now.getMonth(), 1));
    const end = ymd(new Date(now.getFullYear(), now.getMonth() + 1, 0));
    return dateStr >= start && dateStr <= end;
  }

  // custom
  const from = range.from;
  const to = range.to;
  if (from && dateStr < from) return false;
  if (to && dateStr > to) return false;
  return true;
}

function matchesQuery(row: FilterableAppointment, query: string): boolean {
  const q = query.trim();
  if (!q) return true;

  const haystackText = [
    row.customers?.name ?? "",
    row.services?.name ?? "",
    row.providers?.name ?? "",
  ]
    .join(" ")
    .toLowerCase();
  if (haystackText.includes(q.toLowerCase())) return true;

  const np = normalizePhone(q);
  if (np.length >= 2) {
    const phone = normalizePhone(row.customers?.phone ?? "");
    if (phone.includes(np)) return true;
  }
  return false;
}

/**
 * Hybrid filtering: fuzzy client search over the loaded rows plus status and
 * date-range narrowing. Since the appointments page currently loads every row
 * for the business, client filtering is complete; when server-side pagination
 * is introduced, `searchAppointments` (server action) becomes the fallback for
 * queries with no local match.
 */
export function useBookingFilters<T extends FilterableAppointment>(
  appointments: T[],
) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [range, setRange] = useState<DateRange>({ preset: "month" });

  const visible = useMemo(
    () =>
      appointments.filter(
        (a) =>
          (status === "all" || a.status === status) &&
          inRange(a.appointment_date, range) &&
          matchesQuery(a, query),
      ),
    [appointments, status, range, query],
  );

  const counts = useMemo(() => {
    // Counts respect the date range and search, but not the status tab itself,
    // so each tab shows how many rows it would reveal.
    const scoped = appointments.filter(
      (a) => inRange(a.appointment_date, range) && matchesQuery(a, query),
    );
    const byStatus: Record<string, number> = { all: scoped.length };
    for (const a of scoped) byStatus[a.status] = (byStatus[a.status] ?? 0) + 1;
    return byStatus;
  }, [appointments, range, query]);

  return {
    query,
    setQuery,
    status,
    setStatus,
    range,
    setRange,
    visible,
    counts,
    searchKind: classifySearch(query),
  };
}
