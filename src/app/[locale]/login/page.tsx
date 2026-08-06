import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { noindexMetadata } from "@/lib/seo/metadata";
import { Link } from "@/i18n/navigation";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { safeNextPath } from "@/lib/safe-redirect";
import { AuthTabs } from "./auth-tabs";

// Crawlable but NOT indexable. Disallow and noindex cancel each other out: a
// path blocked in robots.txt is never fetched, so the noindex on it is never
// read — and anything linking to it can still surface as a bare URL with no way
// to remove it. This page must be reachable (it is a real destination) and must
// never rank, which is exactly what robots: index=false, follow=true says.
//
// It also gives the page its own title. Without one it inherited the root
// layout's, and ~25 routes shared a single title — a real ranking drag.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Login" });
  return noindexMetadata(t("title"));
}

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
            <AuthTabs next={safeNext} />
          </div>

          <p className="mt-6 text-sm text-muted">
            {t("noAccount")}{" "}
            <Link
              href={`/signup?next=${encodeURIComponent(safeNext)}`}
              className="font-semibold text-ink underline-offset-2 hover:underline"
            >
              {t("signUpLink")}
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
