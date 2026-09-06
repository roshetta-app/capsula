/**
 * useBackClose — shared popup/sheet back-close mechanism.
 *
 * Generalizes the dual native+web back-gesture pattern already proven in
 * Lightbox.jsx, so any popup or sheet can register itself as "the thing
 * currently open" and close on back instead of letting the route change
 * underneath it.
 *
 * Usage:
 *   useBackClose(isOpen, onClose)
 *
 *   isOpen   — true while the popup/sheet is visible. The guard is only
 *              active during that window; with nothing open, back behaves
 *              completely normally (changes route / exits, as
 *              appropriate) on both platforms.
 *   onClose  — the same function the popup/sheet's own visible close
 *              control (X button, backdrop tap, etc.) already calls.
 *              Read via a ref internally, so callers don't need to
 *              memoize it with useCallback for this hook to stay correct.
 *
 * Native (Capacitor): registers a 'backButton' listener while open, which
 * calls onClose() instead of letting Capacitor fall through to the
 * WebView's own browser history — exactly Lightbox.jsx's approach.
 *
 * Web/PWA: pushes a placeholder history entry while open, so a back
 * press/gesture pops that placeholder (caught via 'popstate') and calls
 * onClose(), rather than navigating the real route entry underneath it.
 * If the popup/sheet closes some other way first (its own X button,
 * confirming an action, etc.) the placeholder is still sitting there
 * unconsumed — cleanup removes it with a single history.back() so the
 * back stack never ends up with a dead entry someone would have to press
 * back through twice. If the placeholder was already consumed by a real
 * back press, that extra history.back() is skipped.
 */

import { useEffect, useRef } from 'react'
import { Capacitor } from '@capacitor/core'
import { App as CapacitorApp } from '@capacitor/app'

export function useBackClose(isOpen, onClose) {
  const poppedViaBrowserBackRef = useRef(false)
  const onCloseRef = useRef(onClose)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  // Native back-button guard. No-ops on the website build.
  useEffect(() => {
    if (!isOpen) return
    if (!Capacitor.isNativePlatform()) return

    const listenerPromise = CapacitorApp.addListener('backButton', () => {
      onCloseRef.current()
    })

    return () => {
      listenerPromise.then((handle) => handle.remove())
    }
  }, [isOpen])

  // Browser back-gesture/button guard (website/PWA only). No-ops on native.
  useEffect(() => {
    if (!isOpen) return
    if (Capacitor.isNativePlatform()) return

    poppedViaBrowserBackRef.current = false
    window.history.pushState({ capsulaBackClose: true }, '')

    function handlePopState() {
      poppedViaBrowserBackRef.current = true
      onCloseRef.current()
    }

    window.addEventListener('popstate', handlePopState)
    return () => {
      window.removeEventListener('popstate', handlePopState)
      if (!poppedViaBrowserBackRef.current) {
        window.history.back()
      }
    }
  }, [isOpen])
}
