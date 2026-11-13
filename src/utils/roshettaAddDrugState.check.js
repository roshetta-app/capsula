// Checks for roshettaAddDrugState.js (step 5.2a). Run with: node --test src/utils/roshettaAddDrugState.check.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { addDrugTarget, addPartnerQuery, addDrugState, addDrugHint } from './roshettaAddDrugState.js';

test('addDrugTarget: no query is a new group, ?partner= is a partner of that group', () => {
  assert.deepEqual(addDrugTarget(''), { kind: 'group' });
  assert.deepEqual(addDrugTarget(undefined), { kind: 'group' });
  assert.deepEqual(addDrugTarget('?other=1'), { kind: 'group' });
  assert.deepEqual(addDrugTarget('?partner='), { kind: 'group' });
  assert.deepEqual(addDrugTarget('?partner=%20%20'), { kind: 'group' });
  assert.deepEqual(addDrugTarget('?partner=row-7'), { kind: 'partner', rowId: 'row-7' });
});

test('addPartnerQuery: what the editor adds is read back the same, odd characters included', () => {
  assert.equal(addPartnerQuery('row-7'), '?partner=row-7');
  for (const id of ['row-7', 'a b&c=d', 'x/y?z']) {
    assert.deepEqual(addDrugTarget(addPartnerQuery(id)), { kind: 'partner', rowId: id });
  }
});

test('addDrugState: loading, guest, error and missing come first; read only replaces the search', () => {
  assert.equal(addDrugState({ authLoading: true }), 'loading');
  assert.equal(addDrugState({ isGuest: true, status: 'ready' }), 'guest');
  assert.equal(addDrugState({ status: 'loading' }), 'loading');
  assert.equal(addDrugState({ status: 'error', listCount: 0 }), 'error');
  assert.equal(addDrugState({ status: 'ready', found: false, listCount: 2 }), 'missing');
  assert.equal(addDrugState({ status: 'ready', found: true }), 'search');
  assert.equal(addDrugState({ status: 'ready', found: true, isReadOnly: true }), 'readonly');
  // a saved copy that is shown is never hidden behind a loading or error state
  assert.equal(addDrugState({ status: 'loading', found: true }), 'search');
  assert.equal(addDrugState({ status: 'error', found: true, listCount: 1 }), 'search');
  // a missing roshetta stays missing even when the account is read only
  assert.equal(addDrugState({ status: 'ready', found: false, listCount: 1, isReadOnly: true }), 'missing');
});

test('addDrugHint: one plain line, with a stand-in when the name is empty', () => {
  assert.equal(addDrugHint({ kind: 'group' }, 'Chest pain'), 'Choose a drug to add to Chest pain');
  assert.equal(addDrugHint({ kind: 'partner', rowId: 'r' }, 'Chest pain'), 'Choose an or / plus drug for Chest pain');
  assert.equal(addDrugHint({ kind: 'group' }, '  '), 'Choose a drug to add to this roshetta');
  assert.equal(addDrugHint(undefined, undefined), 'Choose a drug to add to this roshetta');
});
