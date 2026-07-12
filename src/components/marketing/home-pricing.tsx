import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { PLANS, type PlanId } from "@/lib/billing/plans";

const ORDER: PlanId[] = ["free", "pro_49", "center_99", "enterprise_299"];
const POPULAR: PlanId = "center_99";

function Check() {
  return (
    <svg
      className="mt-0.5 size-4 shrink-0 text-primary"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="m5 12.5 5 5 9-11" />
    </svg>
  );
}

/**
 * Compact pricing section for the landing page — the four plans as summary
 * cards over the SAME PLANS config + Pricing translations used by /pricing and
 * the billing enforcement, so nothing can drift. Full comparison lives at
 * /pricing (linked below).
 */
export async function HomePricing() {
  const t = await getTranslations("Pricing");

  return (
    <section className="mx-auto max-w-6xl px-5 pb-24">
      <div className="flex flex-col items-center text-center">
        <span className="eyebrow">{t("eyebrow")}</span>
        <h2 className="mt-4 font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
          {t("title")}
        </h2>
        <p className="mt-3 max-w-2xl leading-[1.6] text-muted">{t("subtitle")}</p>
      </div>

      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {ORDER.map((id) => {
          const popular = id === POPULAR;
          const price = PLANS[id].priceSar;
          const isFree = id === "free";
          return (
            <div
              key={id}
              className={`relative flex flex-col gap-4 rounded-2xl border bg-paper p-6 shadow-sm transition-shadow hover:shadow-md ${
                popular ? "border-primary ring-1 ring-primary" : "border-line"
              }`}
            >
              {popular && (
                <span className="absolute -top-3 inset-x-0 mx-auto w-fit rounded-full bg-primary px-3 py-1 text-[11px] font-bold text-paper">
                  {t("mostPopular")}
                </span>
              )}

              <div>
                <h3 className="font-display text-lg font-bold text-ink">
                  {t(`plans.${id}.name`)}
                </h3>
                <p className="mt-1 text-xs text-muted">{t(`plans.${id}.tagline`)}</p>
              </div>

              <div className="flex items-end gap-1">
                <span className="font-display text-3xl font-extrabold text-ink" dir="ltr">
                  {isFree ? t("freePrice") : price}
                </span>
                {!isFree && (
                  <span className="pb-1 text-xs text-muted">{t("perMonth")}</span>
                )}
              </div>

              <ul className="flex flex-col gap-2 border-t border-line pt-4">
                {(["f1", "f2", "f3", "f4", "f5"] as const).map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-ink">
                    <Check />
                    <span className="leading-snug">{t(`plans.${id}.${f}`)}</span>
                  </li>
                ))}
              </ul>

              <Link
                href={isFree ? "/signup" : "/pricing"}
                className={`mt-auto rounded-full px-4 py-2.5 text-center text-sm font-semibold transition-colors ${
                  popular
                    ? "bg-primary text-paper hover:bg-primary-hover"
                    : "border border-line text-ink hover:border-muted"
                }`}
              >
                {isFree ? t("startFree") : t("subscribe")}
              </Link>
            </div>
          );
        })}
      </div>

      <div className="mt-8 text-center">
        <Link
          href="/pricing"
          className="text-sm font-semibold text-primary transition-colors hover:text-primary-hover"
        >
          {t("compareTitle")} ←
        </Link>
      </div>
    </section>
  );
}
