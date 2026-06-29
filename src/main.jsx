import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Module executed successfully — clear the boot-retry counter from
// index.html's __mainLoadFailed fallback, so a genuine future load
// failure (not this one) gets the full retry budget again.
try {
  sessionStorage.removeItem('capsula_boot_retry_count')
} catch (e) { /* sessionStorage unavailable (e.g. private mode edge case) */ }

// ─── PWA install prompt capture ───────────────────────────────────────────────
//
// The browser fires `beforeinstallprompt` once, very early — before React mounts.
// We must catch it here at the module level, stash it on window, and prevent
// the default mini-infobar so we can surface our own UI in OnboardingScreen.
//
// OnboardingScreen reads window.__installPrompt and calls .prompt() when the
// user taps "Install". If the event was never fired (already installed, iOS,
// or browser doesn't support it) the install slide is skipped automatically.

window.__installPrompt = null

window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault()
  window.__installPrompt = e
  console.log('[PWA] Install prompt captured')
})

window.addEventListener('appinstalled', () => {
  window.__installPrompt = null
  console.log('[PWA] App installed')
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// ─── Service worker registration + auto-update ────────────────────────────────
//
// After a new SW activates it takes control (controllerchange) and sends a
// RELOAD message. Both triggers call the same hardReload() helper.
//
// Why hardReload() instead of location.reload()?
//   location.reload() re-uses the browser's HTTP cache, which may still hold
//   the old index.html (with old Vite-hashed asset filenames). Those filenames
//   no longer exist after a new build → ERR_ABORTED 404 → blank page on desktop.
//
//   Instead we navigate to /capsula/?sw-reload=<timestamp> — a URL the browser
//   has never seen, so it cannot serve it from HTTP cache. GitHub Pages returns
//   the fresh index.html. React Router's basename strips /capsula and the app
//   boots normally at the root route.
//
//   The ?sw-reload param is ignored by the app; it exists only to bust the cache.
//
// Guard: a single reloading flag prevents controllerchange and the RELOAD
// message from both firing a navigation in the same update cycle.
//
// Fix (blank-screen-until-tab-reopened bug):
//   The controllerchange/message listeners used to be attached inside
//   register().then(...), i.e. only after the registration promise resolved.
//   That left a race: if a new SW's install → activate → clients.claim() →
//   postMessage('RELOAD') sequence completed before this tab got around to
//   attaching the listeners (e.g. this tab was already open and idle when a
//   deploy landed), both the controllerchange event and the RELOAD message
//   fired into a void — nobody was listening yet — and the page never
//   reloaded itself. The tab would silently end up running stale JS against
//   a new index.html on the next manual refresh, which is what produced the
//   blank screen; closing and reopening the tab "fixed" it only because the
//   fresh tab's SW was already in control from the start, so there was no
//   change event to miss.
//   Fix: attach both listeners BEFORE calling register(), so they exist no
//   matter how fast the new SW's lifecycle completes relative to this tab.
//
// Fix (stale-UI-after-deploy):
//   register() now passes { updateViaCache: 'none' }. Without this, the
//   browser checks for a new sw.js using its normal HTTP caching rules —
//   so it can keep thinking the old sw.js is still current for a while
//   even after a deploy, delaying the entire install→activate→RELOAD
//   chain this app depends on. 'none' forces every update check to be a
//   real network request, regardless of what cache headers GitHub Pages'
//   CDN happens to send.

if ('serviceWorker' in navigator) {
  let reloading = false

  function hardReload(reason) {
    if (reloading) return
    reloading = true
    console.log('[SW] ' + reason + ' — navigating for fresh build')
    // Cache-busting: unique URL forces browser past HTTP cache for index.html.
    // Built from the CURRENT location (not a hardcoded root path) so a
    // reload while deep in the CMS lands back on the same page, not
    // the main app screen.
    var url = new URL(window.location.href)
    url.searchParams.set('sw-reload', Date.now())
    window.location.replace(url.toString())
  }

  // ── Trigger 1: new SW takes control ───────────────────────────────────
  // Attached immediately — must exist before register() can possibly
  // resolve to a SW that later takes control.
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    hardReload('Controller changed')
  })

  // ── Trigger 2: explicit RELOAD message from SW activate ─────────────────
  // Attached immediately for the same reason — register() resolving is not
  // the same moment as "the SW now exists and could send a message."
  navigator.serviceWorker.addEventListener('message', event => {
    if (event.data?.type === 'RELOAD') {
      hardReload('RELOAD message received')
    }
  })

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/capsula/sw.js', { updateViaCache: 'none' })
      .then(registration => {
        console.log('[SW] Registered:', registration.scope)

        // ── Poll for updates every 60 s ──────────────────────────────────
        setInterval(() => registration.update(), 60_000)
      })
      .catch(err => console.warn('[SW] Registration failed:', err))
  })
}
