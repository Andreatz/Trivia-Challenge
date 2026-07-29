const CACHE_VERSION = 'trivia-challenge-v9';
const APP_SHELL = [
  './',
  './index.html',
  './spectator.html',
  './leaderboard.html',
  './manifest.webmanifest',
  './src/app.js',
  './src/admin-auth.js',
  './src/audience-api.js',
  './src/audience-config.js',
  './src/audience-host.js',
  './src/spectator.js',
  './src/leaderboard.js',
  './src/core/audience-questions.js',
  './src/fullscreen.js',
  './src/pwa.js',
  './src/core/game-rules.js',
  './src/core/game-contracts.js',
  './src/core/game-registry.js',
  './src/core/schema.js',
  './src/core/storage.js',
  './src/core/timer.js',
  './src/styles.css',
  './src/admin-auth.css',
  './src/components.css',
  './src/anime-theme-overrides.css',
  './src/legacy-glow.css',
  './src/fullscreen.css',
  './src/audience.css',
  './src/audience-host.css',
  './public/vendor/supabase.js',
  './public/vendor/qrious.min.js',
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
