"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { signInWithMagicLink } from "./actions";
import { initialLoginState } from "./types";

// Presentation for the Magic Link request. Business logic lives in the
// signInWithMagicLink server action.
export function MagicLinkForm({ next }: { next: string }) {
  const t = useTranslations("Login");
  const [state, formAction, pending] = useActionState(
    signInWithMagicLink,
    initialLoginState,
  );

  return (
    <form action={formAction} className="flex w-full flex-col gap-3">
      <input type="hidden" name="next" value={next} />

      <label className="flex flex-col gap-1 text-sm">
        <span>{t("emailLabel")}</span>
        <input
          type="email"
          name="email"
          required
          autoComplete="email"
          dir="ltr"
          placeholder="you@example.com"
          className="rounded-md border border-neutral-300 px-3 py-2 text-start outline-none focus:border-neutral-500"
        />
      </label>

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition-opacity disabled:opacity-60"
      >
        {pending ? t("sending") : t("submit")}
      </button>

      {state.status === "success" && state.messageKey && (
        <p className="text-sm text-green-700">
          {t(`messages.${state.messageKey}`)}
        </p>
      )}
      {state.status === "error" && state.messageKey && (
        <p className="text-sm text-red-700">
          {t(`messages.${state.messageKey}`)}
        </p>
      )}
    </form>
  );
}
