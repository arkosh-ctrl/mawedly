import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { requireAdmin } from "@/lib/admin/guard";
import { AdminNav } from "@/components/admin/admin-nav";

// Platform admin shell. requireAdmin() redirects non-admins to /dashboard, so
// everything below this layout is admin-only. Arabic-only (internal tool).
export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requireAdmin(locale);

  return (
    <div dir="rtl" className="min-h-screen bg-canvas text-ink">
      <header className="sticky top-0 z-30 border-b border-line bg-paper/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-5 py-4 sm:px-8">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-saffron" aria-hidden />
              <span className="font-display text-lg font-extrabold tracking-tight">
                موعدلي · الإدارة
              </span>
              <span className="rounded-full border border-line px-2 py-0.5 text-[11px] text-muted">
                {session.role === "admin" ? "مدير النظام" : "موظف (قراءة)"}
              </span>
            </div>
            <Link
              href="/dashboard"
              className="rounded-full border border-line px-3 py-1.5 text-xs text-ink transition-colors hover:border-ink"
            >
              لوحة التاجر ←
            </Link>
          </div>
          <AdminNav />
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-8 sm:px-8">{children}</main>
    </div>
  );
}
