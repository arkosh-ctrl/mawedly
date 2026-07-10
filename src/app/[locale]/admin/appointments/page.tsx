import { setRequestLocale } from "next-intl/server";
import { requireAdmin } from "@/lib/admin/guard";
import { getRecentAppointments } from "@/lib/admin/queries";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  pending_verification: "بانتظار",
  confirmed: "مؤكد",
  completed: "مكتمل",
  no_show: "لم يحضر",
  canceled: "ملغى",
};

const STATUS_CLASS: Record<string, string> = {
  pending_verification: "bg-warning-light text-warning",
  confirmed: "bg-success-light text-success",
  completed: "bg-primary-light text-primary",
  no_show: "bg-canvas text-muted",
  canceled: "bg-brick/10 text-brick",
};

export default async function AdminAppointmentsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireAdmin(locale);
  const rows = await getRecentAppointments(50);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <span className="eyebrow">أحدث النشاط</span>
        <h1 className="mt-2 font-display text-2xl font-extrabold tracking-tight">
          المواعيد عبر المنصة
        </h1>
      </div>

      <div className="overflow-hidden rounded-2xl border border-line bg-paper">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-sm">
            <thead className="border-b border-line bg-canvas text-xs font-semibold text-muted">
              <tr>
                <th className="p-3 text-start">النشاط</th>
                <th className="p-3 text-start">الخدمة</th>
                <th className="p-3 text-start">التاريخ</th>
                <th className="p-3 text-start">الوقت</th>
                <th className="p-3 text-start">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-muted">
                    لا مواعيد بعد.
                  </td>
                </tr>
              ) : (
                rows.map((a) => (
                  <tr key={a.id} className="border-t border-line hover:bg-canvas/60">
                    <td className="p-3 font-semibold text-ink">
                      {a.businesses?.name ?? "—"}
                    </td>
                    <td className="p-3 text-muted">{a.services?.name ?? "—"}</td>
                    <td className="p-3 font-mono text-xs text-muted" dir="ltr">
                      {a.appointment_date}
                    </td>
                    <td className="p-3 font-mono text-xs text-muted" dir="ltr">
                      {a.start_time.slice(0, 5)}
                    </td>
                    <td className="p-3">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          STATUS_CLASS[a.status] ?? "bg-canvas text-muted"
                        }`}
                      >
                        {STATUS_LABEL[a.status] ?? a.status}
                      </span>
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
