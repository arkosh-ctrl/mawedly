import { setRequestLocale } from "next-intl/server";
import { requireAdmin } from "@/lib/admin/guard";
import { getVerificationRequests } from "@/lib/admin/queries";
import { VerificationReview } from "@/components/admin/verification-review";

export const dynamic = "force-dynamic";

const TYPE_LABEL: Record<string, string> = {
  mental_health: "الصحة النفسية",
  nutrition: "التغذية السريرية",
  medical: "طب وأسنان",
  health: "صحة عامة",
  legal: "الاستشارات القانونية",
  accounting: "محاسبة قانونية",
  engineering: "هندسة استشارية",
};

const ISSUER_LABEL: Record<string, string> = {
  scfhs: "SCFHS",
  moj: "وزارة العدل",
  socpa: "SOCPA",
  sce: "SCE",
  other: "أخرى",
};

const STATUS_LABEL: Record<string, string> = {
  pending: "قيد المراجعة",
  rejected: "مرفوض",
};

const STATUS_CLASS: Record<string, string> = {
  pending: "bg-warning-light text-warning",
  rejected: "bg-brick/10 text-brick",
};

export default async function AdminVerificationsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requireAdmin(locale);
  const canManage = session.role === "admin";
  const rows = await getVerificationRequests();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <span className="eyebrow">التوثيق المهني</span>
        <h1 className="mt-2 font-display text-2xl font-extrabold tracking-tight">
          طلبات التوثيق ({rows.length})
        </h1>
        <p className="mt-1 text-sm text-muted">
          راجع رقم الترخيص والمستند المرفق، ثم وثّق أو ارفض. الموثّق يظهر بشارة
          خضراء في صفحة الحجز.
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line bg-paper px-5 py-10 text-center text-sm text-muted">
          لا طلبات توثيق معلّقة حالياً. ✨
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {rows.map((r) => (
            <div
              key={r.id}
              className="flex flex-col gap-4 rounded-2xl border border-line bg-paper p-5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-ink">{r.name}</span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      STATUS_CLASS[r.status] ?? "bg-canvas text-muted"
                    }`}
                  >
                    {STATUS_LABEL[r.status] ?? r.status}
                  </span>
                </div>
                <span className="text-xs text-muted">
                  {TYPE_LABEL[r.type] ?? r.type}
                  {r.licenseIssuer
                    ? ` · ${ISSUER_LABEL[r.licenseIssuer] ?? r.licenseIssuer}`
                    : ""}
                </span>
                <span className="font-mono text-xs text-muted" dir="ltr">
                  {r.licenseNumber ?? "— لا رقم ترخيص —"}
                </span>
                {r.documentUrl ? (
                  <a
                    href={r.documentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-fit text-xs font-medium text-primary hover:text-primary-hover"
                  >
                    عرض مستند الترخيص
                  </a>
                ) : (
                  <span className="text-xs text-brick">لم يُرفع مستند بعد</span>
                )}
              </div>

              {canManage && <VerificationReview id={r.id} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
