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

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/capsula/sw.js')
      .then(registration => {
        console.log('[SW] Registered:', registration.scope)

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

        // ── Trigger 1: new SW takes control ───────────────────────────────
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          hardReload('Controller changed')
        })

        // ── Trigger 2: explicit RELOAD message from SW activate ────────────
        navigator.serviceWorker.addEventListener('message', event => {
          if (event.data?.type === 'RELOAD') {
            hardReload('RELOAD message received')
          }
        })

        // ── Poll for updates every 60 s ────────────────────────────────────
        setInterval(() => registration.update(), 60_000)
      })
      .catch(err => console.warn('[SW] Registration failed:', err))
  })
}
