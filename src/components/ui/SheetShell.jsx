/**
 * src/components/ui/SheetShell.jsx
 *
 * ⚠️ TEMPORARY DIAGNOSTIC BUILD (console version) — 2026-09-06 ⚠️
 * This is NOT the fix. This logs every touch/pointer/scroll event that
 * fires while a sheet is open straight to the browser console, so it can
 * be watched live via chrome://inspect while testing on the phone.
 *
 * WHAT TO DO:
 *  1. Plug the phone into the computer via USB, enable USB debugging on
 *     the phone if not already on.
 *  2. On the computer, open chrome://inspect/#devices in desktop Chrome.
 *  3. Find the phone in the list, then click "inspect" under either the
 *     PWA tab or the Capsula app's WebView (whichever you're testing) —
 *     this opens a live DevTools window connected to the phone.
 *  4. Open the DevTools "Console" tab in that window.
 *  5. On the phone, place this file, rebuild, open the specialty picker.
 *  6. Do the light/slow drag that snaps back, and separately, scroll the
 *     list past its top/bottom.
 *  7. Every event will print as: [sheet-debug] 123ms  pointermove type=touch
 *  8. Copy/screenshot the console output around the moment it breaks and
 *     send it over.
 *
 * This will be removed / replaced with the real fix once we know what's
 * actually firing. Everything else in this file is unchanged from the
 * last working version.
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

function useGestureDebugLog(isOpen) {
  const startRef = useRef(0)

  useEffect(() => {
    if (!isOpen) return
    startRef.current = performance.now()
    // eslint-disable-next-line no-console
    console.log('%c[sheet-debug] sheet opened, logging starts now', 'color:#0a0')

    const append = (label) => (e) => {
      const t = (performance.now() - startRef.current).toFixed(0)
      const extra = e?.pointerType ? ` type=${e.pointerType}` : ''
      // eslint-disable-next-line no-console
      console.log(`%c[sheet-debug] ${t}ms  ${label}${extra}`, 'color:#0a0')
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
  useGestureDebugLog(isOpen)

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
    </Drawer.Root>
  )
}
