/// <reference lib="webworker" />

// ShoppIQ Service Worker — Offline-first with cache fallback
const CACHE_NAME = 'shoppiq-v1';
const STATIC_CACHE = 'shoppiq-static-v1';
const DATA_CACHE = 'shoppiq-data-v1';

// App shell files to pre-cache
const APP_SHELL = [
  '/',
  '/dashboard',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

// Install: pre-cache app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(APP_SHELL);
    })
  );
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== STATIC_CACHE && key !== DATA_CACHE && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Fetch: network-first for API, cache-first for static assets
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip Chrome extension URLs and similar
  if (!url.protocol.startsWith('http')) return;

  // Firestore API requests: network-first, cache fallback
  if (url.hostname.includes('firestore.googleapis.com') || url.hostname.includes('googleapis.com')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Clone and cache the fresh response
          const cloned = response.clone();
          caches.open(DATA_CACHE).then((cache) => {
            cache.put(request, cloned);
          });
          return response;
        })
        .catch(() => {
          // Offline: return cached data
          return caches.match(request);
        })
    );
    return;
  }

  // Static assets (JS, CSS, images, fonts): cache-first
  if (
    url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|gif|woff|woff2|ttf|ico)$/) ||
    url.hostname.includes('fonts.googleapis.com') ||
    url.hostname.includes('fonts.gstatic.com')
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          const cloned = response.clone();
          caches.open(STATIC_CACHE).then((cache) => {
            cache.put(request, cloned);
          });
          return response;
        });
      })
    );
    return;
  }

  // Navigation requests (HTML): network-first with offline fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const cloned = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, cloned);
          });
          return response;
        })
        .catch(() => {
          return caches.match(request).then((cached) => {
            return cached || caches.match('/');
          });
        })
    );
    return;
  }

  // Everything else: network-first
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});
