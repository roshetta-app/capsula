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
 * 2026-10-03 (back layers): useBackLayer(isOpen, onBack) adds a "layer" ON
 * TOP of an open sheet, for things inside it that Back should close first
 * (a filter pop-up, the second page of a two-page sheet). A layer adds NO
 * history step of its own. When Back is pressed and a layer is open, the
 * newest layer's onBack runs instead of the sheet closing, and (website
 * only) the sheet's single placeholder step is put straight back, so the
 * history stack is exactly what it was before the press. Closing a layer any
 * other way (Done button, tap outside) does not touch history at all. With
 * no layer open, everything below behaves exactly as before. A layer only
 * does anything while a useBackClose sheet is open under it.
 *
 * 2026-10-03 (second Back leaving the page, website/installed app): a log
 * from a real browser showed that after a Back press was handed to a layer,
 * the NEXT Back press never reached the app at all. The browser jumped
 * straight out of the app to an older page. Cause (most likely): to keep the
 * sheet's placeholder step after a layer took the press, this file added a
 * NEW placeholder step from inside the Back event itself, with no tap behind
 * it, and browsers distrust history steps that code adds without a tap and
 * skip over them on the next Back. Fix: no history step is added while a
 * Back press is being handled any more. Instead the app goes forward again
 * onto the original placeholder step (the one added by the tap that opened
 * the sheet), which is still there. The placeholder now also carries a copy
 * of the page's own router state, so going back onto it leaves the router's
 * idea of the current page exactly as it was.
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

// --- Back layers (see 2026-10-03 note above) --------------------------------
const backLayers = []          // open layers, newest last
let layerPressHandled = false  // one Back press is handled by one layer only

// After a layer takes a Back press, the app goes forward again onto the
// sheet's placeholder step. That forward move fires its own popstate event,
// which must not be mistaken for another Back press. 'rearmPending' is set
// just before going forward; the first popstate afterwards is the landing.
// 'rearmEvent' lets every other open sheet recognise that same landing.
let rearmPending = false
let rearmEvent = null
const REARM_FALLBACK_MS = 400

// Runs the newest open layer for this Back press. Returns 'none' (no layer
// open), 'handled' (a layer took the press), or 'already' (another listener
// of the same press already gave it to a layer). The flag is cleared after
// the whole press has been delivered to every listener.
function runBackLayer() {
  if (layerPressHandled) return 'already'
  const top = backLayers[backLayers.length - 1]
  if (!top) return 'none'
  layerPressHandled = true
  setTimeout(() => { layerPressHandled = false }, 0)
  top.onBackRef.current()
  return 'handled'
}

export function useBackLayer(isOpen, onBack) {
  const onBackRef = useRef(onBack)

  useEffect(() => {
    onBackRef.current = onBack
  }, [onBack])

  useEffect(() => {
    if (!isOpen) return
    const layer = { onBackRef }
    backLayers.push(layer)
    return () => {
      const i = backLayers.indexOf(layer)
      if (i >= 0) backLayers.splice(i, 1)
    }
  }, [isOpen])
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
      if (runBackLayer() !== 'none') return
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
    window.history.pushState({ ...(window.history.state || {}), capsulaBackClose: true }, '')
    openBackCloseCount++

    function handlePopState(event) {
      // The landing back on the placeholder after a layer took a Back press
      // (see the 2026-10-03 note above). Not a Back press: ignore it.
      if (event && event === rearmEvent) return
      if (rearmPending) {
        rearmPending = false
        rearmEvent = event
        return
      }

      // A layer is open on top of this sheet: it takes the press and the
      // sheet stays. Go forward onto the placeholder step this press just
      // left, so the stack is exactly what it was. No new history step is
      // added here (see the 2026-10-03 note above).
      const layerResult = runBackLayer()
      if (layerResult === 'handled') {
        rearmPending = true
        window.history.forward()
        // Safety net: if the browser never reports the move forward, add the
        // placeholder the old way so the sheet is never left without one.
        setTimeout(() => {
          if (!rearmPending) return
          rearmPending = false
          window.history.pushState({ ...(window.history.state || {}), capsulaBackClose: true }, '')
        }, REARM_FALLBACK_MS)
        return
      }
      if (layerResult === 'already') return
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
