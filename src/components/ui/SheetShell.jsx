/**
 * src/components/ui/SheetShell.jsx
 *
 * Shared bottom-sheet shell built on vaul's Drawer. Used by every sheet
 * migrated in Phase 5 of the Back-Button & State-Audit merged plan;
 * SpecialtiesBottomSheet.jsx was the first, and the pattern the rest copy.
 *
 * - Wires this app's own back-close behavior (useBackClose) so hardware/
 *   browser back closes the sheet instead of changing the route.
 * - Locks the page in place while open by pinning <html> with
 *   `position: fixed` (saving and restoring the exact scroll position),
 *   rather than the earlier `overflow: hidden`-only lock. This app's page
 *   scrolls via <html>, not <body>, which is why vaul's own built-in
 *   scroll-lock (aimed at <body>) doesn't cover it. History on this exact
 *   spot, for anyone revisiting it:
 *     - `overflow: hidden` alone (the original approach here) is a
 *       known-weak technique on mobile — many browsers/WebViews still let
 *       a touch-drag "reach through" an `overflow: hidden` element and
 *       scroll it anyway. Confirmed present on this app's real APK, not
 *       just a PWA quirk.
 *     - `touch-action: none` added on top of it (2026-09-09) fixed that,
 *       but broke the sheet's own drag-vs-scroll handling — the property
 *       cascades to every descendant of <html>, including the sheet
 *       itself and its inner list, so the browser could no longer tell a
 *       scroll over the list from a drag on the sheet. Reverted same day.
 *       Do not reapply `touch-action: none` broadly to <html> again.
 *     - `position: fixed` (this version) was then built and tested
 *       on-device successfully, but reverted the same day anyway with no
 *       specific broken behavior identified — worth double-checking
 *       on-device again for anything subtle (a visible jump/flicker on
 *       open or close, or the sheet's own inner list losing its scroll)
 *       before trusting this is fully clean. `position: fixed` removes
 *       the element from being scrollable at all, rather than just
 *       hiding overflow, so there's no drag gesture left for the browser
 *       to misinterpret in the first place — this is also what vaul's
 *       own built-in lock does, just at <body> by default. The sheet's
 *       own scrollable content lives in a separate element from <html>
 *       (its own list, inside its own box), so it isn't the element being
 *       pinned here and shouldn't be affected.
 * - The drag surface (Drawer.Content) never scrolls itself — it's
 *   `overflow: hidden` here, full stop. Any inner scrollable content
 *   (e.g. the specialty list) handles its own scroll separately, inside
 *   its own scrollable element. This split is what fixed the sheet
 *   closing/snapping back mid-drag (confirmed 2026-09-08): before it, the
 *   drag surface and its inner list were both independently scrollable,
 *   which confused the phone about whether a touch was a drag or a
 *   scroll, and sometimes yanked control away mid-gesture.
 * - `closeThreshold` defaults to 0.4 (raised from vaul's own 0.25
 *   default) so a light, accidental touch doesn't close the sheet — it
 *   takes a real, deliberate drag or a fast flick before it lets go.
 */

import { useEffect } from 'react'
import { Drawer } from 'vaul'
import { useBackClose } from '../../hooks/useBackClose'

const VISUALLY_HIDDEN_STYLE = {
  position:   'absolute',
  width:      1,
  height:     1,
  padding:    0,
  margin:     -1,
  overflow:   'hidden',
  clip:       'rect(0,0,0,0)',
  whiteSpace: 'nowrap',
  border:     0,
}

export default function SheetShell({
  isOpen,
  onClose,
  ariaLabel,
  children,
  zIndex = 200,
  backdropOpacity = 0.4,
  maxHeight = '85dvh',
  closeThreshold = 0.4,
}) {
  useBackClose(isOpen, onClose)

  useEffect(() => {
    if (!isOpen) return
    const html = document.documentElement
    const scrollY = window.scrollY
    const prevPosition = html.style.position
    const prevTop = html.style.top
    const prevWidth = html.style.width
    const prevOverflow = html.style.overflow

    html.style.position = 'fixed'
    html.style.top = `-${scrollY}px`
    html.style.width = '100%'
    html.style.overflow = 'hidden'

    return () => {
      html.style.position = prevPosition
      html.style.top = prevTop
      html.style.width = prevWidth
      html.style.overflow = prevOverflow
      window.scrollTo(0, scrollY)
    }
  }, [isOpen])

  return (
    <Drawer.Root
      open={isOpen}
      onOpenChange={(open) => { if (!open) onClose() }}
      closeThreshold={closeThreshold}
    >
      <Drawer.Portal>
        <Drawer.Overlay
          style={{
            position:        'fixed',
            inset:           0,
            zIndex,
            backgroundColor: `rgba(0,0,0,${backdropOpacity})`,
          }}
        />
        <Drawer.Content
          aria-describedby={undefined}
          style={{
            position:        'fixed',
            bottom:          0,
            left:            0,
            right:           0,
            zIndex:          zIndex + 1,
            backgroundColor: 'var(--color-surface)',
            borderRadius:    '16px 16px 0 0',
            paddingBottom:   'env(safe-area-inset-bottom)',
            display:         'flex',
            flexDirection:   'column',
            maxHeight,
            overflow:        'hidden',
            outline:         'none',
          }}
        >
          <Drawer.Title style={VISUALLY_HIDDEN_STYLE}>
            {ariaLabel}
          </Drawer.Title>

          <div
            aria-hidden="true"
            style={{
              width:           40,
              height:          4,
              borderRadius:    2,
              backgroundColor: 'var(--color-border)',
              margin:          'var(--space-5) auto var(--space-4)',
              flexShrink:      0,
            }}
          />

          {children}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}
