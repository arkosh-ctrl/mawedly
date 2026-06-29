import type { MetadataRoute } from "next";

const baseUrl = (
  process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
).replace(/\/+$/, "");

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Protected and non-public routes. Pages are locale-prefixed
      // (localePrefix: "always"), so dashboard/login are disallowed for both
      // locales explicitly; /api covers all API endpoints.
      disallow: [
        "/ar/dashboard",
        "/en/dashboard",
        "/ar/login",
        "/en/login",
        "/api/",
      ],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
