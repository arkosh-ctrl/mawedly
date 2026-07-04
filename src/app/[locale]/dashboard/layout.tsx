import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Toaster } from "sonner";
import { createClient } from "@/lib/supabase/server";
import { Link } from "@/i18n/navigation";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { SidebarNav } from "@/components/dashboard/sidebar-nav";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { SignOutButton } from "./sign-out-button";

// Protected shell. Middleware already guards /dashboard, but we re-check on the
// server as defense in depth and to read the session for the UI.
//
// Layout: a Calendly-style two-surface split. The sidebar (paper) is the first
// flex child, so logical properties place it inline-start — right in RTL, left
// in LTR — while the content area stays on canvas. On <lg the sidebar folds
// into a compact top bar with a horizontal tab strip.
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

  // Business id drives the notification bell's Realtime subscription. Null until
  // the merchant creates their business in settings — the bell is hidden then.
  const userId = data.claims.sub as string | undefined;
  const { data: business } = await supabase
    .from("businesses")
    .select("id")
    .eq("user_id", userId ?? "")
    .maybeSingle();

  const t = await getTranslations("Dashboard");
  const dir = locale === "ar" ? "rtl" : "ltr";

  return (
    <div className="flex min-h-screen bg-canvas text-ink">
      {/* Desktop sidebar — raised paper surface against the canvas content. */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-e border-line bg-paper lg:flex">
        <div className="flex items-center justify-between gap-2 px-6 pb-5 pt-6">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-saffron" aria-hidden />
            <Link
              href="/dashboard"
              className="font-display text-lg font-extrabold tracking-tight text-ink"
            >
              {t("brand")}
            </Link>
          </div>
          {business && <NotificationBell businessId={business.id} />}
        </div>
        <SidebarNav orientation="vertical" />
        <div className="mt-auto flex flex-col items-start gap-3 border-t border-line px-5 py-4">
          <LocaleSwitcher />
          <SignOutButton />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar: brand row + horizontal tab strip. */}
        <header className="sticky top-0 z-30 border-b border-line bg-paper/90 backdrop-blur lg:hidden">
          <div className="flex items-center justify-between gap-3 px-4 pt-3">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-saffron" aria-hidden />
              <Link
                href="/dashboard"
                className="font-display text-lg font-extrabold tracking-tight text-ink"
              >
                {t("brand")}
              </Link>
            </div>
            <div className="flex items-center gap-2">
              {business && <NotificationBell businessId={business.id} />}
              <LocaleSwitcher />
              <SignOutButton />
            </div>
          </div>
          <SidebarNav orientation="horizontal" />
        </header>

        <div className="mx-auto w-full max-w-4xl px-5 py-8 sm:px-8 lg:py-12">
          {children}
        </div>
      </div>

      <Toaster dir={dir} richColors position="top-center" />
    </div>
  );
}
