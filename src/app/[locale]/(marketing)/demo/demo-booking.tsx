"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

/**
 * A self-contained mock of the real booking flow.
 *
 * DELIBERATELY ISOLATED FROM THE PRODUCT. It imports nothing from
 * @/lib/booking, calls no API route, touches no database and reads no slug.
 * A public page that anyone can hammer must not be able to write a row, create
 * a business, or consume rate-limit budget the real /[slug] page depends on.
 * The cost of that isolation is a second, simpler copy of the flow's shape —
 * which is the right trade for a page whose entire job is to be clicked by
 * strangers.
 *
 * The times are fixed and one is pre-taken, so the "a booked slot disappears"
 * idea is visible rather than described.
 */

const TIMES = ["09:00", "10:30", "12:00", "14:00", "16:30", "18:00", "19:30"];
const TAKEN = new Set(["12:00", "18:00"]);

type Service = { name: string; meta: string };

export function DemoBooking() {
  const t = useTranslations("Demo");
  const services = t.raw("services") as Service[];

  const [service, setService] = useState<Service | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const reset = () => {
    setService(null);
    setTime(null);
    setDone(false);
  };

  return (
    <div className="mt-10 overflow-hidden rounded-2xl border border-line bg-paper shadow-lg">
      {/* Always-visible sandbox notice. A demo that looks like the real thing
          must say it is not, on the page itself, not only in the heading. */}
      <p className="border-b border-line bg-canvas px-5 py-2.5 text-center font-mono text-xs text-muted">
        {t("sandboxNote")}
      </p>

      <div className="grid md:grid-cols-[2fr_3fr]">
        {/* Identity rail — inline-start, so it sits right in RTL and left in
            LTR without a second layout. */}
        <div className="flex flex-col gap-3 border-b border-line bg-paper p-6 text-ink md:border-b-0 md:border-e">
          <span className="h-1 w-8 rounded-full bg-primary" />
          <span className="font-display text-lg font-bold leading-snug">
            {t("businessName")}
          </span>
          <span className="self-start rounded-full bg-primary-light px-2.5 py-0.5 text-xs font-semibold text-primary">
            {t("businessType")}
          </span>
          <span className="font-mono text-xs text-muted" dir="ltr">
            {t("hours")}
          </span>
        </div>

        <div className="flex flex-col gap-4 p-6">
          {done ? (
            <div className="flex flex-col gap-3">
              <span className="self-start rounded-full bg-primary-light px-3 py-1 text-sm font-semibold text-primary">
                ✓ {t("successTitle")}
              </span>
              <p className="font-mono text-sm text-muted" dir="auto">
                {t("successMeta", {
                  service: service?.name ?? "",
                  time: time ?? "",
                })}
              </p>
              <p className="leading-relaxed text-ink">{t("successBody")}</p>
              <p className="border-s-2 border-line ps-3 text-sm leading-relaxed text-muted">
                {t("paymentNote")}
              </p>
              <button
                type="button"
                onClick={reset}
                className="self-start rounded-full border border-line px-4 py-2 text-sm text-muted transition-colors hover:border-primary hover:text-primary"
              >
                {t("restart")}
              </button>
            </div>
          ) : (
            <>
              <Step num="01" label={t("step1")} />
              <div className="flex flex-col gap-2">
                {services.map((item) => {
                  const active = service?.name === item.name;
                  return (
                    <button
                      key={item.name}
                      type="button"
                      aria-pressed={active}
                      onClick={() => {
                        setService(item);
                        setTime(null);
                      }}
                      className={`flex flex-col items-start gap-0.5 rounded-lg border-2 px-3 py-2 text-start transition-colors ${
                        active
                          ? "border-primary bg-primary-light/40"
                          : "border-line bg-paper hover:border-primary/40"
                      }`}
                    >
                      <span className="text-sm font-semibold text-ink">
                        {item.name}
                      </span>
                      <span className="font-mono text-xs text-muted">
                        {item.meta}
                      </span>
                    </button>
                  );
                })}
              </div>

              {service ? (
                <>
                  <Step num="02" label={t("step2")} />
                  <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
                    {TIMES.map((slot) => {
                      // A taken slot is not rendered as disabled — it is not
                      // rendered at all, which is what the real page does.
                      if (TAKEN.has(slot)) return null;
                      const active = time === slot;
                      return (
                        <button
                          key={slot}
                          type="button"
                          dir="ltr"
                          aria-pressed={active}
                          onClick={() => setTime(slot)}
                          className={`rounded-md border px-2 py-1.5 text-center font-mono text-xs transition-colors ${
                            active
                              ? "border-primary bg-primary font-semibold text-paper"
                              : "border-line bg-paper text-ink hover:border-primary/40"
                          }`}
                        >
                          {slot}
                        </button>
                      );
                    })}
                  </div>
                </>
              ) : null}

              {service && time ? (
                <>
                  <Step num="03" label={t("step3")} />
                  <div className="flex flex-col gap-3">
                    <label className="flex flex-col gap-1.5">
                      <span className="text-xs font-medium text-muted">
                        {t("nameLabel")}
                      </span>
                      <input
                        type="text"
                        placeholder={t("namePlaceholder")}
                        className="rounded-lg border border-line bg-canvas px-3 py-2 text-sm text-ink outline-none transition-colors focus:border-primary"
                      />
                    </label>
                    <label className="flex flex-col gap-1.5">
                      <span className="text-xs font-medium text-muted">
                        {t("phoneLabel")}
                      </span>
                      <input
                        type="tel"
                        dir="ltr"
                        placeholder={t("phonePlaceholder")}
                        className="rounded-lg border border-line bg-canvas px-3 py-2 text-start font-mono text-sm text-ink outline-none transition-colors focus:border-primary"
                      />
                    </label>
                    {/* No validation and no required fields on purpose: the
                        inputs are scenery. Blocking a demo on a phone format
                        would teach the visitor nothing about the product. */}
                    <button
                      type="button"
                      onClick={() => setDone(true)}
                      className="mt-1 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-paper transition-colors hover:bg-primary-hover"
                    >
                      {t("submit")}
                    </button>
                  </div>
                </>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Step({ num, label }: { num: string; label: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="font-mono text-xs font-medium text-saffron" dir="ltr">
        {num}
      </span>
      <span className="text-sm font-semibold text-ink">{label}</span>
    </div>
  );
}
