// Offline support.
// Code and pages are network-first: when online the game always loads the newest files as one
// matching set (mixing an old page with new scripts breaks the game). The cache is only the
// offline fallback. Pictures can come from the cache first, since an older picture is harmless.
const CACHE = 'heromixer-v7';
const FILES = ['./', 'index.html', 'style.css', 'imglist.js', 'data.js', 'art.js', 'game.js', 'boss.js', 'shop.js', 'ui.js', 'manifest.webmanifest',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/maskable-192.png', 'icons/maskable-512.png', 'icons/apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES.map(f => new Request(f, { cache: 'reload' })))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  e.respondWith(caches.open(CACHE).then(async c => {
    if (url.pathname.includes('/img/')) {
      const hit = await c.match(req);
      const net = fetch(req).then(r => { if (r.ok) c.put(req, r.clone()); return r; });
      if (hit) { net.catch(() => {}); return hit; }
      return net;
    }
    try {
      const r = await fetch(req.url, { cache: 'no-cache' }); // revalidate with the server every time
      if (r.ok) c.put(req, r.clone());
      return r;
    } catch (err) {
      const hit = await c.match(req, { ignoreSearch: true });
      if (hit) return hit;
      throw err;
    }
  }));
});
