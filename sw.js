const CACHE_NAME = "roxthal-storage-v4";
const STATIC_CACHE = "roxthal-static-v4";

function isSupabaseStorage(url) {
  return (
    url.hostname.includes("supabase.co") &&
    url.pathname.includes("/storage/v1/object/public/")
  );
}

function normalizeStorageRequest(request) {
  try {
    const url = new URL(request.url);

    // Evita que ?v=Date.now(), ?v=timestamp, etc.
    // conviertan el mismo archivo en una URL diferente.
    url.searchParams.delete("v");

    return new Request(url.toString(), {
      method: "GET",
      headers: request.headers,
      mode: request.mode,
      credentials: request.credentials,
      redirect: request.redirect
    });
  } catch (_) {
    return request;
  }
}

self.addEventListener("install", event => {
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(
            key =>
              key !== CACHE_NAME &&
              key !== STATIC_CACHE
          )
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const request = event.request;

  // Solo interceptamos peticiones GET.
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  /*
   * ==========================================
   * SUPABASE STORAGE
   * ==========================================
   *
   * Estrategia:
   *   CACHE FIRST + actualización silenciosa
   *
   * Esto evita descargar repetidamente las mismas
   * imágenes/vídeos desde Supabase.
   */
  if (isSupabaseStorage(url)) {
    const cacheRequest = normalizeStorageRequest(request);

    event.respondWith(
      caches.open(CACHE_NAME).then(async cache => {
        const cached = await cache.match(cacheRequest);

        const networkRequest = fetch(cacheRequest)
          .then(response => {
            if (response && response.ok) {
              cache.put(
                cacheRequest,
                response.clone()
              );
            }

            return response;
          })
          .catch(() => null);

        // Si ya tenemos el archivo:
        // devolverlo inmediatamente y actualizar
        // la caché en segundo plano.
        if (cached) {
          event.waitUntil(networkRequest);
          return cached;
        }

        // Primera visita: necesitamos Internet.
        const fresh = await networkRequest;

        if (fresh) {
          return fresh;
        }

        throw new Error(
          "Recurso de Supabase no disponible"
        );
      })
    );

    return;
  }

  /*
   * ==========================================
   * ARCHIVOS DE LA APLICACIÓN
   * ==========================================
   *
   * HTML / JS / CSS / manifest:
   *
   * Primero Internet para garantizar que la app
   * esté actualizada.
   *
   * Si no hay conexión:
   * usar caché como respaldo.
   */
  const isNavigation =
    request.mode === "navigate";

  const isStatic =
    request.destination === "script" ||
    request.destination === "style" ||
    request.destination === "font" ||
    request.destination === "manifest";

  if (isNavigation || isStatic) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async cache => {
        try {
          const response = await fetch(request);

          if (response && response.ok) {
            cache.put(
              request,
              response.clone()
            );
          }

          return response;
        } catch (error) {
          const cached = await cache.match(request);

          if (cached) {
            return cached;
          }

          throw error;
        }
      })
    );

    return;
  }

  /*
   * ==========================================
   * RESTO DE PETICIONES
   * ==========================================
   */

  event.respondWith(
    fetch(request).catch(() =>
      caches.match(request)
    )
  );
});

/*
 * Permite actualizar el Service Worker
 * inmediatamente cuando la aplicación lo solicite.
 */
self.addEventListener("message", event => {
  if (event.data === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
