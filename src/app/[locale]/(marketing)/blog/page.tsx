import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { getPublishedPosts } from "@/lib/blog/queries";
import { formatBlogDate, blogUrl, SITE_URL } from "@/lib/blog/urls";
import { isBlogLocale } from "@/lib/blog/validate";

// Server Component. The locale comes from the ROUTE, never from a client
// context: a language chosen client-side would leave the server rendering one
// language, and Google would index only that one.
//
// revalidate = 300 is what makes scheduled publishing work without a cron —
// the RLS policy hides a post until published_at passes, and the page refreshes
// itself within five minutes of that instant.
export const revalidate = 300;
export const dynamicParams = true;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Blog" });

  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: {
      canonical: `${SITE_URL}/${locale}/blog`,
      languages: Object.fromEntries(
        routing.locales.map((l) => [l, `${SITE_URL}/${l}/blog`]),
      ),
    },
    openGraph: {
      type: "website",
      title: t("metaTitle"),
      description: t("metaDescription"),
      url: `${SITE_URL}/${locale}/blog`,
      locale,
    },
  };
}

export default async function BlogIndexPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isBlogLocale(locale)) notFound();
  setRequestLocale(locale);

  const t = await getTranslations("Blog");
  const result = await getPublishedPosts(locale);

  return (
    <div className="mx-auto max-w-3xl px-5 py-20">
      <span className="eyebrow">{t("eyebrow")}</span>
      <h1 className="mt-4 font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
        {t("title")}
      </h1>
      <p className="mt-4 text-lg leading-relaxed text-muted">
        {t("subtitle")}
      </p>

      {/* A failed query is NEVER shown as "no posts yet": an empty state where
          the query actually errored reads as data loss and nobody investigates. */}
      {!result.ok ? (
        <div
          role="alert"
          className="mt-12 rounded-2xl border border-brick/30 bg-danger-light p-6"
        >
          <p className="font-semibold text-ink">{t("errorTitle")}</p>
          <p className="mt-2 text-sm text-muted">{t("errorBody")}</p>
          <p className="mt-3 font-mono text-xs text-brick">{result.error}</p>
        </div>
      ) : result.data.length === 0 ? (
        <p className="mt-12 rounded-2xl border border-line bg-paper p-8 text-muted">
          {t("empty")}
        </p>
      ) : (
        <ul className="mt-12 flex flex-col gap-8">
          {result.data.map((post) => (
            <li
              key={post.slug}
              className="rounded-2xl border border-line bg-paper p-6 transition-colors hover:border-primary/40"
            >
              <Link href={blogUrl(post.slug)} className="block">
                <h2 className="font-display text-xl font-bold text-ink">
                  {post.title}
                </h2>
                <p className="mt-3 leading-relaxed text-muted">
                  {post.excerpt}
                </p>
                <p className="mt-4 flex items-center gap-2 text-sm text-sage">
                  <time dateTime={post.published_at}>
                    {formatBlogDate(post.published_at, locale)}
                  </time>
                  <span aria-hidden>·</span>
                  <span>{t("readingTime", { minutes: post.readingMinutes })}</span>
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
