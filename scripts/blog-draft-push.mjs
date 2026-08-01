#!/usr/bin/env node
/**
 * Assemble a draft folder into a blog payload and push it to /api/blog/publish.
 *
 *   node scripts/blog-draft-push.mjs content/drafts/<slug>
 *   node scripts/blog-draft-push.mjs all
 *   node scripts/blog-draft-push.mjs all --dry
 *
 * A draft folder holds three files, so the prose stays reviewable as Markdown
 * instead of being buried in escaped JSON:
 *
 *   meta.json  { slug, cover_image, status, published_at, ar: {...}, en: {...} }
 *   ar.md      Arabic body (restricted Markdown subset)
 *   en.md      English body
 *
 * Target is production www — the apex answers 308 and a redirected POST arrives
 * without its body. Override with BLOG_API_BASE only when you truly mean local.
 */

import { readFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const DEFAULT_BASE = "https://www.mawedly.com";
const DRAFTS_DIR = "content/drafts";

async function loadKey() {
  if (process.env.BLOG_API_KEY) return process.env.BLOG_API_KEY;
  if (!existsSync(".env.local")) return null;
  const text = await readFile(".env.local", "utf8");
  const line = text.split("\n").find((l) => l.startsWith("BLOG_API_KEY="));
  return line ? line.slice("BLOG_API_KEY=".length).trim() : null;
}

async function buildPayload(dir) {
  const meta = JSON.parse(await readFile(path.join(dir, "meta.json"), "utf8"));
  const ar = (await readFile(path.join(dir, "ar.md"), "utf8")).trim();
  const en = (await readFile(path.join(dir, "en.md"), "utf8")).trim();

  return {
    slug: meta.slug,
    cover_image: meta.cover_image ?? null,
    status: meta.status ?? "draft",
    published_at: meta.published_at ?? null,
    translations: [
      { locale: "ar", content: ar, ...meta.ar },
      { locale: "en", content: en, ...meta.en },
    ],
  };
}

async function main() {
  const [target, ...flags] = process.argv.slice(2);
  const dry = flags.includes("--dry");

  if (!target) {
    console.error("usage: blog-draft-push.mjs <folder|all> [--dry]");
    process.exit(2);
  }

  const dirs =
    target === "all"
      ? (await readdir(DRAFTS_DIR, { withFileTypes: true }))
          .filter((e) => e.isDirectory())
          .map((e) => path.join(DRAFTS_DIR, e.name))
          .sort()
      : [target];

  const key = dry ? "dry-run" : await loadKey();
  if (!key) {
    console.error("BLOG_API_KEY is not set (env or .env.local).");
    process.exit(2);
  }

  const base = (process.env.BLOG_API_BASE ?? DEFAULT_BASE).replace(/\/+$/, "");
  let failures = 0;

  for (const dir of dirs) {
    const payload = await buildPayload(dir);
    const words = payload.translations.map(
      (t) => `${t.locale}:${t.content.split(/\s+/).length}w`,
    );

    if (dry) {
      console.log(`[dry] ${payload.slug} — ${words.join(" ")}`);
      continue;
    }

    const headers = {
      authorization: `Bearer ${key}`,
      "content-type": "application/json",
    };
    const url = `${base}/api/blog/publish`;

    let response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      redirect: "error",
    });
    let verb = "created";

    // Already pushed once? Update it instead of failing, so re-running after a
    // copy or cover change is safe.
    //
    // The update deliberately omits status AND published_at. Those live in the
    // admin editor once a post is scheduled, and re-sending the draft file's
    // "draft / null" would knock a live article back to a draft — and because
    // the public policy tests published_at, it would vanish from the site
    // without any error. The API keeps both fields when the keys are absent.
    if (response.status === 409) {
      const { status, published_at, ...rest } = payload;
      void status;
      void published_at;
      response = await fetch(url, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ target_slug: payload.slug, ...rest }),
        redirect: "error",
      });
      verb = "updated";
    }

    const text = await response.text();
    console.log(
      `${response.ok ? "ok " : "ERR"} ${payload.slug} — ${verb} — ${response.status} ${text}`,
    );
    if (!response.ok) failures += 1;
  }

  process.exit(failures === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
