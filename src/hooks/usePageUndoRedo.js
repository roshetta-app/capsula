/**
 * src/hooks/usePageUndoRedo.js
 *
 * Undo and redo for the condition page editor, for the current editing session
 * only (nothing is stored; closing or refreshing the page clears the steps).
 *
 * It watches the three things the page's Save button saves (details, blocks,
 * tags). Each time one changes it records a step; changes that come close
 * together count as one step (see src/utils/undoHistory.js). The first
 * recording after the page has finished loading is the starting point, so a
 * freshly opened page has nothing to undo.
 *
 * Undo and redo do not touch the page themselves: they hand the earlier page
 * to onRestore, and the editor puts it back. The page that comes back is then
 * recognised as identical to the current step, so it is not recorded again.
 *
 * Usage:
 *   const { canUndo, canRedo, undo, redo } = usePageUndoRedo({
 *     form, blocks, tags, ready: !loading, disabled: saving, onRestore: restorePage,
 *   })
 */

import { useState, useEffect, useCallback } from 'react'
import {
  createHistory,
  recordChange,
  canUndo as hasUndo,
  canRedo as hasRedo,
  undo as stepBack,
  redo as stepForward,
} from '../utils/undoHistory'

export function usePageUndoRedo({ form, blocks, tags, ready, disabled = false, onRestore }) {
  const [history, setHistory] = useState(null)

  // Record the page after every change. The recording runs one moment later
  // (not during the change itself) and only the newest page is recorded.
  useEffect(() => {
    if (!ready) return undefined
    const timer = setTimeout(() => {
      const snapshot = { form, blocks, tags }
      const now = Date.now()
      setHistory(prev => (prev === null ? createHistory(snapshot) : recordChange(prev, snapshot, now)))
    }, 0)
    return () => clearTimeout(timer)
  }, [ready, form, blocks, tags])

  const undo = useCallback(() => {
    if (disabled || history === null || !hasUndo(history)) return
    const next = stepBack(history)
    setHistory(next)
    onRestore(next.present)
  }, [disabled, history, onRestore])

  const redo = useCallback(() => {
    if (disabled || history === null || !hasRedo(history)) return
    const next = stepForward(history)
    setHistory(next)
    onRestore(next.present)
  }, [disabled, history, onRestore])

  return {
    canUndo: !disabled && history !== null && hasUndo(history),
    canRedo: !disabled && history !== null && hasRedo(history),
    undo,
    redo,
  }
}
