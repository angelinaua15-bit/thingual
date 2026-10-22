/* Thingual service worker: offline app shell + cached static files and photos. */
const VERSION = 'v1';
const SHELL = `thingual-shell-${VERSION}`;
const STATIC = `thingual-static-${VERSION}`;
const PHOTOS = `thingual-photos-${VERSION}`;

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(SHELL).then((c) => c.addAll(['/', '/manifest.webmanifest', '/logo-mark.webp', '/fonts/fonts.css'])).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => !k.endsWith(VERSION)).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

const trim = async (name, max) => {
  const c = await caches.open(name);
  const keys = await c.keys();
  for (let i = 0; i < keys.length - max; i++) await c.delete(keys[i]);
};

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // pages: network first, offline → cached shell
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => { const copy = res.clone(); caches.open(SHELL).then((c) => c.put('/', copy)); return res; })
        .catch(() => caches.match('/')),
    );
    return;
  }

  // our hashed bundles, fonts, emoji, icons: cache first (they never change under the same name)
  if (url.origin === self.location.origin && /^\/(_expo|fonts|emoji|assets)\//.test(url.pathname)) {
    e.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => { if (res.ok) { const copy = res.clone(); caches.open(STATIC).then((c) => c.put(req, copy)); } return res; })),
    );
    return;
  }

  // photos (Unsplash + community uploads): stale-while-revalidate, capped
  if (url.hostname === 'images.unsplash.com' || (url.hostname.endsWith('.supabase.co') && url.pathname.includes('/storage/v1/object/public/'))) {
    e.respondWith(
      caches.open(PHOTOS).then(async (c) => {
        const hit = await c.match(req);
        const net = fetch(req).then((res) => { if (res.ok || res.type === 'opaque') { c.put(req, res.clone()); trim(PHOTOS, 400); } return res; }).catch(() => hit);
        return hit || net;
      }),
    );
  }
});
