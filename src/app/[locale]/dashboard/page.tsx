import { getTranslations, setRequestLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { Link } from "@/i18n/navigation";

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
    .select("id, name")
    .eq("user_id", userId ?? "")
    .maybeSingle();

  return (
    <main className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold tracking-tight">{t("welcomeTitle")}</h1>
      <p className="opacity-80">{t("signedInAs", { email })}</p>

      {business ? (
        <p className="opacity-80">{t("currentBusiness", { name: business.name })}</p>
      ) : (
        <div className="flex flex-col items-start gap-3 rounded-md border border-dashed border-neutral-300 px-4 py-4">
          <p className="text-sm opacity-80">{t("noBusiness")}</p>
          <Link
            href="/dashboard/settings"
            className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white"
          >
            {t("completeSetup")}
          </Link>
        </div>
      )}
    </main>
  );
}
