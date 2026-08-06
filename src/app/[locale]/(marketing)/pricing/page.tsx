import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo/metadata";
import {
  SITE_URL,
  breadcrumbSchema,
  organizationSchema,
  seoLocale,
} from "@/lib/seo/site";
import { JsonLd } from "@/components/json-ld";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { PLANS, type PlanId } from "@/lib/billing/plans";

// /pricing — the four plans + a full feature-comparison table. Pure
// presentation over the same PLANS config that enforces the limits, so the
// page can never drift from what the product actually does.

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Pricing" });
  return pageMetadata({
    locale: seoLocale(locale),
    path: "/pricing",
    title: t("metaTitle"),
    description: t("metaDescription"),
  });
}

const PLAN_ORDER: PlanId[] = ["free", "pro_49", "center_99", "enterprise_299"];

// Comparison rows: label key + a value per plan (true/false or a text value).
type FeatureRow = {
  key: string;
  values: Record<PlanId, boolean | string>;
};

function buildRows(): FeatureRow[] {
  const limitText = (n: number) => (n === -1 ? "unlimited" : String(n));
  return [
    {
      key: "appointments",
      values: {
        free: limitText(PLANS.free.appointmentsLimit),
        pro_49: limitText(PLANS.pro_49.appointmentsLimit),
        center_99: limitText(PLANS.center_99.appointmentsLimit),
        enterprise_299: limitText(PLANS.enterprise_299.appointmentsLimit),
      },
    },
    {
      key: "providers",
      values: {
        free: limitText(PLANS.free.providersLimit),
        pro_49: limitText(PLANS.pro_49.providersLimit),
        center_99: limitText(PLANS.center_99.providersLimit),
        enterprise_299: limitText(PLANS.enterprise_299.providersLimit),
      },
    },
    { key: "bookingLink", values: allPlans(true) },
    { key: "deposit", values: allPlans(true) },
    { key: "whatsapp", values: allPlans(true) },
    { key: "bilingual", values: allPlans(true) },
    { key: "inAppNotifications", values: allPlans(true) },
    { key: "emails", values: featureCol("emails") },
    { key: "calendar", values: featureCol("calendar") },
    { key: "video", values: featureCol("video") },
    { key: "social", values: featureCol("social") },
    { key: "analytics", values: featureCol("analytics") },
    { key: "branding", values: featureCol("branding") },
    { key: "prioritySupport", values: featureCol("prioritySupport") },
  ];
}

function allPlans(v: boolean): Record<PlanId, boolean> {
  return { free: v, pro_49: v, center_99: v, enterprise_299: v };
}

function featureCol(
  f: keyof (typeof PLANS)["free"]["features"],
): Record<PlanId, boolean> {
  return {
    free: PLANS.free.features[f],
    pro_49: PLANS.pro_49.features[f],
    center_99: PLANS.center_99.features[f],
    enterprise_299: PLANS.enterprise_299.features[f],
  };
}

export default async function PricingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const loc = seoLocale(locale);
  const t = await getTranslations("Pricing");
  const tNav = await getTranslations("Nav");
  const rows = buildRows();

  return (
    <div className="mx-auto max-w-6xl px-5 py-16 sm:py-20">
      {/* The SoftwareApplication with its Offers lives on the home page, which
          is the anchor for the product entity. Repeating it here would put two
          nodes with the same @id in the index for no gain — this page just needs
          a readable breadcrumb trail and the publisher. */}
      <JsonLd
        nodes={[
          breadcrumbSchema([
            { name: tNav("home"), url: `${SITE_URL}/${loc}` },
            { name: tNav("pricing"), url: `${SITE_URL}/${loc}/pricing` },
          ]),
          organizationSchema(loc),
        ]}
      />

      <div className="flex flex-col items-center gap-3 text-center">
        <span className="eyebrow">{t("eyebrow")}</span>
        <h1 className="font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
          {t("title")}
        </h1>
        <p className="max-w-2xl leading-[1.6] text-muted">{t("subtitle")}</p>
      </div>

      {/* Plan cards */}
      <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {PLAN_ORDER.map((id) => {
          const isPro = id === "pro_49";
          const isEnterprise = id === "enterprise_299";
          return (
            <div
              key={id}
              className={`relative flex flex-col gap-4 rounded-2xl p-6 shadow-sm transition-shadow hover:shadow-md ${
                isEnterprise
                  ? "bg-ink text-paper"
                  : isPro
                    ? "border-2 border-primary bg-paper"
                    : "border border-line bg-paper"
              }`}
            >
              {isPro && (
                <span className="absolute -top-3 start-6 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-paper">
                  {t("mostPopular")}
                </span>
              )}
              <div className="flex flex-col gap-1">
                <h2
                  className={`font-display text-lg font-bold ${isEnterprise ? "text-paper" : "text-ink"}`}
                >
                  {t(`plans.${id}.name`)}
                </h2>
                <p
                  className={`text-xs leading-relaxed ${isEnterprise ? "text-sage" : "text-muted"}`}
                >
                  {t(`plans.${id}.tagline`)}
                </p>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span
                  className={`font-mono text-3xl font-bold ${isEnterprise ? "text-paper" : "text-ink"}`}
                >
                  {PLANS[id].priceSar === 0 ? t("freePrice") : PLANS[id].priceSar}
                </span>
                {PLANS[id].priceSar > 0 && (
                  <span
                    className={`text-xs ${isEnterprise ? "text-sage" : "text-muted"}`}
                  >
                    {t("perMonth")}
                  </span>
                )}
              </div>
              <ul
                className={`flex flex-1 flex-col gap-2 text-sm ${isEnterprise ? "text-sage" : "text-muted"}`}
              >
                {[1, 2, 3, 4, 5].map((i) => (
                  <li key={i} className="flex items-start gap-2">
                    <CheckIcon primary={!isEnterprise} />
                    {t(`plans.${id}.f${i}`)}
                  </li>
                ))}
              </ul>
              <Link
                href={id === "free" ? "/signup" : "/dashboard/billing"}
                className={`rounded-full px-5 py-2.5 text-center text-sm font-semibold transition-colors ${
                  isEnterprise || isPro
                    ? "bg-primary text-paper hover:bg-primary-hover"
                    : "border border-line text-ink hover:border-muted"
                }`}
              >
                {id === "free" ? t("startFree") : t("subscribe")}
              </Link>
            </div>
          );
        })}
      </div>

      {/* Feature comparison */}
      <div className="mt-16">
        <h2 className="mb-6 text-center font-display text-2xl font-bold tracking-tight text-ink">
          {t("compareTitle")}
        </h2>
        <div className="overflow-x-auto rounded-2xl border border-line bg-paper shadow-sm">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-line bg-canvas text-xs font-semibold text-muted">
                <th className="p-3 text-start">{t("featureColumn")}</th>
                {PLAN_ORDER.map((id) => (
                  <th key={id} className="p-3 text-center">
                    {t(`plans.${id}.name`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.key} className="border-b border-line last:border-0">
                  <td className="p-3 text-start font-medium text-ink">
                    {t(`features.${row.key}`)}
                  </td>
                  {PLAN_ORDER.map((id) => {
                    const v = row.values[id];
                    return (
                      <td key={id} className="p-3 text-center">
                        {typeof v === "string" ? (
                          <span className="font-mono text-xs text-ink">
                            {v === "unlimited" ? t("unlimited") : v}
                          </span>
                        ) : v ? (
                          <span className="inline-flex justify-center text-success">
                            <CheckIcon />
                          </span>
                        ) : (
                          <span className="text-line">—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-6 flex flex-col gap-1.5 text-center text-xs leading-relaxed text-muted">
          <p>{t("reviewsNote")}</p>
          <p>{t("analyticsNote")}</p>
          <p>{t("paymentNote")}</p>
        </div>
      </div>
    </div>
  );
}

function CheckIcon({ primary = false }: { primary?: boolean }) {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={`mt-0.5 shrink-0 ${primary ? "text-primary" : ""}`}
    >
      <path d="M5 12.5l4.5 4.5L19 7" />
    </svg>
  );
}
