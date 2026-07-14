import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Dpa" });
  return { title: t("metaTitle"), description: t("metaDescription") };
}

const SUBPROCESSORS = [
  { name: "Supabase", purpose: "sub.supabase", location: "sub.supabaseLoc" },
  { name: "Resend", purpose: "sub.resend", location: "sub.resendLoc" },
  { name: "WhatsApp / Meta", purpose: "sub.whatsapp", location: "sub.whatsappLoc" },
  { name: "Lemon Squeezy", purpose: "sub.lemon", location: "sub.lemonLoc" },
] as const;

export default async function DpaPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Dpa");

  const sections = [
    { h: t("partiesTitle"), b: t("partiesBody") },
    { h: t("natureTitle"), b: t("natureBody") },
    { h: t("mawedlyTitle"), b: t("mawedlyBody") },
    { h: t("yourTitle"), b: t("yourBody") },
  ];
  const tail = [
    { h: t("transferTitle"), b: t("transferBody") },
    { h: t("securityTitle"), b: t("securityBody") },
    { h: t("contactTitle"), b: t("contactBody") },
  ];

  return (
    <div className="mx-auto max-w-2xl px-5 py-20">
      <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
        {t("title")}
      </h1>
      <p className="mt-2 font-mono text-xs text-muted">{t("updated")}</p>
      <p className="mt-6 leading-relaxed text-pine">{t("intro")}</p>

      <div className="mt-10 flex flex-col">
        {sections.map((s) => (
          <section key={s.h} className="border-t border-line py-7 first:border-t-0">
            <h2 className="font-display text-lg font-bold text-ink">{s.h}</h2>
            <p className="mt-3 leading-relaxed text-muted">{s.b}</p>
          </section>
        ))}

        {/* Sub-processors table */}
        <section className="border-t border-line py-7">
          <h2 className="font-display text-lg font-bold text-ink">
            {t("subprocessorsTitle")}
          </h2>
          <p className="mt-3 leading-relaxed text-muted">{t("subprocessorsBody")}</p>
          <div className="mt-4 overflow-hidden rounded-xl border border-line">
            <table className="w-full text-sm">
              <thead className="bg-canvas text-xs font-semibold text-muted">
                <tr>
                  <th className="p-3 text-start">{t("colProcessor")}</th>
                  <th className="p-3 text-start">{t("colPurpose")}</th>
                  <th className="p-3 text-start">{t("colLocation")}</th>
                </tr>
              </thead>
              <tbody>
                {SUBPROCESSORS.map((s) => (
                  <tr key={s.name} className="border-t border-line">
                    <td className="p-3 font-medium text-ink" dir="ltr">
                      {s.name}
                    </td>
                    <td className="p-3 text-muted">{t(s.purpose)}</td>
                    <td className="p-3 text-muted">{t(s.location)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {tail.map((s) => (
          <section key={s.h} className="border-t border-line py-7">
            <h2 className="font-display text-lg font-bold text-ink">{s.h}</h2>
            <p className="mt-3 leading-relaxed text-muted">{s.b}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
