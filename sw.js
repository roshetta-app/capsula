/**
 * Capsula Service Worker
 *
 * Strategy:
 *   - HTML (navigation requests) → network-first, NO cache write
 *     (index.html must always be fresh — caching it caused stale-bundle 404s)
 *   - JS/CSS/fonts/images        → cache-first (Vite content-hashes guarantee freshness)
 *
 * Auto-update flow:
 *   1. vite.config.js swBuildStampPlugin injects a build timestamp → CACHE_VERSION
 *      changes on every `vite build` run (replaces mqcm3oce placeholder)
 *   2. Browser detects new SW file → installs it, calls skipWaiting()
 *   3. On activate: delete all old caches, claim all tabs, send 'RELOAD' message
 *   4. main.jsx receives 'RELOAD' → calls location.reload()
 *   Result: the tab reloads itself automatically within seconds of a deploy.
 *
 * Phase 2K addition:
 *   - Offline fallback responses include header X-Served-From: cache
 *     so the app can confirm it is in offline/cached mode.
 *
 * Phase 3K addition:
 *   - Push event handler: shows notification when push message received
 *   - notificationclick handler: focuses/opens the app on tap
 */

const CACHE_VERSION = 'capsula-vmqcm3oce'
const STATIC_CACHE  = CACHE_VERSION + '-static'

// Do NOT precache index.html — it must always be fetched fresh from the network
// so the browser gets the correct Vite-hashed asset filenames after each deploy.
const URLS_TO_PRECACHE = []

// ─── Install ──────────────────────────────────────────────────────────────────

self.addEventListener('install', event => {
  self.skipWaiting()
  event.waitUntil(
    caches.open(STATIC_CACHE).then(cache => cache.addAll(URLS_TO_PRECACHE))
  )
})

// ─── Activate ─────────────────────────────────────────────────────────────────

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys =>
        Promise.all(
          keys
            .filter(key => key !== STATIC_CACHE)
            .map(key => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
      .then(() => self.clients.matchAll({ type: 'window' }))
      .then(clients => {
        clients.forEach(client => client.postMessage({ type: 'RELOAD' }))
      })
  )
})

// ─── Push ─────────────────────────────────────────────────────────────────────

self.addEventListener('push', event => {
  let data = { title: 'Capsula', message: 'New update available', type: 'info' }

  if (event.data) {
    try { data = JSON.parse(event.data.text()) } catch { /* use defaults */ }
  }

  const options = {
    body: data.message,
    icon: '/capsula/icons/icon-192.png',
    badge: '/capsula/icons/icon-192.png',
    tag: 'capsula-notification',
    renotify: true,
    data: { url: '/capsula/' },
  }

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  )
})

// ─── Notification click ───────────────────────────────────────────────────────

self.addEventListener('notificationclick', event => {
  event.notification.close()
  const target = event.notification.data?.url ?? '/capsula/'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clients => {
        const existing = clients.find(c => c.url.includes('/capsula/'))
        if (existing) return existing.focus()
        return self.clients.openWindow(target)
      })
  )
})

// ─── Helpers ──────────────────────────────────────────────────────────────────

function withCacheHeader(response) {
  if (!response) return response
  const headers = new Headers(response.headers)
  headers.set('X-Served-From', 'cache')
  return new Response(response.body, {
    status:     response.status,
    statusText: response.statusText,
    headers,
  })
}

// ─── Fetch ────────────────────────────────────────────────────────────────────

self.addEventListener('fetch', event => {
  const { request } = event
  const url = new URL(request.url)

  if (url.origin !== location.origin) return

  // Navigation (HTML pages) → always network-first, never cache
  // This guarantees the browser always gets the latest index.html with the
  // correct Vite asset hashes after every deploy.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() =>
        // Offline only: serve whatever index.html we have cached
        caches.match('/capsula/index.html').then(cached =>
          cached ? withCacheHeader(cached) : Response.error()
        )
      )
    )
    return
  }

  // Vite-hashed assets + icons + fonts → cache-first (hashes guarantee freshness)
  if (
    url.pathname.startsWith('/capsula/assets/') ||
    url.pathname.startsWith('/capsula/icons/')  ||
    request.destination === 'font'
  ) {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached
        return fetch(request)
          .then(response => {
            const clone = response.clone()
            caches.open(STATIC_CACHE).then(cache => cache.put(request, clone))
            return response
          })
          .catch(() =>
            caches.match(request).then(fallback =>
              fallback ? withCacheHeader(fallback) : Response.error()
            )
          )
      })
    )
    return
  }
})
