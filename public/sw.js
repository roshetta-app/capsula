const CACHE_NAME = 'capsula-v1'

// These are the core app files — cached immediately on install
const APP_SHELL = [
  '/capsula/',
  '/capsula/index.html',
]

// On install: cache the app shell
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL))
  )
  self.skipWaiting()
})

// On activate: delete old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  )
  self.clients.claim()
})

// On fetch: serve from cache, fall back to network
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url)

  // drugs.json — always try network first so new drug data gets through
  if (url.pathname.includes('drugs.json')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const copy = response.clone()
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy))
          return response
        })
        .catch(() => caches.match(event.request))
    )
    return
  }

  // Everything else — cache first, network as fallback
  event.respondWith(
    caches.match(event.request).then(cached => {
      return cached || fetch(event.request).then(response => {
        const copy = response.clone()
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy))
        return response
      })
    }).catch(() => caches.match('/capsula/'))
  )
})