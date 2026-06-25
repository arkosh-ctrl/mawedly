import { getTranslations, setRequestLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { Link } from "@/i18n/navigation";
import { ServicesManager } from "./services-manager";

export default async function ServicesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Services");

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub as string | undefined;

  const { data: business } = await supabase
    .from("businesses")
    .select("id")
    .eq("user_id", userId ?? "")
    .maybeSingle();

  if (!business) {
    return (
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-4">
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <div className="flex flex-col items-start gap-3 rounded-md border border-dashed border-neutral-300 px-4 py-4">
          <p className="text-sm opacity-80">{t("noBusiness")}</p>
          <Link
            href="/dashboard/settings"
            className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white"
          >
            {t("goToSettings")}
          </Link>
        </div>
      </main>
    );
  }

  // Merchant dashboard shows ALL services (active + archived) for their business
  // — not filtered by is_active (that filter is only for the public page).
  const { data: services } = await supabase
    .from("services")
    .select("*")
    .eq("business_id", business.id)
    .order("created_at", { ascending: true });

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-sm opacity-70">{t("subtitle")}</p>
      </div>
      <ServicesManager services={services ?? []} />
    </main>
  );
}
