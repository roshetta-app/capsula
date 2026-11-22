/**
 * src/utils/viewCount.js
 * 2026-11-22 (step H3): counts one unique view of a shared roshetta or group. The shared page calls this
 * once it is really showing; the count is sent only after the page has been visible for about 2 seconds
 * in a row (a link-preview builder or a tab that was never looked at never sends it). The server does the
 * rest (record_view: once per visitor per day, never the owner, never a hidden or private item).
 *
 * Rules kept here:
 *  - Nothing is kept on the phone: no local storage, no cookie, no cache. The only memory is this call.
 *  - The page never waits for it and never sees a failure: errors are swallowed.
 *  - Sent at most once per call. Hiding the page before 2 seconds restarts the wait; offline waits until the
 *    connection is back.
 *  - The caller does not call it for the owner (the server also refuses to count the owner).
 *
 * The browser pieces are handed in (deps) so the rules can be checked without a browser;
 * viewCountContent.js binds the real ones.
 */

export const SEEN_MS = 2000
export const COUNT_KINDS = ['roshetta', 'group']

export function countViewWhenSeen(kind, code, deps) {
  const { rpc, isOnline, isVisible, listen, unlisten, setTimer, clearTimer, seenMs = SEEN_MS } = deps
  const none = () => {}
  if (!COUNT_KINDS.includes(kind) || typeof code !== 'string' || code.length < 32) return none

  let timer = null
  let done = false
  let stopped = false

  const clear = () => {
    if (timer !== null) { clearTimer(timer); timer = null }
  }
  const send = () => {
    timer = null
    if (done || stopped || !isOnline() || !isVisible()) return
    done = true
    unlisten(onChange)
    try {
      Promise.resolve(rpc('record_view', { p_kind: kind, p_code: code })).catch(() => {})
    } catch { /* never reaches the page */ }
  }
  const arm = () => {
    clear()
    if (done || stopped || !isVisible()) return
    timer = setTimer(send, seenMs)
  }
  function onChange() {
    if (isVisible()) arm()
    else clear()
  }

  listen(onChange)
  arm()
  return () => {
    stopped = true
    clear()
    unlisten(onChange)
  }
}
