import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import {
  getPublishedPost,
  getPublishedSlugs,
  getRelatedPosts,
} from "@/lib/blog/queries";
import { renderMarkdown } from "@/lib/blog/markdown";
import {
  SITE_URL,
  absoluteBlogUrl,
  blogUrl,
  formatBlogDate,
} from "@/lib/blog/urls";
import { isBlogLocale } from "@/lib/blog/validate";
import {
  AUTHOR,
  breadcrumbSchema,
  organizationSchema,
  personSchema,
} from "@/lib/seo/site";
import { dynamicPageMetadata } from "@/lib/seo/metadata";
import { JsonLd } from "@/components/json-ld";

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

  const title = translation.seo_title || translation.title;
  const description = translation.seo_description || translation.excerpt;

  // hreflang is claimed ONLY for locales that actually have a translation:
  // an alternate pointing at a 404 is worse than no alternate at all. That is
  // why this uses dynamicPageMetadata — availability here is a data fact, not
  // a structural one, so it cannot come from LOCALIZED_PATHS.
  return dynamicPageMetadata({
    locale,
    path: blogUrl(post.slug),
    availableLocales: locales,
    title,
    description,
    ogType: "article",
    image: ogImage(post.cover_image),
    publishedTime: post.published_at ?? undefined,
    modifiedTime: post.updated_at,
  });
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

  const related = await getRelatedPosts(post.slug, locale);

  const crumbs = [
    { name: t("breadcrumbHome"), url: `${SITE_URL}/${locale}` },
    { name: t("breadcrumbBlog"), url: `${SITE_URL}/${locale}/blog` },
    { name: translation.title, url: absoluteBlogUrl(locale, post.slug) },
  ];

  // One @graph rather than three separate scripts, so the article, its author,
  // the publisher and the breadcrumb trail are linked by @id instead of being
  // four unrelated fragments a parser has to guess about.
  const jsonLdNodes = [
    {
      "@type": "BlogPosting",
      "@id": `${absoluteBlogUrl(locale, post.slug)}#article`,
      headline: translation.title,
      description: translation.seo_description || translation.excerpt,
      inLanguage: locale,
      datePublished: post.published_at,
      dateModified: post.updated_at,
      image: ogImage(post.cover_image),
      wordCount: translation.content.trim().split(/\s+/).length,
      mainEntityOfPage: {
        "@type": "WebPage",
        "@id": absoluteBlogUrl(locale, post.slug),
      },
      author: { "@id": `${SITE_URL}/#author` },
      publisher: { "@id": `${SITE_URL}/#organization` },
      isPartOf: {
        "@type": "Blog",
        "@id": `${SITE_URL}/${locale}/blog#blog`,
        name: t("title"),
      },
    },
    personSchema(locale),
    organizationSchema(locale),
    breadcrumbSchema(crumbs),
  ];

  return (
    <article className="mx-auto max-w-3xl px-5 py-20">
      <JsonLd nodes={jsonLdNodes} />

      {/* Visible breadcrumb mirroring the schema. Search results can show the
          path, and a reader landing from search gets a way up and out. */}
      <nav aria-label={t("breadcrumbBlog")} className="text-sm text-muted">
        <ol className="flex flex-wrap items-center gap-2">
          <li>
            <Link href="/" className="hover:text-ink">
              {t("breadcrumbHome")}
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li>
            <Link href={blogUrl()} className="text-primary hover:underline">
              {t("breadcrumbBlog")}
            </Link>
          </li>
        </ol>
      </nav>

      <h1 className="mt-6 font-display text-3xl font-extrabold leading-tight tracking-tight text-ink sm:text-4xl">
        {translation.title}
      </h1>

      <p className="mt-4 flex flex-wrap items-center gap-2 text-sm text-sage">
        <span className="text-muted">
          {t("writtenBy", {
            name: locale === "ar" ? AUTHOR.nameAr : AUTHOR.nameEn,
          })}
        </span>
        <span aria-hidden>·</span>
        {post.published_at ? (
          <time dateTime={post.published_at}>
            {formatBlogDate(post.published_at, locale)}
          </time>
        ) : null}
        <span aria-hidden>·</span>
        <span>{t("readingTime", { minutes: readingMinutes })}</span>
      </p>

      {post.cover_image ? (
        // Decorative: the cover repeats the headline's idea visually and adds
        // no information of its own, so an empty alt is correct here.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={post.cover_image}
          alt=""
          width={1200}
          height={630}
          className="mt-8 aspect-[1200/630] w-full rounded-2xl border border-line object-cover"
        />
      ) : null}

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

      {/* Related reading. Without it every article is reachable only from the
          index — an orphan page gets crawled less and read less. */}
      {related.ok && related.data.length > 0 ? (
        <section className="mt-16 border-t border-line pt-10">
          <h2 className="font-display text-xl font-bold text-ink">
            {t("relatedTitle")}
          </h2>
          <ul className="mt-6 flex flex-col gap-4">
            {related.data.map((item) => (
              <li key={item.slug}>
                <Link
                  href={blogUrl(item.slug)}
                  className="block rounded-xl border border-line bg-paper p-4 transition-colors hover:border-primary/40"
                >
                  <p className="font-semibold text-ink">{item.title}</p>
                  <p className="mt-1 line-clamp-2 text-sm text-muted">
                    {item.excerpt}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

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
