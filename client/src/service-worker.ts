/// <reference lib="webworker" />

const CACHE_NAME = 'stage-monitor-v1';

const CACHED_URLS = [
  '/',
  '/index.html',
  '/manifest.json'
];

self.addEventListener('install', (event: ExtendableEvent) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(CACHED_URLS))
  );
});

self.addEventListener('fetch', (event: FetchEvent) => {
  if (event.request.url.includes('/ws/')) {
    return; // Don't cache WebSocket connections
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});

self.addEventListener('activate', (event: ExtendableEvent) => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      );
    })
  );
});

export {};
