/**
 * src/components/ui/SheetShell.jsx
 *
 * ⚠️ TEMPORARY DIAGNOSTIC BUILD — 2026-09-06 ⚠️
 * This is NOT the fix. This is a debug version added to figure out why a
 * light/slow drag on the PWA (Android Chrome, added to home screen) still
 * snaps back or closes partway through, even though the finger never
 * lifted. Two prior targeted fixes (removing touch-action, adding
 * overscroll-behavior) did not resolve it, so instead of guessing a third
 * time, this build shows a small on-screen readout of exactly which
 * browser touch/pointer events fire while you drag, in order, with
 * timestamps.
 *
 * WHAT TO DO:
 *  1. Place this file, rebuild, open it in the PWA (same way you tested
 *     before — Android Chrome, added to home screen).
 *  2. Open the specialty picker sheet.
 *  3. Do the same light/slow drag that causes the snap-back.
 *  4. A small black box will appear in the top-left of the screen showing
 *     the last ~15 events (e.g. "pointerdown", "pointermove x4",
 *     "pointercancel", "lostpointercapture", etc.) with timestamps.
 *  5. Take a screenshot or just read off the list to me, especially
 *     whatever appears right at/before the moment it snaps back.
 *
 * This will be removed / replaced with the real fix once we know what's
 * actually firing. Everything else in this file is unchanged from the
 * last working version.
 */

import { useEffect, useRef, useState } from 'react'
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

const DEBUG_OVERLAY_STYLE = {
  position:       'fixed',
  top:            8,
  left:           8,
  zIndex:         99999,
  maxWidth:       '80vw',
  maxHeight:      '40vh',
  overflowY:      'auto',
  backgroundColor: 'rgba(0,0,0,0.85)',
  color:          '#0f0',
  fontFamily:     'monospace',
  fontSize:       11,
  lineHeight:     1.4,
  padding:        8,
  borderRadius:   6,
  pointerEvents:  'none',
  whiteSpace:     'pre-wrap',
}

function useGestureDebugLog(isOpen) {
  const [log, setLog] = useState([])
  const startRef = useRef(0)

  useEffect(() => {
    if (!isOpen) {
      setLog([])
      return
    }
    startRef.current = performance.now()

    const append = (label) => (e) => {
      const t = (performance.now() - startRef.current).toFixed(0)
      const extra = e?.pointerType ? ` type=${e.pointerType}` : ''
      setLog((prev) => {
        const next = [...prev, `${t}ms  ${label}${extra}`]
        return next.slice(-15)
      })
    }

    // Passive, non-interfering listeners purely for observation — these
    // never call preventDefault/stopPropagation, so they cannot change
    // the drag behavior itself, only report on it.
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
      ['visibilitychange', append('visibilitychange')],
      ['scroll', append('scroll')],
    ]

    events.forEach(([type, handler]) => {
      window.addEventListener(type, handler, { passive: true, capture: true })
    })

    return () => {
      events.forEach(([type, handler]) => {
        window.removeEventListener(type, handler, { capture: true })
      })
    }
  }, [isOpen])

  return log
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
  const debugLog = useGestureDebugLog(isOpen)

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

      {isOpen && (
        <div style={DEBUG_OVERLAY_STYLE}>
          {debugLog.length === 0 ? 'waiting for gesture…' : debugLog.join('\n')}
        </div>
      )}
    </Drawer.Root>
  )
}
