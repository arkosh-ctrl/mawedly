"use client";

import { useTranslations } from "next-intl";
import { recordClientVideoJoin } from "./actions";

/**
 * Customer "enter room" button. Records the join (best-effort) then opens Jitsi
 * in a new tab. Rendered inside the server consultation page, which has already
 * validated the room is open.
 */
export function ClientJoin({
  appointmentId,
  jitsiUrl,
}: {
  appointmentId: string;
  jitsiUrl: string;
}) {
  const t = useTranslations("Video");

  function join() {
    // Fire-and-forget; don't block opening the room on the write.
    void recordClientVideoJoin(appointmentId);
    window.open(jitsiUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <button
      type="button"
      onClick={join}
      className="inline-flex items-center gap-2 rounded-full bg-pine px-6 py-3 text-base font-medium text-paper transition-colors hover:bg-ink"
    >
      {t("enterRoom")}
    </button>
  );
}
