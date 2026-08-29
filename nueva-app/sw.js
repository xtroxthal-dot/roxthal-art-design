/* =========================================================
   RoXThal Art Design
   NUEVA APP — sw.js
   Service Worker
   ========================================================= */

const CACHE_NAME = "roxthal-art-design-v1";

const APP_SHELL = [
  "./",
  "./index.html",
  "./app.css",
  "./app.js",
  "./admin.js",
  "./pwa.js",
  "./manifest.json"
];

/* =========================================================
   INSTALL
   ========================================================= */

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(APP_SHELL);
      })
      .then(() => {
        return self.skipWaiting();
      })
  );
});

/* =========================================================
   ACTIVATE
   ========================================================= */

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => {
              return (
                name.startsWith(
                  "roxthal-art-design-"
                ) &&
                name !== CACHE_NAME
              );
            })
            .map((name) => {
              return caches.delete(name);
            })
        );
      })
      .then(() => {
        return self.clients.claim();
      })
  );
});

/* =========================================================
   FETCH
   ========================================================= */

self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  /*
   * Solo gestionamos recursos de nuestra propia aplicación.
   * Las peticiones externas, incluyendo Supabase,
   * continúan directamente hacia Internet.
   */

  if (url.origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    fetch(request)
      .then((response) => {

        if (
          response &&
          response.status === 200
        ) {
          const responseClone =
            response.clone();

          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(
                request,
                responseClone
              );
            });
        }

        return response;
      })
      .catch(() => {
        return caches.match(request);
      })
  );
});

/* =========================================================
   MENSAJES
   ========================================================= */

self.addEventListener("message", (event) => {

  if (
    event.data &&
    event.data.type === "SKIP_WAITING"
  ) {
    self.skipWaiting();
  }

});
