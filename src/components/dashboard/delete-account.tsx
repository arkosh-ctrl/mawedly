"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { toast } from "sonner";
import { deleteMyAccount } from "@/app/[locale]/dashboard/settings/delete-account";

const ERR: Record<string, string> = {
  unauthorized: "انتهت الجلسة، سجّل الدخول من جديد.",
  deleteFailed: "تعذّر الحذف، حاول مجدداً.",
};

// DSAR — irreversible "delete my account & all data". Two-step confirm to avoid
// accidents: reveal → type-nothing confirm button.
export function DeleteAccount() {
  const t = useTranslations("Settings.danger");
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();

  function remove() {
    startTransition(async () => {
      const res = await deleteMyAccount();
      if (res.status === "success") {
        toast.success(t("done"));
        router.replace("/");
      } else {
        toast.error(ERR[res.messageKey] ?? "خطأ");
        setConfirming(false);
      }
    });
  }

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-brick/30 bg-brick/5 p-6">
      <h2 className="eyebrow text-brick">{t("title")}</h2>
      <p className="text-sm leading-relaxed text-muted">{t("body")}</p>

      {!confirming ? (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="w-fit rounded-full border border-brick/40 px-4 py-2 text-sm font-semibold text-brick transition-colors hover:bg-brick/10"
        >
          {t("button")}
        </button>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-brick">{t("confirm")}</span>
          <button
            type="button"
            onClick={remove}
            disabled={isPending}
            className="rounded-full bg-brick px-4 py-2 text-sm font-semibold text-paper transition-colors hover:opacity-90 disabled:opacity-60"
          >
            {isPending ? t("deleting") : t("confirmYes")}
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            disabled={isPending}
            className="rounded-full border border-line px-4 py-2 text-sm font-medium text-ink transition-colors hover:border-muted disabled:opacity-60"
          >
            {t("cancel")}
          </button>
        </div>
      )}
    </section>
  );
}
