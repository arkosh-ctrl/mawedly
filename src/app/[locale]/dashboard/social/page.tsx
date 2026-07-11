import { getTranslations, setRequestLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { hasFeature } from "@/lib/billing/plans";
import { PageHeader } from "@/components/dashboard/page-header";
import { UpgradeCard } from "@/components/dashboard/upgrade-card";
import { SocialLinksForm } from "./social-links-form";

// /dashboard/social — the merchant's public social profiles. Saved links show
// up as icons on the public booking page, and this is also where future
// social features (auto-posting via OAuth, V2) would live.

export default async function SocialPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Social");

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub as string | undefined;

  const { data: business } = await supabase
    .from("businesses")
    .select("id, plan, subscription_status")
    .eq("user_id", userId ?? "")
    .maybeSingle();

  // Plan gate: the whole social toolkit is a paid-plan feature.
  if (
    business &&
    !hasFeature(business.plan, business.subscription_status, "social")
  ) {
    return (
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <PageHeader eyebrow={t("subtitle")} title={t("title")} />
        <UpgradeCard
          featureTitle={t("locked.title")}
          featureBody={t("locked.body")}
        />
      </main>
    );
  }

  let links: Record<string, string> = {};
  if (business) {
    const { data } = await supabase
      .from("business_social_links")
      .select("platform, url")
      .eq("business_id", business.id);
    links = Object.fromEntries((data ?? []).map((l) => [l.platform, l.url]));
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <PageHeader eyebrow={t("subtitle")} title={t("title")} />

      {!business ? (
        <p className="rounded-2xl border border-dashed border-line bg-paper px-5 py-8 text-center text-sm text-muted">
          {t("noBusiness")}
        </p>
      ) : (
        <>
          <p className="text-sm leading-relaxed text-muted">{t("hint")}</p>
          <SocialLinksForm initialLinks={links} />
        </>
      )}
    </main>
  );
}
