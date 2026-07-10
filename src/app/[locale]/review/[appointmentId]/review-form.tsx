"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { submitReview } from "./actions";
import { initialReviewState } from "./types";

// Blank review form: 1-5 stars (required) + optional comment. Shows nothing
// about the appointment. On success the form is replaced by a generic thank-you;
// any failure renders a single generic error. Business logic lives in the
// submitReview server action.
export function ReviewForm({ appointmentId }: { appointmentId: string }) {
  const t = useTranslations("Review");
  const [state, formAction, pending] = useActionState(
    submitReview,
    initialReviewState,
  );
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);

  if (state.status === "success") {
    return (
      <p className="rounded-lg border border-saffron/40 bg-saffron/10 px-4 py-3 text-sm text-pine">
        {t("messages.thanks")}
      </p>
    );
  }

  const active = hover || rating;

  return (
    <form action={formAction} className="flex w-full flex-col gap-4">
      <input type="hidden" name="appointmentId" value={appointmentId} />
      <input type="hidden" name="rating" value={rating} />

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-ink">{t("ratingLabel")}</span>
        <div className="flex gap-1.5" dir="ltr">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              onMouseEnter={() => setHover(n)}
              onMouseLeave={() => setHover(0)}
              aria-label={t("starLabel", { n })}
              aria-pressed={rating === n}
              className={`text-3xl leading-none transition-colors ${
                n <= active ? "text-saffron" : "text-line hover:text-saffron/50"
              }`}
            >
              ★
            </button>
          ))}
        </div>
      </div>

      <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">
        <span>{t("commentLabel")}</span>
        <textarea
          name="comment"
          rows={4}
          maxLength={1000}
          placeholder={t("commentPlaceholder")}
          className="rounded-lg border border-line bg-canvas px-3 py-2.5 text-start text-ink outline-none transition-colors placeholder:text-muted/60 focus:border-primary"
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">
        <span>{t("reviewer_name_label")}</span>
        <input
          name="reviewer_name"
          maxLength={100}
          autoComplete="name"
          className="rounded-lg border border-line bg-canvas px-3 py-2.5 text-start text-ink outline-none transition-colors focus:border-primary"
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">
        <span>{t("reviewer_phone_label")}</span>
        <input
          name="reviewer_phone"
          maxLength={20}
          dir="ltr"
          inputMode="tel"
          autoComplete="tel"
          className="rounded-lg border border-line bg-canvas px-3 py-2.5 text-start text-ink outline-none transition-colors focus:border-primary"
        />
        <span className="text-xs text-muted">{t("reviewer_phone_hint")}</span>
      </label>

      <button
        type="submit"
        disabled={pending || rating === 0}
        className="rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-paper transition-colors hover:bg-primary-hover disabled:opacity-60"
      >
        {pending ? t("submitting") : t("submit")}
      </button>

      {state.status === "error" && (
        <p className="text-sm text-brick">{t("messages.failed")}</p>
      )}
    </form>
  );
}
