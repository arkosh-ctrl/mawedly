import { getTranslations, setRequestLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { Link } from "@/i18n/navigation";
import { ShareCard } from "@/components/dashboard/share-card";

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Dashboard");

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const email = (claimsData?.claims?.email as string | undefined) ?? "";
  const userId = claimsData?.claims?.sub as string | undefined;

  const { data: business } = await supabase
    .from("businesses")
    .select("id, name, slug")
    .eq("user_id", userId ?? "")
    .maybeSingle();

  return (
    <main className="flex flex-col gap-4">
      <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink">
        {t("welcomeTitle")}
      </h1>
      <p className="font-mono text-sm text-muted" dir="ltr">
        {t("signedInAs", { email })}
      </p>

      {business ? (
        <>
          <p className="text-pine">
            {t("currentBusiness", { name: business.name })}
          </p>
          <ShareCard
            slug={business.slug}
            businessName={business.name}
            locale={locale}
          />
        </>
      ) : (
        <div className="flex flex-col items-start gap-3 rounded-2xl border border-dashed border-line bg-paper px-5 py-5">
          <p className="text-sm text-muted">{t("noBusiness")}</p>
          <Link
            href="/dashboard/settings"
            className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-paper transition-colors hover:bg-pine"
          >
            {t("completeSetup")}
          </Link>
        </div>
      )}
    </main>
  );
}
