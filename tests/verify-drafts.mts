// One-off gate for the drafted articles: every folder in content/drafts must
// pass the SAME validator the API uses, and its Markdown must render to the
// allowed tag set with no unsupported constructs left as literal text.
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { validateBlogPost } from "../src/lib/blog/validate.ts";
import { renderMarkdown } from "../src/lib/blog/markdown.ts";
import type { BlogPostInput } from "../src/lib/blog/types.ts";

const DIR = "content/drafts";
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
