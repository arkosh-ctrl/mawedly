// One-off gate for the drafted articles: every folder in content/drafts must
// pass the SAME validator the API uses, and its Markdown must render to the
// allowed tag set with no unsupported constructs left as literal text.
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { validateBlogPost } from "../src/lib/blog/validate.ts";
import { renderMarkdown } from "../src/lib/blog/markdown.ts";
import type { BlogPostInput } from "../src/lib/blog/types.ts";

const DIR = "content/drafts";
// Hosted covers are only reachable with a network. Skip the check with
// SKIP_REMOTE_COVERS=1 so the gate still runs offline.
const CHECK_REMOTE = process.env.SKIP_REMOTE_COVERS !== "1";
const ALLOWED = new Set(["h2","h3","h4","p","ul","ol","li","blockquote","pre","code","strong","em","a","img","figure","hr","br"]);

let bad = 0;
for (const entry of (await readdir(DIR, { withFileTypes: true })).filter(e => e.isDirectory()).sort()) {
  const dir = path.join(DIR, entry.name);
  const meta = JSON.parse(await readFile(path.join(dir, "meta.json"), "utf8"));
  const ar = (await readFile(path.join(dir, "ar.md"), "utf8")).trim();
  const en = (await readFile(path.join(dir, "en.md"), "utf8")).trim();

  const payload: BlogPostInput = {
    slug: meta.slug,
    cover_image: meta.cover_image ?? null,
    status: meta.status ?? "draft",
    published_at: meta.published_at ?? null,
    translations: [
      { locale: "ar", content: ar, ...meta.ar },
      { locale: "en", content: en, ...meta.en },
    ],
  };

  const problems: string[] = [];

  // 1. draft validity
  if (validateBlogPost(payload)) problems.push(`draft invalid: ${validateBlogPost(payload)}`);
  // 2. would it also pass when published? (both locales + a date)
  const asPublished = { ...payload, status: "published" as const, published_at: new Date().toISOString() };
  if (validateBlogPost(asPublished)) problems.push(`publish-blocked: ${validateBlogPost(asPublished)}`);

  // 3. folder name must equal slug (the push script relies on meta, but a
  //    mismatch makes the repo confusing to navigate)
  if (entry.name !== meta.slug) problems.push(`folder/slug mismatch: ${entry.name} vs ${meta.slug}`);

  // 4. every cover must exist on disk — the shared one AND the per-language
  //    ones. The validator only checks the SHAPE of the path, so a typo would
  //    sail through and surface as a 404 on the page and, worse, as a blank
  //    card when the article is shared.
  const covers: [string, string | null | undefined][] = [
    ["post", payload.cover_image],
    ...payload.translations.map(
      (t) => [t.locale, t.cover_image] as [string, string | null | undefined],
    ),
  ];
  for (const [where, cover] of covers) {
    // Per-language covers are optional: a PHOTOGRAPH carries no text, so one
    // shared image is correct in both languages. Only the post-level cover is
    // mandatory.
    if (!cover) {
      if (where === "post") problems.push("post: no cover_image");
      continue;
    }
    if (cover.startsWith("/")) {
      try {
        await stat(path.join("public", cover));
      } catch {
        problems.push(`${where}: cover missing on disk — public${cover}`);
      }
    } else if (CHECK_REMOTE) {
      // A hosted cover that 404s renders as a broken box on the card and a
      // blank share preview — neither failure announces itself, so check.
      try {
        const res = await fetch(cover, {
          method: "GET",
          headers: { range: "bytes=0-0" },
        });
        const type = res.headers.get("content-type") ?? "";
        if (!res.ok && res.status !== 206) {
          problems.push(`${where}: cover URL returned ${res.status}`);
        } else if (!type.startsWith("image/")) {
          problems.push(`${where}: cover URL is ${type || "unknown"}, not an image`);
        }
      } catch (e) {
        problems.push(
          `${where}: cover URL unreachable — ${e instanceof Error ? e.message : e}`,
        );
      }
    }
  }

  // 5. two locales may share a PHOTO, but never a generated cover: that one has
  //    the title drawn into it, so it can only be right in one language.
  const [arCover, enCover] = payload.translations.map((t) => t.cover_image);
  if (arCover && enCover && arCover === enCover && arCover.startsWith("/covers/")) {
    problems.push("ar and en share a generated cover — the baked-in title cannot suit both");
  }

  for (const t of payload.translations) {
    const html = renderMarkdown(t.content);
    for (const m of html.matchAll(/<\/?([a-zA-Z][a-zA-Z0-9]*)/g)) {
      if (!ALLOWED.has(m[1].toLowerCase())) problems.push(`${t.locale}: tag <${m[1]}> outside allowlist`);
    }
    if (/<h1[ >]/.test(html)) problems.push(`${t.locale}: emits an h1`);
    if (t.content.includes("|") && /^\s*\|/m.test(t.content)) problems.push(`${t.locale}: looks like a table (unsupported)`);
    if (!/<a href="\/(ar|en)\//.test(html)) problems.push(`${t.locale}: no internal link`);
    if (t.seo_title.length > 70) problems.push(`${t.locale}: seo_title ${t.seo_title.length} chars (soft max 60-70)`);
    if (t.seo_description.length > 180) problems.push(`${t.locale}: seo_description ${t.seo_description.length} chars`);
  }

  const words = payload.translations.map(t => `${t.locale} ${t.content.split(/\s+/).length}w`).join(" / ");
  if (problems.length) { bad++; console.log(`FAIL ${meta.slug} — ${words}`); for (const p of problems) console.log(`      ${p}`); }
  else console.log(`ok   ${meta.slug} — ${words}`);
}
console.log(bad === 0 ? "\nAll drafts pass." : `\n${bad} draft(s) failed.`);
process.exit(bad === 0 ? 0 : 1);
