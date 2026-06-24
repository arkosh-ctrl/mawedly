import { getTranslations, setRequestLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { SettingsForm } from "./settings-form";
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

  const fallbackLang: "ar" | "en" = locale === "en" ? "en" : "ar";
  const defaultValues: SettingsInput = {
    name: business?.name ?? "",
    slug: business?.slug ?? "",
    phone: business?.phone ?? "",
    notification_email: business?.notification_email ?? "",
    default_language:
      (business?.default_language as "ar" | "en" | undefined) ?? fallbackLang,
    bank_name: business?.bank_name ?? "",
    bank_iban: business?.bank_iban ?? "",
    bank_account_name: business?.bank_account_name ?? "",
  };

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-sm opacity-70">{t("subtitle")}</p>
      </div>
      <SettingsForm defaultValues={defaultValues} qrUrl={qrUrl} />
    </main>
  );
}
