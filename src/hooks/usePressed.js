/**
 * src/hooks/usePressed.js
 *
 * Tap feedback helper (2026-10-18, drug page strip and Share button). Same
 * pointer pattern as ConditionCard and SpecialtySelector: 'pressed' is true
 * while a finger is down on the element and drops the moment it lifts, leaves,
 * or the browser takes the touch over for scrolling. Spread 'handlers' onto
 * the element and style it from 'pressed' (a small scale-down, set with the
 * app's --motion-fast / --ease-settle tokens).
 */

import { useState } from 'react'

export function usePressed() {
  const [pressed, setPressed] = useState(false)
  const handlers = {
    onPointerDown: () => setPressed(true),
    onPointerUp: () => setPressed(false),
    onPointerLeave: () => setPressed(false),
    onPointerCancel: () => setPressed(false),
  }
  return { pressed, handlers }
}
