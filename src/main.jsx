import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

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
// Two complementary triggers for desktop reliability:
//
//   1. controllerchange  — fires when the NEW sw takes control (most reliable on desktop)
//   2. message RELOAD    — sent by sw.js activate; catches cases where controller
//                          was already set before controllerchange fires
//
// We guard with a flag so we never double-reload.

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/capsula/sw.js')
      .then(registration => {
        console.log('[SW] Registered:', registration.scope)

        // ── Trigger 1: controllerchange ────────────────────────────────────
        let reloading = false
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          if (reloading) return
          reloading = true
          console.log('[SW] Controller changed — reloading for fresh build')
          window.location.reload()
        })

        // ── Trigger 2: message from SW ─────────────────────────────────────
        navigator.serviceWorker.addEventListener('message', event => {
          if (event.data?.type === 'RELOAD') {
            if (reloading) return
            reloading = true
            console.log('[SW] RELOAD message received — reloading')
            window.location.reload()
          }
        })

        // ── Poll for updates every 60 s ────────────────────────────────────
        setInterval(() => registration.update(), 60_000)
      })
      .catch(err => console.warn('[SW] Registration failed:', err))
  })
}
