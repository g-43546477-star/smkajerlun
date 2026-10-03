/* Only generic offline help is cached. User pages, sessions and API data stay online. */
const CACHE = 'smkaj-school-pwa-v1';
const OFFLINE = '/offline/';
const HELP_SCRIPT = '/assets/pwa-offline.js';

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll([OFFLINE, HELP_SCRIPT])));
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(name => name.startsWith('smkaj-school-pwa-') && name !== CACHE).map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', event => {
  if (event.data?.type === 'ACTIVATE_UPDATE') self.skipWaiting();
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request, { cache: 'no-store' }).catch(async () => {
      const cache = await caches.open(CACHE);
      return (await cache.match(OFFLINE)) || Response.error();
    }));
  } else if (url.pathname === HELP_SCRIPT) {
    event.respondWith(fetch(event.request).catch(async () => {
      const cache = await caches.open(CACHE);
      return (await cache.match(HELP_SCRIPT)) || Response.error();
    }));
  }
});
