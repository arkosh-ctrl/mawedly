"use client";

import { useEffect } from "react";

/**
 * First-touch signup attribution, captured entirely in the browser.
 *
 * WHY THIS EXISTS AS A CLIENT COMPONENT AND NOT MIDDLEWARE
 * A visitor almost never lands directly on /signup. They arrive on a blog post
 * or the home page carrying `?utm_source=...`, read, and only then click
 * "start free" — a client-side navigation that drops the query string. Reading
 * `location.search` inside the signup form would therefore capture nothing for
 * the paths that matter. Middleware could persist it in a cookie, but the
 * project's middleware also refreshes the Supabase session and guards
 * /dashboard, and that is not a hot path worth risking for analytics. So the
 * first landing page writes the attribution to localStorage and the signup form
 * reads it back.
 *
 * FIRST-TOUCH, NOT LAST-TOUCH
 * The stored record is never overwritten while it is younger than TTL_DAYS.
 * The channel that first introduced someone to Mawedly is the one that earned
 * the signup; a later direct visit must not overwrite it with "direct".
 *
 * PRIVACY (PDPL)
 * Only the referrer's HOST is stored, never the full URL — a full referrer can
 * carry search terms or identifiers from the other site, which is more than an
 * attribution record needs. Nothing here identifies a person.
 */

const STORAGE_KEY = "mwd_attr";
const TTL_DAYS = 90;

export type Attribution = {
  source: string;
  medium: string;
  campaign: string;
  /** Referring host only (e.g. "linkedin.com"), never a full URL. */
  referrer: string;
  /** First path seen, useful for spotting which content converts. */
  landing: string;
  /** ISO timestamp of first touch. */
  at: string;
};

/**
 * Normalise an untrusted value into a short, safe token.
 *
 * These strings come from a URL anyone can craft, and they end up in the
 * database and an admin table. Lowercase, strip everything outside a narrow
 * allowlist, and cap the length — the same rule the zod schema re-applies on
 * the server, because a client-side check is a convenience, never a guarantee.
 */
function clean(value: string | null | undefined): string {
  if (!value) return "";
  return value
    .toLowerCase()
    .replace(/[^a-z0-9_.-]/g, "")
    .slice(0, 64);
}

/** Host of a referrer URL, or "" when same-origin, absent, or unparseable. */
function referrerHost(): string {
  try {
    if (!document.referrer) return "";
    const url = new URL(document.referrer);
    if (url.host === window.location.host) return "";
    return clean(url.host.replace(/^www\./, ""));
  } catch {
    return "";
  }
}

/** The stored record, or null when missing, malformed, or expired. */
export function readAttribution(): Attribution | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Attribution>;
    if (!parsed || typeof parsed.at !== "string") return null;
    const ageMs = Date.now() - new Date(parsed.at).getTime();
    if (!Number.isFinite(ageMs) || ageMs > TTL_DAYS * 864e5) return null;
    return {
      source: clean(parsed.source),
      medium: clean(parsed.medium),
      campaign: clean(parsed.campaign),
      referrer: clean(parsed.referrer),
      landing: (parsed.landing ?? "").slice(0, 120),
      at: parsed.at,
    };
  } catch {
    // Private mode, disabled storage, or corrupt JSON — attribution is a
    // nice-to-have and must never break a page.
    return null;
  }
}

export function AttributionCapture() {
  useEffect(() => {
    try {
      // First touch wins: never overwrite a live record.
      if (readAttribution()) return;

      const params = new URLSearchParams(window.location.search);
      const utmSource = clean(params.get("utm_source") ?? params.get("ref"));
      const host = referrerHost();

      // Nothing worth recording: no campaign tag and no external referrer.
      // Deliberately NOT storing a "direct" placeholder — that would lock in
      // "direct" for 90 days and shadow a real campaign click tomorrow.
      if (!utmSource && !host) return;

      const record: Attribution = {
        source: utmSource || host,
        medium: clean(params.get("utm_medium")) || (utmSource ? "" : "referral"),
        campaign: clean(params.get("utm_campaign")),
        referrer: host,
        landing: window.location.pathname.slice(0, 120),
        at: new Date().toISOString(),
      };

      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
    } catch {
      // Same reasoning as readAttribution: swallow and move on.
    }
  }, []);

  return null;
}
