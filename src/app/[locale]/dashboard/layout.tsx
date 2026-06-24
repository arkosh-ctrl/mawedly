import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Toaster } from "sonner";
import { createClient } from "@/lib/supabase/server";
import { Link } from "@/i18n/navigation";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { SignOutButton } from "./sign-out-button";

// Protected shell. Middleware already guards /dashboard, but we re-check on the
// server as defense in depth and to read the session for the UI.
export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) {
    redirect(`/${locale}/login`);
  }

  const t = await getTranslations("Dashboard");
  const dir = locale === "ar" ? "rtl" : "ltr";

  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between border-b border-neutral-200 px-6 py-4">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="font-semibold">
            {t("brand")}
          </Link>
          <Link href="/dashboard/settings" className="text-sm opacity-70 hover:opacity-100">
            {t("settingsNav")}
          </Link>
        </div>
        <div className="flex items-center gap-3">
          <LocaleSwitcher />
          <SignOutButton />
        </div>
      </header>
      <div className="px-6 py-8">{children}</div>
      <Toaster dir={dir} richColors position="top-center" />
    </div>
  );
}
