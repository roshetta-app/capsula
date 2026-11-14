/**
 * src/utils/roshettaAddDrugState.js
 * 2026-11-14 (Roshetta plan, step 5.2a): the small decisions of the Add drug screen of a
 * roshetta (/roshetta/:id/add), kept in a plain file so they are checked without a screen
 * (roshettaAddDrugState.check.js).
 *
 *   addDrugTarget(search)       what the chosen drug is for, read from the address' query part:
 *                               '' or anything else -> { kind: 'group' } (a new drug group);
 *                               '?partner=<group id>' -> { kind: 'partner', rowId } (an or / plus
 *                               partner for that group). Step 5.2c uses the partner kind.
 *   addDrugState({...})         what the screen draws: 'loading' | 'guest' | 'error' | 'missing'
 *                               | 'readonly' | 'search'
 *   addDrugHint(target, name)   the one plain line above the results
 *   addPartnerQuery(rowId)      the query part the editor adds to the address for a partner
 *   addGroupRows(rows, drug)    2026-11-14 (step 5.2b): the roshetta's rows with one new drug group
 *                               at the end (library doses left empty), or null if the drug is not usable
 *   addGroupAnswer(result)      what the screen does with the answer of saving: 'done' | 'drugs_full'
 *                               | 'read_only' | 'sign_in' | 'gone' | 'silent' | 'failed'
 */

import { pageState } from './roshettaPageState.js';
import { newDrugGroup } from './roshettaRows.js';

export function addDrugTarget(search) {
  const text = typeof search === 'string' ? search : '';
  const rowId = new URLSearchParams(text).get('partner');
  return rowId && rowId.trim() ? { kind: 'partner', rowId: rowId.trim() } : { kind: 'group' };
}

export function addPartnerQuery(rowId) {
  return `?partner=${encodeURIComponent(rowId)}`;
}

export function addDrugState({
  authLoading = false, isGuest = false, status = 'loading', found = false, listCount = 0, isReadOnly = false,
} = {}) {
  const base = pageState({ authLoading, isGuest, status, found, rowCount: 1, listCount });
  if (base === 'loading' || base === 'guest' || base === 'error' || base === 'missing') return base;
  return isReadOnly ? 'readonly' : 'search';
}

export function addDrugHint(target, name) {
  const who = typeof name === 'string' && name.trim() ? name.trim() : 'this roshetta';
  return target?.kind === 'partner'
    ? `Choose an or / plus drug for ${who}`
    : `Choose a drug to add to ${who}`;
}

export function addGroupRows(rows, drug) {
  const list = Array.isArray(rows) ? rows : [];
  try {
    return [...list, newDrugGroup(drug)];
  } catch {
    return null;
  }
}

// The saving answers { ok, reason? }. 'silent' = the saving already showed its own message.
export function addGroupAnswer(result) {
  if (result?.ok) return 'done';
  switch (result?.reason) {
    case 'drug_limit': return 'drugs_full';
    case 'read_only': return 'read_only';
    case 'guest': return 'sign_in';
    case 'missing': return 'gone';
    case 'error': return 'silent';
    default: return 'failed';
  }
}
