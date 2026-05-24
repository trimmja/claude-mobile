const CACHE = 'jeb-v18';
const ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './data/actions.json',
  './data/timing.json',
  './data/stories.json',
  './data/reflections.json',
  './data/stageAdvances.json',
  './js/main.js',
  './js/version.js',
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
  './js/stories.js',
  './js/reflections.js',
  './js/notifications.js',
  './js/journal.js',
  './js/unlocks.js',
];

self.addEventListener('install', () => {
  caches.open(CACHE).then(cache => cache.addAll(ASSETS).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
});

function isBalanceJson(url) {
  return url.pathname.includes('/data/') && url.pathname.endsWith('.json');
}

function isAppAsset(url) {
  return /\.(js|css|html)$/.test(url.pathname);
}

// Balance JSON: always network. App assets: network-first.
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  const url = new URL(e.request.url);

  if (isBalanceJson(url)) {
    e.respondWith(fetch(e.request));
    return;
  }

  if (isAppAsset(url)) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then(cache => cache.put(e.request, copy));
          }
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
