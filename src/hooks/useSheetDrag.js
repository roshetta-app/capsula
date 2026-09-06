/**
 * useSheetDrag — real drag-to-close gesture for a bottom sheet's existing
 * (previously decorative) handle.
 *
 * Generalizes the same drag interaction across every bottom sheet in the
 * app (Merged Phase 3, step 3.2), the same way useBackClose.js generalizes
 * the back-button/back-gesture side of Phase 1 — one small hook instead of
 * repeating pointer-tracking logic in 8+ sheet files.
 *
 * Usage:
 *   const { dragY, isDragging, dragHandlers } = useSheetDrag(onClose)
 *
 *   onClose  — called once the handle is dragged past CLOSE_THRESHOLD_PX,
 *              or released with enough downward velocity to count as a
 *              flick even if the threshold wasn't reached. Read via a ref
 *              internally, so callers don't need to memoize it.
 *
 *   dragY        — current downward drag offset in px (0 when not
 *                  dragging). Add this to the sheet's own translateY.
 *   isDragging   — true while a drag is in progress. Use this to disable
 *                  the sheet's normal open/close transition so the sheet
 *                  tracks the finger directly instead of easing behind it.
 *   dragHandlers — spread onto the handle element: { onPointerDown,
 *                  onPointerMove, onPointerUp, onPointerCancel }.
 *
 * Only downward movement is tracked (dragY is clamped to >= 0) — the
 * handle is a close gesture, not a way to drag the sheet up past its
 * resting position. Uses Pointer Events (not separate touch/mouse
 * handlers) since this app's targets (mobile web/PWA + Capacitor WebView)
 * both support them, and pointer capture keeps the drag tracking correctly
 * even if the finger moves off the small handle element.
 */

import { useCallback, useRef, useState } from 'react'

const CLOSE_THRESHOLD_PX = 100 // dragged past this far down -> treat as close
const CLOSE_VELOCITY_PX_MS = 0.5 // fast downward flick closes even under the threshold

export function useSheetDrag(onClose) {
  const [dragY, setDragY] = useState(0)
  const [isDragging, setIsDragging] = useState(false)

  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  const startYRef = useRef(0)
  const startTimeRef = useRef(0)
  const draggingRef = useRef(false)

  const handlePointerDown = useCallback((e) => {
    draggingRef.current = true
    startYRef.current = e.clientY
    startTimeRef.current = Date.now()
    setIsDragging(true)
    e.currentTarget.setPointerCapture?.(e.pointerId)
  }, [])

  const handlePointerMove = useCallback((e) => {
    if (!draggingRef.current) return
    const delta = e.clientY - startYRef.current
    setDragY(delta > 0 ? delta : 0)
  }, [])

  const endDrag = useCallback((e) => {
    if (!draggingRef.current) return
    draggingRef.current = false
    setIsDragging(false)

    setDragY((finalDragY) => {
      const elapsedMs = Math.max(Date.now() - startTimeRef.current, 1)
      const velocity = finalDragY / elapsedMs
      if (finalDragY > CLOSE_THRESHOLD_PX || velocity > CLOSE_VELOCITY_PX_MS) {
        onCloseRef.current()
      }
      return 0
    })

    e.currentTarget?.releasePointerCapture?.(e.pointerId)
  }, [])

  return {
    dragY,
    isDragging,
    dragHandlers: {
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: endDrag,
      onPointerCancel: endDrag,
    },
  }
}
