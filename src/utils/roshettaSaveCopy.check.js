// Checks for roshettaSaveCopy.js (step 6.2c). Run with: node --test src/utils/roshettaSaveCopy.check.js
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  copyFields, saveSignInId, isRoshettaSaveRequest, saveCopyAnswer, showSaveBar,
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
