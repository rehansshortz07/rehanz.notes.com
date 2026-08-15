const CACHE_NAME = "uninotes-cache-v1";
const ASSETS_TO_CACHE = [
  "./index.html",
  "./style.css",
  "./script.js"
];

// Install Event - Caching Core Assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activate Event - Clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event - Serve from Cache or Network
self.addEventListener("fetch", (event) => {
  // Skip cross-origin requests like Supabase API calls or CDNs
  if (!event.request.url.startsWith(self.location.origin)) return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((networkResponse) => {
        return networkResponse;
      }).catch(() => {
        // Safe fallback for optional files like favicon or manifest
        if (event.request.url.includes("favicon.ico") || event.request.url.includes("manifest.json")) {
          return new Response("", { status: 404, statusText: "Not Found" });
        }
        
        // General offline fallback for other missing local assets
        return new Response("Offline - resource unavailable", {
          status: 503,
          statusText: "Service Unavailable",
          headers: { "Content-Type": "text/plain" }
        });
      });
    })
  );
});
