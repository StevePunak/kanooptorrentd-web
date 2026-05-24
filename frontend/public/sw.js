// Minimal service worker — exists only to satisfy Chrome's PWA
// installability requirement. No caching: stale data in an admin UI is a
// nightmare we don't want to debug. Add caching here only when there's a
// concrete reason and a strategy to invalidate it.

self.addEventListener('install', (e) => self.skipWaiting());
self.addEventListener('activate', (e) => self.clients.claim());
self.addEventListener('fetch', () => {}); // empty handler satisfies installability
