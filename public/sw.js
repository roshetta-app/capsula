const CACHE_NAME = 'capsula-v2'

// Core app shell — cached on install
const APP_SHELL = [
  '/capsula/',
  '/capsula/index.html',
]

// ─── Install — cache app shell ────────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL))
  )
  self.skipWaiting()
})

// ─── Activate — delete old caches ────────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  )
  self.clients.claim()
})

// ─── Fetch ────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url)

  // Only handle same-origin requests
  if (url.origin !== self.location.origin) return

  // drugs.json — network first so new data always gets through
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

  // Navigation requests (page loads/refreshes) under /capsula/* →
  // serve /capsula/index.html so React Router handles the path.
  // This is what prevents the 404 when refreshing /capsula/drugs etc.
  // (The 404.html trick covers the first load before SW is active;
  //  this covers all subsequent loads once SW is installed.)
  if (
    event.request.mode === 'navigate' &&
    url.pathname.startsWith('/capsula')
  ) {
    event.respondWith(
      caches.match('/capsula/index.html').then(cached => {
        return cached || fetch('/capsula/index.html')
      })
    )
    return
  }

  // Everything else — cache first, network fallback
  event.respondWith(
    caches.match(event.request).then(cached => {
      return cached || fetch(event.request).then(response => {
        // Only cache successful same-origin responses
        if (response.ok && url.origin === self.location.origin) {
          const copy = response.clone()
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy))
        }
        return response
      })
    }).catch(() => caches.match('/capsula/index.html'))
  )
})
