import { defineRouting } from "next-intl/routing";

// Central routing configuration shared by the proxy/middleware, the request
// config, and the typed navigation helpers.
export const routing = defineRouting({
  // Arabic is the default and is served at /ar; English is served at /en.
  locales: ["ar", "en"],
  defaultLocale: "ar",
  // Always prefix the pathname with the locale (e.g. "/" -> "/ar").
  localePrefix: "always",
});

// Convenience type used across the app for anything locale-aware.
export type Locale = (typeof routing.locales)[number];
