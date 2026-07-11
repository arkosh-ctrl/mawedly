// The four Mawedly plans — defined in code (single source of truth), the DB
// only stores each business's subscription STATE (businesses.plan + billing
// columns from migration 0020). -1 means unlimited.
//
// Display prices are SAR (marketing); Lemon Squeezy products are created in
// USD (LS is a Merchant of Record and does not settle in SAR) — the variant
// ids come from env, see README-BILLING.md.

export type PlanId = "free" | "pro_49" | "center_99" | "enterprise_299";

export type PlanFeatures = {
  /** Automated emails: booking confirmations, reminders, review requests. */
  emails: boolean;
  /** Virtual (video) consultation services. */
  video: boolean;
  /** Review share cards + social links page + icons on the public page. */
  social: boolean;
  /** Analytics dashboard (KPIs, trend, heatmap). */
  analytics: boolean;
  /** Add-to-calendar buttons + .ics email attachments. */
  calendar: boolean;
  /** Custom branding (logo + accent color) on the public booking page. */
  branding: boolean;
  /** Priority support. */
  prioritySupport: boolean;
};

export type Plan = {
  id: PlanId;
  /** SAR/month, 0 for free. */
  priceSar: number;
  /** Monthly appointment ceiling; -1 = unlimited. */
  appointmentsLimit: number;
  /** Active providers ceiling; -1 = unlimited. */
  providersLimit: number;
  features: PlanFeatures;
  /** Env var name holding the Lemon Squeezy variant id (null for free). */
  lemonVariantEnv: string | null;
};

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: "free",
    priceSar: 0,
    appointmentsLimit: 15,
    providersLimit: 1,
    features: {
      emails: false,
      video: false,
      social: false,
      analytics: false,
      calendar: false,
      branding: false,
      prioritySupport: false,
    },
    lemonVariantEnv: null,
  },
  pro_49: {
    id: "pro_49",
    priceSar: 49,
    appointmentsLimit: 60,
    providersLimit: 1,
    features: {
      emails: true,
      video: true,
      social: true,
      analytics: false,
      calendar: true,
      branding: false,
      prioritySupport: false,
    },
    lemonVariantEnv: "LEMONSQUEEZY_PRO_VARIANT_ID",
  },
  center_99: {
    id: "center_99",
    priceSar: 99,
    appointmentsLimit: 120,
    providersLimit: 5,
    features: {
      emails: true,
      video: true,
      social: true,
      analytics: true,
      calendar: true,
      branding: false,
      prioritySupport: false,
    },
    lemonVariantEnv: "LEMONSQUEEZY_CENTER_VARIANT_ID",
  },
  enterprise_299: {
    id: "enterprise_299",
    priceSar: 299,
    appointmentsLimit: -1,
    providersLimit: -1,
    features: {
      emails: true,
      video: true,
      social: true,
      analytics: true,
      calendar: true,
      branding: true,
      prioritySupport: true,
    },
    lemonVariantEnv: "LEMONSQUEEZY_ENTERPRISE_VARIANT_ID",
  },
};

export const PAID_PLAN_IDS: PlanId[] = ["pro_49", "center_99", "enterprise_299"];

export function isPlanId(value: string): value is PlanId {
  return value in PLANS;
}

/** The effective plan for a business row: unknown/legacy values fall back to
 * free, and a subscription that is expired behaves as free (webhook handling
 * also rewrites the column, this is defense in depth). */
export function effectivePlan(plan: string, subscriptionStatus?: string): Plan {
  if (!isPlanId(plan)) return PLANS.free;
  if (plan !== "free" && subscriptionStatus === "expired") return PLANS.free;
  return PLANS[plan];
}

export function hasFeature(
  plan: string,
  subscriptionStatus: string | undefined,
  feature: keyof PlanFeatures,
): boolean {
  return effectivePlan(plan, subscriptionStatus).features[feature];
}
