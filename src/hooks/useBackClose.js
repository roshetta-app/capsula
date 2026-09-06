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
 *
 * isAnyBackCloseOpen() — Phase 4 (Back-Button Mapping) addition. Exposes
 * whether at least one useBackClose consumer currently has its guard
 * registered (isOpen === true), via a plain module-level counter. Added
 * so BottomNav's own always-on tab-level back handling (which isn't
 * itself a useBackClose consumer — it isn't an isOpen/onClose overlay,
 * it's the fallback that applies when nothing else is open) can check
 * this and step aside whenever a sheet is already claiming the back
 * press, instead of both reacting to the same press at once. Purely
 * additive: existing useBackClose callers are unaffected.
 */

import { useEffect, useRef } from 'react'
import { Capacitor } from '@capacitor/core'
import { App as CapacitorApp } from '@capacitor/app'

let openBackCloseCount = 0

export function isAnyBackCloseOpen() {
  return openBackCloseCount > 0
}

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
    openBackCloseCount++

    return () => {
      openBackCloseCount--
      listenerPromise.then((handle) => handle.remove())
    }
  }, [isOpen])

  // Browser back-gesture/button guard (website/PWA only). No-ops on native.
  useEffect(() => {
    if (!isOpen) return
    if (Capacitor.isNativePlatform()) return

    poppedViaBrowserBackRef.current = false
    window.history.pushState({ capsulaBackClose: true }, '')
    openBackCloseCount++

    function handlePopState() {
      poppedViaBrowserBackRef.current = true
      onCloseRef.current()
    }

    window.addEventListener('popstate', handlePopState)
    return () => {
      window.removeEventListener('popstate', handlePopState)
      if (!poppedViaBrowserBackRef.current) {
        // Bug fix (2026-09-06): closing via anything other than a real
        // back press (backdrop tap, X button, confirming an action)
        // still leaves our placeholder sitting on top of the stack, so
        // it's consumed here to keep the back stack balanced. That
        // consumption itself fires a popstate event that looks
        // identical to a genuine back press to any other listener —
        // most notably BottomNav's tab-level back handling, which was
        // reading "nothing is open anymore" mid-flight (this count was
        // decremented before this fired) and wrongly treating our own
        // cleanup as if the user had pressed back for real: sending
        // people to the Conditions tab, or arming/showing the
        // press-again-to-exit prompt, whenever a popup was closed by
        // tapping outside it. Keeping the count elevated until this
        // phantom event has had a chance to pass through fixes that at
        // the source, for every popup/sheet that uses this hook.
        window.history.back()
        setTimeout(() => { openBackCloseCount-- }, 0)
      } else {
        openBackCloseCount--
      }
    }
  }, [isOpen])
}