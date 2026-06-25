import { routing } from "@/i18n/routing";

// Accept only internal, locale-prefixed paths as redirect targets. This blocks
// open-redirect tricks where new URL(next, origin) resolves to an external host:
//   "//evil.com"  and  "/\\evil.com"  both pass a naive startsWith("/") check
//   but resolve to http://evil.com/.
// Returns the path if safe, otherwise null.
export function safeNextPath(next: string | null | undefined): string | null {
  if (!next) return null;
  // Backslashes can be normalized to "/" by some parsers — reject outright.
  if (next.includes("\\")) return null;
  // Must start with "/<locale>" followed by "/" or end of string.
  const pattern = new RegExp(`^/(${routing.locales.join("|")})(/|$)`);
  return pattern.test(next) ? next : null;
}
