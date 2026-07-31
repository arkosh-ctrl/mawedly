import { createHash, timingSafeEqual } from "node:crypto";

/**
 * Bearer-key auth for the publishing API.
 *
 * This key exists so an agent (or any CLI) can publish WITHOUT a browser
 * session: the /admin pages sit behind a Supabase session check that a
 * headless caller cannot satisfy, and without a separate door the workflow
 * collapses into pasting thousands of characters by hand.
 *
 * Its scope is the blog and nothing else. It is deliberately NOT the cron
 * secret and NOT a service-role key: those guard far more dangerous surfaces,
 * and a key that ends up in an agent's environment should be able to do
 * exactly one thing.
 *
 * No `import "server-only"` here — on purpose, so the decision stays unit
 * testable under plain node (see tests/blog-auth.test.mts). Nothing leaks:
 * BLOG_API_KEY is not NEXT_PUBLIC_, so it is never inlined into a client
 * bundle, and in a browser the function would read `undefined` and return
 * "not_configured" — i.e. closed.
 */
export type BlogApiAuth = "ok" | "unauthorized" | "not_configured";

const MIN_KEY_LENGTH = 24;

export function authorizeBlogApi(request: Request): BlogApiAuth {
  const expected = process.env.BLOG_API_KEY;

  // No key configured means CLOSED, never open. A missing env var must not be
  // the difference between "authenticated" and "anyone can publish".
  if (!expected || expected.length < MIN_KEY_LENGTH) return "not_configured";

  const header = request.headers.get("authorization") ?? "";
  const token = header.toLowerCase().startsWith("bearer ")
    ? header.slice(7).trim()
    : "";
  if (!token) return "unauthorized";

  // Compare fixed-length digests: timingSafeEqual throws on unequal lengths,
  // and hashing first means the comparison leaks neither content nor length.
  const digest = (value: string) =>
    createHash("sha256").update(value, "utf8").digest();

  return timingSafeEqual(digest(token), digest(expected))
    ? "ok"
    : "unauthorized";
}
