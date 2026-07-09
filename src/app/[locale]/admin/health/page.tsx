import { setRequestLocale } from "next-intl/server";
import { requireAdmin } from "@/lib/admin/guard";
import { getSystemHealth } from "@/lib/admin/queries";

export const dynamic = "force-dynamic";

const SCOPE_LABEL: Record<string, string> = {
  email: "الإيميل",
  cron_reminders: "التذكيرات (Cron)",
  booking_api: "الحجز",
  notifications: "الإشعارات",
  video: "الفيديو",
  calendar: "التقويم",
  deposit: "العربون",
  system: "النظام",
};

const LEVEL_CLASS: Record<string, string> = {
  error: "bg-brick/10 text-brick",
  warn: "bg-saffron/15 text-pine",
  info: "bg-pine/10 text-pine",
};

function fmt(iso: string) {
  return `${iso.slice(0, 10)} ${iso.slice(11, 16)}`;
}

export default async function AdminHealthPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireAdmin(locale);
  const { events, scopes } = await getSystemHealth();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <span className="eyebrow">المراقبة</span>
        <h1 className="mt-2 font-display text-2xl font-extrabold tracking-tight">
          صحة الأنظمة
        </h1>
        <p className="mt-1 text-sm text-muted">
          رصد آخر ٧ أيام لكل نظام فرعي. الأحمر = أخطاء تحتاج انتباهك.
        </p>
      </div>

      {/* Per-scope 24h summary */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {scopes.length === 0 ? (
          <p className="col-span-full rounded-2xl border border-dashed border-line bg-paper px-4 py-8 text-center text-sm text-muted">
            لا أحداث مسجّلة بعد — الأنظمة هادئة. ✨
          </p>
        ) : (
          scopes.map((s) => (
            <div
              key={s.scope}
              className={`flex flex-col gap-1 rounded-2xl border bg-paper p-4 ${
                s.errors24h > 0 ? "border-brick/40" : "border-line"
              }`}
            >
              <span className="text-sm font-semibold text-ink">
                {SCOPE_LABEL[s.scope] ?? s.scope}
              </span>
              <span
                className={`text-2xl font-extrabold ${
                  s.errors24h > 0 ? "text-brick" : "text-pine"
                }`}
              >
                {s.errors24h > 0 ? `${s.errors24h} خطأ` : "سليم"}
              </span>
              <span className="text-[11px] text-muted" dir="ltr">
                {s.lastAt ? fmt(s.lastAt) : "—"}
              </span>
              {s.warns24h > 0 && (
                <span className="text-[11px] text-muted">
                  {s.warns24h} تحذير (٢٤س)
                </span>
              )}
            </div>
          ))
        )}
      </div>

      {/* Live events feed */}
      <section className="overflow-hidden rounded-2xl border border-line bg-paper">
        <h2 className="border-b border-line px-5 py-3 font-display text-base font-bold text-ink">
          سجل الأحداث ({events.length})
        </h2>
        {events.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted">
            لا أحداث خلال آخر ٧ أيام.
          </p>
        ) : (
          <div className="divide-y divide-line">
            {events.map((e) => (
              <div key={e.id} className="flex items-start gap-3 px-5 py-3">
                <span
                  className={`mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                    LEVEL_CLASS[e.level] ?? "bg-canvas text-muted"
                  }`}
                >
                  {e.level}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-ink">
                    <span className="text-muted">
                      [{SCOPE_LABEL[e.scope] ?? e.scope}]
                    </span>{" "}
                    {e.event}
                  </p>
                  {e.meta && Object.keys(e.meta).length > 0 && (
                    <pre
                      dir="ltr"
                      className="mt-1 overflow-x-auto rounded-md bg-ink px-2 py-1 font-mono text-[10px] text-canvas"
                    >
                      {JSON.stringify(e.meta)}
                    </pre>
                  )}
                </div>
                <span className="shrink-0 font-mono text-[11px] text-muted" dir="ltr">
                  {fmt(e.created_at)}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
