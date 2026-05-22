const CACHE = 'tokyo-called-v2';
const ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './data/actions.json',
  './data/timing.json',
  './js/main.js',
  './js/state.js',
  './js/language.js',
  './js/save.js',
  './js/npcs.js',
  './js/locations.js',
  './js/resources.js',
  './js/actions.js',
  './js/gameData.js',
  './js/parseDuration.js',
  './js/milestones.js',
  './js/audio.js',
  './js/engine.js',
  './js/ui.js',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(ASSETS).catch(() => {}))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
