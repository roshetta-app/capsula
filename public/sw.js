/**
 * Capsula Service Worker
 *
 * Strategy:
 *   - HTML (navigation requests) → network-first, fall back to cache
 *   - JS/CSS/fonts/images        → cache-first (Vite content-hashes guarantee freshness)
 *
 * Auto-update flow:
 *   1. deploy.yml injects the git SHA → CACHE_VERSION changes every deploy
 *   2. Browser detects new SW → installs it, calls skipWaiting()
 *   3. On activate: delete all old caches, claim all tabs, send 'RELOAD' message
 *   4. main.jsx receives 'RELOAD' → calls location.reload()
 *   Result: the tab reloads itself automatically within seconds of a deploy.
 */

const CACHE_VERSION = 'capsula-v__BUILD_SHA__'
const STATIC_CACHE  = CACHE_VERSION + '-static'

const URLS_TO_PRECACHE = [
  '/capsula/',
  '/capsula/index.html',
]

// ─── Install ──────────────────────────────────────────────────────────────────

self.addEventListener('install', event => {
  // Activate immediately — don't wait for old tabs to close
  self.skipWaiting()

  event.waitUntil(
    caches.open(STATIC_CACHE).then(cache => cache.addAll(URLS_TO_PRECACHE))
  )
})

// ─── Activate ─────────────────────────────────────────────────────────────────

self.addEventListener('activate', event => {
  event.waitUntil(
    // 1. Delete all caches from previous versions
    caches.keys()
      .then(keys =>
        Promise.all(
          keys
            .filter(key => key !== STATIC_CACHE)
            .map(key => caches.delete(key))
        )
      )
      // 2. Take control of all open tabs immediately
      .then(() => self.clients.claim())
      // 3. Tell every open tab to reload so it picks up the new JS bundle
      .then(() => self.clients.matchAll({ type: 'window' }))
      .then(clients => {
        clients.forEach(client => client.postMessage({ type: 'RELOAD' }))
      })
  )
})

// ─── Fetch ────────────────────────────────────────────────────────────────────

self.addEventListener('fetch', event => {
  const { request } = event
  const url = new URL(request.url)

  // Only handle same-origin requests
  if (url.origin !== location.origin) return

  // ── Navigation requests (HTML) → network-first ──────────────────────────
  // Always try the network first so index.html is never stale.
  // Falls back to cache only when offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          const clone = response.clone()
          caches.open(STATIC_CACHE).then(cache => cache.put(request, clone))
          return response
        })
        .catch(() => caches.match('/capsula/index.html'))
    )
    return
  }

  // ── Vite-hashed assets (JS, CSS) → cache-first ──────────────────────────
  // Vite fingerprints every asset filename on build, so a new deploy produces
  // new filenames. The old hashed files are never re-requested, which means
  // cache-first is safe and fast here.
  if (
    url.pathname.startsWith('/capsula/assets/') ||
    url.pathname.startsWith('/capsula/icons/')  ||
    request.destination === 'font'
  ) {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached
        return fetch(request).then(response => {
          const clone = response.clone()
          caches.open(STATIC_CACHE).then(cache => cache.put(request, clone))
          return response
        })
      })
    )
    return
  }

  // Everything else (Supabase API, etc.) → network only
})
