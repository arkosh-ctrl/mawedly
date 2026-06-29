"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { requestPasswordReset, signInWithPassword } from "./actions";
import { initialLoginState } from "./types";

// Password sign-in with an inline "forgot / set password" reset request. Both
// the wrong-password and never-set-a-password cases surface the same generic
// error, so the reset affordance is always offered. Business logic lives in the
// signInWithPassword / requestPasswordReset server actions.
export function PasswordForm({ next }: { next: string }) {
  const t = useTranslations("Login");
  const [mode, setMode] = useState<"signin" | "reset">("signin");

  const [signInState, signInAction, signInPending] = useActionState(
    signInWithPassword,
    initialLoginState,
  );
  const [resetState, resetAction, resetPending] = useActionState(
    requestPasswordReset,
    initialLoginState,
  );

  if (mode === "reset") {
    return (
      <form action={resetAction} className="flex w-full flex-col gap-3">
        <p className="text-sm text-muted">{t("resetSubtitle")}</p>

        <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">
          <span>{t("emailLabel")}</span>
          <input
            type="email"
            name="email"
            required
            autoComplete="email"
            dir="ltr"
            placeholder="you@example.com"
            className="rounded-lg border border-line bg-canvas px-3 py-2.5 font-mono text-start text-ink outline-none transition-colors placeholder:text-muted/60 focus:border-ink"
          />
        </label>

        <button
          type="submit"
          disabled={resetPending}
          className="rounded-full bg-ink px-4 py-2.5 text-sm font-semibold text-paper transition-colors hover:bg-pine disabled:opacity-60"
        >
          {resetPending ? t("sending") : t("sendResetSubmit")}
        </button>

        <button
          type="button"
          onClick={() => setMode("signin")}
          className="self-start text-sm text-muted underline-offset-2 hover:text-ink hover:underline"
        >
          {t("backToSignIn")}
        </button>

        {resetState.status === "success" && resetState.messageKey && (
          <p className="rounded-lg border border-saffron/40 bg-saffron/10 px-3 py-2 text-sm text-pine">
            {t(`messages.${resetState.messageKey}`)}
          </p>
        )}
        {resetState.status === "error" && resetState.messageKey && (
          <p className="text-sm text-brick">
            {t(`messages.${resetState.messageKey}`)}
          </p>
        )}
      </form>
    );
  }

  return (
    <form action={signInAction} className="flex w-full flex-col gap-3">
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
          className="rounded-lg border border-line bg-canvas px-3 py-2.5 font-mono text-start text-ink outline-none transition-colors placeholder:text-muted/60 focus:border-ink"
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">
        <span>{t("passwordLabel")}</span>
        <input
          type="password"
          name="password"
          required
          autoComplete="current-password"
          dir="ltr"
          className="rounded-lg border border-line bg-canvas px-3 py-2.5 text-start text-ink outline-none transition-colors focus:border-ink"
        />
      </label>

      <button
        type="submit"
        disabled={signInPending}
        className="rounded-full bg-ink px-4 py-2.5 text-sm font-semibold text-paper transition-colors hover:bg-pine disabled:opacity-60"
      >
        {signInPending ? t("signingIn") : t("signInSubmit")}
      </button>

      <button
        type="button"
        onClick={() => setMode("reset")}
        className="self-start text-sm text-muted underline-offset-2 hover:text-ink hover:underline"
      >
        {t("forgotPassword")}
      </button>

      {signInState.status === "error" && signInState.messageKey && (
        <p className="text-sm text-brick">
          {t(`messages.${signInState.messageKey}`)}
        </p>
      )}
    </form>
  );
}
