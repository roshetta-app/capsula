/**
 * src/hooks/useDirtyState.js
 * Phase 3A — Tracks whether a form value has been modified from its saved state.
 *
 * Usage:
 *   const isDirty = useDirtyState(savedValue, currentValue)
 *
 * - Returns true when currentValue differs from savedValue (deep equality via JSON).
 * - Reset: pass the new saved value as initialValue after a successful save.
 *
 * NOTE: uses JSON.stringify comparison — suitable for plain objects/arrays.
 * For functions or special types, swap for a custom comparator.
 */

import { useMemo } from 'react'

export function useDirtyState(initialValue, currentValue) {
  return useMemo(() => {
    try {
      return JSON.stringify(initialValue) !== JSON.stringify(currentValue)
    } catch {
      return initialValue !== currentValue
    }
  }, [initialValue, currentValue])
}
