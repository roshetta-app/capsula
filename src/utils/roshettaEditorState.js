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
 *
 * 2026-11-14 (step 5.3b, autosave and the status word):
 *   AUTOSAVE_DELAY_MS        how long after the last change the roshetta is saved (800)
 *   saveAnswer(result)       what the saving answered, in the editor's words: 'saved' | 'drugs_full'
 *                            | 'read_only' | 'sign_in' | 'gone' | 'silent' (the saving already showed
 *                            its own message) | 'failed'
 *   saveRefused(answer)      true for every answer except 'saved'
 *   saveStatus({...})        the one status word at the top: { word, tone } or null (nothing to say)
 *                            Saving | Waiting to save | Saved | Couldn't save
 *
 * 2026-11-14 (step 5.3c, up, down and delete on the cards):
 *   moveEntryById(rows, id, dir)  the rows with the entry moved one place ('up' | 'down'); a new list,
 *                            the same rows when the id is not there or the entry is already at the end
 *   deleteEntryById(rows, id)     the rows without that entry (a drug group goes with its partners)
 *   deleteNeedsQuestion(row)      true when the card holds something typed (a dose or a text), so the
 *                            screen asks before deleting; an empty card goes at once
 *   deleteQuestion(row)           { title, message } of that question
 */

import { pageState } from './roshettaPageState.js';
import { ROSHETTA_ROW_TYPES, deleteEntry, moveEntryDown, moveEntryUp, newTextBlock } from './roshettaRows.js';

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

export const AUTOSAVE_DELAY_MS = 800;

// Same reading of the saving's answer as the Add drug screen (roshettaAddDrugState.js).
export function saveAnswer(result) {
  if (result?.ok) return 'saved';
  switch (result?.reason) {
    case 'drug_limit': return 'drugs_full';
    case 'read_only': return 'read_only';
    case 'guest': return 'sign_in';
    case 'missing': return 'gone';
    case 'error': return 'silent';
    default: return 'failed';
  }
}

export function saveRefused(answer) {
  return answer !== 'saved';
}

// typing       something was changed and the short wait before saving is not over
// saving       a save is being put on the phone right now
// refused      the last save was refused
// waitingHere  this roshetta has a change saved on the phone and not yet sent
// failedHere   the server refused a change of this roshetta
// touched      something was changed on this screen
export function saveStatus({
  touched = false, typing = false, saving = false, refused = false,
  online = true, waitingHere = false, failedHere = false, syncState = 'idle',
} = {}) {
  if (failedHere || refused) return { word: "Couldn't save", tone: 'warning' };
  if (typing || saving) return { word: 'Saving', tone: 'neutral' };
  if (waitingHere) {
    return online && syncState === 'syncing'
      ? { word: 'Saving', tone: 'neutral' }
      : { word: 'Waiting to save', tone: 'neutral' };
  }
  if (touched) return { word: 'Saved', tone: 'neutral' };
  return null;
}

function indexOfId(rows, id) {
  return Array.isArray(rows) ? rows.findIndex(r => r && r.id === id) : -1;
}

export function moveEntryById(rows, id, dir) {
  const list = Array.isArray(rows) ? rows : [];
  const index = indexOfId(list, id);
  if (index < 0) return list;
  return dir === 'up' ? moveEntryUp(list, index) : moveEntryDown(list, index);
}

export function deleteEntryById(rows, id) {
  const list = Array.isArray(rows) ? rows : [];
  const index = indexOfId(list, id);
  return index < 0 ? list : deleteEntry(list, index);
}

function typedOf(row) {
  const text = row?.row_type === ROSHETTA_ROW_TYPES.DRUG ? row.dose : row?.content;
  return typeof text === 'string' && text.trim() !== '';
}

export function deleteNeedsQuestion(row) {
  return typedOf(row);
}

export function deleteQuestion(row) {
  return row?.row_type === ROSHETTA_ROW_TYPES.DRUG
    ? { title: 'Delete this drug group?', message: 'The drug and its dose will be removed from this roshetta.' }
    : { title: 'Delete this text?', message: 'The text will be removed from this roshetta.' };
}
