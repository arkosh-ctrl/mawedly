"use client";

import Script from "next/script";
import { useEffect } from "react";
import {
  aiReferralEvent,
  classifyAiReferrer,
} from "@/lib/analytics/ai-referrers";

/**
 * Vercel Web Analytics, loaded from Vercel's own endpoint rather than the
 * @vercel/analytics npm package.
 *
 * The package is a thin wrapper around exactly this script and the same
 * window.va() queue, so behaviour is identical — but skipping it keeps the
 * dependency list where it is. That matters more than the ergonomics here: this
 * is a marketing measurement concern and should not add a runtime dependency to
 * a booking product.
 *
 * REQUIRES Web Analytics to be enabled for the project in the Vercel dashboard.
 * Until it is, /_vercel/insights/script.js 404s and nothing is collected —
 * silently, which is why the setup step is written down in the README rather
 * than assumed.
 *
 * No cookies, no device fingerprinting, no cross-site identifiers, so this adds
 * no consent obligation under PDPL and needs no banner.
 */
export function WebAnalytics() {
  return (
    <>
      <Script src="/_vercel/insights/script.js" strategy="afterInteractive" />
      <AiReferralTracker />
    </>
  );
}

declare global {
  interface Window {
    va?: (event: "event" | "beforeSend" | "pageview", properties?: unknown) => void;
  }
}

/**
 * Reports which answer engine sent a visit, if any.
 *
 * Fires once, on mount, and needs no deduplication: document.referrer is only
 * an external origin on the ENTRY page load. Every internal navigation after
 * that reports mawedly.com, which the classifier returns null for. So there is
 * nothing to store and no session state to keep.
 */
function AiReferralTracker() {
  useEffect(() => {
    const source = classifyAiReferrer(document.referrer);
    if (!source) return;

    // The queue exists as soon as the script tag is parsed; if analytics is
    // disabled for the project, window.va is simply absent and this no-ops.
    window.va?.("event", {
      name: aiReferralEvent(source),
      data: { source, path: window.location.pathname },
    });
  }, []);

  return null;
}
