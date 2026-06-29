"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { updatePassword } from "./actions";
import { initialUpdatePasswordState } from "./types";

// Presentation for setting a new password. Business logic lives in the
// updatePassword server action.
export function UpdatePasswordForm() {
  const t = useTranslations("UpdatePassword");
  const [state, formAction, pending] = useActionState(
    updatePassword,
    initialUpdatePasswordState,
  );

  return (
    <form action={formAction} className="flex w-full flex-col gap-3">
      <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">
        <span>{t("newPasswordLabel")}</span>
        <input
          type="password"
          name="password"
          required
          autoComplete="new-password"
          dir="ltr"
          className="rounded-lg border border-line bg-canvas px-3 py-2.5 text-start text-ink outline-none transition-colors focus:border-ink"
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">
        <span>{t("confirmPasswordLabel")}</span>
        <input
          type="password"
          name="confirmPassword"
          required
          autoComplete="new-password"
          dir="ltr"
          className="rounded-lg border border-line bg-canvas px-3 py-2.5 text-start text-ink outline-none transition-colors focus:border-ink"
        />
      </label>

      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-ink px-4 py-2.5 text-sm font-semibold text-paper transition-colors hover:bg-pine disabled:opacity-60"
      >
        {pending ? t("saving") : t("submit")}
      </button>

      {state.status === "error" && state.messageKey && (
        <p className="text-sm text-brick">{t(`messages.${state.messageKey}`)}</p>
      )}
    </form>
  );
}
