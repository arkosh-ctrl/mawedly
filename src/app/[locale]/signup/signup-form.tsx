"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { signupAction } from "./actions";
import { BUSINESS_TYPES } from "./schema";
import {
  requiresLicense,
  defaultIssuer,
  LICENSE_ISSUERS,
} from "@/lib/verification/professions";
import { initialSignupState } from "./types";
import {
  readAttribution,
  type Attribution,
} from "@/components/attribution-capture";

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
  // Drives the conditional license section: shown only for regulated professions.
  const [type, setType] = useState<string>(BUSINESS_TYPES[0]);
  const showLicense = requiresLicense(type);
  const suggestedIssuer = defaultIssuer(type);
  // Explicit consent — mandatory to enable submit.
  const [termsConsent, setTermsConsent] = useState(false);

  // First-touch attribution written by AttributionCapture on the landing page.
  // Read in an effect, never during render: localStorage does not exist on the
  // server, and touching it while rendering would break hydration.
  const [attribution, setAttribution] = useState<Attribution | null>(null);
  useEffect(() => {
    setAttribution(readAttribution());
  }, []);

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
    "rounded-lg border border-line bg-canvas px-3 py-2.5 text-start text-ink outline-none transition-colors focus:border-primary";
  const labelClass = "flex flex-col gap-1.5 text-sm font-medium text-ink";

  const slugUnavailable =
    slugStatus === "taken" ||
    slugStatus === "reserved" ||
    slugStatus === "invalid";

  return (
    <form action={formAction} className="flex w-full flex-col gap-3">
      <input type="hidden" name="next" value={next} />

      {/* Attribution — invisible to the merchant, validated again server-side.
          Rendered only once the effect has read storage, so the server-rendered
          markup and the first client render agree. Empty when storage is
          unavailable or the visit had no campaign tag and no referrer. */}
      {attribution && (
        <>
          <input type="hidden" name="attr_source" value={attribution.source} />
          <input type="hidden" name="attr_medium" value={attribution.medium} />
          <input
            type="hidden"
            name="attr_campaign"
            value={attribution.campaign}
          />
          <input
            type="hidden"
            name="attr_referrer"
            value={attribution.referrer}
          />
        </>
      )}

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
        <select
          name="type"
          value={type}
          onChange={(e) => setType(e.target.value)}
          className={inputClass}
        >
          {BUSINESS_TYPES.map((value) => (
            <option key={value} value={value}>
              {t(`types.${value}`)}
            </option>
          ))}
        </select>
      </label>

      {/* Regulated professions: capture license number + issuer + attestation.
          Optional but recommended — verification is manual after signup. */}
      {showLicense && (
        <div className="flex flex-col gap-3 rounded-lg border border-saffron/40 bg-saffron/5 p-3.5">
          <p className="text-xs leading-relaxed text-ink">{t("license.intro")}</p>

          <label className={labelClass}>
            <span>{t("license.numberLabel")}</span>
            <input
              name="license_number"
              dir="ltr"
              className={inputClass}
              placeholder={t("license.numberPlaceholder")}
            />
          </label>

          <label className={labelClass}>
            <span>{t("license.issuerLabel")}</span>
            <select
              name="license_issuer"
              defaultValue={suggestedIssuer ?? ""}
              className={inputClass}
            >
              <option value="">{t("license.issuerNone")}</option>
              {LICENSE_ISSUERS.map((iss) => (
                <option key={iss} value={iss}>
                  {t(`license.issuers.${iss}`)}
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-start gap-2 text-xs leading-relaxed text-ink">
            <input
              type="checkbox"
              name="license_attestation"
              className="mt-0.5 accent-primary"
            />
            <span>{t("license.attestation")}</span>
          </label>

          <p className="text-xs text-muted">{t("license.uploadLater")}</p>
          <p className="rounded-lg bg-brick/5 px-3 py-2 text-xs leading-relaxed text-brick">
            {t("license.schedulingOnly")}
          </p>
        </div>
      )}

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

      {/* Mandatory legal consent. */}
      <label className="flex items-start gap-2.5 text-sm text-ink">
        <input
          type="checkbox"
          name="terms_consent"
          checked={termsConsent}
          onChange={(e) => setTermsConsent(e.target.checked)}
          className="mt-0.5 size-4 accent-primary"
        />
        <span className="leading-relaxed">
          {t.rich("consent.legal", {
            terms: (c) => (
              <Link href="/terms" target="_blank" className="text-primary underline">{c}</Link>
            ),
            privacy: (c) => (
              <Link href="/privacy" target="_blank" className="text-primary underline">{c}</Link>
            ),
            disclaimer: (c) => (
              <Link href="/disclaimer" target="_blank" className="text-primary underline">{c}</Link>
            ),
          })}
        </span>
      </label>

      {/* Optional marketing/notifications consent. */}
      <label className="flex items-start gap-2.5 text-sm text-muted">
        <input
          type="checkbox"
          name="marketing_consent"
          className="mt-0.5 size-4 accent-primary"
        />
        <span className="leading-relaxed">{t("consent.marketing")}</span>
      </label>

      <p className="text-xs leading-relaxed text-muted">{t("consent.storageNote")}</p>

      <button
        type="submit"
        disabled={pending || slugUnavailable || slugStatus === "checking" || !termsConsent}
        className="rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-paper transition-colors hover:bg-primary-hover disabled:opacity-60"
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
