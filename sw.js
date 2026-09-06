const CACHE_NAME = "roxthal-storage-v7";
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

/*
 * Normaliza las URLs de Storage.
 *
 * Elimina parámetros utilizados únicamente
 * para romper caché desde el HTML.
 *
 * De esta manera:
 *
 * imagen.jpg?v=123
 * imagen.jpg?v=456
 *
 * utilizan exactamente la misma entrada
 * de caché del Service Worker.
 */
function normalizeStorageRequest(request) {
  try {
    const url = new URL(request.url);

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
   * Nunca intercepta INSERT, UPDATE, DELETE
   * ni operaciones administrativas.
   */

  if (isPublicMediaApi(url, request)) {
    event.respondWith(
      caches.open(MEDIA_API_CACHE).then(async cache => {
        const cached = await cache.match(request);

        /*
         * Si existe una copia local, devolverla directamente.
         *
         * NO hacer una petición silenciosa adicional
         * en cada visita.
         */
        if (cached) {
          return cached;
        }

        try {
          const fresh = await fetch(request);

          if (fresh && fresh.ok) {
            await cache.put(
              request,
              fresh.clone()
            );
          }

          return fresh;

        } catch (error) {
          throw new Error(
            "Galería de RoXThal no disponible"
          );
        }
      })
    );

    return;
  }

  /*
   * ==========================================================
   * SUPABASE STORAGE
   * ==========================================================
   *
   * CACHE FIRST REAL.
   *
   * Si la imagen ya existe localmente:
   *
   *     NO se conecta a Supabase.
   *
   * Solo descarga la imagen la primera vez.
   */

  if (isSupabaseStorage(url)) {

    /*
     * Las peticiones Range se mantienen directas.
     * Esto evita romper reproducción de vídeo/audio.
     */
    if (request.headers.has("range")) {
      event.respondWith(fetch(request));
      return;
    }

    const cacheRequest =
      normalizeStorageRequest(request);

    event.respondWith(
      caches.open(CACHE_NAME).then(async cache => {

        const cached =
          await cache.match(cacheRequest);

        /*
         * IMAGEN YA CACHÉ:
         * devolver inmediatamente.
         *
         * MUY IMPORTANTE:
         * no hacemos fetch() en segundo plano.
         */
        if (cached) {
          return cached;
        }

        /*
         * IMAGEN NO CACHÉ:
         * descargar una sola vez.
         */
        const fresh =
          await fetch(cacheRequest);

        if (fresh && fresh.ok) {
          await cache.put(
            cacheRequest,
            fresh.clone()
          );
        }

        return fresh;
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

          const response =
            await fetch(request);

          if (response && response.ok) {
            await cache.put(
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
   * RESTO DE PETICIONES
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
