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

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/capsula/sw.js')
      .then(registration => {
        console.log('Capsula SW registered')

        // Listen for messages from the SW.
        // When a new SW activates it sends { type: 'RELOAD' } to all open tabs.
        // We reload the page so the tab picks up the new JS bundle immediately.
        navigator.serviceWorker.addEventListener('message', event => {
          if (event.data?.type === 'RELOAD') {
            console.log('Capsula SW updated — reloading for fresh build')
            window.location.reload()
          }
        })
      })
      .catch(err => console.warn('SW registration failed:', err))
  })
}
