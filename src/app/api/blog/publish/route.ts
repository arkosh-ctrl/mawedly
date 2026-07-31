import { NextResponse, type NextRequest } from "next/server";
import { authorizeBlogApi } from "@/lib/blog/auth";
import {
  createBlogPost,
  updateBlogPost,
  listAllBlogPosts,
  type BlogPostPatch,
} from "@/lib/blog/write";
import { logSystemEvent } from "@/lib/admin/log-event";
import type { BlogPostInput } from "@/lib/blog/types";

// Publishing API for the blog — deliberately OUTSIDE /admin so a headless
// agent can reach it with a bearer key instead of a browser session.
//
// IMPORTANT: this file must export nothing but HTTP verbs and route config
// (dynamic / runtime / revalidate / …). Exporting a helper from a route file
// breaks `next build`, and `tsc --noEmit` does not catch it — that is why the
// validator and the write logic live in lib/blog/.
//
// GET    → list every post (drafts included)
// POST   → create
// PATCH  → update; omitting published_at KEEPS the stored value (see write.ts)

export const dynamic = "force-dynamic";
export const runtime = "nodejs"; // node:crypto for the timing-safe compare

const STATUS_FOR_ERROR: Record<string, number> = {
  slug_taken: 409,
  not_found: 404,
  db_error: 500,
};

function guard(request: NextRequest): NextResponse | null {
  const auth = authorizeBlogApi(request);
  if (auth === "not_configured") {
    return NextResponse.json(
      { error: "blog_api_not_configured" },
      { status: 503 },
    );
  }
  if (auth === "unauthorized") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return null;
}

export async function GET(request: NextRequest) {
  const denied = guard(request);
  if (denied) return denied;

  const result = await listAllBlogPosts();
  if (!result.ok) {
    return NextResponse.json(
      { error: "db_error", detail: result.error },
      { status: 500 },
    );
  }
  return NextResponse.json({ posts: result.posts });
}

export async function POST(request: NextRequest) {
  const denied = guard(request);
  if (denied) return denied;

  let payload: BlogPostInput;
  try {
    payload = (await request.json()) as BlogPostInput;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const result = await createBlogPost(payload);
  if (!result.ok) {
    const status = STATUS_FOR_ERROR[result.error] ?? 400;
    if (status === 500) {
      await logSystemEvent({
        scope: "system",
        event: "blog_publish_failed",
        level: "error",
        meta: { op: "create", detail: result.detail },
      });
    }
    return NextResponse.json(
      { error: result.error, detail: result.detail },
      { status },
    );
  }

  await logSystemEvent({
    scope: "system",
    event: "blog_post_created",
    level: "info",
    meta: { post_id: result.id, slug: result.slug, status: payload.status },
  });

  return NextResponse.json(
    { id: result.id, slug: result.slug },
    { status: 201 },
  );
}

export async function PATCH(request: NextRequest) {
  const denied = guard(request);
  if (denied) return denied;

  let payload: BlogPostPatch & { id?: string; target_slug?: string };
  try {
    payload = (await request.json()) as BlogPostPatch & {
      id?: string;
      target_slug?: string;
    };
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const { id, target_slug, ...patch } = payload;
  // `target_slug` identifies the row; `slug` inside the patch RENAMES it.
  const identifier = id ? { id } : { slug: target_slug ?? patch.slug };
  if (!identifier.id && !identifier.slug) {
    return NextResponse.json({ error: "identifier_required" }, { status: 400 });
  }

  const result = await updateBlogPost(identifier, patch);
  if (!result.ok) {
    const status = STATUS_FOR_ERROR[result.error] ?? 400;
    if (status === 500) {
      await logSystemEvent({
        scope: "system",
        event: "blog_publish_failed",
        level: "error",
        meta: { op: "update", detail: result.detail },
      });
    }
    return NextResponse.json(
      { error: result.error, detail: result.detail },
      { status },
    );
  }

  await logSystemEvent({
    scope: "system",
    event: "blog_post_updated",
    level: "info",
    meta: { post_id: result.id, slug: result.slug },
  });

  return NextResponse.json({ id: result.id, slug: result.slug });
}
