"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { renderMarkdown, readingMinutes } from "@/lib/blog/markdown";
import {
  validateBlogPost,
  validationMessage,
  RECOMMENDED_SEO_TITLE_LENGTH,
  RECOMMENDED_SEO_DESCRIPTION_LENGTH,
  MIN_CONTENT_LENGTH,
} from "@/lib/blog/validate";
import type {
  BlogLocale,
  BlogPostInput,
  BlogStatus,
  BlogTranslation,
} from "@/lib/blog/types";
import { saveNewPost, saveExistingPost } from "@/app/[locale]/admin/blog/actions";

// Admin-only, Arabic-only (same convention as the rest of /admin).
//
// The preview uses the REAL renderer, so anything that would break on the live
// page breaks here, in front of the author — and the client mirrors the server
// validator so the save button explains itself instead of failing on submit.

const GULF_OFFSET_MS = 3 * 60 * 60 * 1000;

const STATUS_LABEL: Record<BlogStatus, string> = {
  draft: "مسودة",
  scheduled: "مجدول",
  published: "منشور",
};

const LOCALE_LABEL: Record<BlogLocale, string> = {
  ar: "العربية",
  en: "English",
};

/** ISO -> "YYYY-MM-DDTHH:mm" in Gulf wall-clock (Asia/Riyadh, fixed UTC+3). */
function isoToGulfInput(iso: string | null): string {
  if (!iso) return "";
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return "";
  return new Date(ms + GULF_OFFSET_MS).toISOString().slice(0, 16);
}

/** Gulf wall-clock -> ISO. */
function gulfInputToIso(value: string): string | null {
  if (!value) return null;
  const ms = Date.parse(`${value}:00Z`);
  if (Number.isNaN(ms)) return null;
  return new Date(ms - GULF_OFFSET_MS).toISOString();
}

function emptyTranslation(locale: BlogLocale): BlogTranslation {
  return {
    locale,
    title: "",
    excerpt: "",
    content: "",
    seo_title: "",
    seo_description: "",
    cover_image: null,
  };
}

export type BlogEditorProps = {
  /** Absent for a new post. */
  postId?: string;
  initial?: BlogPostInput;
};

export function BlogEditor({ postId, initial }: BlogEditorProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [tab, setTab] = useState<BlogLocale>("ar");
  const [showPreview, setShowPreview] = useState(true);

  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [coverImage, setCoverImage] = useState(initial?.cover_image ?? "");
  const [status, setStatus] = useState<BlogStatus>(initial?.status ?? "draft");
  const [publishedAt, setPublishedAt] = useState(
    isoToGulfInput(initial?.published_at ?? null),
  );

  const [translations, setTranslations] = useState<
    Record<BlogLocale, BlogTranslation>
  >(() => ({
    ar:
      initial?.translations.find((t) => t.locale === "ar") ??
      emptyTranslation("ar"),
    en:
      initial?.translations.find((t) => t.locale === "en") ??
      emptyTranslation("en"),
  }));

  function patchTranslation(locale: BlogLocale, patch: Partial<BlogTranslation>) {
    setTranslations((prev) => ({
      ...prev,
      [locale]: { ...prev[locale], ...patch },
    }));
  }

  const payload: BlogPostInput = useMemo(() => {
    const filled = (["ar", "en"] as BlogLocale[]).filter(
      (l) => translations[l].title.trim() || translations[l].content.trim(),
    );
    return {
      slug: slug.trim(),
      cover_image: coverImage.trim() || null,
      status,
      // ALWAYS sent, including when unchanged: an update that omits
      // published_at clears it, and the public policy tests that date.
      published_at: gulfInputToIso(publishedAt),
      translations: filled.map((l) => translations[l]),
    };
  }, [slug, coverImage, status, publishedAt, translations]);

  const invalid = validateBlogPost(payload);
  const reason = invalid ? validationMessage(invalid, "ar") : null;

  const active = translations[tab];
  const previewHtml = useMemo(
    () => renderMarkdown(active.content),
    [active.content],
  );

  function save() {
    if (invalid) return;
    startTransition(async () => {
      const result = postId
        ? await saveExistingPost(postId, payload)
        : await saveNewPost(payload);

      if (result.status === "error") {
        toast.error(result.message);
        return;
      }
      toast.success("تم الحفظ.");
      router.push(`/admin/blog/${result.id}`);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Shared fields --------------------------------------------------- */}
      <section className="rounded-2xl border border-line bg-paper p-5">
        <h2 className="font-display text-lg font-bold">حقول مشتركة</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">المُعرّف (slug)</span>
            <input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              dir="ltr"
              placeholder="how-deposits-cut-no-shows"
              className="rounded-xl border border-line bg-canvas px-3 py-2 font-mono text-sm outline-none focus:border-primary"
            />
            <span className="text-xs text-muted">
              حروف لاتينية صغيرة وأرقام وشرطات. يظهر في /ar/blog/&lt;slug&gt;.
            </span>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">صورة الغلاف (اختياري)</span>
            <input
              value={coverImage ?? ""}
              onChange={(e) => setCoverImage(e.target.value)}
              dir="ltr"
              placeholder="/covers/no-shows.png"
              className="rounded-xl border border-line bg-canvas px-3 py-2 font-mono text-sm outline-none focus:border-primary"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">الحالة</span>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as BlogStatus)}
              className="rounded-xl border border-line bg-canvas px-3 py-2 text-sm outline-none focus:border-primary"
            >
              {(["draft", "scheduled", "published"] as BlogStatus[]).map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">
              تاريخ النشر (بتوقيت الخليج)
            </span>
            <input
              type="datetime-local"
              value={publishedAt}
              onChange={(e) => setPublishedAt(e.target.value)}
              dir="ltr"
              className="rounded-xl border border-line bg-canvas px-3 py-2 font-mono text-sm outline-none focus:border-primary"
            />
            <span className="text-xs text-muted">
              المقال يظهر تلقائياً عند بلوغ هذا الوقت (خلال 5 دقائق) — لا حاجة
              لأي إجراء آخر.
            </span>
          </label>
        </div>
      </section>

      {/* Per-locale tabs -------------------------------------------------- */}
      <section className="rounded-2xl border border-line bg-paper p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1">
            {(["ar", "en"] as BlogLocale[]).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setTab(l)}
                className={`rounded-full px-4 py-1.5 text-sm transition-colors ${
                  tab === l
                    ? "bg-primary-light font-semibold text-primary"
                    : "text-muted hover:bg-canvas hover:text-ink"
                }`}
              >
                {LOCALE_LABEL[l]}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setShowPreview((v) => !v)}
            className="rounded-full border border-line px-3 py-1.5 text-xs text-muted hover:border-muted hover:text-ink"
          >
            {showPreview ? "إخفاء المعاينة" : "إظهار المعاينة"}
          </button>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <div
            className="flex flex-col gap-4"
            dir={tab === "ar" ? "rtl" : "ltr"}
          >
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">العنوان</span>
              <input
                value={active.title}
                onChange={(e) => patchTranslation(tab, { title: e.target.value })}
                className="rounded-xl border border-line bg-canvas px-3 py-2 outline-none focus:border-primary"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">
                غلاف هذه اللغة (اختياري)
              </span>
              <input
                value={active.cover_image ?? ""}
                onChange={(e) =>
                  patchTranslation(tab, { cover_image: e.target.value })
                }
                dir="ltr"
                placeholder="/covers/slug-ar.png"
                className="rounded-xl border border-line bg-canvas px-3 py-2 font-mono text-sm outline-none focus:border-primary"
              />
              <span className="text-xs text-muted">
                اتركه فارغاً ليُستخدم غلاف المقال المشترك. الغلاف الذي يحمل
                العنوان مكتوباً يجب أن يكون خاصاً بلغته.
              </span>
              {active.cover_image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={active.cover_image}
                  alt=""
                  className="mt-1 aspect-[1200/630] w-full rounded-xl border border-line object-cover"
                />
              ) : null}
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">المقتطف</span>
              <textarea
                value={active.excerpt}
                rows={2}
                onChange={(e) =>
                  patchTranslation(tab, { excerpt: e.target.value })
                }
                className="rounded-xl border border-line bg-canvas px-3 py-2 outline-none focus:border-primary"
              />
            </label>

            <Counter
              label="عنوان SEO"
              value={active.seo_title}
              recommended={RECOMMENDED_SEO_TITLE_LENGTH}
              onChange={(v) => patchTranslation(tab, { seo_title: v })}
            />

            <Counter
              label="وصف SEO"
              value={active.seo_description}
              recommended={RECOMMENDED_SEO_DESCRIPTION_LENGTH}
              multiline
              onChange={(v) => patchTranslation(tab, { seo_description: v })}
            />

            <label className="flex flex-col gap-1.5">
              <span className="flex items-center justify-between text-sm font-medium">
                <span>المحتوى (Markdown)</span>
                <span
                  className={`font-mono text-xs ${
                    active.content.trim().length < MIN_CONTENT_LENGTH
                      ? "text-brick"
                      : "text-muted"
                  }`}
                >
                  {active.content.trim().length} / {MIN_CONTENT_LENGTH} ·{" "}
                  {readingMinutes(active.content)} د
                </span>
              </span>
              <textarea
                value={active.content}
                rows={22}
                onChange={(e) =>
                  patchTranslation(tab, { content: e.target.value })
                }
                className="rounded-xl border border-line bg-canvas px-3 py-2 font-mono text-sm leading-relaxed outline-none focus:border-primary"
              />
              <span className="text-xs text-muted">
                المدعوم: عناوين # حتى ###، فقرات، قوائم - و 1.، اقتباس &gt;،
                كتل كود ```، كود مضمّن، **عريض**، *مائل*، روابط، صور، ---. غير
                مدعوم: الجداول، HTML خام، القوائم المتداخلة.
              </span>
            </label>
          </div>

          {showPreview ? (
            <div className="rounded-xl border border-line bg-canvas p-5">
              <p className="mb-3 text-xs text-muted">
                معاينة حيّة — نفس المُصيّر المستخدم في الصفحة العامة.
              </p>
              <div dir={tab === "ar" ? "rtl" : "ltr"}>
                <h1 className="font-display text-2xl font-extrabold text-ink">
                  {active.title || "—"}
                </h1>
                <div
                  className="blog-prose mt-5"
                  dangerouslySetInnerHTML={{ __html: previewHtml }}
                />
              </div>
            </div>
          ) : null}
        </div>
      </section>

      {/* Save ------------------------------------------------------------- */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={Boolean(invalid) || pending}
          className="rounded-xl bg-primary px-5 py-2.5 font-semibold text-paper transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? "جارٍ الحفظ…" : postId ? "حفظ التعديلات" : "إنشاء المقال"}
        </button>
        {reason ? (
          <p role="status" className="text-sm text-brick">
            {reason}
          </p>
        ) : (
          <p className="text-sm text-muted">جاهز للحفظ.</p>
        )}
      </div>
    </div>
  );
}

function Counter({
  label,
  value,
  recommended,
  multiline,
  onChange,
}: {
  label: string;
  value: string;
  recommended: number;
  multiline?: boolean;
  onChange: (value: string) => void;
}) {
  const over = value.length > recommended;
  return (
    <label className="flex flex-col gap-1.5">
      <span className="flex items-center justify-between text-sm font-medium">
        <span>{label}</span>
        <span
          className={`font-mono text-xs ${over ? "text-warning" : "text-muted"}`}
        >
          {value.length} / {recommended}
        </span>
      </span>
      {multiline ? (
        <textarea
          value={value}
          rows={2}
          onChange={(e) => onChange(e.target.value)}
          className="rounded-xl border border-line bg-canvas px-3 py-2 outline-none focus:border-primary"
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="rounded-xl border border-line bg-canvas px-3 py-2 outline-none focus:border-primary"
        />
      )}
    </label>
  );
}
