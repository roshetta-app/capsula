// Step list for undo and redo. No screen code in here, so it can be tested on its own.
//
// A history holds the page as it stands now (present), the earlier versions
// (past, oldest first) and the versions undo stepped back from (future).
// Every function returns a new history and never changes the one it was given.
//
// Changes that arrive close together (typing a sentence) count as ONE step:
// if less than MERGE_WINDOW_MS passed since the previous change, the page is
// updated without adding a new step. The first change after an undo or a redo
// always starts a new step.

export const MAX_STEPS = 50
export const MERGE_WINDOW_MS = 800

// A text form of the page, used only to tell whether anything really changed.
// Returns null when the page cannot be turned into text (then it always counts as changed).
function keyOf(snapshot) {
  try {
    return JSON.stringify(snapshot)
  } catch {
    return null
  }
}

// Start a history from the page as it was when it finished loading.
export function createHistory(baseline) {
  return {
    past: [],
    present: baseline,
    presentKey: keyOf(baseline),
    future: [],
    lastChangeAt: null,
  }
}

// The page changed. 'now' is the time in milliseconds.
// Nothing happens when the page is identical to the current one.
export function recordChange(history, snapshot, now) {
  const key = keyOf(snapshot)
  if (key !== null && key === history.presentKey) return history

  const merge = history.lastChangeAt !== null && now - history.lastChangeAt < MERGE_WINDOW_MS
  const past = merge
    ? history.past
    : [...history.past, history.present].slice(-MAX_STEPS)

  return {
    past,
    present: snapshot,
    presentKey: key,
    future: [],
    lastChangeAt: now,
  }
}

export function canUndo(history) {
  return history.past.length > 0
}

export function canRedo(history) {
  return history.future.length > 0
}

// Step back one step. Does nothing when there is nothing to undo.
export function undo(history) {
  if (!canUndo(history)) return history
  const previous = history.past[history.past.length - 1]
  return {
    past: history.past.slice(0, -1),
    present: previous,
    presentKey: keyOf(previous),
    future: [history.present, ...history.future],
    lastChangeAt: null,
  }
}

// Step forward one step. Does nothing when there is nothing to redo.
export function redo(history) {
  if (!canRedo(history)) return history
  const next = history.future[0]
  return {
    past: [...history.past, history.present].slice(-MAX_STEPS),
    present: next,
    presentKey: keyOf(next),
    future: history.future.slice(1),
    lastChangeAt: null,
  }
}
