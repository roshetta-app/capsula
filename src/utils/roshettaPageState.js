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
