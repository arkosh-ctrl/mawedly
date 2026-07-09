import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { requireAdmin } from "@/lib/admin/guard";
import { getSubscribers, type SubscriberStatus } from "@/lib/admin/queries";
import { SubscriberContact } from "@/components/admin/subscriber-contact";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<SubscriberStatus, string> = {
  active: "نشط",
  trial: "تجربة",
  trial_expired: "منتهية التجربة",
  suspended: "معلّق",
};

const STATUS_CLASS: Record<SubscriberStatus, string> = {
  active: "bg-pine/10 text-pine",
  trial: "bg-saffron/15 text-pine",
  trial_expired: "bg-brick/10 text-brick",
  suspended: "bg-brick/10 text-brick",
};

const FILTERS = [
  { key: "all", label: "الكل" },
  { key: "trial_ending", label: "تجربة تنتهي قريباً" },
  { key: "expired", label: "منتهية التجربة" },
  { key: "suspended", label: "معلّق" },
];

function fmt(iso: string | null) {
  return iso ? iso.slice(0, 10) : "—";
}

export default async function AdminContactsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ f?: string }>;
}) {
  const { locale } = await params;
  const { f } = await searchParams;
  setRequestLocale(locale);
  const session = await requireAdmin(locale);

  // Contact info is admin-only (PDPL: viewers don't see PII).
  if (session.role !== "admin") {
    return (
      <div className="rounded-2xl border border-dashed border-line bg-paper px-5 py-10 text-center text-sm text-muted">
        جهات اتصال المشتركين متاحة لمدير النظام فقط.
      </div>
    );
  }

  const filter = f ?? "all";
  const all = await getSubscribers();
  const soon = Date.now() + 5 * 86_400_000;

  const rows = all.filter((s) => {
    if (filter === "suspended") return s.status === "suspended";
    if (filter === "expired") return s.status === "trial_expired";
    if (filter === "trial_ending")
      return (
        s.status === "trial" &&
        s.trialEndsAt !== null &&
        new Date(s.trialEndsAt).getTime() <= soon
      );
    return true;
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <span className="eyebrow">المشتركون</span>
        <h1 className="mt-2 font-display text-2xl font-extrabold tracking-tight">
          جهات اتصال المشتركين
        </h1>
        <p className="mt-1 text-sm text-muted">
          للتواصل الترويجي وتجديد الاشتراك. استهدف المعلّقين والتجارب المنتهية.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((ff) => (
          <Link
            key={ff.key}
            href={`/admin/contacts?f=${ff.key}`}
            className={`rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
              filter === ff.key
                ? "border-ink bg-ink text-paper"
                : "border-line text-muted hover:border-ink hover:text-ink"
            }`}
          >
            {ff.label}
          </Link>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-line bg-paper">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="border-b border-line bg-canvas text-xs font-semibold text-muted">
              <tr>
                <th className="p-3 text-start">النشاط</th>
                <th className="p-3 text-start">الجوال</th>
                <th className="p-3 text-start">الإيميل</th>
                <th className="p-3 text-start">الحالة</th>
                <th className="p-3 text-start">الحجوزات</th>
                <th className="p-3 text-start">آخر نشاط</th>
                <th className="p-3 text-start">تواصل</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted">
                    لا مشتركين ضمن هذا التصنيف.
                  </td>
                </tr>
              ) : (
                rows.map((s) => (
                  <tr key={s.id} className="border-t border-line hover:bg-canvas/60">
                    <td className="p-3 font-semibold text-ink">{s.name}</td>
                    <td className="p-3 font-mono text-xs text-muted" dir="ltr">
                      {s.phone}
                    </td>
                    <td className="p-3 font-mono text-xs text-muted" dir="ltr">
                      {s.email ?? "—"}
                    </td>
                    <td className="p-3">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_CLASS[s.status]}`}
                      >
                        {STATUS_LABEL[s.status]}
                      </span>
                    </td>
                    <td className="p-3 text-muted">{s.appointments}</td>
                    <td className="p-3 font-mono text-xs text-muted" dir="ltr">
                      {fmt(s.lastActivity)}
                    </td>
                    <td className="p-3">
                      <SubscriberContact
                        name={s.name}
                        phone={s.phone}
                        email={s.email}
                        status={s.status}
                      />
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
