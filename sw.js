const CACHE_NAME = "roxthal-storage-v5";
const STATIC_CACHE = "roxthal-static-v5";
const MEDIA_API_CACHE = "roxthal-media-api-v1";

const SUPABASE_HOST = "lvvhpuedktdmfehvhcwk.supabase.co";
const MEDIA_TABLE = "/rest/v1/roxthal_talleres_media";

function isSupabaseStorage(url) {
  return (
    url.hostname === SUPABASE_HOST &&
    url.pathname.includes("/storage/v1/object/public/")
  );
}

function isPublicMediaApi(url, request) {
  return (
    request.method === "GET" &&
    url.hostname === SUPABASE_HOST &&
    url.pathname === MEDIA_TABLE
  );
}

function normalizeStorageRequest(request) {
  try {
    const url = new URL(request.url);

    // Elimina únicamente nuestro cache-buster ?v=
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
              key !== STATIC_CACHE &&
              key !== MEDIA_API_CACHE
          )
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const request = event.request;

  if (request.method !== "GET") return;

  const url = new URL(request.url);

  /*
   * ==========================================================
   * GALERÍA PÚBLICA — roxthal_talleres_media
   * ==========================================================
   *
   * SOLO GET.
   *
   * Nunca intercepta INSERT, UPDATE, DELETE ni operaciones
   * administrativas.
   *
   * Estrategia:
   *   CACHE FIRST + actualización silenciosa
   */

  if (isPublicMediaApi(url, request)) {
    event.respondWith(
      caches.open(MEDIA_API_CACHE).then(async cache => {
        const cached = await cache.match(request);

        const networkRequest = fetch(request)
          .then(response => {
            if (response && response.ok) {
              cache.put(request, response.clone());
            }

            return response;
          })
          .catch(() => null);

        if (cached) {
          event.waitUntil(networkRequest);
          return cached;
        }

        const fresh = await networkRequest;

        if (fresh) {
          return fresh;
        }

        throw new Error(
          "Galería de RoXThal no disponible"
        );
      })
    );

    return;
  }

  /*
   * ==========================================================
   * SUPABASE STORAGE
   * ==========================================================
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

        if (cached) {
          event.waitUntil(networkRequest);
          return cached;
        }

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
   * ==========================================================
   * ARCHIVOS DE LA APP
   * ==========================================================
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

          const cached =
            await cache.match(request);

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
   * ==========================================================
   * RESTO
   * ==========================================================
   */

  event.respondWith(
    fetch(request).catch(() =>
      caches.match(request)
    )
  );
});

self.addEventListener("message", event => {
  if (event.data === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
