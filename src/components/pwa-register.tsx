"use client";

import { useEffect } from "react";

// Registers the service worker (production only) so Mawedly is installable and
// shows an offline fallback. The SW is deliberately minimal — it never caches
// authenticated HTML or API responses, so SSR + cookie auth stay correct.
export function PWARegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    const onLoad = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Registration failures are non-fatal — the app works without the SW.
      });
    };
    window.addEventListener("load", onLoad);
    return () => window.removeEventListener("load", onLoad);
  }, []);

  return null;
}
