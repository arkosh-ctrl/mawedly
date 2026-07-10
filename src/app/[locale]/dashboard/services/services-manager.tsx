"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Modal } from "@/components/ui/modal";
import type { Service } from "@/lib/supabase/database.types";
import { serviceSchema, type ServiceInput } from "./schema";
import { saveService, setServiceActive } from "./actions";

const EMPTY: ServiceInput = {
  name: "",
  session_type: "in_person",
  duration_minutes: 30,
  price: 0,
  deposit_amount: 0,
};

export function ServicesManager({ services }: { services: Service[] }) {
  const t = useTranslations("Services");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);
  const [confirmArchive, setConfirmArchive] = useState<Service | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ServiceInput>({
    resolver: zodResolver(serviceSchema),
    defaultValues: EMPTY,
  });

  function openCreate() {
    setEditing(null);
    reset(EMPTY);
    setDialogOpen(true);
  }

  function openEdit(s: Service) {
    setEditing(s);
    reset({
      name: s.name,
      session_type:
        (s.session_type as ServiceInput["session_type"]) ?? "in_person",
      duration_minutes: s.duration_minutes,
      price: Number(s.price),
      deposit_amount: Number(s.deposit_amount),
    });
    setDialogOpen(true);
  }

  function onSubmit(values: ServiceInput) {
    const fd = new FormData();
    if (editing) fd.set("id", editing.id);
    fd.set("name", values.name);
    fd.set("session_type", values.session_type);
    fd.set("duration_minutes", String(values.duration_minutes));
    fd.set("price", String(values.price));
    fd.set("deposit_amount", String(values.deposit_amount));

    startTransition(async () => {
      const res = await saveService(fd);
      if (res.status === "success") {
        toast.success(t(`messages.${res.messageKey}`));
        setDialogOpen(false);
        router.refresh();
      } else {
        toast.error(t(`messages.${res.messageKey}`));
      }
    });
  }

  function changeActive(s: Service, active: boolean) {
    const fd = new FormData();
    fd.set("id", s.id);
    fd.set("active", String(active));
    startTransition(async () => {
      const res = await setServiceActive(fd);
      if (res.status === "success") {
        toast.success(t(`messages.${res.messageKey}`));
        setConfirmArchive(null);
        router.refresh();
      } else {
        toast.error(t(`messages.${res.messageKey}`));
      }
    });
  }

  const inputClass =
    "rounded-lg border border-line bg-canvas px-3 py-2.5 text-start text-ink outline-none transition-colors focus:border-primary";
  const labelClass = "flex flex-col gap-1.5 text-sm font-medium text-ink";
  const errorClass = "text-xs text-brick";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={openCreate}
          className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-paper transition-colors hover:bg-primary-hover"
        >
          {t("add")}
        </button>
      </div>

      {services.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line bg-paper px-4 py-8 text-center text-sm text-muted">
          {t("empty")}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {services.map((s) => (
            <li
              key={s.id}
              className={`flex flex-col gap-2 rounded-xl border border-line bg-paper px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between ${
                s.is_active ? "" : "opacity-60"
              }`}
            >
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="font-display font-bold text-ink">{s.name}</span>
                  {!s.is_active && (
                    <span className="rounded-full bg-canvas px-2 py-0.5 text-xs text-muted">
                      {t("inactive")}
                    </span>
                  )}
                </div>
                <span className="text-xs text-muted">
                  {t("units.minutes", { n: s.duration_minutes })} ·{" "}
                  {t("fields.price")}: {Number(s.price)} {t("units.currency")} ·{" "}
                  {t("fields.deposit")}: {Number(s.deposit_amount)}{" "}
                  {t("units.currency")}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => openEdit(s)}
                  className="rounded-full border border-line px-3 py-1 text-sm text-ink transition-colors hover:border-muted"
                >
                  {t("edit")}
                </button>
                {s.is_active ? (
                  <button
                    type="button"
                    onClick={() => setConfirmArchive(s)}
                    className="rounded-full border border-brick/40 px-3 py-1 text-sm text-brick transition-colors hover:bg-brick/5"
                  >
                    {t("archive")}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => changeActive(s, true)}
                    disabled={isPending}
                    className="rounded-full border border-pine/40 px-3 py-1 text-sm text-pine transition-colors hover:bg-primary-hover/5"
                  >
                    {t("activate")}
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={editing ? t("editTitle") : t("addTitle")}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
          <label className={labelClass}>
            <span>{t("fields.name")}</span>
            <input className={inputClass} {...register("name")} />
            {errors.name && (
              <span className={errorClass}>{t(errors.name.message!)}</span>
            )}
          </label>

          <label className={labelClass}>
            <span>{t("fields.sessionType")}</span>
            <select className={inputClass} {...register("session_type")}>
              <option value="in_person">{t("sessionType.in_person")}</option>
              <option value="virtual">{t("sessionType.virtual")}</option>
              <option value="phone">{t("sessionType.phone")}</option>
            </select>
          </label>

          <label className={labelClass}>
            <span>{t("fields.duration")}</span>
            <input
              type="number"
              className={inputClass}
              dir="ltr"
              {...register("duration_minutes")}
            />
            {errors.duration_minutes && (
              <span className={errorClass}>
                {t(errors.duration_minutes.message!)}
              </span>
            )}
          </label>

          <label className={labelClass}>
            <span>{t("fields.price")}</span>
            <input
              type="number"
              step="0.01"
              className={inputClass}
              dir="ltr"
              {...register("price")}
            />
            {errors.price && (
              <span className={errorClass}>{t(errors.price.message!)}</span>
            )}
          </label>

          <label className={labelClass}>
            <span>{t("fields.deposit")}</span>
            <input
              type="number"
              step="0.01"
              className={inputClass}
              dir="ltr"
              {...register("deposit_amount")}
            />
            {errors.deposit_amount && (
              <span className={errorClass}>
                {t(errors.deposit_amount.message!)}
              </span>
            )}
          </label>

          <div className="mt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setDialogOpen(false)}
              className="rounded-full border border-line px-4 py-2 text-sm text-ink transition-colors hover:border-muted"
            >
              {t("cancel")}
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-paper transition-colors hover:bg-primary-hover disabled:opacity-60"
            >
              {isPending ? t("saving") : t("save")}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={!!confirmArchive}
        onClose={() => setConfirmArchive(null)}
        title={t("archiveConfirmTitle")}
      >
        <p className="mb-4 text-sm text-muted">{t("archiveConfirmBody")}</p>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setConfirmArchive(null)}
            className="rounded-full border border-line px-4 py-2 text-sm text-ink transition-colors hover:border-muted"
          >
            {t("cancel")}
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={() => confirmArchive && changeActive(confirmArchive, false)}
            className="rounded-full bg-brick px-4 py-2 text-sm font-semibold text-paper transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {t("archive")}
          </button>
        </div>
      </Modal>
    </div>
  );
}
