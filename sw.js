const CACHE_NAME = 'nepali-patro-v2026-08-21-01';
const APP_SHELL = ['./', './index.html', './manifest.json', './assets/logo.svg'];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;

  const url = new URL(request.url);
  const isDocument = request.mode === 'navigate' || request.destination === 'document';
  const isData = url.pathname.includes('/data/') || url.pathname.endsWith('.json');
  const isAsset = ['script', 'style', 'font', 'image'].includes(request.destination);

  // HTML and JSON must always revalidate. These are the files most likely to change between deployments.
  if (isDocument || isData) {
    event.respondWith(
      fetch(request, { cache: 'no-store' })
        .then(response => {
          if (response.ok && isDocument) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, copy)).catch(() => {});
          }
          return response;
        })
        .catch(() => caches.match(request).then(cached => cached || caches.match('./index.html')))
    );
    return;
  }

  // Static assets use cache-first, but the cache is versioned and replaced on every deployment.
  if (isAsset) {
    event.respondWith(
      caches.match(request).then(cached => cached || fetch(request).then(response => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, copy)).catch(() => {});
        }
        return response;
      }))
    );
  }
});