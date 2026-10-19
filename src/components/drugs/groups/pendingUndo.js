/**
 * src/components/drugs/groups/pendingUndo.js
 * 2026-10-19 (Drug groups plan, step 6.1): a one-slot hand-off for the Undo of
 * Delete group. When a group is deleted from its own page the person is taken
 * back to the Drugs home, and the home's My drug groups area shows the
 * "Group deleted / Undo" message there. The page puts the deleted group here,
 * the home takes it once (taking empties the slot, so a later visit shows
 * nothing). Kept in memory only: it does not survive closing the app.
 */

let pending = null

export function setPendingUndo(group) {
  pending = group ?? null
}

export function takePendingUndo() {
  const g = pending
  pending = null
  return g
}
