/**
 * src/components/ui/SheetShell.jsx
 *
 * Shared bottom-sheet shell built on vaul's Drawer. Used by every sheet
 * migrated in Phase 5 of the Back-Button & State-Audit merged plan;
 * SpecialtiesBottomSheet.jsx was the first, and the pattern the rest copy.
 *
 * - Wires this app's own back-close behavior (useBackClose) so hardware/
 *   browser back closes the sheet instead of changing the route.
 * - Locks <html> scrolling while open. vaul's own scroll-lock only covers
 *   <body>, but this app's page actually scrolls via <html>, so without
 *   this the page behind the sheet could still move during a drag. Sets
 *   both `overflow: hidden` (stops the scroll position itself from
 *   moving) and `touch-action: none` (stops the browser from treating a
 *   touch-drag on <html> as a pan/scroll gesture in the first place —
 *   without this, a drag on the sheet could still visually drag the page
 *   underneath it, confirmed 2026-09-09).
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
    const prevOverflow    = html.style.overflow
    const prevTouchAction = html.style.touchAction
    html.style.overflow    = 'hidden'
    html.style.touchAction = 'none'
    return () => {
      html.style.overflow    = prevOverflow
      html.style.touchAction = prevTouchAction
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
