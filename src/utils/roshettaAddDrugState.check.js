// Checks for roshettaAddDrugState.js (step 5.2a). Run with: node --test src/utils/roshettaAddDrugState.check.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { addDrugTarget, addPartnerQuery, addDrugState, addDrugHint, addGroupRows, addGroupAnswer } from './roshettaAddDrugState.js';

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

test('addGroupRows: one new drug group at the end, the rows before it untouched, no library dose copied', () => {
  const before = [{ row_type: 'plain_text', id: 't1', content: 'Note' }];
  const rows = addGroupRows(before, { id: 'b1', name: 'Panadol', dose: '500 mg', genericName: 'Paracetamol' });
  assert.equal(rows.length, 2);
  assert.equal(rows[0], before[0]);
  assert.equal(rows[1].brand_id, 'b1');
  assert.equal(rows[1].brand_name, 'Panadol');
  assert.equal(rows[1].dose, '');
  assert.deepEqual(rows[1].alternatives, []);
  assert.equal(before.length, 1);
  assert.equal(addGroupRows(undefined, { id: 'b2', name: 'X' }).length, 1);
  assert.equal(addGroupRows(before, { name: 'no id' }), null);
  assert.equal(addGroupRows(before, null), null);
});

test('addGroupAnswer: every answer of saving has one plain meaning', () => {
  assert.equal(addGroupAnswer({ ok: true, queued: true }), 'done');
  assert.equal(addGroupAnswer({ ok: false, reason: 'drug_limit' }), 'drugs_full');
  assert.equal(addGroupAnswer({ ok: false, reason: 'read_only' }), 'read_only');
  assert.equal(addGroupAnswer({ ok: false, reason: 'guest' }), 'sign_in');
  assert.equal(addGroupAnswer({ ok: false, reason: 'missing' }), 'gone');
  assert.equal(addGroupAnswer({ ok: false, reason: 'error' }), 'silent');
  for (const r of ['invalid', 'not_loaded', 'limit', 'whatever']) assert.equal(addGroupAnswer({ ok: false, reason: r }), 'failed');
  assert.equal(addGroupAnswer(undefined), 'failed');
});
