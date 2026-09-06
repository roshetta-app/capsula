/**
 * src/components/ui/SheetShell.jsx
 * Phase 5 (Back-Button & State-Audit merged plan) — drag-to-dismiss vaul
 * migration.
 *
 * Shared bottom-sheet shell, replacing the hand-rolled backdrop/dialog/
 * handle markup every sheet in the app used to repeat, and the
 * useSheetDrag.js gesture that only made the small handle bar draggable.
 * Built on `vaul`'s Drawer parts, which own the drag gesture on the whole
 * sheet directly and already resolve "is this a scroll or a close-drag"
 * correctly on their own — a drag only starts closing the sheet once
 * whatever's under the finger is scrolled all the way to the top.
 *
 * What this replaces, per sheet that adopts it:
 *  - The backdrop div + dialog div + drag-handle markup.
 *  - shouldRender/animateIn mount-timing state — vaul unmounts on its own
 *    once its own exit transition finishes, nothing to track by hand.
 *  - The manual Escape-key listener and body-scroll-lock effect — vaul's
 *    underlying Radix Dialog already does both while the sheet is open
 *    (the default "modal" behavior, which is what every sheet here wants).
 *  - The per-sheet useBackClose() call — wired once, here, instead of once
 *    per sheet file. (Still needed at all because vaul has no concept of
 *    Capacitor's native hardware back button.)
 *  - The per-sheet useSheetDrag() call and its dragY/isDragging/
 *    dragHandlers wiring.
 *
 * What a caller still owns:
 *  - Its own content — everything that used to sit inside the old dialog
 *    div (after the handle) is unchanged, just passed as children here.
 *  - Its own visual quirks that differed sheet-to-sheet before this
 *    migration: AccountSheet.jsx and PaywallGateSheet.jsx sit at a higher
 *    z-index tier and use a slightly darker backdrop than the rest — pass
 *    those through the zIndex / backdropOpacity props rather than losing
 *    the distinction by hardcoding one value here.
 *
 * Drag-to-close sensitivity:
 *  - `closeThreshold` (0–1) is how far down the sheet must be dragged,
 *    as a fraction of its own height, before it lets go and closes
 *    instead of snapping back. vaul's own default (0.25) meant a small,
 *    accidental nudge was enough to close the sheet — raised here to 0.4
 *    so it takes a real, deliberate pull (or a fast flick, which vaul
 *    still honors separately) before it closes. Exposed as a prop, same
 *    pattern as zIndex/backdropOpacity, in case a specific sheet ever
 *    needs its own feel.
 *
 * Usage:
 *   <SheetShell isOpen={isOpen} onClose={onClose} ariaLabel="Select specialty">
 *     ...sheet content (everything that used to follow the old handle)...
 *   </SheetShell>
 */

import { useEffect } from 'react'
import { Drawer } from 'vaul'
import { useBackClose } from '../../hooks/useBackClose'

const VISUALLY_HIDDEN_STYLE = {
  position: 'absolute',
  width:    1,
  height:   1,
  padding:  0,
  margin:   -1,
  overflow: 'hidden',
  clip:     'rect(0,0,0,0)',
  whiteSpace: 'nowrap',
  border:   0,
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

  // vaul locks scrolling on <body> while a sheet is open (its own built-in
  // behavior). This app's page actually scrolls via the <html> element
  // rather than <body>, which vaul has no way to know about — so <html>
  // was left free to scroll underneath the drag. This mirrors just the
  // overflow lock onto <html>, active only while a sheet is open,
  // restoring whatever was there before on close.
  //
  // Bug fix, 2026-09-06 (sheet-drag-false-liftoff) — this used to also set
  // touchAction: 'none' on <html> here. That's what was causing the drag
  // to feel like it thought your finger had lifted mid-drag: changing
  // touch-action on an ancestor of the sheet's own drag target can make
  // the browser end the in-progress touch sequence early. It was removed
  // for two reasons: it was the direct cause of that bug, and it was never
  // fixing the real background-bounce issue anyway — that turned out to
  // be Android's native WebView edge-glow effect, fixed separately at the
  // native level (see MainActivity.java).
  //
  // Bug fix, 2026-09-06 (pwa-drag-finger-lift) — the same "finger lifted"
  // symptom persisted, but only in the browser/PWA build, not the
  // installed app. Root cause: the browser's own built-in pull-to-
  // refresh/rubber-band gesture, which the installed app's WebView doesn't
  // have. Even with <html> unable to scroll, the browser can still try to
  // take over a downward drag from the top of the page for its own
  // gesture, which cancels the in-progress drag from the app's point of
  // view — that hand-off is what looked like an early finger-lift.
  // `overscroll-behavior` is the correct, narrow tool for this: unlike
  // `touch-action`, it only tells the browser "don't run your own
  // pull-to-refresh/bounce here," without changing how touch events are
  // delivered to the page — so it doesn't reintroduce the earlier bug.
  // Scoped to while a sheet is open and restored on close, same pattern as
  // the overflow lock above.
  useEffect(() => {
    if (!isOpen) return
    const html = document.documentElement
    const prevOverflow = html.style.overflow
    const prevOverscrollBehavior = html.style.overscrollBehavior
    html.style.overflow = 'hidden'
    html.style.overscrollBehavior = 'none'
    return () => {
      html.style.overflow = prevOverflow
      html.style.overscrollBehavior = prevOverscrollBehavior
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
            overflowY:       'auto',
            outline:         'none',
          }}
        >
          {/* Accessible name for screen readers — visually hidden since
              every sheet already shows its own visible title/label in its
              content below. */}
          <Drawer.Title style={VISUALLY_HIDDEN_STYLE}>
            {ariaLabel}
          </Drawer.Title>

          {/* Visual drag handle — purely decorative now. The whole sheet
              is the real drag target (vaul owns that directly on
              Drawer.Content above), this bar just signals "draggable" the
              way it always has. */}
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
