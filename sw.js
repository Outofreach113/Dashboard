/* Daily Planner service worker: cache the app shell so the home-screen app
   opens fast and survives a flaky connection. Live data (weather, quotes,
   Supabase) is never cached here — it is always fetched fresh. */
const CACHE = "daily-planner-v1";
const CORE = ["./", "./index.html", "./manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(CORE)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  // Only handle same-origin navigation and core files; everything else
  // (Supabase, quotes, weather, Google) goes straight to the network.
  if (event.request.mode === "navigate" || (url.origin === location.origin && CORE.some((c) => url.pathname.endsWith(c.replace("./", ""))))) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(() => caches.match(event.request).then((cached) => cached || caches.match("./index.html")))
    );
  }
});
