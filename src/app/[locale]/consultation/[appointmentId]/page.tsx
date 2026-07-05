import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { resolveVideoAccess, buildJitsiUrl } from "@/lib/video/access";
import { ClientJoin } from "./client-join";

// Public consultation landing (capability URL: possession of the appointment id
// is the credential — same shell/model as /chat and /review). No auth, no
// appointment data beyond what the room needs. All validation happens
// server-side via the service-role RPC.
export default async function ConsultationPage({
  params,
}: {
  params: Promise<{ locale: string; appointmentId: string }>;
}) {
  const { locale, appointmentId } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Video");
  const tNav = await getTranslations("Nav");

  const resolved = await resolveVideoAccess(appointmentId, "client");

  return (
    <main className="flex min-h-screen flex-col bg-canvas text-ink">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-8 px-6 py-16">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="font-display text-xl font-extrabold tracking-tight text-ink"
          >
            {tNav("brand")}
          </Link>
          <LocaleSwitcher />
        </div>

        {!resolved ? (
          <div className="rounded-2xl border border-line bg-paper p-8 text-center shadow-xl shadow-ink/5">
            <p className="mb-3 text-4xl" aria-hidden>
              🔒
            </p>
            <h1 className="font-display text-2xl font-extrabold tracking-tight">
              {t("closedTitle")}
            </h1>
            <p className="mt-2 text-sm text-muted">{t("closedBody")}</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-6 rounded-2xl border border-line bg-paper p-8 text-center shadow-xl shadow-ink/5">
            <div>
              <span className="eyebrow">{t("consultationEyebrow")}</span>
              <h1 className="mt-3 font-display text-2xl font-extrabold tracking-tight">
                {t("consultationTitle")}
              </h1>
              <p className="mt-2 text-sm text-muted">{t("consultationBody")}</p>
            </div>

            <div className="w-full rounded-lg border border-saffron/30 bg-saffron/10 p-4">
              <p className="text-xs text-muted">{t("passwordLabel")}</p>
              <code
                dir="ltr"
                className="mt-1 block rounded bg-ink px-4 py-2 text-center font-mono text-2xl tracking-widest text-paper"
              >
                {resolved.access.roomPassword}
              </code>
            </div>

            <ClientJoin
              appointmentId={appointmentId}
              jitsiUrl={buildJitsiUrl(resolved.access)}
            />

            <p className="text-xs text-muted">{t("noAppNeeded")}</p>
          </div>
        )}
      </div>
    </main>
  );
}
