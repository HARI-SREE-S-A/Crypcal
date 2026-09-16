/// <reference lib="webworker" />

/**
 * 192.168.6 Service Worker — Offline caching + PWA support.
 *
 * Strategy:
 * - App shell (HTML, CSS, JS): Cache-first with background update
 * - Matrix API calls: Network-only (never cache encrypted content)
 * - Static assets (icons, manifest): Cache-first
 */

declare const self: ServiceWorkerGlobalScope;

const CACHE_NAME = 'one92168-v1';

/** Assets to precache on install */
const PRECACHE_URLS = [
  '/',
  '/manifest.json',
  '/icon.svg',
];

/** URL patterns that should NEVER be cached (encrypted content) */
const NEVER_CACHE_PATTERNS = [
  '/_matrix/',
  '/lk-jwt/',
  '/livekit/',
];

// =============================================================================
// Install: precache app shell
// =============================================================================
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS);
    }),
  );
  // Activate immediately
  self.skipWaiting();
});

// =============================================================================
// Activate: clean old caches
// =============================================================================
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name)),
      );
    }),
  );
  // Take control of all clients immediately
  self.clients.claim();
});

// =============================================================================
// Fetch: route requests to appropriate strategy
// =============================================================================
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Never cache Matrix/LiveKit API calls — they contain encrypted content
  if (NEVER_CACHE_PATTERNS.some((pattern) => url.pathname.startsWith(pattern))) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Cache-first for static assets
  if (
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.wasm') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.json')
  ) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, clone);
            });
          }
          return response;
        });
      }),
    );
    return;
  }

  // Navigation requests: try network first, fall back to cached index.html
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match('/') as Promise<Response>;
      }),
    );
    return;
  }

  // Default: network-first
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request) as Promise<Response>;
    }),
  );
});
