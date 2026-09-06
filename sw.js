const CACHE_NAME = "roxthal-storage-v7";
const STATIC_CACHE = "roxthal-static-v5";
const MEDIA_API_CACHE = "roxthal-media-api-v2";
const MEDIA_API_META_CACHE = "roxthal-media-api-meta-v1";

const SUPABASE_HOST = "lvvhpuedktdmfehvhcwk.supabase.co";
const MEDIA_TABLE = "/rest/v1/roxthal_talleres_media";

/*
 * ==========================================================
 * ROXTHAL ART DESIGN — SERVICE WORKER v8
 * ==========================================================
 *
 * OBJETIVOS:
 *
 * 1. Proteger Supabase Storage contra egress repetitivo.
 * 2. Mantener las imágenes en caché real.
 * 3. No hacer fetch silencioso de imágenes ya almacenadas.
 * 4. Mantener vídeos/audio con Range funcionando.
 * 5. Mantener actualizada la galería pública.
 *
 * IMPORTANTE:
 *
 * CACHE_NAME se mantiene en v7 deliberadamente.
 *
 * No se cambia a v8 para evitar borrar la caché existente
 * de imágenes y provocar otra descarga masiva.
 *
 * ==========================================================
 */

const MEDIA_API_TTL = 10 * 60 * 1000;


/* ==========================================================
   IDENTIFICACIÓN DE PETICIONES
   ========================================================== */

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


/* ==========================================================
   NORMALIZACIÓN STORAGE
   ========================================================== */

function normalizeStorageRequest(request) {

  try {

    const url = new URL(request.url);

    /*
     * Eliminamos solamente el parámetro ?v=
     * utilizado por el HTML para cache-busting.
     */

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


/* ==========================================================
   CONTROL DE TIEMPO DE GALERÍA
   ========================================================== */

async function getMediaApiTimestamp() {

  try {

    const metaCache =
      await caches.open(MEDIA_API_META_CACHE);

    const key =
      new Request(
        "https://roxthal.local/__media_api_last_refresh__"
      );

    const response =
      await metaCache.match(key);

    if (!response) {
      return 0;
    }

    const text =
      await response.text();

    const timestamp =
      Number(text);

    if (!Number.isFinite(timestamp)) {
      return 0;
    }

    return timestamp;

  } catch (_) {

    return 0;

  }

}


async function setMediaApiTimestamp(timestamp) {

  try {

    const metaCache =
      await caches.open(MEDIA_API_META_CACHE);

    const key =
      new Request(
        "https://roxthal.local/__media_api_last_refresh__"
      );

    await metaCache.put(

      key,

      new Response(
        String(timestamp),
        {
          headers: {
            "Content-Type": "text/plain"
          }
        }
      )

    );

  } catch (_) {

    /*
     * Si falla solamente el registro temporal,
     * no se bloquea la galería.
     */

  }

}


/* ==========================================================
   ACTUALIZACIÓN CONTROLADA DE GALERÍA
   ========================================================== */

async function refreshMediaApi(request, cache) {

  try {

    const fresh =
      await fetch(request);

    if (fresh && fresh.ok) {

      await cache.put(
        request,
        fresh.clone()
      );

      await setMediaApiTimestamp(
        Date.now()
      );

    }

    return fresh;

  } catch (error) {

    /*
     * Si Supabase está restringido o no disponible,
     * mantenemos la copia local.
     */

    return null;

  }

}


/* ==========================================================
   INSTALL
   ========================================================== */

self.addEventListener("install", event => {

  self.skipWaiting();

});


/* ==========================================================
   ACTIVATE
   ========================================================== */

self.addEventListener("activate", event => {

  event.waitUntil(

    caches.keys().then(keys =>

      Promise.all(

        keys
          .filter(key => {

            /*
             * Conservamos las cachés actuales de la app.
             */

            return (
              key !== CACHE_NAME &&
              key !== STATIC_CACHE &&
              key !== MEDIA_API_CACHE &&
              key !== MEDIA_API_META_CACHE
            );

          })
          .map(key => caches.delete(key))

      )

    ).then(() =>

      self.clients.claim()

    )

  );

});


/* ==========================================================
   FETCH
   ========================================================== */

self.addEventListener("fetch", event => {

  const request =
    event.request;

  /*
   * Solo GET.
   */

  if (request.method !== "GET") {
    return;
  }


  const url =
    new URL(request.url);


  /* ========================================================
     GALERÍA PÚBLICA
     ======================================================== */

  if (isPublicMediaApi(url, request)) {

    event.respondWith(

      caches.open(MEDIA_API_CACHE).then(
        async cache => {

          const cached =
            await cache.match(request);

          const lastRefresh =
            await getMediaApiTimestamp();

          const now =
            Date.now();

          const cacheIsFresh =
            cached &&
            lastRefresh > 0 &&
            (now - lastRefresh) < MEDIA_API_TTL;


          /*
           * ------------------------------------------------
           * CACHÉ ACTUALIZADA
           * ------------------------------------------------
           *
           * No hacemos ninguna petición.
           */

          if (cacheIsFresh) {

            return cached;

          }


          /*
           * ------------------------------------------------
           * CACHÉ EXISTENTE PERO CADUCADA
           * ------------------------------------------------
           *
           * Devolvemos inmediatamente la copia local.
           *
           * La actualización se hace UNA sola vez,
           * solamente cuando ha vencido el TTL.
           */

          if (cached) {

            const refreshPromise =
              refreshMediaApi(
                request,
                cache
              );

            event.waitUntil(
              refreshPromise.catch(
                () => {}
              )
            );

            return cached;

          }


          /*
           * ------------------------------------------------
           * NO EXISTE CACHÉ
           * ------------------------------------------------
           *
           * Primera descarga.
           */

          const fresh =
            await refreshMediaApi(
              request,
              cache
            );


          if (fresh) {
            return fresh;
          }


          throw new Error(
            "Galería de RoXThal no disponible"
          );

        }

      )

    );

    return;

  }


  /* ========================================================
     SUPABASE STORAGE
     ======================================================== */

  if (isSupabaseStorage(url)) {


    /*
     * --------------------------------------------------------
     * RANGE
     * --------------------------------------------------------
     *
     * Vídeos/audio:
     * no interceptamos Range para no romper reproducción.
     */

    if (request.headers.has("range")) {

      event.respondWith(
        fetch(request)
      );

      return;

    }


    const cacheRequest =
      normalizeStorageRequest(
        request
      );


    event.respondWith(

      caches.open(CACHE_NAME).then(
        async cache => {

          const cached =
            await cache.match(
              cacheRequest
            );


          /*
           * ------------------------------------------------
           * IMAGEN YA CACHÉ
           * ------------------------------------------------
           *
           * ESTA ES LA PARTE CRÍTICA.
           *
           * NO hacemos fetch().
           * NO hacemos actualización silenciosa.
           * NO conectamos nuevamente con Supabase.
           */

          if (cached) {

            return cached;

          }


          /*
           * ------------------------------------------------
           * IMAGEN NO CACHÉ
           * ------------------------------------------------
           *
           * Se descarga solamente la primera vez.
           */

          const fresh =
            await fetch(
              cacheRequest
            );


          if (
            fresh &&
            fresh.ok
          ) {

            await cache.put(

              cacheRequest,

              fresh.clone()

            );

          }


          return fresh;

        }

      )

    );

    return;

  }


  /* ========================================================
     ARCHIVOS ESTÁTICOS DE LA APP
     ======================================================== */

  const isNavigation =
    request.mode === "navigate";


  const isStatic =
    request.destination === "script" ||
    request.destination === "style" ||
    request.destination === "font" ||
    request.destination === "manifest";


  if (
    isNavigation ||
    isStatic
  ) {

    event.respondWith(

      caches.open(STATIC_CACHE).then(
        async cache => {

          try {

            const response =
              await fetch(request);


            if (
              response &&
              response.ok
            ) {

              await cache.put(

                request,

                response.clone()

              );

            }


            return response;

          } catch (error) {

            const cached =
              await cache.match(
                request
              );


            if (cached) {

              return cached;

            }


            throw error;

          }

        }

      )

    );

    return;

  }


  /* ========================================================
     RESTO DE PETICIONES
     ======================================================== */

  event.respondWith(

    fetch(request).catch(
      () => caches.match(request)
    )

  );

});


/* ==========================================================
   MENSAJES
   ========================================================== */

self.addEventListener("message", event => {

  if (
    event.data ===
    "SKIP_WAITING"
  ) {

    self.skipWaiting();

  }

});
