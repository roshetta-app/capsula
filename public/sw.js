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
 * Phase F4 Stage 4 addition:
 *   - The push payload now carries log_id (see send-notification/index.ts),
 *     stashed on the shown notification's data. notificationclick reports
 *     the tap back by calling the increment_notification_click Postgres
 *     function directly over Supabase's REST endpoint. The URL/key below
 *     are hardcoded rather than routed through vite.config.js's build-time
 *     injection (that path was built narrowly for the version stamp only) -
 *     this is the same public/client-safe anon key already shipped in
 *     every page load, so hardcoding it here carries no new exposure.
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

// Static files served directly from public/ (no Vite content hash) that are
// safe to cache-first: they're small, rarely change, and CACHE_VERSION nukes
// the whole cache on every deploy anyway, so there's no real staleness risk —
// same reasoning that already covers /capsula/icons/ below.
// Deliberately excludes 404.html, manifest.json, and sw.js itself: the 404
// fallback and manifest should stay live, and a service worker should never
// cache-first its own file.
const PUBLIC_ROOT_CACHE_FIRST = [
  '/capsula/logo.svg',
  '/capsula/favicon.svg',
  '/capsula/favicon.ico',
  '/capsula/favicon-32.png',
  '/capsula/icons.svg',
]

// Hardcoded Supabase project values for tap-tracking (see Phase F4 Stage 4
// addition note above). Same anon key already used client-side app-wide.
const SUPABASE_URL      = 'https://szzsqjpmcqsmvkvncgln.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN6enNxanBtY3FzbXZrdm5jZ2xuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2ODU0MjcsImV4cCI6MjA5NjI2MTQyN30.OkSXQ_yul-PblXAU7Y6M8PdXomzGX58vaT-NPq396Kc'

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
  let payload = {}

  if (event.data) {
    try { payload = JSON.parse(event.data.text()) } catch { /* use defaults below */ }
  }

  // FCM v1 sends the title/body nested under `notification`, not as flat
  // top-level fields — matches the shape sent by send-notification/index.ts.
  const title = payload.notification?.title ?? 'Capsula'
  const body  = payload.notification?.body ?? 'New update available'

  // log_id (added Phase F4 Stage 4) identifies which notification_log row
  // this send belongs to, so a tap can report back against the right row.
  const logId = payload.data?.log_id ?? null

  const iconUrl  = `${self.location.origin}/capsula/icons/icon-192.png`
  const badgeUrl = `${self.location.origin}/capsula/icons/badge-192.png`

  const options = {
    body,
    icon: iconUrl,
    badge: badgeUrl,
    tag: 'capsula-notification',
    renotify: true,
    data: { url: '/capsula/', log_id: logId },
  }

  event.waitUntil(
    self.registration.showNotification(title, options)
  )
})

// ─── Notification click ───────────────────────────────────────────────────────

self.addEventListener('notificationclick', event => {
  event.notification.close()
  const target = event.notification.data?.url ?? '/capsula/'
  const logId  = event.notification.data?.log_id ?? null

  // Reports the tap back against its notification_log row (Phase F4 Stage
  // 4). Fire-and-forget alongside the focus/open-window work below — a
  // failed report shouldn't block or delay opening the app.
  const reportClick = logId
    ? fetch(`${SUPABASE_URL}/rest/v1/rpc/increment_notification_click`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ log_id: logId }),
      }).catch(() => { /* best-effort only — a failed report shouldn't break the tap */ })
    : Promise.resolve()

  const focusOrOpen = self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    .then(clients => {
      const existing = clients.find(c => c.url.includes('/capsula/'))
      if (existing) return existing.focus()
      return self.clients.openWindow(target)
    })

  event.waitUntil(Promise.all([reportClick, focusOrOpen]))
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

  // Vite-hashed assets + icons + fonts + a small set of static public-root
  // files (see PUBLIC_ROOT_CACHE_FIRST above) → cache-first
  if (
    url.pathname.startsWith('/capsula/assets/') ||
    url.pathname.startsWith('/capsula/icons/')  ||
    PUBLIC_ROOT_CACHE_FIRST.includes(url.pathname) ||
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
