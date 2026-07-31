import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getPublishedPost, getPublishedSlugs } from "@/lib/blog/queries";
import { renderMarkdown } from "@/lib/blog/markdown";
import {
  SITE_URL,
  absoluteBlogUrl,
  blogUrl,
  formatBlogDate,
} from "@/lib/blog/urls";
import { isBlogLocale } from "@/lib/blog/validate";
import type { BlogLocale } from "@/lib/blog/types";

// dynamicParams = true so a post published AFTER the last build still resolves
// instead of 404ing until the next deploy — which is the whole point of
// scheduling by timestamp.
export const revalidate = 300;
export const dynamicParams = true;

export async function generateStaticParams() {
  const result = await getPublishedSlugs();
  // Fail soft: a database hiccup at build time must not fail the deploy, and
  // dynamicParams covers anything not prerendered here.
  if (!result.ok) return [];
  return result.data.map((entry) => ({ slug: entry.slug }));
}

function ogImage(cover: string | null): string {
  if (!cover) return `${SITE_URL}/icon-512.png`;
  return cover.startsWith("http") ? cover : `${SITE_URL}${cover}`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isBlogLocale(locale)) return {};

  const result = await getPublishedPost(slug, locale);
  if (!result.ok || !result.data) return {};

  const { post, translation, locales } = result.data;

  // hreflang is claimed ONLY for locales that actually have a translation:
  // an alternate pointing at a 404 is worse than no alternate at all.
  const languages = Object.fromEntries(
    locales.map((l) => [l, absoluteBlogUrl(l, post.slug)]),
  ) as Record<BlogLocale, string>;

  const title = translation.seo_title || translation.title;
  const description = translation.seo_description || translation.excerpt;

  return {
    title,
    description,
    alternates: {
      canonical: absoluteBlogUrl(locale, post.slug),
      languages,
    },
    openGraph: {
      type: "article",
      title,
      description,
      url: absoluteBlogUrl(locale, post.slug),
      locale,
      publishedTime: post.published_at ?? undefined,
      modifiedTime: post.updated_at,
      images: [ogImage(post.cover_image)],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage(post.cover_image)],
    },
  };
}

export default async function BlogArticlePage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  if (!isBlogLocale(locale)) notFound();
  setRequestLocale(locale);

  const t = await getTranslations("Blog");
  const result = await getPublishedPost(slug, locale);

  // Surface the failure. Rendering a 404 (or an empty page) when the QUERY
  // broke would hide an outage behind a normal-looking result.
  if (!result.ok) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-20">
        <div
          role="alert"
          className="rounded-2xl border border-brick/30 bg-danger-light p-6"
        >
          <p className="font-semibold text-ink">{t("errorTitle")}</p>
          <p className="mt-2 text-sm text-muted">{t("errorBody")}</p>
          <p className="mt-3 font-mono text-xs text-brick">{result.error}</p>
        </div>
      </div>
    );
  }

  if (!result.data) notFound();

  const { post, translation, locales, readingMinutes } = result.data;
  const html = renderMarkdown(translation.content);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: translation.title,
    description: translation.seo_description || translation.excerpt,
    inLanguage: locale,
    datePublished: post.published_at,
    dateModified: post.updated_at,
    image: ogImage(post.cover_image),
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": absoluteBlogUrl(locale, post.slug),
    },
    author: {
      "@type": "Organization",
      name: locale === "ar" ? "موعدلي" : "Mawedly",
      url: SITE_URL,
    },
    publisher: {
      "@type": "Organization",
      name: locale === "ar" ? "موعدلي" : "Mawedly",
      url: SITE_URL,
      logo: {
        "@type": "ImageObject",
        url: `${SITE_URL}/icon-512.png`,
      },
    },
  };

  return (
    <article className="mx-auto max-w-3xl px-5 py-20">
      <script
        type="application/ld+json"
        // Structured data, not user content: serialised from values we control.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <Link href={blogUrl()} className="text-sm text-primary hover:underline">
        {t("backToIndex")}
      </Link>

      <h1 className="mt-6 font-display text-3xl font-extrabold leading-tight tracking-tight text-ink sm:text-4xl">
        {translation.title}
      </h1>

      <p className="mt-4 flex items-center gap-2 text-sm text-sage">
        {post.published_at ? (
          <time dateTime={post.published_at}>
            {formatBlogDate(post.published_at, locale)}
          </time>
        ) : null}
        <span aria-hidden>·</span>
        <span>{t("readingTime", { minutes: readingMinutes })}</span>
      </p>

      {translation.excerpt ? (
        <p className="mt-6 border-s-2 border-primary ps-4 text-lg leading-relaxed text-ink">
          {translation.excerpt}
        </p>
      ) : null}

      {/* Safe by construction: renderMarkdown escapes the stored text FIRST and
          only then emits a fixed tag set, so content can never become markup. */}
      <div
        className="blog-prose mt-10"
        dangerouslySetInnerHTML={{ __html: html }}
      />

      <div className="mt-16 rounded-2xl border border-line bg-paper p-8">
        <p className="font-display text-xl font-bold text-ink">{t("ctaTitle")}</p>
        <p className="mt-3 leading-relaxed text-muted">{t("ctaBody")}</p>
        <Link
          href="/signup"
          className="mt-6 inline-flex rounded-xl bg-primary px-5 py-3 font-semibold text-paper transition-colors hover:bg-primary-hover"
        >
          {t("ctaButton")}
        </Link>
      </div>

      {locales.length > 1 ? (
        <p className="mt-8 text-sm text-muted">
          {t("availableIn", {
            locales: locales
              .map((l) => (l === "ar" ? t("localeAr") : t("localeEn")))
              .join(" · "),
          })}
        </p>
      ) : null}
    </article>
  );
}
