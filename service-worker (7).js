/* PumpPicks service worker
   ───────────────────────────────────────────────
   BUMP THIS VERSION every time you re-upload changed files,
   otherwise Samsung will keep serving the old cached app.
   e.g. v1 -> v2 -> v3 ...                               */
const CACHE = 'pumppicks-v2';

/* App shell: the files that make the app load offline. */
const SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-512-maskable.png'
];

/* Install: pre-cache the shell. */
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

/* Activate: delete any old version caches, take control immediately. */
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

/* Fetch strategy:
   - Lottery data feed (data.ny.gov): network first, fall back to last good copy.
   - Everything else (app shell): cache first, fall back to network. */
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (url.hostname.endsWith('data.ny.gov')) {
    e.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        return res;
      }).catch(() => caches.match(req))
    );
    return;
  }

  e.respondWith(
    caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      // cache same-origin GETs we didn't precache (e.g. fonts won't be here, that's fine)
      return res;
    }).catch(() => caches.match('./index.html')))
  );
});
