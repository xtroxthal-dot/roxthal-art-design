const CACHE_NAME = "roxthal-app-v3";

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
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const request = event.request;

  // No guardar imágenes en la caché.
  // Así, las imágenes nuevas de Supabase se cargan directamente.
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

  // Para HTML, JS y CSS:
  // primero intentar siempre la versión actual de Internet.
  event.respondWith(
    fetch(request, {
      cache: "no-store"
    }).catch(() => caches.match(request))
  );
});

// Avisar a las páginas abiertas cuando el nuevo Service Worker
// ya está activo para que puedan actualizarse.
self.addEventListener("message", event => {
  if (event.data === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
