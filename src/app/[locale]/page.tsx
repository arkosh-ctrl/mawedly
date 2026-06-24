import { getTranslations, setRequestLocale } from "next-intl/server";
import { LocaleSwitcher } from "@/components/locale-switcher";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("HomePage");

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-start gap-6 px-6 py-16">
      <LocaleSwitcher />

      <h1 className="text-4xl font-bold tracking-tight">{t("title")}</h1>
      <p className="text-lg opacity-80">{t("description")}</p>

      {/* Logical border + padding (border-s / ps) flip sides automatically
          between RTL and LTR — a quick visual proof the layout mirrors. */}
      <p className="border-s-4 border-neutral-300 ps-4 text-sm leading-relaxed">
        {t("directionNote")}
      </p>
    </main>
  );
}
