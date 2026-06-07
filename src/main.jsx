import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

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
        // Fires on desktop when the new SW calls clients.claim() after activate.
        // This is the most reliable desktop signal.
        let reloading = false
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          if (reloading) return
          reloading = true
          console.log('[SW] Controller changed — reloading for fresh build')
          window.location.reload()
        })

        // ── Trigger 2: message from SW ─────────────────────────────────────
        // Backup: SW sends { type: 'RELOAD' } during activate.
        navigator.serviceWorker.addEventListener('message', event => {
          if (event.data?.type === 'RELOAD') {
            if (reloading) return
            reloading = true
            console.log('[SW] RELOAD message received — reloading')
            window.location.reload()
          }
        })

        // ── Poll for updates every 60 s ────────────────────────────────────
        // Forces the browser to check for a new sw.js even when the tab
        // stays open a long time (desktop users rarely close tabs).
        setInterval(() => registration.update(), 60_000)
      })
      .catch(err => console.warn('[SW] Registration failed:', err))
  })
}
