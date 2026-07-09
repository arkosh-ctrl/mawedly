import { setRequestLocale } from "next-intl/server";
import { requireAdmin } from "@/lib/admin/guard";
import { getAuditLog } from "@/lib/admin/queries";

export const dynamic = "force-dynamic";

const ACTION_LABEL: Record<string, string> = {
  activate_business: "تفعيل نشاط",
  suspend_business: "تعليق نشاط",
};

function fmt(iso: string) {
  return `${iso.slice(0, 10)} ${iso.slice(11, 16)}`;
}

export default async function AdminAuditPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireAdmin(locale);
  const entries = await getAuditLog(100);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <span className="eyebrow">المساءلة</span>
        <h1 className="mt-2 font-display text-2xl font-extrabold tracking-tight">
          سجل التدقيق
        </h1>
        <p className="mt-1 text-sm text-muted">
          كل أفعال الإدارة (تفعيل/تعليق) مسجّلة باسم المشرف ووقتها.
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-line bg-paper">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="border-b border-line bg-canvas text-xs font-semibold text-muted">
              <tr>
                <th className="p-3 text-start">الإجراء</th>
                <th className="p-3 text-start">النشاط المستهدف</th>
                <th className="p-3 text-start">المشرف</th>
                <th className="p-3 text-start">الوقت</th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-muted">
                    لا إجراءات مسجّلة بعد.
                  </td>
                </tr>
              ) : (
                entries.map((e) => (
                  <tr key={e.id} className="border-t border-line hover:bg-canvas/60">
                    <td className="p-3 font-semibold text-ink">
                      {ACTION_LABEL[e.action] ?? e.action}
                    </td>
                    <td className="p-3 text-muted">{e.business_name ?? "—"}</td>
                    <td className="p-3 font-mono text-xs text-muted" dir="ltr">
                      {e.admin_email ?? e.admin_user_id.slice(0, 8)}
                    </td>
                    <td className="p-3 font-mono text-xs text-muted" dir="ltr">
                      {fmt(e.created_at)}
                    </td>
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
