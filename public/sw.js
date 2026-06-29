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
 *      changes on every `vite build` run (replaces __BUILD_SHA__ placeholder)
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
 *
 * Fix (GH Pages blank-on-deploy race):
 *   - RELOAD broadcast is delayed 4 s after activate so any in-flight
 *     404→index.html redirects finish decoding sessionStorage before the
 *     tab is told to reload.
 *
 * Fix (stale-UI-after-deploy):
 *   - The navigate fetch below now explicitly passes { cache: 'no-store' }.
 *     Without this, the browser's own HTTP cache could still satisfy this
 *     fetch even though the SW logic intended it to always hit the network —
 *     the meta http-equiv Cache-Control tag in index.html does not actually
 *     stop this in modern browsers, and GitHub Pages offers no way to set a
 *     real Cache-Control response header. cache: 'no-store' is the spec-level
 *     way to force a real network round-trip every time.
 */

const CACHE_VERSION = 'capsula-v__BUILD_SHA__'
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
      .then(() => {
        // Delay the RELOAD broadcast by 4 s.
        // This prevents the SW update from interrupting an in-flight
        // GitHub Pages 404 → /capsula/?p=1 → index.html redirect chain.
        // Without the delay the SW can claim the tab and send RELOAD
        // while sessionStorage still holds the pending gh_pages_redirect
        // key, causing the decode script in index.html to run on the
        // reloaded page instead of the redirect-target page — resulting
        // in a blank screen or wrong route on desktop after a deploy.
        setTimeout(() => {
          self.clients.matchAll({ type: 'window' }).then(clients => {
            clients.forEach(client => client.postMessage({ type: 'RELOAD' }))
          })
        }, 4000)
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
      fetch(request, { cache: 'no-store' }).catch(() =>
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
