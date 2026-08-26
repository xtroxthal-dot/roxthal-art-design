const CACHE_NAME = "roxthal-app-v2";

self.addEventListener("install", event => {
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    )
  );

  self.clients.claim();
});

self.addEventListener("fetch", event => {
  const request = event.request;

  // No guardar imágenes en la caché.
  // Así, cuando cambies una foto en Supabase,
  // los demás dispositivos recibirán la nueva.
  if (
    request.destination === "image" ||
    request.url.includes("/storage/v1/object/public/")
  ) {
    event.respondWith(
      fetch(request, {
        cache: "no-store"
      }).catch(() => caches.match(request))
    );
    return;
  }

  // Para HTML, JS y CSS: intentar primero la versión de Internet.
  event.respondWith(
    fetch(request, {
      cache: "no-store"
    }).catch(() => caches.match(request))
  );
});
