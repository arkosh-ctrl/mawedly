"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { getMerchantVideoAccess } from "@/app/[locale]/dashboard/appointments/video-actions";

function VideoIcon({ className }: { className?: string }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      <path d="m22 8-6 4 6 4V8Z" />
      <rect width="14" height="12" x="2" y="6" rx="2" ry="2" />
    </svg>
  );
}

/**
 * Merchant-side entry into a virtual consultation. Only renders for confirmed,
 * virtual appointments. Clicking materializes the room server-side and reveals
 * the Jitsi link plus the room password to set manually (Lobby).
 */
export function VideoRoomButton({
  appointmentId,
  sessionType,
  status,
}: {
  appointmentId: string;
  sessionType: string | null;
  status: string;
}) {
  const t = useTranslations("Video");
  const [isPending, startTransition] = useTransition();
  const [room, setRoom] = useState<{
    jitsiUrl: string;
    roomPassword: string;
  } | null>(null);

  if (sessionType !== "virtual" || status !== "confirmed") return null;

  function open() {
    startTransition(async () => {
      const res = await getMerchantVideoAccess(appointmentId);
      if (res.status === "success") {
        setRoom({ jitsiUrl: res.jitsiUrl, roomPassword: res.roomPassword });
      } else {
        toast.error(t(`errors.${res.messageKey}`));
      }
    });
  }

  if (room) {
    return (
      <div className="flex flex-col gap-3 rounded-lg border border-line bg-canvas/60 p-3">
        <div className="flex items-center gap-2 text-pine">
          <VideoIcon />
          <span className="text-sm font-semibold">{t("ready")}</span>
        </div>
        <a
          href={room.jitsiUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex w-fit items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-paper transition-colors hover:bg-primary-hover"
        >
          <VideoIcon />
          {t("openRoom")}
        </a>
        <div className="rounded-md border border-saffron/30 bg-saffron/10 p-3 text-xs text-ink">
          <p className="mb-1 font-semibold">{t("lobbyTitle")}</p>
          <p className="leading-relaxed text-muted">{t("lobbyHint")}</p>
          <code
            dir="ltr"
            className="mt-2 block rounded bg-ink px-3 py-1.5 text-center font-mono text-lg tracking-widest text-paper"
          >
            {room.roomPassword}
          </code>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={open}
      disabled={isPending}
      className="inline-flex items-center gap-2 rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-paper transition-colors hover:bg-primary-hover disabled:opacity-50"
    >
      {isPending ? (
        <span className="size-3.5 animate-spin rounded-full border-2 border-paper border-t-transparent" />
      ) : (
        <VideoIcon className="size-3.5" />
      )}
      {t("joinButton")}
    </button>
  );
}
