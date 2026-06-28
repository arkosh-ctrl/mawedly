import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
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
  const tNav = await getTranslations("Nav");

  // Only allow internal, locale-prefixed redirect targets.
  const safeNext = safeNextPath(next) ?? `/${locale}/dashboard`;

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

        <div className="rounded-2xl border border-line bg-paper p-8 shadow-xl shadow-ink/5">
          <span className="eyebrow">{t("subtitle")}</span>
          <h1 className="mt-4 font-display text-3xl font-extrabold tracking-tight">
            {t("title")}
          </h1>

          {error === "auth" && (
            <p className="mt-5 w-full rounded-lg border border-brick/30 bg-brick/5 px-3 py-2 text-sm text-brick">
              {t("messages.authError")}
            </p>
          )}

          <div className="mt-6">
            <MagicLinkForm next={safeNext} />
          </div>
        </div>
      </div>
    </main>
  );
}
