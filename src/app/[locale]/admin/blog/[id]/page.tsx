import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { requireAdmin } from "@/lib/admin/guard";
import { getBlogPostById } from "@/lib/blog/write";
import { BlogEditor } from "@/components/admin/blog-editor";
import { absoluteBlogUrl } from "@/lib/blog/urls";
import type { BlogPostInput } from "@/lib/blog/types";

export const dynamic = "force-dynamic";

export default async function AdminBlogEditPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  await requireAdmin(locale);

  const result = await getBlogPostById(id);

  if (!result.ok) {
    return (
      <div
        role="alert"
        className="rounded-2xl border border-brick/30 bg-danger-light p-6"
      >
        <p className="font-semibold">تعذّر تحميل المقال.</p>
        <p className="mt-2 font-mono text-xs text-brick">{result.error}</p>
      </div>
    );
  }

  if (!result.post) notFound();

  const initial: BlogPostInput = {
    slug: result.post.slug,
    cover_image: result.post.cover_image,
    status: result.post.status,
    published_at: result.post.published_at,
    translations: result.post.translations,
  };

  const isLive =
    result.post.published_at !== null &&
    Date.parse(result.post.published_at) <= Date.now();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link
            href="/admin/blog"
            className="text-sm text-primary hover:underline"
          >
            → المدونة
          </Link>
          <h1 className="mt-3 font-display text-2xl font-extrabold tracking-tight">
            تعديل المقال
          </h1>
        </div>

        {isLive ? (
          <div className="flex gap-2">
            {(["ar", "en"] as const).map((l) => (
              <a
                key={l}
                href={absoluteBlogUrl(l, result.post!.slug)}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full border border-line px-3 py-1.5 text-xs text-muted hover:border-muted hover:text-ink"
              >
                فتح {l.toUpperCase()} ↗
              </a>
            ))}
          </div>
        ) : null}
      </div>

      <BlogEditor postId={result.post.id} initial={initial} />
    </div>
  );
}
