/**
 * Restricted Markdown renderer for the blog. Pure: no I/O, no dependencies.
 *
 * SECURITY MODEL — the ordering IS the guarantee:
 *   1. Strip control characters.
 *   2. Escape EVERY html-significant character in the whole source.
 *   3. Only then convert a fixed set of Markdown constructs into tags.
 *
 * Because step 2 runs before step 3, stored content can never become live
 * markup — there is no path by which raw HTML in the database reaches the page.
 * This is deliberately not a Markdown library: a library is only safe while its
 * "disallow raw HTML" option stays configured correctly, whereas escaping first
 * means raw HTML has no path at all.
 *
 * ORDERING TRAP: after escaping, a blockquote line begins with "&gt;", not ">".
 * Every block matcher below runs against the ESCAPED text and must match the
 * escaped form. (A parser that still looks for ">" silently renders no quotes.)
 *
 * Supported: #..### headings, paragraphs, "-" and "1." lists, "&gt;" quotes,
 * fenced code, inline code, bold, italic, links, images, "---".
 * Not supported (by design): tables, raw HTML, footnotes, nested lists.
 *
 * Headings map to h2/h3/h4, not h1/h2/h3: the page renders the post title as
 * the single <h1>, and a second h1 inside the body weakens the SEO outline.
 */

const ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

function escapeHtml(input: string): string {
  return input.replace(/[&<>"']/g, (c) => ESCAPES[c]);
}

/**
 * Allowlist for link targets, checked AFTER escaping. Anything not matched is
 * rejected outright rather than sanitised — no "javascript:", no "data:", no
 * protocol-relative "//host" (which inherits the page scheme).
 */
function safeHref(raw: string): string | null {
  const url = raw.trim();
  const lower = url.toLowerCase();
  if (/^https?:\/\/[^\s]+$/.test(lower)) return url;
  if (/^mailto:[^\s@]+@[^\s@]+$/.test(lower)) return url;
  if (/^\/(?!\/)/.test(url)) return url; // root-relative only
  if (/^#[\w-]+$/.test(url)) return url; // in-page anchor
  return null;
}

/** Images are stricter still: remote http(s) or a file we serve ourselves. */
function safeSrc(raw: string): string | null {
  const url = raw.trim();
  if (/^https?:\/\/[^\s]+$/i.test(url)) return url;
  if (/^\/(?!\/)/.test(url)) return url;
  return null;
}

// Sentinels for parked inline code. These are control characters, which the
// pre-pass strips from the source, so an author cannot forge them.
const CODE_OPEN = "\u0001";
const CODE_CLOSE = "\u0002";

/**
 * Inline conversion for already-escaped text. Inline code is extracted first
 * and parked behind the sentinels so its contents never undergo emphasis or
 * link substitution.
 */
function renderInline(escaped: string): string {
  const codes: string[] = [];
  let out = escaped.replace(/`([^`\n]+)`/g, (_m, body: string) => {
    codes.push(body);
    return `${CODE_OPEN}${codes.length - 1}${CODE_CLOSE}`;
  });

  // Images before links: "![alt](src)" also matches the link pattern.
  out = out.replace(
    /!\[([^\]\n]*)\]\(([^)\s]+)\)/g,
    (_m, alt: string, src: string) => {
      const safe = safeSrc(src);
      if (!safe) return alt; // rejected target degrades to plain text
      return `<img src="${safe}" alt="${alt}" loading="lazy" />`;
    },
  );

  out = out.replace(
    /\[([^\]\n]+)\]\(([^)\s]+)\)/g,
    (_m, text: string, href: string) => {
      const safe = safeHref(href);
      if (!safe) return text;
      const external = /^https?:\/\//i.test(safe);
      const rel = external ? ' target="_blank" rel="noopener noreferrer"' : "";
      return `<a href="${safe}"${rel}>${text}</a>`;
    },
  );

  // Bold before italic, since "**" would otherwise be consumed as two "*".
  out = out.replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/(^|[^*\w])\*([^*\n]+)\*(?!\*)/g, "$1<em>$2</em>");
  out = out.replace(/(^|[^_\w])_([^_\n]+)_(?![\w_])/g, "$1<em>$2</em>");

  return out.replace(
    new RegExp(`${CODE_OPEN}(\\d+)${CODE_CLOSE}`, "g"),
    (_m, index: string) => `<code>${codes[Number(index)]}</code>`,
  );
}

const RE_FENCE_OPEN = /^\s*```[A-Za-z0-9+#._-]*\s*$/;
const RE_FENCE_CLOSE = /^\s*```\s*$/;
const RE_HR = /^\s*-{3,}\s*$/;
const RE_HEADING = /^(#{1,3})\s+(.+)$/;
const RE_QUOTE = /^\s*&gt;\s?/; // escaped form — see ORDERING TRAP above
const RE_UL = /^\s*-\s+(.+)$/;
const RE_OL = /^\s*\d+\.\s+(.+)$/;
const RE_LONE_IMAGE = /^!\[([^\]\n]*)\]\(([^)\s]+)\)$/;

/** True when a line opens a new block, so paragraph accumulation must stop. */
function startsBlock(line: string): boolean {
  return (
    RE_FENCE_OPEN.test(line) ||
    RE_HR.test(line) ||
    RE_HEADING.test(line) ||
    RE_QUOTE.test(line) ||
    RE_UL.test(line) ||
    RE_OL.test(line)
  );
}

export function renderMarkdown(source: string): string {
  const normalised = source
    .replace(/\r\n?/g, "\n")
    // Control characters are stripped so they cannot smuggle anything past the
    // URL allowlist or forge the inline-code sentinels.
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");

  const lines = escapeHtml(normalised).split("\n");
  const out: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      i += 1;
      continue;
    }

    if (RE_FENCE_OPEN.test(line)) {
      const body: string[] = [];
      i += 1;
      while (i < lines.length && !RE_FENCE_CLOSE.test(lines[i])) {
        body.push(lines[i]);
        i += 1;
      }
      i += 1; // consume the closing fence (harmless past EOF)
      out.push(`<pre><code>${body.join("\n")}</code></pre>`);
      continue;
    }

    if (RE_HR.test(line)) {
      out.push("<hr />");
      i += 1;
      continue;
    }

    const heading = RE_HEADING.exec(line);
    if (heading) {
      const level = heading[1].length + 1; // "#" -> h2 ... "###" -> h4
      out.push(`<h${level}>${renderInline(heading[2].trim())}</h${level}>`);
      i += 1;
      continue;
    }

    if (RE_QUOTE.test(line)) {
      const body: string[] = [];
      while (i < lines.length && RE_QUOTE.test(lines[i])) {
        body.push(lines[i].replace(RE_QUOTE, ""));
        i += 1;
      }
      out.push(
        `<blockquote><p>${renderInline(body.join(" ").trim())}</p></blockquote>`,
      );
      continue;
    }

    if (RE_UL.test(line)) {
      const items: string[] = [];
      let match = RE_UL.exec(lines[i]);
      while (i < lines.length && match) {
        items.push(`<li>${renderInline(match[1].trim())}</li>`);
        i += 1;
        match = i < lines.length ? RE_UL.exec(lines[i]) : null;
      }
      out.push(`<ul>${items.join("")}</ul>`);
      continue;
    }

    if (RE_OL.test(line)) {
      const items: string[] = [];
      let match = RE_OL.exec(lines[i]);
      while (i < lines.length && match) {
        items.push(`<li>${renderInline(match[1].trim())}</li>`);
        i += 1;
        match = i < lines.length ? RE_OL.exec(lines[i]) : null;
      }
      out.push(`<ol>${items.join("")}</ol>`);
      continue;
    }

    // Paragraph: consume until a blank line or the start of another block.
    const paragraph: string[] = [];
    while (i < lines.length && lines[i].trim() && !startsBlock(lines[i])) {
      paragraph.push(lines[i].trim());
      i += 1;
    }
    const text = paragraph.join(" ");

    const lone = RE_LONE_IMAGE.exec(text);
    if (lone) {
      const src = safeSrc(lone[2]);
      out.push(
        src
          ? `<figure><img src="${src}" alt="${lone[1]}" loading="lazy" /></figure>`
          : `<p>${lone[1]}</p>`,
      );
      continue;
    }

    out.push(`<p>${renderInline(text)}</p>`);
  }

  return out.join("\n");
}

/** Rough reading time in minutes, floored at 1. ~200 words per minute. */
export function readingMinutes(source: string): number {
  const words = source.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}
