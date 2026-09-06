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
 *    If the content is tall enough to need its own scrolling (most sheets
 *    are), the caller is responsible for giving its own scrollable region
 *    `flex: 1` + `overflowY: 'auto'` (see SpecialtiesBottomSheet.jsx for
 *    the pattern: a fixed-height header with `flexShrink: 0`, followed by
 *    the scrollable list). This shell deliberately does not scroll itself
 *    — see the drag-vs-scroll note below for why.
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
 * Bug fix, 2026-09-07 (drag-vs-scroll box split) — root cause confirmed via
 * on-device console logging, not guessed: the touch sequence during a
 * light/slow drag was pointerdown -> pointermove -> pointermove ->
 * pointercancel -> lostpointercapture -> scroll -> scroll -> touchmove ->
 * touchend. The pointercancel firing after only two tiny movements, right
 * before native scroll events appear, means the browser itself was handing
 * the touch over to native page-scrolling mid-gesture — not a dropped
 * finger, and not something a settings tweak can suppress.
 *
 * The actual cause: this component's own drag surface (Drawer.Content,
 * below) also had `overflowY: 'auto'` set directly on it. That made the
 * exact same box vaul uses to track the drag *also* a native scrollable
 * container in its own right — on top of whatever scrollable region the
 * caller's content already declared inside it (e.g. the specialty list in
 * SpecialtiesBottomSheet.jsx). With two overlapping scrollable boxes and
 * one of them also being the drag target, the browser has no reliable way
 * to decide which one owns an ambiguous touch, so it sometimes yanks the
 * touch away mid-drag. This also explains an earlier "sheet pulled off the
 * edge" symptom — same shared-box cause.
 *
 * The fix: `overflow: 'hidden'` instead of `overflowY: 'auto'` on
 * Drawer.Content. This keeps the maxHeight cap (so tall content still
 * clips instead of pushing the sheet off-screen) without letting the drag
 * surface itself act as a scroll container. Only a caller's own inner
 * content — never this shell — is now scrollable, which removes the
 * ambiguity for every sheet built on this shell, not just the one that
 * was tested.
 *
 * This file also replaces a temporary diagnostic build (console-only
 * event logging, added 2026-09-06 purely to capture the sequence above)
 * that was standing in for this file during the investigation — that
 * instrumentation is fully removed here; nothing in this file logs to the
 * console anymore.
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
  useEffect(() => {
    if (!isOpen) return
    const html = document.documentElement
    const prevOverflow = html.style.overflow
    html.style.overflow = 'hidden'
    return () => {
      html.style.overflow = prevOverflow
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
