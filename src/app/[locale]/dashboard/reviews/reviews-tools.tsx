"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { buildWhatsappLink } from "@/lib/whatsapp";

export type UnreviewedAppt = {
  id: string;
  date: string;
  customerName: string | null;
  customerPhone: string | null;
};

export type ExportRow = {
  reviewer_name: string | null;
  reviewer_phone: string | null;
  rating: number;
  comment: string | null;
  date: string;
};

// Merchant tools on the reviews page: (1) manually send a review link for a
// completed-but-unreviewed appointment (copy + WhatsApp), and (2) export all
// reviews to an .xlsx file. Both are client-only; xlsx is imported dynamically
// on click so it never ships in the initial bundle.
export function ReviewsTools({
  locale,
  unreviewed,
  exportRows,
  hasReviews,
}: {
  locale: string;
  unreviewed: UnreviewedAppt[];
  exportRows: ExportRow[];
  hasReviews: boolean;
}) {
  const t = useTranslations("Reviews");
  const [selectedId, setSelectedId] = useState("");

  const selected = unreviewed.find((a) => a.id === selectedId) ?? null;
  const reviewUrl =
    selected && typeof window !== "undefined"
      ? `${window.location.origin}/${locale}/review/${selected.id}`
      : "";

  // WhatsApp opens a chat with the CUSTOMER's phone (they haven't reviewed yet,
  // so reviewer_phone doesn't exist), prefilled with the review link.
  const waUrl =
    selected?.customerPhone && reviewUrl
      ? buildWhatsappLink(
          selected.customerPhone,
          `${t("reviewLinkMessage")} ${reviewUrl}`,
        )
      : null;

  async function copyLink() {
    if (!reviewUrl) return;
    await navigator.clipboard.writeText(reviewUrl);
    toast.success(t("copy_link_success"));
  }

  async function exportExcel() {
    const XLSX = await import("xlsx");
    const rows = exportRows.map((r) => ({
      [t("excel.name")]: r.reviewer_name || "—",
      [t("excel.phone")]: r.reviewer_phone || "—",
      [t("excel.rating")]: r.rating,
      [t("excel.comment")]: r.comment || "—",
      [t("excel.date")]: r.date,
    }));
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, t("title"));
    XLSX.writeFile(workbook, "reviews.xlsx");
  }

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-line bg-paper p-5">
      {/* Send a review link manually */}
      <div className="flex flex-col gap-2">
        <span className="text-sm font-semibold text-ink">
          {t("send_review_link")}
        </span>
        {unreviewed.length === 0 ? (
          <p className="text-sm text-muted">{t("no_unreviewed_appointments")}</p>
        ) : (
          <>
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="rounded-lg border border-line bg-canvas px-3 py-2.5 text-start text-ink outline-none transition-colors focus:border-ink"
            >
              <option value="">{t("select_appointment_placeholder")}</option>
              {unreviewed.map((a) => (
                <option key={a.id} value={a.id}>
                  {(a.customerName ?? "—") + " · " + a.date}
                </option>
              ))}
            </select>

            {selected && (
              <div className="flex flex-col gap-2">
                <input
                  readOnly
                  dir="ltr"
                  value={reviewUrl}
                  onFocus={(e) => e.currentTarget.select()}
                  className="rounded-lg border border-line bg-canvas px-3 py-2 font-mono text-xs text-ink outline-none"
                />
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={copyLink}
                    className="rounded-full bg-ink px-3.5 py-1.5 text-xs font-semibold text-paper transition-colors hover:bg-pine"
                  >
                    {t("copyLink")}
                  </button>
                  {waUrl && (
                    <a
                      href={waUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-full border border-pine/40 px-3.5 py-1.5 text-xs font-semibold text-pine transition-colors hover:bg-pine/5"
                    >
                      {t("whatsappSend")}
                    </a>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Export to Excel */}
      {hasReviews && (
        <div className="border-t border-line pt-4">
          <button
            type="button"
            onClick={exportExcel}
            className="rounded-full border border-line px-3.5 py-1.5 text-xs font-semibold text-ink transition-colors hover:border-ink"
          >
            {t("export_excel")}
          </button>
        </div>
      )}
    </section>
  );
}
