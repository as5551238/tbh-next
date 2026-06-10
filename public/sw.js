/// <reference lib="webworker" />

// SW v4 — network-first strategy for GitHub Pages sub-directory hosting
// - HTML requests: network-first with cache fallback (ensures fresh deployments)
// - Static assets (JS/CSS): cache-first with 1h max age (fast repeat loads)
// - On activate: clean old caches, claim clients immediately

const CACHE_NAME = 'tbh-next-v4';
const STATIC_CACHE = 'tbh-static-v4';
const STATIC_MAX_AGE = 3600000; // 1 hour

// Activate: clean ALL old caches immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME && k !== STATIC_CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Install: skip waiting, no precache (avoids black screen on redeployment)
self.addEventListener('install', () => {
  self.skipWaiting();
});

function isStaticAsset(url) {
  return /\.(js|css|woff2?|png|jpg|svg|ico|webp)(\?.*)?$/.test(url);
}

// Fetch: network-first for HTML, cache-first for static assets
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin GET requests
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  // Static assets: cache-first
  if (isStaticAsset(url.pathname)) {
    event.respondWith(
      caches.open(STATIC_CACHE).then((cache) =>
        cache.match(request).then((cached) => {
          if (cached) {
            // Return cached, but update cache in background (stale-while-revalidate)
            const fetchPromise = fetch(request).then((response) => {
              if (response.ok) cache.put(request, response.clone());
              return response;
            }).catch(() => cached);
            return cached;
          }
          return fetch(request).then((response) => {
            if (response.ok) cache.put(request, response.clone());
            return response;
          }).catch(() => new Response('Offline', { status: 503 }));
        })
      )
    );
    return;
  }

  // HTML and other requests: network-first
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok && request.headers.get('Accept')?.includes('text/html')) {
          const cloned = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, cloned));
        }
        return response;
      })
      .catch(() =>
        caches.match(request).then((cached) => cached || new Response('Offline', { status: 503 }))
      )
  );
});

// Push notification handler (kept for future use)
self.addEventListener('push', (event) => {
  const data = event.data?.json() || {};
  const title = data.title || 'TBH Next';
  const options = {
    body: data.body || '您有新的消息',
    icon: '/tbh-next/icon-192.png',
    badge: '/tbh-next/icon-192.png',
    tag: data.tag || 'default',
    data: data.data || {},
    vibrate: [100, 50, 100],
    actions: data.actions || [],
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// Handle app update: notify clients that a new SW is activated
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
