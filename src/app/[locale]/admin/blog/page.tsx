import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { requireAdmin } from "@/lib/admin/guard";
import { listAllBlogPosts } from "@/lib/blog/write";
import { BlogCountdown } from "@/components/admin/blog-countdown";
import { formatBlogDate } from "@/lib/blog/urls";
import type { BlogStatus } from "@/lib/blog/types";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<BlogStatus, string> = {
  draft: "مسودة",
  scheduled: "مجدول",
  published: "منشور",
};

const STATUS_STYLE: Record<BlogStatus, string> = {
  draft: "border-line bg-canvas text-muted",
  scheduled: "border-warning/40 bg-warning-light text-ink",
  published: "border-success/40 bg-success-light text-ink",
};

export default async function AdminBlogListPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireAdmin(locale);

  const result = await listAllBlogPosts();

  // A failed query must not look like "no posts yet".
  if (!result.ok) {
    return (
      <div
        role="alert"
        className="rounded-2xl border border-brick/30 bg-danger-light p-6"
      >
        <p className="font-semibold">تعذّر تحميل المقالات.</p>
        <p className="mt-2 font-mono text-xs text-brick">{result.error}</p>
      </div>
    );
  }

  const now = Date.now();

  // Soonest first: anything still waiting to go live sits at the top, ordered
  // by how close it is; then live posts newest-first; drafts last.
  const posts = [...result.posts].sort((a, b) => {
    const at = a.published_at ? Date.parse(a.published_at) : null;
    const bt = b.published_at ? Date.parse(b.published_at) : null;
    const aFuture = at !== null && at > now;
    const bFuture = bt !== null && bt > now;

    if (aFuture && bFuture) return at - bt;
    if (aFuture) return -1;
    if (bFuture) return 1;
    if (at !== null && bt !== null) return bt - at;
    if (at !== null) return -1;
    if (bt !== null) return 1;
    return 0;
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="eyebrow">المحتوى</span>
          <h1 className="mt-2 font-display text-2xl font-extrabold tracking-tight">
            المدونة
          </h1>
          <p className="mt-2 text-sm text-muted">
            المقال يظهر تلقائياً عند بلوغ تاريخ النشر — لا مهمة مجدولة ولا زر
            نشر.
          </p>
        </div>
        <Link
          href="/admin/blog/new"
          className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-paper transition-colors hover:bg-primary-hover"
        >
          مقال جديد
        </Link>
      </div>

      {posts.length === 0 ? (
        <p className="rounded-2xl border border-line bg-paper p-8 text-muted">
          لا توجد مقالات بعد.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {posts.map((post) => {
            const at = post.published_at ? Date.parse(post.published_at) : null;
            const future = at !== null && at > now;
            const locales = post.translations.map((t) => t.locale);
            const title =
              post.translations.find((t) => t.locale === "ar")?.title ??
              post.translations[0]?.title ??
              post.slug;

            return (
              <li
                key={post.id}
                className="rounded-2xl border border-line bg-paper p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link
                      href={`/admin/blog/${post.id}`}
                      className="font-display text-lg font-bold hover:text-primary"
                    >
                      {title}
                    </Link>
                    <p
                      dir="ltr"
                      className="mt-1 truncate font-mono text-xs text-muted"
                    >
                      /{locale}/blog/{post.slug}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {future && post.published_at ? (
                      <BlogCountdown publishedAt={post.published_at} />
                    ) : null}
                    <span
                      className={`rounded-full border px-2.5 py-0.5 text-xs ${STATUS_STYLE[post.status]}`}
                    >
                      {STATUS_LABEL[post.status]}
                    </span>
                    {(["ar", "en"] as const).map((l) => (
                      <span
                        key={l}
                        className={`rounded-full border px-2 py-0.5 text-[11px] ${
                          locales.includes(l)
                            ? "border-line text-ink"
                            : "border-dashed border-line text-sage"
                        }`}
                      >
                        {l.toUpperCase()}
                      </span>
                    ))}
                  </div>
                </div>

                <p className="mt-3 text-xs text-muted">
                  {post.published_at
                    ? `تاريخ النشر: ${formatBlogDate(post.published_at, "ar")}`
                    : "بلا تاريخ نشر"}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
