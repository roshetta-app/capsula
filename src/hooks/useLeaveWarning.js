/**
 * src/hooks/useLeaveWarning.js
 *
 * Warns before unsaved changes are lost. While 'isUnsaved' is true it:
 *
 *   1. Registers with the leave guard (src/utils/leaveGuard.js), so the admin
 *      menu and Sign out ask Leave / Stay first.
 *   2. Turns on the browser's own warning for refresh, closing the tab and
 *      typing another address. (Phones often ignore this one.)
 *   3. Handles the browser Back button by adding one extra history entry
 *      that Back uses up. The first Back press lands on the same page, which
 *      is the moment to ask Leave / Stay. Stay adds the extra entry again.
 *      Leave goes back one more step, which is the real way out.
 *
 * The extra entry copies the current history state, so React Router keeps its
 * own position tracking correct. A small marker on the copy lets the hook
 * recognise its own entry, so it never stacks two of them.
 *
 * Known limit: after a save (or undoing back to clean) the extra entry stays
 * in the browser's history, so the first Back press may land on the same page
 * before the next one leaves.
 *
 * Usage:
 *   useLeaveWarning(isUnsaved)
 */

import { useEffect } from 'react'
import { setUnsavedCheck, requestLeave } from '../utils/leaveGuard'

const MARKER = '__capsulaLeaveGuard'

function onTrapEntry() {
  const state = window.history.state
  return Boolean(state && state[MARKER])
}

function addTrapEntry() {
  if (onTrapEntry()) return
  window.history.pushState(
    { ...(window.history.state ?? {}), [MARKER]: true },
    '',
    window.location.href,
  )
}

export function useLeaveWarning(isUnsaved) {
  useEffect(() => {
    if (!isUnsaved) return undefined

    // 1. The admin menu and Sign out ask through the guard. The check exists
    // only while there are unsaved changes (it is removed in the cleanup).
    const removeCheck = setUnsavedCheck(() => true)

    // 2. Refresh / close / typed address: the browser's own dialog.
    function handleBeforeUnload(event) {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', handleBeforeUnload)

    // 3. Back button.
    let leaving = false
    addTrapEntry()

    function handlePopState() {
      if (leaving) return
      // The extra entry was just used up, so we are on the real page now.
      requestLeave(
        () => {
          leaving = true
          window.history.go(-1)
        },
        () => addTrapEntry(),
      )
    }
    window.addEventListener('popstate', handlePopState)

    return () => {
      removeCheck()
      window.removeEventListener('beforeunload', handleBeforeUnload)
      window.removeEventListener('popstate', handlePopState)
    }
  }, [isUnsaved])
}
