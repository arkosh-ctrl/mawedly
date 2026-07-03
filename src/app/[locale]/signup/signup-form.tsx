"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { signupAction } from "./actions";
import { BUSINESS_TYPES } from "./schema";
import { initialSignupState } from "./types";

type SlugStatus = "idle" | "checking" | "available" | "taken" | "reserved" | "invalid";

// Merchant signup: account (email + password) + business (name, slug, type,
// phone) in one form and one submit. The slug is verified live (debounced) as
// the merchant types via /api/slug-availability. Business logic lives in the
// signupAction server action. useActionState mirrors the login forms.
export function SignupForm({ next }: { next: string }) {
  const t = useTranslations("Signup");
  const [state, formAction, pending] = useActionState(
    signupAction,
    initialSignupState,
  );

  const [slug, setSlug] = useState("");
  const [slugStatus, setSlugStatus] = useState<SlugStatus>("idle");

  // Debounced live availability check. A monotonically increasing request id
  // (guarded by AbortController) ensures only the latest response is applied,
  // so out-of-order responses can never overwrite a newer keystroke's result.
  const reqId = useRef(0);
  useEffect(() => {
    const value = slug.trim().toLowerCase();
    if (value.length < 3 || value.length > 40 || !/^[a-z0-9-]+$/.test(value)) {
      setSlugStatus(value.length === 0 ? "idle" : "invalid");
      return;
    }

    setSlugStatus("checking");
    const id = ++reqId.current;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/slug-availability?slug=${encodeURIComponent(value)}`,
          { signal: controller.signal },
        );
        const json: { available: boolean; reason: string } = await res.json();
        if (id !== reqId.current) return; // a newer keystroke superseded this
        if (json.available) setSlugStatus("available");
        else if (json.reason === "reserved") setSlugStatus("reserved");
        else if (json.reason === "invalid") setSlugStatus("invalid");
        else setSlugStatus("taken");
      } catch {
        if (id === reqId.current) setSlugStatus("idle");
      }
    }, 350);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [slug]);

  const inputClass =
    "rounded-lg border border-line bg-canvas px-3 py-2.5 text-start text-ink outline-none transition-colors focus:border-ink";
  const labelClass = "flex flex-col gap-1.5 text-sm font-medium text-ink";

  const slugUnavailable =
    slugStatus === "taken" ||
    slugStatus === "reserved" ||
    slugStatus === "invalid";

  return (
    <form action={formAction} className="flex w-full flex-col gap-3">
      <input type="hidden" name="next" value={next} />

      <label className={labelClass}>
        <span>{t("emailLabel")}</span>
        <input
          type="email"
          name="email"
          required
          autoComplete="email"
          dir="ltr"
          placeholder="you@example.com"
          className={`${inputClass} font-mono placeholder:text-muted/60`}
        />
      </label>

      <label className={labelClass}>
        <span>{t("passwordLabel")}</span>
        <input
          type="password"
          name="password"
          required
          minLength={8}
          autoComplete="new-password"
          dir="ltr"
          className={inputClass}
        />
        <span className="text-xs text-muted">{t("passwordHint")}</span>
      </label>

      <label className={labelClass}>
        <span>{t("businessNameLabel")}</span>
        <input name="name" required className={inputClass} />
      </label>

      <label className={labelClass}>
        <span>{t("slugLabel")}</span>
        <input
          name="slug"
          required
          dir="ltr"
          placeholder="noor-consulting"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          className={inputClass}
          aria-invalid={slugUnavailable}
        />
        <span className="text-xs text-muted">{t("slugHint")}</span>
        {slugStatus === "checking" && (
          <span className="text-xs text-muted">{t("slugStatus.checking")}</span>
        )}
        {slugStatus === "available" && (
          <span className="text-xs text-pine">{t("slugStatus.available")}</span>
        )}
        {slugStatus === "taken" && (
          <span className="text-xs text-brick">{t("slugStatus.taken")}</span>
        )}
        {slugStatus === "reserved" && (
          <span className="text-xs text-brick">{t("slugStatus.reserved")}</span>
        )}
        {slugStatus === "invalid" && (
          <span className="text-xs text-brick">{t("slugStatus.invalid")}</span>
        )}
      </label>

      <label className={labelClass}>
        <span>{t("typeLabel")}</span>
        <select name="type" defaultValue={BUSINESS_TYPES[0]} className={inputClass}>
          {BUSINESS_TYPES.map((value) => (
            <option key={value} value={value}>
              {t(`types.${value}`)}
            </option>
          ))}
        </select>
      </label>

      <label className={labelClass}>
        <span>{t("phoneLabel")}</span>
        <input
          name="phone"
          required
          dir="ltr"
          inputMode="tel"
          placeholder="9665XXXXXXXX"
          className={inputClass}
        />
        <span className="text-xs text-muted">{t("phoneHint")}</span>
      </label>

      <button
        type="submit"
        disabled={pending || slugUnavailable || slugStatus === "checking"}
        className="rounded-full bg-ink px-4 py-2.5 text-sm font-semibold text-paper transition-colors hover:bg-pine disabled:opacity-60"
      >
        {pending ? t("creating") : t("submit")}
      </button>

      {state.status === "error" && state.messageKey && (
        <p className="text-sm text-brick">
          {t(`messages.${state.messageKey}`)}
        </p>
      )}
    </form>
  );
}
