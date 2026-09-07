/**
 * src/components/ui/SheetShell.jsx
 *
 * ⚠️ TEMPORARY DIAGNOSTIC BUILD #4 (long-stall detector) — 2026-09-07 ⚠️
 * Chasing occasional big stalls (50-65ms) found via adb gfxinfo, on top of
 * the smaller, mostly-fixed per-frame cost from the icon memoization fix.
 * This build does NOT use DevTools at all — everything logs to console,
 * captured with plain `adb logcat`, same as before.
 *
 * WHAT THIS LOGS:
 *   [long-stall] <duration>ms starting at <time>ms
 *       Printed automatically by the browser itself whenever the main
 *       thread is blocked for 50ms or more (the browser's own "long task"
 *       detector) — this is exactly the kind of stall behind the stutter.
 *   [sheet-debug] pointerdown / pointermove / pointerup / pointercancel
 *       Same touch event log as before, so we can see whether a long-stall
 *       line lines up with a specific moment in the drag (e.g. right when
 *       you cross into the scrollable list, or right when you reverse
 *       direction).
 *
 * WHAT TO DO:
 *  1. Place this as src/components/ui/SheetShell.jsx, replacing the
 *     current one.
 *  2. Full rebuild:
 *     npm run build:capacitor && npx cap sync android && npx cap run android --target=<your device target>
 *  3. In a terminal:
 *     adb -s <your device id> logcat -s chromium:I > stall_log.txt
 *  4. On your phone: open the specialty picker, do the stuttery drag over
 *     the list a few times.
 *  5. Back in the terminal: Ctrl+C to stop logging.
 *  6. Upload stall_log.txt here. That's it — no DevTools, no screenshots
 *     of graphs needed.
 *
 * Everything else here is unchanged from the working version — the
 * drag/scroll box-split fix (overflow: hidden on the drag surface) stays
 * in place.
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

function useLongStallLogger(isOpen) {
  useEffect(() => {
    if (!isOpen) return
    if (typeof PerformanceObserver === 'undefined') return

    let observer
    try {
      observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          // eslint-disable-next-line no-console
          console.log(
            `%c[long-stall] ${entry.duration.toFixed(0)}ms starting at ${entry.startTime.toFixed(0)}ms`,
            'color:#f00; font-weight:bold',
          )
        }
      })
      observer.observe({ entryTypes: ['longtask'] })
    } catch {
      // eslint-disable-next-line no-console
      console.log('[long-stall] longtask API not supported on this WebView')
    }

    return () => observer && observer.disconnect()
  }, [isOpen])
}

function useGestureDebugLog(isOpen) {
  useEffect(() => {
    if (!isOpen) return
    const startTime = performance.now()
    const elapsed = () => (performance.now() - startTime).toFixed(0)

    const append = (label) => () => {
      // eslint-disable-next-line no-console
      console.log(`%c[sheet-debug] ${elapsed()}ms  ${label}`, 'color:#0a0')
    }

    const events = [
      ['pointerdown', append('pointerdown')],
      ['pointermove', append('pointermove')],
      ['pointerup', append('pointerup')],
      ['pointercancel', append('pointercancel')],
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
  useLongStallLogger(isOpen)
  useGestureDebugLog(isOpen)

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
