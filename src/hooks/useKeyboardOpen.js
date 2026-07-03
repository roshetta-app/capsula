/**
 * src/hooks/useKeyboardOpen.js
 *
 * Extracted from BottomNav.jsx (Phase 16) so more than one component can
 * react to the same signal without duplicating the visual-viewport math or
 * coupling to BottomNav directly.
 *
 * Tracks the visual viewport against a captured baseline height. A real
 * on-screen keyboard shrinks it by a large, unmistakable amount; clicking
 * into a field with a mouse (desktop) never shrinks it at all, so this
 * stays false there — no separate mobile/desktop detection needed.
 */
import { useState, useEffect } from 'react'

// Minimum viewport height drop (px) to treat as "a keyboard opened" rather
// than a desktop window resize or other minor viewport fluctuation.
const KEYBOARD_HEIGHT_THRESHOLD = 150

export function useKeyboardOpen() {
  const [keyboardOpen, setKeyboardOpen] = useState(false)

  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return

    let baseline = vv.height

    function update() {
      // Track the largest height seen (keyboard-closed state) as the
      // baseline, so this keeps working correctly even if the browser
      // chrome itself changes height between checks.
      if (vv.height > baseline) baseline = vv.height
      setKeyboardOpen(baseline - vv.height > KEYBOARD_HEIGHT_THRESHOLD)
    }

    update()
    vv.addEventListener('resize', update)
    return () => vv.removeEventListener('resize', update)
  }, [])

  return keyboardOpen
}
