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

      <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">
        <span>{t("emailLabel")}</span>
        <input
          type="email"
          name="email"
          required
          autoComplete="email"
          dir="ltr"
          placeholder="you@example.com"
          className="rounded-lg border border-line bg-canvas px-3 py-2.5 font-mono text-start text-ink outline-none transition-colors placeholder:text-muted/60 focus:border-primary"
        />
      </label>

      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-paper transition-colors hover:bg-primary-hover disabled:opacity-60"
      >
        {pending ? t("sending") : t("submit")}
      </button>

      {state.status === "success" && state.messageKey && (
        <p className="rounded-lg border border-saffron/40 bg-saffron/10 px-3 py-2 text-sm text-pine">
          {t(`messages.${state.messageKey}`)}
        </p>
      )}
      {state.status === "error" && state.messageKey && (
        <p className="text-sm text-brick">{t(`messages.${state.messageKey}`)}</p>
      )}
    </form>
  );
}
