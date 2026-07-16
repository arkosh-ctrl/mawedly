import type { MetadataRoute } from "next";

// Web App Manifest → served at /manifest.webmanifest and auto-linked by Next.js.
// Makes Mawedly installable to the home screen (PWA) on Android/iOS/desktop.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "موعدلي — Mawedly",
    short_name: "موعدلي",
    description: "نظّم مواعيدك برابط حجز ذكي — بالعربية والإنجليزية.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0a7cff",
    lang: "ar",
    dir: "rtl",
    orientation: "portrait",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
