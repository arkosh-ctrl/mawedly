import { setRequestLocale } from "next-intl/server";
import { requireAdmin } from "@/lib/admin/guard";
import { getPlatformBusinesses } from "@/lib/admin/queries";
import { BusinessToggle } from "@/components/admin/business-toggle";

export const dynamic = "force-dynamic";

export default async function AdminBusinessesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requireAdmin(locale);
  const canManage = session.role === "admin";
  const businesses = await getPlatformBusinesses();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <span className="eyebrow">الأنشطة المشتركة</span>
        <h1 className="mt-2 font-display text-2xl font-extrabold tracking-tight">
          الأنشطة ({businesses.length})
        </h1>
      </div>

      <div className="overflow-hidden rounded-2xl border border-line bg-paper">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="border-b border-line bg-canvas text-xs font-semibold text-muted">
              <tr>
                <th className="p-3 text-start">النشاط</th>
                <th className="p-3 text-start">الرابط</th>
                <th className="p-3 text-start">النوع</th>
                <th className="p-3 text-start">الخطة</th>
                <th className="p-3 text-start">الحالة</th>
                <th className="p-3 text-start">أُنشئ</th>
                {canManage && <th className="p-3 text-start">إجراء</th>}
              </tr>
            </thead>
            <tbody>
              {businesses.length === 0 ? (
                <tr>
                  <td colSpan={canManage ? 7 : 6} className="p-8 text-center text-muted">
                    لا أنشطة بعد.
                  </td>
                </tr>
              ) : (
                businesses.map((b) => (
                  <tr key={b.id} className="border-t border-line hover:bg-canvas/60">
                    <td className="p-3 font-semibold text-ink">{b.name}</td>
                    <td className="p-3 font-mono text-xs text-muted" dir="ltr">
                      {b.slug}
                    </td>
                    <td className="p-3 text-muted">{b.type}</td>
                    <td className="p-3 text-muted">{b.plan}</td>
                    <td className="p-3">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          b.is_active
                            ? "bg-success-light text-success"
                            : "bg-brick/10 text-brick"
                        }`}
                      >
                        {b.is_active ? "نشط" : "معطّل"}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-xs text-muted" dir="ltr">
                      {b.created_at?.slice(0, 10) ?? "—"}
                    </td>
                    {canManage && (
                      <td className="p-3">
                        <BusinessToggle id={b.id} isActive={b.is_active} />
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
