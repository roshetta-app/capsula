/**
 * src/utils/roshettaEditorState.js
 * 2026-11-14 (Roshetta plan, step 5.3a): the small decisions of the editor screen of a roshetta
 * (/roshetta/:id/edit), kept in a plain file so they are checked without a screen
 * (roshettaEditorState.check.js).
 *
 *   editorState({...})        what the screen draws: 'loading' | 'guest' | 'error' | 'missing'
 *                             | 'empty' (no cards yet) | 'ready' (the cards). Same decisions as the
 *                             roshetta page (pageState).
 *   editorHint(locked)        the one plain line shown while there are no cards
 *   changeEntry(rows, id, e)  the rows with the entry that has this id replaced by e (a new list;
 *                             the rows come back unchanged when no entry has that id)
 *   addTextRows(rows)         the rows with one empty text block at the end (a new list)
 *   libraryIdSet(drugs, loading)  the Set of library brand ids the cards need to spot a drug that is
 *                             no longer in the library, or null while the library is not loaded
 */

import { pageState } from './roshettaPageState.js';
import { newTextBlock } from './roshettaRows.js';

export function editorState({
  authLoading = false, isGuest = false, status = 'loading', found = false, rowCount = 0, listCount = 0,
} = {}) {
  return pageState({ authLoading, isGuest, status, found, rowCount, listCount });
}

export function editorHint(locked = false) {
  return locked
    ? 'This roshetta is empty.'
    : 'Add a drug or a text to start this roshetta.';
}

export function changeEntry(rows, id, entry) {
  const list = Array.isArray(rows) ? rows : [];
  if (!list.some(r => r && r.id === id)) return list;
  return list.map(r => (r && r.id === id ? entry : r));
}

export function addTextRows(rows) {
  return [...(Array.isArray(rows) ? rows : []), newTextBlock('')];
}

export function libraryIdSet(drugs, loading = false) {
  if (loading || !Array.isArray(drugs) || drugs.length === 0) return null;
  return new Set(drugs.map(d => d?.id).filter(Boolean));
}
