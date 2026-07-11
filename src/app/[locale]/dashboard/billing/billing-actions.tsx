"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import type { PlanId } from "@/lib/billing/plans";

// Upgrade buttons (→ Lemon Squeezy hosted checkout) + Customer Portal link.
// Pure client glue over /api/billing/* — no plan logic here.

export function BillingActions({
  currentPlan,
  upgradablePlans,
  hasSubscription,
}: {
  currentPlan: PlanId;
  upgradablePlans: PlanId[];
  hasSubscription: boolean;
}) {
  const t = useTranslations("Billing");
  const [busy, setBusy] = useState<string | null>(null);

  async function startCheckout(plan: PlanId) {
    setBusy(plan);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (res.ok && data.ok && data.url) {
        window.location.href = data.url;
      } else {
        toast.error(t("errors.checkoutFailed"));
      }
    } catch {
      toast.error(t("errors.checkoutFailed"));
    } finally {
      setBusy(null);
    }
  }

  async function openPortal() {
    setBusy("portal");
    try {
      const res = await fetch("/api/billing/portal");
      const data = await res.json();
      if (res.ok && data.ok && data.url) {
        window.open(data.url, "_blank", "noopener,noreferrer");
      } else {
        toast.error(t("errors.portalFailed"));
      }
    } catch {
      toast.error(t("errors.portalFailed"));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {upgradablePlans.length > 0 && (
        <div className="flex flex-col gap-3 rounded-2xl border border-line bg-paper p-5 shadow-sm">
          <h3 className="font-display text-base font-bold text-ink">
            {currentPlan === "free" ? t("choosePlan") : t("changePlan")}
          </h3>
          <div className="flex flex-col gap-2">
            {upgradablePlans.map((plan) => (
              <div
                key={plan}
                className="flex items-center justify-between gap-3 rounded-xl border border-line px-4 py-3"
              >
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-ink">
                    {t(`plans.${plan}.name`)}
                  </span>
                  <span className="text-xs text-muted">
                    {t(`plans.${plan}.summary`)}
                  </span>
                </div>
                <button
                  type="button"
                  disabled={busy !== null}
                  onClick={() => void startCheckout(plan)}
                  className="whitespace-nowrap rounded-full bg-primary px-4 py-2 text-xs font-semibold text-paper transition-colors hover:bg-primary-hover disabled:opacity-50"
                >
                  {busy === plan ? t("redirecting") : t(`plans.${plan}.price`)}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {hasSubscription && (
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => void openPortal()}
          className="self-start rounded-full border border-line px-5 py-2.5 text-sm font-semibold text-ink transition-colors hover:border-muted disabled:opacity-50"
        >
          {busy === "portal" ? t("redirecting") : t("manageSubscription")}
        </button>
      )}
    </div>
  );
}
