/**
 * src/utils/roshettaPageState.js
 * 2026-11-14 (Roshetta plan, step 4.2a): the small decisions of the roshetta page,
 * kept in a plain file so they are checked without a screen (roshettaPageState.check.js).
 *
 *   pageRoshetta(list, id) -> the roshetta with that id, or null
 *   pageState({ authLoading, isGuest, status, found, rowCount, listCount })
 *       -> 'loading' | 'guest' | 'error' | 'missing' | 'empty' | 'ready'
 *
 * A saved copy that is already shown is never hidden behind a loading or an error state.
 * 'missing' is a roshetta the list does not hold (for example deleted on another device).
 *
 * 2026-11-14 (step 4.2b), also plain rules:
 *   pageControls(state)  -> { menu, statusLine, bar }  which extras are drawn: only while a
 *                           roshetta is shown ('ready' or 'empty'), never on loading, guest,
 *                           error or missing.
 *   deleteOutcome(res)   -> 'done' | 'failed'  what the answer from deleteRoshetta means.
 *                           Already gone (reason 'missing') counts as done: the person wanted
 *                           it gone and it is.
 *   shownRoshetta({ live, last, deleting }) -> the roshetta the page draws. While a delete is
 *                           going on, the last copy stays so the page never flashes
 *                           "This roshetta isn't available" before it closes.
 */

export function pageRoshetta(list, id) {
  if (!Array.isArray(list) || !id) return null;
  return list.find(r => r && r.id === id) ?? null;
}

export function pageState({
  authLoading = false, isGuest = false, status = 'loading', found = false, rowCount = 0, listCount = 0,
} = {}) {
  if (authLoading) return 'loading';
  if (isGuest) return 'guest';
  if (found) return rowCount > 0 ? 'ready' : 'empty';
  if (status === 'loading') return 'loading';
  if (status === 'error' && listCount === 0) return 'error';
  return 'missing';
}

export function pageControls(state) {
  const shown = state === 'ready' || state === 'empty';
  return { menu: shown, statusLine: shown, bar: shown };
}

export function deleteOutcome(res) {
  if (res && res.ok === true) return 'done';
  if (res && res.reason === 'missing') return 'done';
  return 'failed';
}

export function shownRoshetta({ live = null, last = null, deleting = false } = {}) {
  if (live) return live;
  return deleting ? (last ?? null) : null;
}
