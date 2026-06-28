import { SiteNav } from "./site-nav";
import { SiteFooter } from "./site-footer";

// Shared public chrome (navbar + footer). Used by the (marketing) route-group
// layout for the info pages, and directly by the home page (which sits outside
// the group at /[locale]) so both share exactly one nav/footer implementation.
export function MarketingShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-canvas text-ink">
      <SiteNav />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
