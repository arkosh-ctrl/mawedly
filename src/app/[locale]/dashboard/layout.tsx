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
    <div className="min-h-screen bg-canvas text-ink">
      <header className="sticky top-0 z-30 border-b border-line bg-canvas/85 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-6 py-3.5">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
            <Link
              href="/dashboard"
              className="font-display text-lg font-extrabold tracking-tight text-ink"
            >
              {t("brand")}
            </Link>
            <Link
              href="/dashboard/appointments"
              className="text-sm text-muted transition-colors hover:text-ink"
            >
              {t("appointmentsNav")}
            </Link>
            <Link
              href="/dashboard/services"
              className="text-sm text-muted transition-colors hover:text-ink"
            >
              {t("servicesNav")}
            </Link>
            <Link
              href="/dashboard/providers"
              className="text-sm text-muted transition-colors hover:text-ink"
            >
              {t("providersNav")}
            </Link>
            <Link
              href="/dashboard/reviews"
              className="text-sm text-muted transition-colors hover:text-ink"
            >
              {t("reviewsNav")}
            </Link>
            <Link
              href="/dashboard/settings"
              className="text-sm text-muted transition-colors hover:text-ink"
            >
              {t("settingsNav")}
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <LocaleSwitcher />
            <SignOutButton />
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-5xl px-6 py-10">{children}</div>
      <Toaster dir={dir} richColors position="top-center" />
    </div>
  );
}
