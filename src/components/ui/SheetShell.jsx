/**
 * src/components/ui/SheetShell.jsx
 *
 * ⚠️ TEMPORARY DIAGNOSTIC BUILD #2 (console version) — 2026-09-07 ⚠️
 * This is NOT the fix. The first debug build (2026-09-06) diagnosed and
 * fixed the content-scrolling / pointercancel bug. This second build
 * targets two different, still-open symptoms:
 *
 *   1. The sheet itself appears to lift off the top edge of the screen
 *      when dragged upward from the header.
 *   2. On the PWA, the close/snap-back fires before the finger has
 *      actually left the screen.
 *
 * WHAT THIS LOGS (in addition to the same pointer/touch events as before):
 *   - [sheet-debug] transform: <matrix>  translateY=<px>
 *       Sampled continuously while the sheet is open. If translateY ever
 *       goes negative, the sheet has moved upward past its resting
 *       position — that's the "lifting off the edge" symptom, captured
 *       as a number instead of a visual impression.
 *   - [sheet-debug] onOpenChange(false) fired — close/snap-back triggered
 *       Logged the instant vaul decides to close the sheet, so it can be
 *       compared against the timestamps of the pointerup/pointercancel
 *       lines already being logged. If this line appears before
 *       pointerup, that confirms the close is firing before your finger
 *       actually lifts.
 *
 * WHAT TO DO:
 *  1. Rename this file to SheetShell.jsx, replacing the current one.
 *  2. Rebuild/reload (PWA reload is fine, no native rebuild needed).
 *  3. Plug the phone into the computer via USB, USB debugging on.
 *  4. Desktop Chrome -> chrome://inspect/#devices -> "inspect" under the
 *     PWA tab (or the Capsula WebView, if testing the installed app).
 *  5. Open the Console tab in the DevTools window that opens.
 *  6. On the phone: open the specialty picker.
 *       - Drag UP from the header area and watch for translateY going
 *         negative in the console right as it visually lifts.
 *       - Do the drag that closes too early, and check whether the
 *         "onOpenChange(false) fired" line appears before or after the
 *         last pointerup/pointercancel line for that gesture.
 *  7. Copy/screenshot the console output around each moment and send it
 *     over — especially the last ~10 lines before each symptom.
 *
 * Everything else in this file is unchanged from the last working
 * version (the drag/scroll box-split fix from the previous debug round
 * stays in place — Drawer.Content still uses overflow:'hidden', not
 * overflowY:'auto').
 */

import { useEffect, useRef } from 'react'
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

function parseTranslateY(transformValue) {
  // transformValue looks like "matrix(1, 0, 0, 1, 0, 42.5)" or "none".
  if (!transformValue || transformValue === 'none') return null
  const match = transformValue.match(/matrix\(([^)]+)\)/)
  if (!match) return null
  const parts = match[1].split(',').map((n) => parseFloat(n.trim()))
  // matrix(a, b, c, d, tx, ty) — ty is the 6th value (index 5).
  return parts.length === 6 ? parts[5] : null
}

function useGestureDebugLog(isOpen, contentRef) {
  const startRef = useRef(0)
  const lastLoggedTranslateY = useRef(null)

  useEffect(() => {
    if (!isOpen) return
    startRef.current = performance.now()
    lastLoggedTranslateY.current = null
    // eslint-disable-next-line no-console
    console.log('%c[sheet-debug] sheet opened, logging starts now', 'color:#0a0')

    const elapsed = () => (performance.now() - startRef.current).toFixed(0)

    const append = (label) => (e) => {
      const extra = e?.pointerType ? ` type=${e.pointerType}` : ''
      // eslint-disable-next-line no-console
      console.log(`%c[sheet-debug] ${elapsed()}ms  ${label}${extra}`, 'color:#0a0')
    }

    const events = [
      ['pointerdown', append('pointerdown')],
      ['pointermove', append('pointermove')],
      ['pointerup', append('pointerup')],
      ['pointercancel', append('pointercancel')],
      ['lostpointercapture', append('lostpointercapture')],
      ['touchstart', append('touchstart')],
      ['touchmove', append('touchmove')],
      ['touchend', append('touchend')],
      ['touchcancel', append('touchcancel')],
      ['scroll', append('scroll')],
    ]

    events.forEach(([type, handler]) => {
      window.addEventListener(type, handler, { passive: true, capture: true })
    })

    // Poll the sheet's own transform every animation frame while open, and
    // log only when the sampled translateY actually changes, so a real
    // drag shows a clear trail of values (including negative = moved
    // upward past rest) without flooding the console at rest.
    let rafId
    const poll = () => {
      const el = contentRef.current
      if (el) {
        const transform = getComputedStyle(el).transform
        const ty = parseTranslateY(transform)
        if (ty !== null && ty !== lastLoggedTranslateY.current) {
          lastLoggedTranslateY.current = ty
          // eslint-disable-next-line no-console
          console.log(
            `%c[sheet-debug] ${elapsed()}ms  transform: ${transform}  translateY=${ty.toFixed(1)}${ty < 0 ? '  <-- ABOVE resting position' : ''}`,
            'color:#08c'
          )
        }
      }
      rafId = requestAnimationFrame(poll)
    }
    rafId = requestAnimationFrame(poll)

    return () => {
      events.forEach(([type, handler]) => {
        window.removeEventListener(type, handler, { capture: true })
      })
      cancelAnimationFrame(rafId)
    }
  }, [isOpen, contentRef])
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
  const contentRef = useRef(null)
  useBackClose(isOpen, onClose)
  useGestureDebugLog(isOpen, contentRef)

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
      onOpenChange={(open) => {
        if (!open) {
          // eslint-disable-next-line no-console
          console.log('%c[sheet-debug] onOpenChange(false) fired — close/snap-back triggered', 'color:#c00')
          onClose()
        }
      }}
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
          ref={contentRef}
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
