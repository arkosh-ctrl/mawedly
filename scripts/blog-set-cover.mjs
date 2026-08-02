#!/usr/bin/env node
/**
 * Point an article at a hosted cover photo.
 *
 *   node scripts/blog-set-cover.mjs <slug> <https url>
 *   node scripts/blog-set-cover.mjs --list
 *
 * Sets blog_posts.cover_image (the shared cover) and CLEARS the per-language
 * covers, because a photograph carries no text — one image is correct in both
 * languages, unlike a generated cover with the title drawn into it.
 *
 * The URL is checked before it is written. A cover that 404s is worse than no
 * cover: the article card renders a broken box and the share preview comes out
 * blank, and neither failure announces itself.
 *
 * Unsplash: use the direct image URL (right-click the photo, Copy Image
 * Address) — it looks like https://images.unsplash.com/photo-...
 * Hotlinking that CDN is what Unsplash asks integrations to do, so the image
 * stays fast and we store no copies.
 */

import { readFile, writeFile, readdir } from "node:fs/promises";
import path from "node:path";

const DRAFTS = "content/drafts";

async function listDrafts() {
  const entries = await readdir(DRAFTS, { withFileTypes: true });
  return entries.filter((e) => e.isDirectory()).map((e) => e.name).sort();
}

async function main() {
  const [slug, url] = process.argv.slice(2);

  if (!slug || slug === "--list") {
    const slugs = await listDrafts();
    console.log("articles:\n" + slugs.map((s) => `  ${s}`).join("\n"));
    console.log("\nusage: blog-set-cover.mjs <slug> <https url>");
    process.exit(slug ? 0 : 2);
  }

  if (!url || !/^https:\/\//i.test(url)) {
    console.error("a full https:// image URL is required.");
    process.exit(2);
  }

  const dir = path.join(DRAFTS, slug);
  const metaPath = path.join(dir, "meta.json");

  let meta;
  try {
    meta = JSON.parse(await readFile(metaPath, "utf8"));
  } catch {
    const slugs = await listDrafts();
    console.error(`no draft called "${slug}". Known:\n  ${slugs.join("\n  ")}`);
    process.exit(2);
  }

  // Verify before writing, and confirm it is actually an image — a link to the
  // Unsplash *page* rather than the image returns HTML and renders nothing.
  let response;
  try {
    response = await fetch(url, { method: "GET", headers: { range: "bytes=0-0" } });
  } catch (error) {
    console.error(`could not reach the URL: ${error.message}`);
    process.exit(1);
  }
  if (!response.ok && response.status !== 206) {
    console.error(`URL returned ${response.status} — not writing it.`);
    process.exit(1);
  }
  const type = response.headers.get("content-type") ?? "";
  if (!type.startsWith("image/")) {
    console.error(
      `URL is ${type || "an unknown type"}, not an image. On Unsplash use ` +
        "Copy Image Address, not the page link.",
    );
    process.exit(1);
  }

  meta.cover_image = url;
  // A photograph has no text, so it serves both languages. Clearing the
  // per-language covers keeps one source of truth instead of three.
  for (const locale of ["ar", "en"]) {
    if (meta[locale]) meta[locale].cover_image = null;
  }

  await writeFile(metaPath, `${JSON.stringify(meta, null, 2)}\n`, "utf8");
  console.log(`ok ${slug} — ${type}\n   ${url}`);
  console.log("\nnext: npm run verify:drafts && node scripts/blog-draft-push.mjs all");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
