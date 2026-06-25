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
    "rounded-md border border-neutral-300 px-3 py-2 text-start outline-none focus:border-neutral-500";
  const labelClass = "flex flex-col gap-1 text-sm";
  const errorClass = "text-xs text-red-700";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={openCreate}
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white"
        >
          {t("add")}
        </button>
      </div>

      {providers.length === 0 ? (
        <p className="rounded-md border border-dashed border-neutral-300 px-4 py-6 text-center text-sm opacity-70">
          {t("empty")}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {providers.map((p) => (
            <li
              key={p.id}
              className={`flex flex-col gap-2 rounded-md border border-neutral-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between ${
                p.is_active ? "" : "opacity-60"
              }`}
            >
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{p.name}</span>
                  {!p.is_active && (
                    <span className="rounded bg-neutral-200 px-2 py-0.5 text-xs text-neutral-700">
                      {t("inactive")}
                    </span>
                  )}
                </div>
                {p.title && (
                  <span className="text-xs opacity-70">{p.title}</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => openEdit(p)}
                  className="rounded-md border border-neutral-300 px-3 py-1 text-sm hover:bg-neutral-100"
                >
                  {t("edit")}
                </button>
                {p.is_active ? (
                  <button
                    type="button"
                    onClick={() => setConfirmArchive(p)}
                    className="rounded-md border border-red-300 px-3 py-1 text-sm text-red-700 hover:bg-red-50"
                  >
                    {t("archive")}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => changeActive(p, true)}
                    disabled={isPending}
                    className="rounded-md border border-green-300 px-3 py-1 text-sm text-green-700 hover:bg-green-50"
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
              className="rounded-md border border-neutral-300 px-4 py-2 text-sm hover:bg-neutral-100"
            >
              {t("cancel")}
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
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
        <p className="mb-4 text-sm opacity-80">{t("archiveConfirmBody")}</p>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setConfirmArchive(null)}
            className="rounded-md border border-neutral-300 px-4 py-2 text-sm hover:bg-neutral-100"
          >
            {t("cancel")}
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={() => confirmArchive && changeActive(confirmArchive, false)}
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {t("archive")}
          </button>
        </div>
      </Modal>
    </div>
  );
}
