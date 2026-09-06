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
 * Usage:
 *   <SheetShell isOpen={isOpen} onClose={onClose} ariaLabel="Select specialty">
 *     ...sheet content (everything that used to follow the old handle)...
 *   </SheetShell>
 */

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
}) {
  useBackClose(isOpen, onClose)

  return (
    <Drawer.Root
      open={isOpen}
      onOpenChange={(open) => { if (!open) onClose() }}
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
