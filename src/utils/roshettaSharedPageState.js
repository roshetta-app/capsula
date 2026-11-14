/**
 * src/utils/roshettaSharedPageState.js
 * 2026-11-14 (Roshetta plan, step 6.2b): the plain rules behind the public shared page
 * (SharedRoshettaScreen.jsx), so they can be checked without a screen.
 *
 * sharedPageState(result) says which of the page's states to draw from the answer of
 * fetchSharedRoshetta: 'loading' | 'unavailable' | 'offline' | 'error' | 'empty' | 'ready'.
 * sharedProblemText(state) gives the words for the three link-problem states.
 */

export function sharedPageState(result) {
  const status = result && result.status
  if (status === 'unavailable' || status === 'offline' || status === 'error') return status
  if (status !== 'ok') return 'loading'
  const rows = result.roshetta && Array.isArray(result.roshetta.rows) ? result.roshetta.rows : []
  return rows.length === 0 ? 'empty' : 'ready'
}

// Same wording rules as the shared group page: one title, one short line, one button.
export function sharedProblemText(state) {
  if (state === 'offline') {
    return { title: "You're offline", body: 'Reconnect to open this roshetta.', actionLabel: 'Try again', action: 'retry' }
  }
  if (state === 'error') {
    return { title: "Couldn't open this roshetta", body: 'Check your connection and try again.', actionLabel: 'Try again', action: 'retry' }
  }
  return {
    title: "This link isn't available",
    body: 'The owner may have stopped sharing it, or the link is incomplete.',
    actionLabel: 'Open Capsula',
    action: 'open',
  }
}
