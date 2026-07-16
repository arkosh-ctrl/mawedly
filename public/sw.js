// Mawedly service worker — intentionally minimal so SSR + cookie auth stay
// correct. It NEVER caches authenticated HTML or API responses.
//
// Strategy:
//   - Navigations (HTML): network-first; if offline, show /offline.html.
//   - Immutable build assets (/_next/static) + icons: cache-first.
//   - Everything else (API, auth, Supabase, etc.): pass straight to the network.

const CACHE = "mawedly-v1";
const OFFLINE_URL = "/offline.html";
const PRECACHE = [OFFLINE_URL, "/icon-192.png", "/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;

  // Cache-first for immutable static assets only.
  if (sameOrigin && (url.pathname.startsWith("/_next/static/") || PRECACHE.includes(url.pathname))) {
    event.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
        return res;
      })),
    );
    return;
  }

  // Network-first for page navigations, with an offline fallback.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).catch(() => caches.match(OFFLINE_URL)),
    );
    return;
  }

  // Everything else: straight to the network (no caching of API/auth).
});
