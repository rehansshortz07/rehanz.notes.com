const CACHE_NAME = "learn-engineering-v4";

const ASSETS_TO_CACHE = [
  "./",
  "./index.html",
  "./style.css",
  "./script.js",
  "./manifest.json",
  "./icon-512.png"
];

/* =========================================================
   INSTALL
   Download the new version into a NEW cache.
   Do NOT activate it immediately.
   ========================================================= */

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );

  // IMPORTANT:
  // Do not call skipWaiting() here.
  // We want the page to show "Update Available".
});


/* =========================================================
   ACTIVATE
   Delete old caches.
   ========================================================= */

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => cacheName !== CACHE_NAME)
          .map((cacheName) => caches.delete(cacheName))
      );
    })
  );
});


/* =========================================================
   FETCH
   Network-first for HTML.
   Cache-first for static assets.
   ========================================================= */

self.addEventListener("fetch", (event) => {

  // Only handle same-origin requests.
  if (new URL(event.request.url).origin !== self.location.origin) {
    return;
  }

  // Ignore non-GET requests.
  if (event.request.method !== "GET") {
    return;
  }

  const request = event.request;
  const url = new URL(request.url);

  /*
   * HTML/navigation:
   *
   * Always try the network first.
   * This makes new deployments detectable much faster.
   */
  if (
    request.mode === "navigate" ||
    url.pathname.endsWith(".html") ||
    url.pathname === "/"
  ) {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {

          // Update cached HTML with the latest version.
          const responseClone = networkResponse.clone();

          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });

          return networkResponse;
        })
        .catch(() => {
          return caches.match(request);
        })
    );

    return;
  }


  /*
   * Static files:
   * Cache first, then network.
   */
  event.respondWith(
    caches.match(request).then((cachedResponse) => {

      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(request).then((networkResponse) => {

        if (
          networkResponse &&
          networkResponse.status === 200 &&
          networkResponse.type === "basic"
        ) {
          const responseClone = networkResponse.clone();

          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
        }

        return networkResponse;
      });
    })
  );
});


/* =========================================================
   MESSAGE
   The website sends SKIP_WAITING when the user
   clicks "Update Now".
   ========================================================= */

self.addEventListener("message", (event) => {

  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }

});
