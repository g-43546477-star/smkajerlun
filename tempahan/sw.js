/* Cache only a generic offline document. Never cache pages, sessions or API data. */
const CACHE = 'smkaj-tempahan-offline-v1';
const OFFLINE = '/tempahan/offline/';
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.add(OFFLINE)));
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(name => name.startsWith('smkaj-tempahan-offline-') && name !== CACHE).map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || event.request.mode !== 'navigate' || url.origin !== self.location.origin || !url.pathname.startsWith('/tempahan/')) return;
  event.respondWith(fetch(event.request, { cache: 'no-store' }).catch(() => caches.match(OFFLINE)));
});
