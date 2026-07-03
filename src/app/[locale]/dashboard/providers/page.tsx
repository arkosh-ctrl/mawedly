import { getTranslations, setRequestLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { Link } from "@/i18n/navigation";
import { PageHeader } from "@/components/dashboard/page-header";
import { ProvidersManager } from "./providers-manager";

export default async function ProvidersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Providers");

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
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink">
          {t("title")}
        </h1>
        <div className="flex flex-col items-start gap-3 rounded-2xl border border-dashed border-line bg-paper px-5 py-5">
          <p className="text-sm text-muted">{t("noBusiness")}</p>
          <Link
            href="/dashboard/settings"
            className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-paper transition-colors hover:bg-pine"
          >
            {t("goToSettings")}
          </Link>
        </div>
      </main>
    );
  }

  // Dashboard shows ALL providers (active + archived); is_active filtering is
  // only for the public page.
  const { data: providers } = await supabase
    .from("providers")
    .select("*")
    .eq("business_id", business.id)
    .order("created_at", { ascending: true });

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <PageHeader eyebrow={t("subtitle")} title={t("title")} />
      <ProvidersManager providers={providers ?? []} />
    </main>
  );
}
