import { setRequestLocale } from "next-intl/server";
import { requireAdmin } from "@/lib/admin/guard";
import { getPlatformOverview } from "@/lib/admin/queries";
import { StatCard } from "@/components/admin/stat-card";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  pending_verification: "بانتظار",
  confirmed: "مؤكد",
  completed: "مكتمل",
  no_show: "لم يحضر",
  canceled: "ملغى",
};

export default async function AdminOverviewPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requireAdmin(locale);
  const o = await getPlatformOverview(session.role);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <span className="eyebrow">لوحة المنصة</span>
        <h1 className="mt-2 font-display text-2xl font-extrabold tracking-tight">
          نظرة عامة
        </h1>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="الأنشطة"
          value={String(o.businessesTotal)}
          hint={`${o.businessesActive} نشط`}
          accent="pine"
        />
        <StatCard
          label="الحجوزات (الكل)"
          value={String(o.appointmentsTotal)}
          accent="ink"
        />
        <StatCard label="العملاء" value={String(o.customersTotal)} accent="ink" />
        <StatCard
          label="الإيراد (مكتمل)"
          value={o.revenueTotal !== null ? `${Math.round(o.revenueTotal)} ر.س` : "🔒 محجوب"}
          hint={o.revenueTotal === null ? "متاح للمدير فقط" : undefined}
          accent="saffron"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="حجوزات اليوم" value={String(o.bookingsToday)} accent="pine" />
        <StatCard
          label="حجوزات الأسبوع"
          value={String(o.bookingsThisWeek)}
          accent="pine"
        />
        <StatCard
          label="حجوزات الشهر"
          value={String(o.bookingsThisMonth)}
          accent="pine"
        />
      </div>

      <section className="rounded-2xl border border-line bg-paper p-5">
        <h2 className="mb-3 font-display text-base font-bold text-ink">
          توزيع الحجوزات حسب الحالة
        </h2>
        <div className="flex flex-wrap gap-2">
          {Object.entries(o.byStatus).length === 0 ? (
            <p className="text-sm text-muted">لا حجوزات بعد.</p>
          ) : (
            Object.entries(o.byStatus).map(([status, count]) => (
              <span
                key={status}
                className="inline-flex items-center gap-2 rounded-full border border-line bg-canvas px-3 py-1.5 text-sm"
              >
                {STATUS_LABEL[status] ?? status}
                <span className="rounded-full bg-ink px-2 text-xs text-paper">
                  {count}
                </span>
              </span>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
