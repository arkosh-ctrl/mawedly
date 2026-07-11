"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { saveBranding } from "./branding-actions";

// Enterprise-only branding form: logo file + accent hex color. The public
// booking page picks both up on its next render.

export function BrandingForm({
  currentColor,
  hasLogo,
}: {
  currentColor: string | null;
  hasLogo: boolean;
}) {
  const t = useTranslations("Billing.branding");
  const [isPending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await saveBranding(fd);
      if (res.status === "success") {
        toast.success(t(`messages.${res.messageKey}`));
      } else {
        toast.error(t(`messages.${res.messageKey}`));
      }
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col gap-4 rounded-2xl border border-line bg-paper p-5 shadow-sm"
    >
      <div className="flex flex-col gap-1">
        <h3 className="font-display text-base font-bold text-ink">
          {t("title")}
        </h3>
        <p className="text-xs leading-relaxed text-muted">{t("hint")}</p>
      </div>

      <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">
        <span>
          {t("logoLabel")}
          {hasLogo ? ` — ${t("logoSet")}` : ""}
        </span>
        <input
          name="logo"
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          className="text-sm text-ink file:me-3 file:rounded-full file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-paper"
        />
      </label>

      <label className="flex items-center gap-3 text-sm font-medium text-ink">
        <span>{t("colorLabel")}</span>
        <input
          name="brand_color"
          type="color"
          defaultValue={currentColor ?? "#006bff"}
          className="h-9 w-14 cursor-pointer rounded-lg border border-line bg-paper"
        />
      </label>

      <button
        type="submit"
        disabled={isPending}
        className="self-start rounded-full bg-primary px-5 py-2 text-sm font-semibold text-paper transition-colors hover:bg-primary-hover disabled:opacity-50"
      >
        {isPending ? t("saving") : t("save")}
      </button>
    </form>
  );
}
