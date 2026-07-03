import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import {
  IBM_Plex_Sans,
  IBM_Plex_Sans_Arabic,
  IBM_Plex_Mono,
  Tajawal,
} from "next/font/google";
import { routing } from "@/i18n/routing";
import "../globals.css";

// Display face — geometric, confident, covers Arabic + Latin. Used for
// headings via the --font-display stack (the "Daybook" voice).
const display = Tajawal({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "700", "800"],
  variable: "--font-display",
  display: "swap",
});

// Arabic UI body font (default locale). Exposed as a CSS variable so the stack
// in globals.css can prefer it.
const arabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-arabic",
  display: "swap",
});

// Latin body font for English content and Latin glyphs inside Arabic text.
const latin = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-latin",
  display: "swap",
});

// Tabular mono for the ledger data — times, prices, IBANs, dates (always LTR).
const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Mawedly",
  description:
    "Bilingual deposit-based appointment booking for consultants, educators, and health & legal experts.",
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
      className={`${display.variable} ${arabic.variable} ${latin.variable} ${mono.variable}`}
    >
      <body className="antialiased">
        {/* Messages and locale are inherited from the request config. */}
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
