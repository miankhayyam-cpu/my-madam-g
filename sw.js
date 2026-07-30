const CACHE_NAME = 'my-madam-g-v3';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css',
  './js/app.js',
  './js/storage.js',
  './js/cycle.js',
  './js/render/calendar.js',
  './js/render/dayEditor.js',
  './js/render/insights.js',
  './js/render/settings.js',
  './js/render/partnerPrompt.js',
  './js/render/reminder.js',
  './js/render/dayView.js',
  './js/render/scheduleEditor.js',
  './js/crypto.js',
  './js/drive.js',
  './js/drive-config.js',
  './js/sync.js',
  './js/exercise.js',
  './partner.html',
  './js/partner.js',
  './icons/icon.svg',
];

/** Precache with cache: 'reload' — a plain cache.addAll() would let the
 * browser/CDN's HTTP cache hand back stale bytes for unchanged URLs, locking
 * an old version into the Cache Storage entry until the next version bump.
 * DIAGNOSTIC BUILD: per-file try/catch + a debug entry, to find out why the
 * live precache came up empty. */
self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const results = [];
      for (const url of ASSETS) {
        try {
          const res = await fetch(url, { cache: 'reload' });
          await cache.put(url, res.clone());
          results.push({ url, status: res.status });
        } catch (err) {
          results.push({ url, error: String(err) });
        }
      }
      await cache.put('./__sw-debug__', new Response(JSON.stringify(results)));
      self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(() => cached);
    })
  );
});
