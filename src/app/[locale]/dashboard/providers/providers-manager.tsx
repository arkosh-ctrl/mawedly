"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Modal } from "@/components/ui/modal";
import type { Provider } from "@/lib/supabase/database.types";
import { providerSchema, type ProviderInput } from "./schema";
import { saveProvider, setProviderActive } from "./actions";

const EMPTY: ProviderInput = { name: "", title: "" };

export function ProvidersManager({ providers }: { providers: Provider[] }) {
  const t = useTranslations("Providers");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Provider | null>(null);
  const [confirmArchive, setConfirmArchive] = useState<Provider | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProviderInput>({
    resolver: zodResolver(providerSchema),
    defaultValues: EMPTY,
  });

  function openCreate() {
    setEditing(null);
    reset(EMPTY);
    setDialogOpen(true);
  }

  function openEdit(p: Provider) {
    setEditing(p);
    reset({ name: p.name, title: p.title ?? "" });
    setDialogOpen(true);
  }

  function onSubmit(values: ProviderInput) {
    const fd = new FormData();
    if (editing) fd.set("id", editing.id);
    fd.set("name", values.name);
    fd.set("title", values.title ?? "");

    startTransition(async () => {
      const res = await saveProvider(fd);
      if (res.status === "success") {
        toast.success(t(`messages.${res.messageKey}`));
        setDialogOpen(false);
        router.refresh();
      } else {
        toast.error(t(`messages.${res.messageKey}`));
      }
    });
  }

  function changeActive(p: Provider, active: boolean) {
    const fd = new FormData();
    fd.set("id", p.id);
    fd.set("active", String(active));
    startTransition(async () => {
      const res = await setProviderActive(fd);
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
    "rounded-lg border border-line bg-canvas px-3 py-2.5 text-start text-ink outline-none transition-colors focus:border-ink";
  const labelClass = "flex flex-col gap-1.5 text-sm font-medium text-ink";
  const errorClass = "text-xs text-brick";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={openCreate}
          className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-paper transition-colors hover:bg-pine"
        >
          {t("add")}
        </button>
      </div>

      {providers.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line bg-paper px-4 py-8 text-center text-sm text-muted">
          {t("empty")}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {providers.map((p) => (
            <li
              key={p.id}
              className={`flex flex-col gap-2 rounded-xl border border-line bg-paper px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between ${
                p.is_active ? "" : "opacity-60"
              }`}
            >
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="font-display font-bold text-ink">{p.name}</span>
                  {!p.is_active && (
                    <span className="rounded-full bg-canvas px-2 py-0.5 text-xs text-muted">
                      {t("inactive")}
                    </span>
                  )}
                </div>
                {p.title && (
                  <span className="text-xs text-muted">{p.title}</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => openEdit(p)}
                  className="rounded-full border border-line px-3 py-1 text-sm text-ink transition-colors hover:border-ink"
                >
                  {t("edit")}
                </button>
                {p.is_active ? (
                  <button
                    type="button"
                    onClick={() => setConfirmArchive(p)}
                    className="rounded-full border border-brick/40 px-3 py-1 text-sm text-brick transition-colors hover:bg-brick/5"
                  >
                    {t("archive")}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => changeActive(p, true)}
                    disabled={isPending}
                    className="rounded-full border border-pine/40 px-3 py-1 text-sm text-pine transition-colors hover:bg-pine/5"
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
            <span>{t("fields.title")}</span>
            <input className={inputClass} {...register("title")} />
            {errors.title && (
              <span className={errorClass}>{t(errors.title.message!)}</span>
            )}
          </label>

          <div className="mt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setDialogOpen(false)}
              className="rounded-full border border-line px-4 py-2 text-sm text-ink transition-colors hover:border-ink"
            >
              {t("cancel")}
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-paper transition-colors hover:bg-pine disabled:opacity-60"
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
            className="rounded-full border border-line px-4 py-2 text-sm text-ink transition-colors hover:border-ink"
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
