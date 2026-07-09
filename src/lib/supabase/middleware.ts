import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "@/i18n/routing";
import type { Database } from "./database.types";

// Pathname is already locale-prefixed at this point (e.g. /ar/dashboard).
function isProtectedPath(pathname: string): boolean {
  return /^\/(ar|en)\/(dashboard|admin)(\/|$)/.test(pathname);
}

function localeFromPath(pathname: string): string {
  const segment = pathname.split("/")[1];
  return routing.locales.includes(segment as (typeof routing.locales)[number])
    ? segment
    : routing.defaultLocale;
}

// Refreshes the Supabase session on the existing (i18n) response and enforces
// authentication on protected routes. The response is produced first by the
// next-intl middleware and passed in so cookies from both layers are merged.
export async function updateSession(
  request: NextRequest,
  response: NextResponse,
): Promise<NextResponse> {
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Write refreshed cookies onto both the request (for downstream
          // server components) and the outgoing response (for the browser).
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANT: do not run logic between client creation and getClaims().
  // getClaims() validates the JWT signature and refreshes the session.
  const { data } = await supabase.auth.getClaims();
  const isAuthenticated = Boolean(data?.claims);

  if (!isAuthenticated && isProtectedPath(request.nextUrl.pathname)) {
    const locale = localeFromPath(request.nextUrl.pathname);
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}/login`;
    url.searchParams.set("next", request.nextUrl.pathname);

    const redirect = NextResponse.redirect(url);
    // Carry refreshed auth cookies over to the redirect response.
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    return redirect;
  }

  return response;
}
