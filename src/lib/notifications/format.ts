import type { Notification } from "./types";

export type DateGroupKey = "today" | "yesterday" | "thisWeek" | "older";

/**
 * Locale-aware relative time ("منذ ٥ دقائق" / "5 minutes ago") via the platform
 * Intl API — no date library. Falls back to "just now" under a minute.
 */
export function formatRelativeTime(iso: string, locale: string): string {
  const then = new Date(iso).getTime();
  const diffSec = Math.round((then - Date.now()) / 1000); // negative = past
  const rtf = new Intl.RelativeTimeFormat(locale === "ar" ? "ar" : "en", {
    numeric: "auto",
  });

  const abs = Math.abs(diffSec);
  if (abs < 60) return rtf.format(0, "second"); // "now" / "الآن"
  if (abs < 3600) return rtf.format(Math.round(diffSec / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diffSec / 3600), "hour");
  if (abs < 604800) return rtf.format(Math.round(diffSec / 86400), "day");
  return rtf.format(Math.round(diffSec / 604800), "week");
}

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** Bucket a timestamp into today / yesterday / this week / older. */
export function dateGroup(iso: string): DateGroupKey {
  const t = startOfDay(new Date(iso));
  const today = startOfDay(new Date());
  const day = 86_400_000;
  if (t === today) return "today";
  if (t === today - day) return "yesterday";
  if (t > today - 7 * day) return "thisWeek";
  return "older";
}

const GROUP_ORDER: DateGroupKey[] = ["today", "yesterday", "thisWeek", "older"];

/**
 * Group notifications (assumed already sorted newest-first) into ordered date
 * buckets, dropping empty buckets. Returns tuples so render order is stable.
 */
export function groupByDate(
  notifications: Notification[],
): Array<[DateGroupKey, Notification[]]> {
  const buckets = new Map<DateGroupKey, Notification[]>();
  for (const n of notifications) {
    const key = dateGroup(n.created_at);
    const list = buckets.get(key) ?? [];
    list.push(n);
    buckets.set(key, list);
  }
  return GROUP_ORDER.filter((k) => buckets.has(k)).map((k) => [
    k,
    buckets.get(k)!,
  ]);
}
