// FinMaster Service Worker - 100% Offline PWA
const CACHE_NAME = 'finmaster-v25';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './favicon.svg',
  './icon.svg',
  './css/variables.css',
  './css/base.css',
  './css/components.css',
  './css/calendar.css',
  './css/screens.css',
  './css/style.css',
  './js/db.js',
  './js/sound.js',
  './js/constants.js',
  './js/state.js',
  './js/utils.js',
  './js/overview.js',
  './js/swipe.js',
  './js/transactions.js',
  './js/analytics.js',
  './js/work.js',
  './js/settings.js',
  './js/budgets.js',
  './js/recurring.js',
  './js/journal.js',
  './js/savings.js',
  './js/wizard.js',
  './js/categories.js',
  './js/map.js',
  './js/motion.js',
  './js/events.js',
  './js/app.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[FinMaster SW] Caching app shell assets');
      return cache.addAll(ASSETS_TO_CACHE).catch((err) => {
        console.warn('[FinMaster SW] Pre-caching warning:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[FinMaster SW] Deleting old cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Navigation fallback to index.html
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Cache-first for local assets, fallback to network
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;
      return fetch(event.request).then((networkResponse) => {
        // Cache external or dynamic assets if valid
        if (networkResponse && networkResponse.status === 200 && event.request.method === 'GET') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Offline fallback or failed external request
        return new Response(null, { status: 504, statusText: 'Offline' });
      });
    })
  );
});
