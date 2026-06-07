/**
 * Capsula Service Worker
 *
 * Strategy:
 *   - HTML (navigation requests) → network-first, fall back to cache
 *   - JS/CSS/fonts/images        → cache-first, update in background
 *
 * CACHE_VERSION must change on every deploy to bust stale caches.
 * The deploy.yml workflow injects the git SHA at build time via
 * a find-and-replace step (see deploy.yml changes below).
 * If that step is absent, bump the number manually before each push.
 */

const CACHE_VERSION = 'capsula-v__BUILD_SHA__'
const STATIC_CACHE  = CACHE_VERSION + '-static'
const URLS_TO_PRECACHE = [
  '/capsula/',
  '/capsula/index.html',
]

// ─── Install ──────────────────────────────────────────────────────────────────

self.addEventListener('install', event => {
  // Skip waiting so the new SW activates immediately (don't wait for old tabs to close)
  self.skipWaiting()

  event.waitUntil(
    caches.open(STATIC_CACHE).then(cache => cache.addAll(URLS_TO_PRECACHE))
  )
})

// ─── Activate ─────────────────────────────────────────────────────────────────

self.addEventListener('activate', event => {
  // Delete ALL old caches that don't match this version
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== STATIC_CACHE)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())  // take control of all open tabs immediately
  )
})

// ─── Fetch ────────────────────────────────────────────────────────────────────

self.addEventListener('fetch', event => {
  const { request } = event
  const url = new URL(request.url)

  // Only handle same-origin requests
  if (url.origin !== location.origin) return

  // ── Navigation requests (HTML) → network-first ──────────────────────────
  // This ensures a refresh always gets the latest index.html from the network.
  // Falls back to cached version only if offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          // Cache the fresh response
          const clone = response.clone()
          caches.open(STATIC_CACHE).then(cache => cache.put(request, clone))
          return response
        })
        .catch(() => caches.match('/capsula/index.html'))
    )
    return
  }

  // ── Static assets (JS, CSS, fonts, images) → cache-first ────────────────
  // Vite hashes all asset filenames, so a new deploy = new filenames = cache miss.
  // Old hashed files are never re-requested, so this never serves stale JS.
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

  // Everything else → network only (Supabase API calls, etc.)
})
