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
 */

import { pageState } from './roshettaPageState.js';

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
