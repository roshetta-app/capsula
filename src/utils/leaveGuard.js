/**
 * src/utils/leaveGuard.js
 *
 * One small shared holder that lets an editor with unsaved changes stop the
 * admin shell from leaving the page by accident.
 *
 * Three parties use it:
 *   - The editor says whether it has unsaved changes (setUnsavedCheck).
 *   - The admin layout shows the Leave / Stay dialog (setLeaveAsker).
 *   - Anything that wants to leave (menu click, Sign out, the Back button)
 *     calls requestLeave(action) and the action runs only when allowed.
 *
 * Rules:
 *   - Nothing unsaved: the action runs at once, no question.
 *   - Unsaved: the dialog is asked first. Stay does nothing to the page
 *     (and runs the optional onStay, used by the Back button to rebuild its
 *     trap). Leave runs the action exactly once.
 *   - The first answer wins: a second answer to the same question is ignored.
 *     (The dialog component calls its confirm and its close one after the
 *     other, so without this a Leave would also count as a Stay.)
 *   - If no dialog is available (no layout on screen), the action runs
 *     instead of trapping the person on the page.
 *
 * No screen code here, so the logic can be tested on its own.
 */

export function createLeaveGuard() {
  let unsavedCheck = null
  let asker = null

  function setUnsavedCheck(fn) {
    unsavedCheck = fn
    // Remove only if nothing newer has replaced it in the meantime.
    return () => { if (unsavedCheck === fn) unsavedCheck = null }
  }

  function setLeaveAsker(fn) {
    asker = fn
    return () => { if (asker === fn) asker = null }
  }

  function hasUnsaved() {
    if (typeof unsavedCheck !== 'function') return false
    try {
      return Boolean(unsavedCheck())
    } catch {
      return false
    }
  }

  /**
   * Ask "may I leave?". Returns true when the action ran at once, false when
   * the person was asked first.
   */
  function requestLeave(action, onStay) {
    if (!hasUnsaved() || typeof asker !== 'function') {
      action()
      return true
    }

    let decided = false
    const leave = () => {
      if (decided) return
      decided = true
      action()
    }
    const stay = () => {
      if (decided) return
      decided = true
      if (typeof onStay === 'function') onStay()
    }

    asker({ leave, stay })
    return false
  }

  return { setUnsavedCheck, setLeaveAsker, hasUnsaved, requestLeave }
}

// The one guard the app uses.
const guard = createLeaveGuard()

export const setUnsavedCheck = guard.setUnsavedCheck
export const setLeaveAsker   = guard.setLeaveAsker
export const hasUnsaved      = guard.hasUnsaved
export const requestLeave    = guard.requestLeave
