import createMiddleware from "next-intl/middleware";
import { type NextRequest } from "next/server";
import { routing } from "./i18n/routing";
import { updateSession } from "./lib/supabase/middleware";

// On Next.js 15 this file must be named middleware.ts (renamed to proxy.ts in
// Next.js 16+).
const handleI18nRouting = createMiddleware(routing);

export async function middleware(request: NextRequest) {
  // 1. Locale routing first (may redirect "/" -> "/ar" and set the locale cookie).
  const response = handleI18nRouting(request);
  // 2. Refresh the Supabase session on that response and guard /dashboard routes.
  return updateSession(request, response);
}

export const config = {
  // Run on all pathnames except API routes, the locale-agnostic /auth callback,
  // Next internals, and files with an extension (e.g. .png, .ico). This keeps
  // locale prefixing on real pages, including the public booking route
  // /[locale]/[slug] added later.
  matcher: ["/((?!api|trpc|auth|_next|_vercel|.*\\..*).*)"],
};
