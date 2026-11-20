// The tap guard (Roshetta plan, Phase K, step 12.6; cases K7 and K24).
//
// Two small rules, plain code with no React so the checks can run it with a fake clock:
//   open(key, fn)  A second open of the SAME target within a short moment is ignored, so a double
//                  tap on a row opens the page once and one Back returns. A different target is
//                  never held back.
//   back(fn)       A Back press is ignored while the previous one is still settling (the screen
//                  has not changed yet, and not more than a short moment has passed). One press,
//                  one screen: fast presses never skip a screen.
//   settled()      Tell the guard the screen changed, so the next Back counts straight away.
//
// Used at the doors in step 12.7 (through hooks/useTapGuard.js). Nothing calls it yet.

export const OPEN_WINDOW_MS = 700
export const BACK_WINDOW_MS = 450

export function createTapGuard({ now = () => Date.now(), openMs = OPEN_WINDOW_MS, backMs = BACK_WINDOW_MS } = {}) {
  let lastKey = null
  let lastOpenAt = -Infinity
  let backPending = false
  let lastBackAt = -Infinity
  return {
    // Runs fn and returns true, or ignores the tap and returns false.
    open(key, fn) {
      const t = now()
      if (key === lastKey && t - lastOpenAt < openMs) return false
      lastKey = key
      lastOpenAt = t
      fn()
      return true
    },
    back(fn) {
      const t = now()
      if (backPending && t - lastBackAt < backMs) return false
      backPending = true
      lastBackAt = t
      fn()
      return true
    },
    settled() { backPending = false },
  }
}
