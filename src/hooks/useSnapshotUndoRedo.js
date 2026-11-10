/**
 * src/hooks/useSnapshotUndoRedo.js
 *
 * Undo and redo for the drug editor, for the current editing session only
 * (nothing is stored; closing or refreshing the page clears the steps).
 *
 * Same step rules as usePageUndoRedo (src/utils/undoHistory.js: changes close
 * together count as one step, 50 steps kept), but it watches one 'snapshot'
 * (the generic plus all its formulations and brands) and it can be restarted.
 *
 * Why restart: the drug editor writes to the database in pieces (Save on a
 * formulation, Save on the generic, add / delete a formulation, publish or
 * draft toggles). Stepping back across one of those would put on screen
 * something the database no longer has (a brand that already got its id, a
 * formulation that was already deleted). So every time something is written,
 * the editor bumps resetKey and the history starts again from the page as it
 * is at that moment. Undo then only covers edits not yet written.
 *
 * Undo and redo do not touch the page themselves: they hand the earlier page
 * to onRestore, and the editor puts it back.
 *
 * Usage:
 *   const { canUndo, canRedo, undo, redo } = useSnapshotUndoRedo({
 *     snapshot, ready: !loading, disabled: saving, resetKey, onRestore: restore,
 *   })
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  createHistory,
  recordChange,
  canUndo as hasUndo,
  canRedo as hasRedo,
  undo as stepBack,
  redo as stepForward,
} from '../utils/undoHistory'

export function useSnapshotUndoRedo({ snapshot, ready, disabled = false, resetKey = 0, onRestore }) {
  const [history, setHistory] = useState(null)
  const lastResetKey = useRef(resetKey)

  // Record the page after every change (one moment later, newest page only).
  // Not ready (still loading) clears the history, so a reload starts clean.
  useEffect(() => {
    if (!ready) { setHistory(null); return undefined }
    const timer = setTimeout(() => {
      const now = Date.now()
      const restart = lastResetKey.current !== resetKey
      lastResetKey.current = resetKey
      setHistory(prev => (
        restart || prev === null ? createHistory(snapshot) : recordChange(prev, snapshot, now)
      ))
    }, 0)
    return () => clearTimeout(timer)
  }, [ready, snapshot, resetKey])

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
