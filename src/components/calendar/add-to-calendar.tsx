"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { getCalendarLinks } from "@/app/actions/calendar";

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      className={`ms-auto size-4 transition-transform ${open ? "rotate-180" : ""}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function CalendarGlyph() {
  return (
    <svg
      className="size-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="3" y="4" width="18" height="17" rx="2" />
      <path d="M3 9h18M8 2v4M16 2v4" />
    </svg>
  );
}

/**
 * "Add to calendar" control for the booking success screen. Device-aware: on
 * mobile it offers the universal .ics (opens the default calendar app); on
 * desktop it adds a Google Calendar option. Links are resolved server-side.
 */
export function AddToCalendar({
  appointmentId,
  variant = "prominent",
}: {
  appointmentId: string;
  // "prominent" = solid pill for the booking success screen; "compact" = small
  // outline pill that matches the merchant appointment-card action buttons.
  variant?: "prominent" | "compact";
}) {
  const t = useTranslations("Calendar");
  const [open, setOpen] = useState(false);
  const [added, setAdded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [links, setLinks] = useState<{ icsUrl: string; googleUrl: string } | null>(
    null,
  );
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ua = navigator.userAgent;
    const touch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
    const small = window.innerWidth < 768;
    const mobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
    setIsMobile(mobileUA || (touch && small));
  }, []);

  useEffect(() => {
    if (!open) return;
    if (!links) getCalendarLinks(appointmentId).then((l) => l && setLinks(l));
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open, links, appointmentId]);

  function downloadIcs() {
    window.open(`/api/calendar/${appointmentId}`, "_blank", "noopener,noreferrer");
    setAdded(true);
    setOpen(false);
  }

  function openGoogle() {
    if (isMobile || !links) {
      downloadIcs();
      return;
    }
    window.open(links.googleUrl, "_blank", "noopener,noreferrer");
    setAdded(true);
    setOpen(false);
  }

  const compact = variant === "compact";
  const triggerClass = compact
    ? `inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors ${
        added
          ? "border-pine/30 bg-canvas text-pine"
          : "border-line text-ink hover:border-ink"
      }`
    : `inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition-colors ${
        added
          ? "border border-pine/30 bg-canvas text-pine"
          : "bg-pine text-paper hover:bg-ink"
      }`;

  return (
    <div className="relative self-start" ref={ref}>
      <button type="button" onClick={() => setOpen((o) => !o)} className={triggerClass}>
        {added ? (
          <svg
            className={compact ? "size-3.5" : "size-4"}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            aria-hidden
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="m5 12.5 5 5 9-11" />
          </svg>
        ) : (
          <CalendarGlyph />
        )}
        <span>{added ? t("added") : t("button")}</span>
        {!added && !compact && <Chevron open={open} />}
      </button>

      {open && !added && (
        <div className="absolute bottom-[calc(100%+6px)] end-0 z-50 w-64 overflow-hidden rounded-xl border border-line bg-paper shadow-xl">
          <p className="border-b border-line bg-canvas px-4 py-2 text-[11px] font-bold uppercase text-muted">
            {t("choose")}
          </p>

          {!isMobile && (
            <button
              type="button"
              onClick={openGoogle}
              className="flex w-full items-center gap-3 border-b border-line px-4 py-3 text-start transition-colors hover:bg-canvas"
            >
              <span className="flex size-8 items-center justify-center rounded-lg bg-canvas text-pine">
                <CalendarGlyph />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-ink">
                  {t("google")}
                </span>
                <span className="block text-xs text-muted">{t("googleHint")}</span>
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={downloadIcs}
            className="flex w-full items-center gap-3 px-4 py-3 text-start transition-colors hover:bg-canvas"
          >
            <span className="flex size-8 items-center justify-center rounded-lg border border-line bg-canvas text-pine">
              <svg
                className="size-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M12 15V3M8 11l4 4 4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
              </svg>
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-ink">
                {isMobile ? t("phoneCalendar") : t("icsFile")}
              </span>
              <span className="block text-xs text-muted">
                {isMobile ? t("phoneHint") : t("icsHint")}
              </span>
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
