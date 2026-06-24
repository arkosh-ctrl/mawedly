import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

// Resolves the active locale for each request and loads its message catalog.
// Used by server components via the next-intl plugin (see next.config.ts).
export default getRequestConfig(async ({ requestLocale }) => {
  // `requestLocale` typically corresponds to the [locale] segment.
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
