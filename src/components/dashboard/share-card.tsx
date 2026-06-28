"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { QRCodeSVG, QRCodeCanvas } from "qrcode.react";
import { Link } from "@/i18n/navigation";

// QR size in the exported PNG — larger than the on-screen 160px so the printed
// code stays crisp on a reception stand.
const EXPORT_QR_SIZE = 512;

// Share panel for the merchant's public booking link. Pure presentation — the
// slug/name come from the dashboard server component. Styled to match the
// Daybook identity used across the dashboard.
//
// Note on wa.me: the shared lib/whatsapp.ts helper builds a click-to-chat URL
// aimed at a *specific* recipient phone (and returns null without one). Here the
// merchant shares their link to whoever they choose, so we use WhatsApp's
// contact-picker share form (`wa.me/?text=`) instead — a different intent.
export function ShareCard({
  slug,
  businessName,
  locale,
}: {
  slug: string | null;
  businessName: string;
  locale: string;
}) {
  const t = useTranslations("Dashboard");
  const [copied, setCopied] = useState(false);
  // Wraps the hidden, high-res export canvas so we can read its <canvas> pixels.
  const exportRef = useRef<HTMLDivElement>(null);

  // No public link yet — point the merchant at settings instead of a broken URL.
  if (!slug) {
    return (
      <section className="flex flex-col items-start gap-3 rounded-2xl border border-dashed border-line bg-paper px-5 py-5">
        <span className="eyebrow">{t("bookingLink")}</span>
        <p className="text-sm text-muted">{t("setSlugFirst")}</p>
        <Link
          href="/dashboard/settings"
          className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-paper transition-colors hover:bg-pine"
        >
          {t("completeSetup")}
        </Link>
      </section>
    );
  }

  const base = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const url = `${base}/${locale}/${slug}`;
  const waText = `${businessName} — ${url}`;
  const waShareLink = `https://wa.me/?text=${encodeURIComponent(waText)}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard can be blocked (insecure context / permissions); fail quietly.
    }
  }

  // Export the hidden high-res canvas as a PNG the merchant can print.
  function downloadQr() {
    const canvas = exportRef.current?.querySelector("canvas");
    if (!canvas) return;
    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = `mawedly-${slug}-qr.png`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  return (
    <section className="relative flex flex-col gap-5 overflow-hidden rounded-2xl border border-line bg-paper p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <span className="eyebrow">{t("bookingLink")}</span>

          {/* The link itself, set in tabular mono and always shown LTR. */}
          <p
            dir="ltr"
            className="overflow-x-auto whitespace-nowrap rounded-lg border border-line bg-canvas px-3 py-2.5 text-start font-mono text-sm text-ink"
          >
            {url}
          </p>

          <div className="mt-1 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={copy}
              aria-live="polite"
              className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-paper transition-colors hover:bg-pine"
            >
              <CopyIcon />
              {copied ? t("copied") : t("copyLink")}
            </button>
            <a
              href={waShareLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm font-semibold text-ink transition-colors hover:border-ink"
            >
              {t("shareWhatsApp")}
            </a>
          </div>
        </div>

        {/* QR for the same link — a customer scans it to open the booking page. */}
        <div className="flex shrink-0 flex-col items-center gap-2 self-start">
          <div className="rounded-xl border border-line bg-paper p-2">
            <QRCodeSVG
              value={url}
              size={160}
              bgColor="#FBFAF3"
              fgColor="#12302A"
              aria-label={url}
            />
          </div>
          <span className="font-mono text-xs text-muted">{t("scanToBook")}</span>
          <button
            type="button"
            onClick={downloadQr}
            className="mt-1 inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-paper transition-colors hover:bg-pine"
          >
            <DownloadIcon />
            {t("downloadQr")}
          </button>
        </div>
      </div>

      {/* Hidden high-res canvas, rendered off-screen purely as the PNG source. */}
      <div ref={exportRef} aria-hidden className="pointer-events-none absolute -left-[9999px] top-0">
        <QRCodeCanvas
          value={url}
          size={EXPORT_QR_SIZE}
          bgColor="#FBFAF3"
          fgColor="#12302A"
        />
      </div>
    </section>
  );
}

// Small inline copy glyph (no lucide-react dependency), tuned to the Daybook
// stroke weight.
function CopyIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

// Download glyph (tray + down arrow), matched to the Daybook stroke weight.
function DownloadIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="M7 10l5 5 5-5" />
      <path d="M12 15V3" />
    </svg>
  );
}
