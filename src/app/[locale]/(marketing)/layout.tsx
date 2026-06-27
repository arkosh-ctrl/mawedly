import { setRequestLocale } from "next-intl/server";
import { MarketingShell } from "@/components/marketing/marketing-shell";

// Shared shell for the public marketing INFO pages. Lives in a route group so it
// wraps ONLY these pages — not /[slug], /dashboard, or /login. The route group
// "(marketing)" does not affect the URL. The home page at /[locale] sits outside
// this group and uses <MarketingShell> directly.
export default async function MarketingLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <MarketingShell>{children}</MarketingShell>;
}
