const CACHE_NAME = 'my-madam-g-v4';
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

async function broadcast(message) {
  const clients = await self.clients.matchAll({ includeUncontrolled: true });
  clients.forEach((c) => c.postMessage(message));
}

/** Precache with cache: 'reload' — a plain cache.addAll() would let the
 * browser/CDN's HTTP cache hand back stale bytes for unchanged URLs, locking
 * an old version into the Cache Storage entry until the next version bump.
 * DIAGNOSTIC BUILD: postMessage checkpoints, to find out why the live
 * precache came up empty. */
self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      await broadcast({ type: 'sw-debug', step: 'install-start' });
      try {
        const cache = await caches.open(CACHE_NAME);
        await broadcast({ type: 'sw-debug', step: 'cache-opened' });
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
        await broadcast({ type: 'sw-debug', step: 'loop-done', results });
        self.skipWaiting();
      } catch (err) {
        await broadcast({ type: 'sw-debug', step: 'install-error', error: String(err), stack: err?.stack });
        throw err;
      }
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
