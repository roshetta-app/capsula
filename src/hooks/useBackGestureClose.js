/**
 * src/hooks/useBackGestureClose.js
 *
 * Makes the phone's back gesture / back button close an open bottom sheet
 * instead of navigating the browser away from the app. Shared by every
 * consumer-facing sheet (SpecialtiesBottomSheet, ConfirmSheet,
 * FavouritesManagerSheet, DrugsInfoSheet, RecentlyViewedSheet,
 * BrandsBottomSheet, DoseAdjustmentsBottomSheet, PregnancyCategoryBottomSheet)
 * so the behavior is identical everywhere instead of hand-rolled per sheet.
 * Admin CMS modals (Modal.jsx / ConfirmModal.jsx) intentionally do not use
 * this — that surface is desktop-only.
 *
 * How it works: while the sheet is open, a history entry is pushed. A back
 * gesture pops that entry, which fires 'popstate' — caught here and turned
 * into a call to the sheet's existing onClose, the same close path already
 * used by a backdrop tap or Escape. If the sheet closes any other way, the
 * pushed history entry is still sitting there unused, so it's removed with
 * one history.back() on cleanup — otherwise a second back gesture would be
 * needed to actually leave the screen.
 *
 * Usage: useBackGestureClose(isOpen, onClose)
 */

import { useEffect, useRef } from 'react'

export default function useBackGestureClose(isOpen, onClose) {
  const pushedRef = useRef(false)

  useEffect(() => {
    if (!isOpen) return

    window.history.pushState({ sheetOpen: true }, '')
    pushedRef.current = true

    function handlePopState() {
      pushedRef.current = false
      onClose()
    }
    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('popstate', handlePopState)
      // Closed some other way (backdrop tap, Escape, X button) — the entry
      // we pushed above was never popped, so remove it ourselves.
      if (pushedRef.current) {
        pushedRef.current = false
        window.history.back()
      }
    }
  }, [isOpen, onClose])
}
