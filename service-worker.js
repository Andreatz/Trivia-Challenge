const CACHE_VERSION = 'trivia-challenge-v4';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './src/app.js',
  './src/fullscreen.js',
  './src/pwa.js',
  './src/core/game-rules.js',
  './src/core/game-contracts.js',
  './src/core/game-registry.js',
  './src/core/schema.js',
  './src/core/storage.js',
  './src/core/timer.js',
  './src/styles.css',
  './src/components.css',
  './src/anime-theme-overrides.css',
  './src/legacy-glow.css',
  './src/fullscreen.css',
  './public/assets/favicon.svg',
  './public/assets-manifest.json',
  './public/thumbnails-manifest.json',
  './public/assets/Background.jpeg'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_VERSION).then(cache => cache.addAll(APP_SHELL)));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_VERSION).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;
      return fetch(request).then(response => {
        if (!response || !response.ok) return response;
        const copy = response.clone();
        caches.open(CACHE_VERSION).then(cache => cache.put(request, copy));
        return response;
      });
    })
  );
});

self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});
