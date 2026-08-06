"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";

/**
 * The interactive half of the no-show calculator.
 *
 * No storage of any kind: nothing here is worth persisting, and a calculator
 * that quietly remembers a previous visitor's revenue figures is a surprise
 * nobody wants. State lives for the length of the visit.
 *
 * Every number is derived on render — there is no effect, no debounce and no
 * async, so the result can never lag behind the inputs the reader is looking at.
 */

type Field = "appointments" | "noShowRate" | "price" | "duration";

// Starting values, not claims. They exist so the page shows a worked example
// on load instead of four zeros, and they are plausible for a small salon.
const DEFAULTS: Record<Field, number> = {
  appointments: 120,
  noShowRate: 15,
  price: 150,
  duration: 60,
};

const LIMITS: Record<Field, { min: number; max: number }> = {
  appointments: { min: 0, max: 5000 },
  noShowRate: { min: 0, max: 100 },
  price: { min: 0, max: 100000 },
  duration: { min: 0, max: 600 },
};

export function NoShowCalculator() {
  const t = useTranslations("Tools.noShow");
  const locale = useLocale();
  const [values, setValues] = useState<Record<Field, number>>(DEFAULTS);

  // Latin digits in both locales — the app renders every figure, time and price
  // in tabular Latin numerals, and the result cards sit next to mono type.
  const format = (n: number) =>
    new Intl.NumberFormat(`${locale === "ar" ? "ar" : "en"}-u-nu-latn`, {
      maximumFractionDigits: 0,
    }).format(n);

  const clamp = (field: Field, raw: number) => {
    const { min, max } = LIMITS[field];
    if (!Number.isFinite(raw)) return min;
    return Math.min(max, Math.max(min, raw));
  };

  const missed = (values.appointments * values.noShowRate) / 100;
  const monthly = missed * values.price;
  const results = [
    { key: "missedLabel", value: format(Math.round(missed)), unit: t("apptUnit") },
    { key: "monthlyLabel", value: format(Math.round(monthly)), unit: t("currency") },
    { key: "yearlyLabel", value: format(Math.round(monthly * 12)), unit: t("currency") },
    {
      key: "hoursLabel",
      value: format(Math.round((missed * values.duration) / 60)),
      unit: t("hoursUnit"),
    },
  ] as const;

  return (
    <div className="mt-10 grid gap-6 md:grid-cols-2">
      <section className="rounded-2xl border border-line bg-paper p-6">
        <h2 className="font-display text-lg font-bold text-ink">
          {t("inputsTitle")}
        </h2>

        <div className="mt-5 flex flex-col gap-5">
          {(Object.keys(DEFAULTS) as Field[]).map((field) => (
            <label key={field} className="flex flex-col gap-2">
              <span className="text-sm font-medium text-ink">{t(field)}</span>
              <input
                type="number"
                inputMode="numeric"
                dir="ltr"
                value={values[field]}
                min={LIMITS[field].min}
                max={LIMITS[field].max}
                onChange={(e) =>
                  setValues((v) => ({
                    ...v,
                    [field]: clamp(field, e.target.valueAsNumber),
                  }))
                }
                className="w-full rounded-lg border border-line bg-canvas px-3 py-2 text-start font-mono text-ink outline-none transition-colors focus:border-primary"
              />
            </label>
          ))}
        </div>

        {/* The rate is the input people guess at, and a guessed rate makes every
            figure opposite it meaningless. Say so where it is entered. */}
        <p className="mt-5 border-s-2 border-line ps-3 text-sm leading-relaxed text-muted">
          {t("rateHint")}
        </p>
      </section>

      <section
        // The figures change as the reader types. Announce them once, politely,
        // rather than firing on every keystroke.
        aria-live="polite"
        className="rounded-2xl border border-line bg-canvas p-6"
      >
        <h2 className="font-display text-lg font-bold text-ink">
          {t("resultsTitle")}
        </h2>

        <dl className="mt-5 flex flex-col gap-4">
          {results.map((result) => (
            <div
              key={result.key}
              className="flex items-baseline justify-between gap-4 border-b border-line pb-4 last:border-b-0 last:pb-0"
            >
              <dt className="text-sm text-muted">{t(result.key)}</dt>
              <dd className="flex items-baseline gap-1.5">
                <span
                  dir="ltr"
                  className="font-mono text-2xl font-bold text-ink"
                >
                  {result.value}
                </span>
                <span className="text-xs text-muted">{result.unit}</span>
              </dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
