// The first few cards of a screen fade in one after another (2026-11-20, step 11.19).
// It plays on exactly the same moments as the whole-screen fade in utils/pageEntrance.js (a forward
// open of a screen, or the first open of a tab in a session; never Back, never a cold start, never
// admin, never with reduce motion), because PageEntrance only hands out a gate on those moments.
// A screen with no gate (Home and Topics have their own entrance) gets nothing from this file.
//
// How it works: the gate gives out slots 0, 1, 2 ... to the cards that appear first. Its window opens
// when the first card claims a slot and shuts ROW_WINDOW_MS later, and it holds at most ROW_STAGGER_MAX
// slots. Cards that appear after that (search results, a list that grows, a sheet) never animate.
// The fade is opacity only, so nothing can move and fixed bars cannot jump.

export const ROW_STAGGER_MAX = 8
export const ROW_STAGGER_MS = 30
export const ROW_START_MS = 60
export const ROW_WINDOW_MS = 300
export const ROW_FADE_MS = 200   // the app's base motion duration (--motion-base)

export function newRowGate() {
  return { next: 0, openedAt: null }
}

// Gives the next slot (0-based) or -1 for none. `now` is a millisecond clock reading.
export function claimRowSlot(gate, now) {
  if (!gate) return -1
  if (gate.openedAt === null) gate.openedAt = now
  if (now - gate.openedAt > ROW_WINDOW_MS) return -1
  if (gate.next >= ROW_STAGGER_MAX) return -1
  const slot = gate.next
  gate.next += 1
  return slot
}

export function rowDelayMs(slot) {
  return ROW_START_MS + slot * ROW_STAGGER_MS
}

// How long until the class can be taken off again (the last fade has finished, plus a little).
export function rowFinishMs(slot) {
  return rowDelayMs(slot) + ROW_FADE_MS + 80
}
