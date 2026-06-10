/// <reference lib="webworker" />

// SW v3 — no-op for sub-directory hosting (GitHub Pages)
// The SW cache-first strategy was causing black screen on redeployment
// because PRECACHE_URLS used root paths instead of /tbh-next/ paths.
// This version simply passes all requests through to the network.

const CACHE_NAME = 'tbh-next-v3';

// Activate: clean ALL old caches immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Install: skip waiting, no precache
self.addEventListener('install', () => {
  self.skipWaiting();
});

// Fetch: network-only (SW is effectively disabled)
self.addEventListener('fetch', (event) => {
  // Do not intercept any requests — let browser handle everything
  // This ensures fresh content on every deployment
});

// Push notification handler (kept for future use)
self.addEventListener('push', (event) => {
  const data = event.data?.json() || {};
  const title = data.title || 'TBH Next';
  const options = {
    body: data.body || '您有新的消息',
    icon: '/tbh-next/favicon.svg',
    badge: '/tbh-next/favicon.svg',
    tag: data.tag || 'default',
    data: data.data || {},
    vibrate: [100, 50, 100],
    actions: data.actions || [],
  };
  event.waitUntil(self.registration.showNotification(title, options));
});
