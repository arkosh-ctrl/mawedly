import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { safeNextPath } from "@/lib/safe-redirect";
import { SignupForm } from "./signup-form";

export default async function SignupPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ next?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const { next } = await searchParams;
  const t = await getTranslations("Signup");
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

          <div className="mt-6">
            <SignupForm next={safeNext} />
          </div>

          <p className="mt-6 text-sm text-muted">
            {t("haveAccount")}{" "}
            <Link
              href={`/login?next=${encodeURIComponent(safeNext)}`}
              className="font-semibold text-ink underline-offset-2 hover:underline"
            >
              {t("signInLink")}
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
