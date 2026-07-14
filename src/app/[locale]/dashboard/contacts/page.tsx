import { getTranslations, setRequestLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/dashboard/page-header";
import { Link } from "@/i18n/navigation";
import { resolveBusinessId, listContacts } from "@/lib/contacts/queries";
import { ContactsClient } from "@/components/dashboard/contacts/contacts-client";

export const dynamic = "force-dynamic";

export default async function ContactsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Contacts");

  const supabase = await createClient();
  const businessId = await resolveBusinessId(supabase);

  if (!businessId) {
    return (
      <main className="flex flex-col gap-6">
        <PageHeader eyebrow={t("eyebrow")} title={t("title")} />
        <div className="flex flex-col items-start gap-3 rounded-2xl border border-dashed border-line bg-paper px-5 py-5">
          <p className="text-sm text-muted">{t("noBusiness")}</p>
          <Link
            href="/dashboard/settings"
            className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-paper transition-colors hover:bg-primary-hover"
          >
            {t("completeSetup")}
          </Link>
        </div>
      </main>
    );
  }

  const [{ data: business }, initialContacts] = await Promise.all([
    supabase.from("businesses").select("name, slug, phone").eq("id", businessId).maybeSingle(),
    listContacts(supabase, businessId),
  ]);

  return (
    <main className="flex flex-col gap-6">
      <PageHeader eyebrow={t("eyebrow")} title={t("title")} subline={t("subtitle")} />
      <ContactsClient
        initialContacts={initialContacts}
        businessName={business?.name ?? ""}
      />
    </main>
  );
}
