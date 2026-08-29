/* =========================================================
   RoXThal Art Design
   NUEVA APP — sw.js
   Service Worker
   ========================================================= */

const CACHE_NAME = "roxthal-art-design-v2";

/*
 * Solo guardamos el núcleo de la aplicación.
 * Los datos dinámicos de Supabase NO se almacenan aquí.
 */

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
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
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
            .filter(
              (name) =>
                name.startsWith(
                  "roxthal-art-design-"
                ) &&
                name !== CACHE_NAME
            )
            .map((name) =>
              caches.delete(name)
            )
        );
      })
      .then(() =>
        self.clients.claim()
      )
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

  const url =
    new URL(request.url);

  /*
   * Las peticiones externas, especialmente Supabase,
   * NO pasan por nuestra caché.
   */

  if (
    url.origin !== self.location.origin
  ) {
    return;
  }

  /*
   * Para HTML utilizamos siempre la versión
   * más reciente disponible en Internet.
   */

  if (
    request.mode === "navigate" ||
    request.destination === "document"
  ) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          return response;
        })
        .catch(() =>
          caches.match("./index.html")
        )
    );

    return;
  }

  /*
   * CSS y JavaScript:
   * red primero, caché como respaldo.
   */

  event.respondWith(
    fetch(request)
      .then((response) => {

        if (
          response &&
          response.status === 200
        ) {
          const copy =
            response.clone();

          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(
                request,
                copy
              );
            });
        }

        return response;
      })
      .catch(() =>
        caches.match(request)
      )
  );
});

/* =========================================================
   MENSAJES
   ========================================================= */

self.addEventListener(
  "message",
  (event) => {

    if (
      event.data?.type ===
      "SKIP_WAITING"
    ) {
      self.skipWaiting();
    }

  }
);
