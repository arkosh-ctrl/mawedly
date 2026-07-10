"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Modal } from "@/components/ui/modal";
import {
  buildShareIntentUrl,
  PLATFORM_COLORS,
  type SharePlatform,
} from "@/lib/social/platforms";
import { logReviewShare } from "@/lib/social/actions";

// "Share this review" — icon button + modal. V1 is intent-only:
// - WhatsApp / X / Telegram / Facebook / LinkedIn / Snapchat open a
//   click-to-share window (caption + booking link).
// - Instagram has no web intent: the flow is download the card + copy the
//   caption, then post from the app.
// - On devices with the Web Share API (phones), a native share button offers
//   the card image itself to ANY installed app.
// Every successful trigger is logged fire-and-forget via logReviewShare.

const INTENT_PLATFORMS: SharePlatform[] = [
  "whatsapp",
  "x",
  "telegram",
  "snapchat",
  "facebook",
  "linkedin",
];

const PLATFORM_LABELS: Record<string, string> = {
  whatsapp: "WhatsApp",
  x: "X",
  telegram: "Telegram",
  snapchat: "Snapchat",
  facebook: "Facebook",
  linkedin: "LinkedIn",
};

export function ShareReview({
  reviewId,
  rating,
  comment,
  bookingPath,
}: {
  reviewId: string;
  rating: number;
  comment: string | null;
  /** Locale-aware public booking path, e.g. "/ar/my-slug". */
  bookingPath: string;
}) {
  const t = useTranslations("Reviews.share");
  const [open, setOpen] = useState(false);
  const [caption, setCaption] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Cache-buster fixed per mount: guarantees a fresh card even for browsers
  // that cached a response from before the route went no-store.
  const [cacheKey] = useState(() => Date.now());

  const cardUrl = `/api/share-card/${reviewId}?v=${cacheKey}`;

  function bookingLink() {
    return `${window.location.origin}${bookingPath}`;
  }

  function defaultCaption() {
    const quote = (comment ?? "").trim().slice(0, 160);
    return t("defaultCaption", {
      quote: quote || t("noQuoteFallback"),
      rating,
      link: bookingLink(),
    });
  }

  // Lazily resolved so window.location is only touched client-side on open.
  const captionValue = caption ?? (open ? defaultCaption() : "");

  function openIntent(platform: SharePlatform) {
    const url = buildShareIntentUrl(platform, {
      text: captionValue,
      link: bookingLink(),
    });
    if (!url) return;
    window.open(url, "_blank", "noopener,noreferrer,width=640,height=560");
    void logReviewShare(reviewId, platform);
  }

  async function copyCaption() {
    await navigator.clipboard.writeText(captionValue);
    toast.success(t("copied"));
  }

  async function downloadCard() {
    setBusy(true);
    try {
      const res = await fetch(cardUrl);
      if (!res.ok) throw new Error("card fetch failed");
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `mawedly-review-${reviewId.slice(0, 8)}.png`;
      a.click();
      URL.revokeObjectURL(a.href);
      void logReviewShare(reviewId, "instagram");
    } catch {
      toast.error(t("cardFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function nativeShare() {
    setBusy(true);
    try {
      const res = await fetch(cardUrl);
      if (!res.ok) throw new Error("card fetch failed");
      const blob = await res.blob();
      const file = new File([blob], "mawedly-review.png", {
        type: "image/png",
      });
      const payload: ShareData = navigator.canShare?.({ files: [file] })
        ? { files: [file], text: captionValue }
        : { text: `${captionValue}\n${bookingLink()}` };
      await navigator.share(payload);
      void logReviewShare(reviewId, "native");
    } catch {
      // Cancelled by the user or unsupported — stay quiet.
    } finally {
      setBusy(false);
    }
  }

  const canNativeShare =
    typeof navigator !== "undefined" && typeof navigator.share === "function";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-full border border-line px-2.5 py-1 text-xs font-medium text-primary transition-colors hover:border-primary"
      >
        <ShareIcon />
        {t("button")}
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title={t("title")}>
        <div className="flex flex-col gap-4">
          {/* Card preview — generated on the fly, merchant-session gated. */}
          {open && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={cardUrl}
              alt={t("previewAlt")}
              className="w-full rounded-xl border border-line bg-canvas"
            />
          )}

          <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">
            <span>{t("captionLabel")}</span>
            <textarea
              rows={3}
              value={captionValue}
              onChange={(e) => setCaption(e.target.value)}
              className="resize-none rounded-lg border border-line bg-paper px-3 py-2 text-start text-sm text-ink outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary-light"
            />
          </label>

          {/* Intent platforms — one click opens the share window. */}
          <div className="flex flex-wrap gap-2">
            {INTENT_PLATFORMS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => openIntent(p)}
                className="rounded-full px-3.5 py-1.5 text-xs font-semibold text-paper transition-transform hover:scale-[1.03]"
                style={{ backgroundColor: PLATFORM_COLORS[p] }}
              >
                {PLATFORM_LABELS[p]}
              </button>
            ))}
            {canNativeShare && (
              <button
                type="button"
                disabled={busy}
                onClick={() => void nativeShare()}
                className="rounded-full bg-primary px-3.5 py-1.5 text-xs font-semibold text-paper transition-colors hover:bg-primary-hover disabled:opacity-50"
              >
                {t("nativeShare")}
              </button>
            )}
          </div>

          {/* Instagram flow: download + copy, then post from the app. */}
          <div className="flex flex-col gap-2 rounded-xl border border-line bg-canvas p-3">
            <span className="text-xs font-semibold text-ink">Instagram</span>
            <p className="text-xs leading-relaxed text-muted">
              {t("instagramHint")}
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => void downloadCard()}
                className="rounded-full bg-ink px-3.5 py-1.5 text-xs font-semibold text-paper transition-colors hover:bg-pine disabled:opacity-50"
              >
                {t("download")}
              </button>
              <button
                type="button"
                onClick={() => void copyCaption()}
                className="rounded-full border border-line px-3.5 py-1.5 text-xs font-semibold text-ink transition-colors hover:border-muted"
              >
                {t("copy")}
              </button>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
}

function ShareIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="m8.6 10.6 6.8-3.9M8.6 13.4l6.8 3.9" />
    </svg>
  );
}
