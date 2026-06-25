import { getTranslations, setRequestLocale } from "next-intl/server";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { safeNextPath } from "@/lib/safe-redirect";
import { MagicLinkForm } from "./magic-link-form";

export default async function LoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const { next, error } = await searchParams;
  const t = await getTranslations("Login");

  // Only allow internal, locale-prefixed redirect targets.
  const safeNext = safeNextPath(next) ?? `/${locale}/dashboard`;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col items-start gap-6 px-6 py-16">
      <LocaleSwitcher />

      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-sm opacity-80">{t("subtitle")}</p>
      </div>

      {error === "auth" && (
        <p className="w-full rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {t("messages.authError")}
        </p>
      )}

      <MagicLinkForm next={safeNext} />
    </main>
  );
}
