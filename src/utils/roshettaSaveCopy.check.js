// Checks for roshettaSaveCopy.js (step 6.2c). Run with: node --test src/utils/roshettaSaveCopy.check.js
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  copyFields, trimToDrugCap, savedCopyMessage, saveSignInId, isRoshettaSaveRequest, saveCopyAnswer, showSaveBar,
  SAVE_ERROR_MESSAGE, SAVE_NOT_LOADED_MESSAGE,
} from './roshettaSaveCopy.js';

test('copy: only name, description and rows are taken; a missing description or rows is safe', () => {
  const shared = { name: 'Chest pain', description: 'ED', rows: [{ row_type: 'plain_text' }], owner: 'x', id: 'y' };
  assert.deepEqual(copyFields(shared), { name: 'Chest pain', description: 'ED', rows: [{ row_type: 'plain_text' }] });
  assert.deepEqual(copyFields({ name: 'A' }), { name: 'A', description: '', rows: [] });
});

test('sign-in request: carries the link code, and only that link counts', () => {
  assert.equal(saveSignInId('abc'), 'rsave:abc');
  assert.equal(isRoshettaSaveRequest({ type: 'groups', id: 'rsave:abc' }, 'abc'), true);
  assert.equal(isRoshettaSaveRequest({ type: 'groups', id: 'rsave:abc' }, 'zzz'), false);
  assert.equal(isRoshettaSaveRequest({ type: 'groups', id: 'save:abc' }, 'abc'), false, 'a group save is not a roshetta save');
  assert.equal(isRoshettaSaveRequest({ type: 'drugs', id: 'rsave:abc' }, 'abc'), false);
  assert.equal(isRoshettaSaveRequest(null, 'abc'), false);
});

test('answer: saved, the three sheets, guest, and notices for everything else', () => {
  assert.deepEqual(saveCopyAnswer({ ok: true, roshetta: { id: 'n1' } }), { kind: 'saved', roshetta: { id: 'n1' } });
  assert.deepEqual(saveCopyAnswer({ ok: false, reason: 'limit' }), { kind: 'sheet', sheet: 'roshettas' });
  assert.deepEqual(saveCopyAnswer({ ok: false, reason: 'drug_limit' }), { kind: 'sheet', sheet: 'drugs' });
  assert.deepEqual(saveCopyAnswer({ ok: false, reason: 'read_only' }), { kind: 'sheet', sheet: 'readonly' });
  assert.deepEqual(saveCopyAnswer({ ok: false, reason: 'guest' }), { kind: 'sign_in' });
  assert.deepEqual(saveCopyAnswer({ ok: false, reason: 'not_loaded' }), { kind: 'notice', message: SAVE_NOT_LOADED_MESSAGE });
  for (const reason of ['invalid', 'missing', 'error', 'whatever']) {
    assert.deepEqual(saveCopyAnswer({ ok: false, reason }), { kind: 'notice', message: SAVE_ERROR_MESSAGE });
  }
  assert.equal(saveCopyAnswer(undefined).kind, 'notice', 'no answer is a notice, not a crash');
});

test('bar: only for a roshetta that shows with something in it', () => {
  assert.equal(showSaveBar('ready'), true);
  for (const s of ['loading', 'empty', 'unavailable', 'offline', 'error']) assert.equal(showSaveBar(s), false);
});

const drug = (id, partners = 0) => ({ row_type: 'drug', id, alternatives: Array.from({ length: partners }, (_, i) => ({ id: `${id}-p${i}`, group_id: id })) });
const text = (id) => ({ row_type: 'plain_text', id });

test('trim: under or at the cap changes nothing', () => {
  const rows = [drug('a', 1), text('t'), drug('b')];
  assert.deepEqual(trimToDrugCap(rows, 3), { rows, saved: 3, total: 3 });
  assert.deepEqual(trimToDrugCap(rows, 10), { rows, saved: 3, total: 3 });
  assert.deepEqual(trimToDrugCap([], 10), { rows: [], saved: 0, total: 0 });
});

test('trim: keeps the first drugs in order, partners count, text blocks stay', () => {
  const rows = [drug('a'), text('t1'), drug('b', 1), drug('c'), text('t2'), drug('d')];
  const r = trimToDrugCap(rows, 3);
  assert.equal(r.total, 5); assert.equal(r.saved, 3);
  assert.deepEqual(r.rows.map(x => x.id), ['a', 't1', 'b', 't2'], 'a and b with its partner fill the cap; c and d are left out');
  assert.equal(r.rows[2].alternatives.length, 1);
});

test('trim: a group that fits only in part keeps its main drug and the first partners that fit', () => {
  const rows = [drug('a'), drug('b', 3), drug('c')];
  const r = trimToDrugCap(rows, 3);
  assert.deepEqual(r.rows.map(x => x.id), ['a', 'b']);
  assert.deepEqual(r.rows[1].alternatives.map(x => x.id), ['b-p0'], 'room for 2 of the 4 in b: the main and one partner');
  assert.equal(rows[1].alternatives.length, 3, 'the shared roshetta is not changed');
  assert.equal(trimToDrugCap([drug('a', 2)], 1).rows[0].alternatives.length, 0);
});

test('trim: a cap of 0 or a bad cap', () => {
  assert.deepEqual(trimToDrugCap([drug('a'), text('t')], 0).rows.map(x => x.id), ['t']);
  assert.equal(trimToDrugCap([drug('a'), drug('b')], undefined).saved, 2, 'no cap known: nothing trimmed');
  assert.equal(trimToDrugCap([drug('a'), drug('b')], NaN).rows.length, 2);
});

test('saved line: plain when all kept; part kept names the numbers, and only a free account is told to upgrade', () => {
  assert.equal(savedCopyMessage(7, 7, false), 'Saved to your roshettas');
  assert.equal(savedCopyMessage(10, 14, false), 'Saved 10 of 14 drugs. Upgrade to Pro to keep all of them.');
  assert.equal(savedCopyMessage(30, 35, true), 'Saved 30 of 35 drugs.');
});
