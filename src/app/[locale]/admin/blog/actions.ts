"use server";

import { revalidatePath } from "next/cache";
import { getAdminSession } from "@/lib/admin/guard";
import { createBlogPost, updateBlogPost } from "@/lib/blog/write";
import { validationMessage } from "@/lib/blog/validate";
import { logSystemEvent } from "@/lib/admin/log-event";
import type { BlogPostInput } from "@/lib/blog/types";

// Server actions for the admin editor. They call the SAME write functions the
// publishing API uses, so the editor and an agent can never diverge on what
// counts as a valid post.

export type BlogActionResult =
  | { status: "success"; id: string; slug: string }
  | { status: "error"; message: string };

function reject(message: string): BlogActionResult {
  return { status: "error", message };
}

/**
 * Purge the cached blog surfaces so a save is visible without waiting for the
 * 5-minute revalidate window. Concrete paths are used rather than route
 * patterns: route groups and the [locale] segment make the pattern form easy to
 * get subtly wrong, and a silently-missed purge looks exactly like a save that
 * did not happen.
 */
function revalidateBlog(slug: string) {
  for (const locale of ["ar", "en"] as const) {
    revalidatePath(`/${locale}/blog`);
    revalidatePath(`/${locale}/blog/${slug}`);
  }
  revalidatePath("/sitemap.xml");
}

export async function saveNewPost(
  input: BlogPostInput,
): Promise<BlogActionResult> {
  const session = await getAdminSession();
  if (!session || session.role !== "admin") return reject("غير مصرّح.");

  const result = await createBlogPost(input, session.userId);
  if (!result.ok) {
    if (result.error === "slug_taken") return reject("المُعرّف مستخدم بالفعل.");
    if (result.error === "db_error") {
      await logSystemEvent({
        scope: "system",
        event: "blog_admin_create_failed",
        level: "error",
        meta: { detail: result.detail },
      });
      return reject(`فشل الحفظ: ${result.detail ?? "خطأ غير معروف"}`);
    }
    if (result.error === "not_found") return reject("المقال غير موجود.");
    return reject(validationMessage(result.error, "ar"));
  }

  revalidateBlog(result.slug);
  return { status: "success", id: result.id, slug: result.slug };
}

export async function saveExistingPost(
  id: string,
  input: BlogPostInput,
): Promise<BlogActionResult> {
  const session = await getAdminSession();
  if (!session || session.role !== "admin") return reject("غير مصرّح.");

  // published_at is always sent explicitly — including its unchanged value.
  // Dropping the key would clear the date, and since the public policy tests
  // that date the article would silently disappear from the site.
  const result = await updateBlogPost({ id }, input);
  if (!result.ok) {
    if (result.error === "slug_taken") return reject("المُعرّف مستخدم بالفعل.");
    if (result.error === "not_found") return reject("المقال غير موجود.");
    if (result.error === "db_error") {
      await logSystemEvent({
        scope: "system",
        event: "blog_admin_update_failed",
        level: "error",
        meta: { post_id: id, detail: result.detail },
      });
      return reject(`فشل الحفظ: ${result.detail ?? "خطأ غير معروف"}`);
    }
    return reject(validationMessage(result.error, "ar"));
  }

  revalidateBlog(result.slug);
  return { status: "success", id: result.id, slug: result.slug };
}
