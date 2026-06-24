import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

// Point the plugin at our request config so server components can resolve
// the active locale and load the matching message catalog.
const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // Project-wide Next.js options go here (kept empty for the scaffold step).
};

export default withNextIntl(nextConfig);
