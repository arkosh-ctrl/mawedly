import { getTranslations, setRequestLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/dashboard/page-header";
import { SettingsForm } from "./settings-form";
import { NotificationSettings } from "@/components/dashboard/notification-settings";
import type { SettingsInput } from "./schema";

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Settings");

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub as string | undefined;

  // Filter by user_id: the public-read RLS policy would otherwise expose other
  // active businesses, breaking .maybeSingle().
  const { data: business } = await supabase
    .from("businesses")
    .select("*")
    .eq("user_id", userId ?? "")
    .maybeSingle();

  // The QR bucket is private — render via a short-lived signed URL only.
  let qrUrl: string | null = null;
  if (business?.bank_qr_path) {
    const { data: signed } = await supabase.storage
      .from("bank-qrs")
      .createSignedUrl(business.bank_qr_path, 600);
    qrUrl = signed?.signedUrl ?? null;
  }

  // License document is likewise private — signed URL only.
  let licenseDocUrl: string | null = null;
  if (business?.license_document_path) {
    const { data: signed } = await supabase.storage
      .from("licenses")
      .createSignedUrl(business.license_document_path, 600);
    licenseDocUrl = signed?.signedUrl ?? null;
  }

  const fallbackLang: "ar" | "en" = locale === "en" ? "en" : "ar";
  const defaultValues: SettingsInput = {
    name: business?.name ?? "",
    tagline: business?.tagline ?? "",
    slug: business?.slug ?? "",
    phone: business?.phone ?? "",
    notification_email: business?.notification_email ?? "",
    default_language:
      (business?.default_language as "ar" | "en" | undefined) ?? fallbackLang,
    work_start: business?.work_start?.slice(0, 5) ?? "09:00",
    work_end: business?.work_end?.slice(0, 5) ?? "21:00",
    bank_name: business?.bank_name ?? "",
    bank_iban: business?.bank_iban ?? "",
    bank_account_name: business?.bank_account_name ?? "",
    license_number: business?.license_number ?? "",
    license_issuer:
      (business?.license_issuer as SettingsInput["license_issuer"]) ?? "",
  };

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <PageHeader eyebrow={t("subtitle")} title={t("title")} />
      <SettingsForm
        defaultValues={defaultValues}
        qrUrl={qrUrl}
        showLicense={business?.requires_license ?? false}
        verificationStatus={business?.verification_status ?? "not_required"}
        licenseDocUrl={licenseDocUrl}
      />
      {business && <NotificationSettings />}
    </main>
  );
}
