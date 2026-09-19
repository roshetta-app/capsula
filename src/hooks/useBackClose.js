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
 * unconsumed — cleanup neutralizes it in place with replaceState (not a
 * history.back() pop), so the stack stays exactly where it was without
 * ever firing a popstate event that some other back-listener could
 * mistake for a real press.
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
 *
 * 2026-09-19 (this session — spurious-resume-backButton fix): reported
 * symptom — a sheet open behind the new image-search icon (see
 * SharedDrugCard.jsx/BrandsList.jsx) dips closed and snaps back open the
 * instant the native in-app browser (@capacitor/browser's Browser.open(),
 * a Chrome Custom Tab on Android) is closed. Root-cause hypothesis:
 * closing a Custom Tab and handing control back to the host app can fire
 * a spurious 'backButton' event on the way — distinct from a real user
 * back-press, but this listener couldn't previously tell the two apart,
 * so it called onClose() and started the sheet closing before `isOpen`
 * (unrelated to this fire) put it right back. Fix: track the moment the
 * app last came back to the foreground (via the same App plugin's
 * 'appStateChange' event) and ignore a 'backButton' firing within
 * RESUME_GUARD_MS of that — a genuine back-press only ever happens once
 * the app is already stable in the foreground, never in the same instant
 * it resumes. Scoped to the native branch only; the web/PWA popstate path
 * (a completely separate mechanism, not involved in this bug) is
 * untouched.
 */

import { useEffect, useRef } from 'react'
import { Capacitor } from '@capacitor/core'
import { App as CapacitorApp } from '@capacitor/app'

let openBackCloseCount = 0

// A 'backButton' event firing this soon after the app resumes from the
// background is treated as spurious (see 2026-09-19 note above) rather
// than a real user back-press.
const RESUME_GUARD_MS = 500

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

    let lastResumedAt = 0

    const stateListenerPromise = CapacitorApp.addListener('appStateChange', ({ isActive }) => {
      if (isActive) lastResumedAt = Date.now()
    })

    const backListenerPromise = CapacitorApp.addListener('backButton', () => {
      if (Date.now() - lastResumedAt < RESUME_GUARD_MS) return
      onCloseRef.current()
    })
    openBackCloseCount++

    return () => {
      openBackCloseCount--
      stateListenerPromise.then((handle) => handle.remove())
      backListenerPromise.then((handle) => handle.remove())
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
      openBackCloseCount--
      if (!poppedViaBrowserBackRef.current) {
        // Bug fix (2026-09-06, revised): closing via anything other than
        // a real back press (backdrop tap, X button, confirming an
        // action) still leaves our placeholder sitting on top of the
        // stack. The first attempt at this fix consumed it with
        // history.back() and delayed telling anyone else "nothing is
        // open anymore" until just after — but that relied on our
        // cleanup's popstate landing before a separately-scheduled
        // timer, and different browser engines don't guarantee that
        // ordering the same way, which is exactly why it worked on the
        // phone app but not reliably on the installed PWA. Neutralizing
        // the placeholder in place instead — turning it into an
        // ordinary entry rather than popping it — never fires a
        // popstate event at all, on any browser, so there's no phantom
        // "back press" for anything else (BottomNav's tab handling,
        // etc.) to ever misread, regardless of timing.
        window.history.replaceState(null, '')
      }
    }
  }, [isOpen])
}
