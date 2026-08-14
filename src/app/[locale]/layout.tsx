import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { PWARegister } from "@/components/pwa-register";
import { WebAnalytics } from "@/components/analytics/web-analytics";
import { AttributionCapture } from "@/components/attribution-capture";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import {
  IBM_Plex_Sans,
  IBM_Plex_Sans_Arabic,
  IBM_Plex_Mono,
} from "next/font/google";
import { routing } from "@/i18n/routing";
import { METADATA_BASE } from "@/lib/seo/metadata";
import "../globals.css";

// NOTE ON FONT LOADING — every family here costs one blocking request per
// weight in the critical path, so the set is kept deliberately minimal.
//
// There is no display face on purpose: globals.css maps the --font-display
// token onto the body stack ("headings share the body face"). A Tajawal import
// used to live here and shipped eight unused files on every page load; it was
// removed once the Cal-Apple redesign dropped the second voice.

// Arabic UI body font (default locale) — the ONLY preloaded family. Its
// character set already covers Latin glyphs, which is what makes deferring the
// Latin face below safe on Arabic pages.
const arabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-arabic",
  display: "swap",
});

// Latin body font for English content and Latin glyphs inside Arabic text.
// preload: false — it still loads wherever it is used, but it no longer blocks
// first paint. On /ar the Arabic face renders Latin text acceptably until it
// arrives; on /en it is fetched as soon as the stylesheet resolves.
const latin = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-latin",
  display: "swap",
  preload: false,
});

// Tabular mono for the ledger data — times, prices, IBANs, dates (always LTR).
// Weights match actual usage: 400 default, 500 (font-medium), 700 (font-bold).
// 600 was loaded and never used, while font-bold had no real 700 to bind to and
// was being synthesised by the browser.
const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-mono",
  display: "swap",
  preload: false,
});

// Root-level fallback ONLY. Every public page overrides all of this through
// pageMetadata() (src/lib/seo/metadata.ts); what survives here is the app-shell
// metadata that has no per-page variant.
//
// The description used to read "deposit-based appointment booking", which was
// served on roughly 25 routes and read as though the platform handles the
// money. It does not: payment happens directly between provider and customer,
// and every legal page says so. metadataBase belongs here so relative URLs
// resolve against the canonical www origin instead of localhost.
export const metadata: Metadata = {
  metadataBase: METADATA_BASE,
  title: "Mawedly — موعدلي",
  description:
    "Bilingual (Arabic/English) appointment scheduling for the Gulf. A scheduling tool only — Mawedly never handles your money.",
  appleWebApp: { capable: true, title: "موعدلي", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#0a7cff",
};

// Pre-render a route for every supported locale at build time.
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  // In Next.js 15 dynamic params are async and must be awaited.
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  // Make the locale available to server components and enable static rendering.
  setRequestLocale(locale);

  // Direction is derived from the locale: Arabic is RTL, everything else LTR.
  const dir = locale === "ar" ? "rtl" : "ltr";

  return (
    <html
      lang={locale}
      dir={dir}
      className={`${arabic.variable} ${latin.variable} ${mono.variable}`}
    >
      <body className="antialiased">
        {/* Messages and locale are inherited from the request config. */}
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
        <PWARegister />
        {/* Loaded sitewide so an answer-engine referral is captured wherever it
            lands — a blog post and a use-case page are likelier entry points
            than the home page. */}
        <WebAnalytics />
        {/* Mounted sitewide for the same reason as WebAnalytics: the landing
            page carrying the campaign tag is usually a blog post, not /signup,
            and the tag is gone by the time the merchant reaches the form. */}
        <AttributionCapture />
      </body>
    </html>
  );
}
