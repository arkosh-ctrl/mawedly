"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { settingsSchema, type SettingsInput } from "./schema";
import { saveSettings } from "./actions";

type Props = {
  defaultValues: SettingsInput;
  qrUrl: string | null;
};

export function SettingsForm({ defaultValues, qrUrl }: Props) {
  const t = useTranslations("Settings");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(qrUrl);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SettingsInput>({
    resolver: zodResolver(settingsSchema),
    defaultValues,
  });

  // Translate a zod error key (e.g. "errors.slugFormat") or pass through.
  function err(message?: string) {
    return message ? t(message) : null;
  }

  function onSubmit(values: SettingsInput) {
    const fd = new FormData();
    Object.entries(values).forEach(([key, value]) => {
      fd.set(key, value == null ? "" : String(value));
    });
    if (file) fd.set("qr", file);

    startTransition(async () => {
      const result = await saveSettings(fd);
      if (result.status === "success") {
        toast.success(t(`messages.${result.messageKey}`));
        setFile(null);
        router.refresh();
      } else {
        toast.error(t(`messages.${result.messageKey}`));
      }
    });
  }

  const inputClass =
    "rounded-lg border border-line bg-canvas px-3 py-2.5 text-start text-ink outline-none transition-colors focus:border-primary";
  const labelClass = "flex flex-col gap-1.5 text-sm font-medium text-ink";
  const errorClass = "text-xs text-brick";

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
      {/* Business info */}
      <section className="flex flex-col gap-4 rounded-2xl border border-line bg-paper p-6">
        <h2 className="eyebrow">{t("sections.business")}</h2>

        <label className={labelClass}>
          <span>{t("fields.name")}</span>
          <input className={inputClass} {...register("name")} />
          {errors.name && <span className={errorClass}>{err(errors.name.message)}</span>}
        </label>

        <label className={labelClass}>
          <span>{t("fields.slug")}</span>
          <input className={inputClass} dir="ltr" placeholder="noor-consulting" {...register("slug")} />
          <span className="text-xs text-muted">{t("hints.slug")}</span>
          {errors.slug && <span className={errorClass}>{err(errors.slug.message)}</span>}
        </label>

        <label className={labelClass}>
          <span>{t("fields.phone")}</span>
          <input className={inputClass} dir="ltr" inputMode="tel" placeholder="9665XXXXXXXX" {...register("phone")} />
          <span className="text-xs text-muted">{t("hints.phone")}</span>
          {errors.phone && <span className={errorClass}>{err(errors.phone.message)}</span>}
        </label>

        <label className={labelClass}>
          <span>{t("fields.notificationEmail")}</span>
          <input className={inputClass} dir="ltr" type="email" {...register("notification_email")} />
          {errors.notification_email && (
            <span className={errorClass}>{err(errors.notification_email.message)}</span>
          )}
        </label>

        <label className={labelClass}>
          <span>{t("fields.defaultLanguage")}</span>
          <select className={inputClass} {...register("default_language")}>
            <option value="ar">{t("langOptions.ar")}</option>
            <option value="en">{t("langOptions.en")}</option>
          </select>
        </label>

        <div className="flex flex-col gap-3 sm:flex-row">
          <label className={`${labelClass} flex-1`}>
            <span>{t("fields.workStart")}</span>
            <input
              type="time"
              className={inputClass}
              dir="ltr"
              {...register("work_start")}
            />
            {errors.work_start && (
              <span className={errorClass}>{t(errors.work_start.message!)}</span>
            )}
          </label>

          <label className={`${labelClass} flex-1`}>
            <span>{t("fields.workEnd")}</span>
            <input
              type="time"
              className={inputClass}
              dir="ltr"
              {...register("work_end")}
            />
            {errors.work_end && (
              <span className={errorClass}>{t(errors.work_end.message!)}</span>
            )}
          </label>
        </div>
      </section>

      {/* Bank details */}
      <section className="flex flex-col gap-4 rounded-2xl border border-line bg-paper p-6">
        <h2 className="eyebrow">{t("sections.bank")}</h2>

        <label className={labelClass}>
          <span>{t("fields.bankName")}</span>
          <input className={inputClass} {...register("bank_name")} />
          {errors.bank_name && <span className={errorClass}>{err(errors.bank_name.message)}</span>}
        </label>

        <label className={labelClass}>
          <span>{t("fields.bankIban")}</span>
          <input className={inputClass} dir="ltr" placeholder="SA0000000000000000000000" {...register("bank_iban")} />
          {errors.bank_iban && <span className={errorClass}>{err(errors.bank_iban.message)}</span>}
        </label>

        <label className={labelClass}>
          <span>{t("fields.bankAccountName")}</span>
          <input className={inputClass} {...register("bank_account_name")} />
          {errors.bank_account_name && (
            <span className={errorClass}>{err(errors.bank_account_name.message)}</span>
          )}
        </label>

        <div className={labelClass}>
          <span>{t("fields.qr")}</span>
          {preview && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={preview}
              alt={t("fields.qr")}
              className="size-32 rounded-xl border border-line bg-paper object-contain p-1"
            />
          )}
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              setFile(f);
              if (f) setPreview(URL.createObjectURL(f));
            }}
            className="text-sm"
          />
          <span className="text-xs text-muted">{t("hints.qr")}</span>
        </div>
      </section>

      <div>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-paper transition-colors hover:bg-primary-hover disabled:opacity-60"
        >
          {isPending ? t("saving") : t("save")}
        </button>
      </div>
    </form>
  );
}
