// Checks for reportRules.js (step 14.9b). Run with: node --test src/utils/reportRules.check.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { REPORT_REASONS, isReason, sheetTitle, resultText, endsSheet, sendReport } from './reportRules.js';

const online = () => true;
const ask = (reply, isOnline = online, calls = []) => ({
  rpc: async (fn, args) => { calls.push({ fn, args }); return typeof reply === 'function' ? reply() : reply; },
  isOnline,
  timeLimitMs: 50,
});

test('the reasons are exactly the five the database accepts, medical first', () => {
  assert.deepEqual(REPORT_REASONS.map(r => r.key), ['medical', 'impersonation', 'spam', 'inappropriate', 'other']);
  assert.equal(isReason('spam'), true);
  for (const bad of ['', 'x', null, undefined, 'MEDICAL']) assert.equal(isReason(bad), false, String(bad));
});

test('a good report calls report_shared with kind, reference and reason, and trims the reference', async () => {
  const calls = [];
  const r = await sendReport('group', '  abc  ', 'medical', ask({ data: 'ok', error: null }, online, calls));
  assert.deepEqual(r, { status: 'ok' });
  assert.deepEqual(calls, [{ fn: 'report_shared', args: { p_kind: 'group', p_ref: 'abc', p_reason: 'medical' } }]);
});

test('already reported is its own answer', async () => {
  assert.deepEqual(await sendReport('profile', 'sara', 'other', ask({ data: 'already', error: null })), { status: 'already' });
});

test('bad input never reaches the database', async () => {
  const calls = [];
  for (const [k, ref, reason] of [['x', 'a', 'spam'], ['roshetta', '', 'spam'], ['roshetta', '   ', 'spam'], ['roshetta', 'a', 'nope'], ['roshetta', null, 'spam']]) {
    assert.deepEqual(await sendReport(k, ref, reason, ask({ data: 'ok', error: null }, online, calls)), { status: 'error' });
  }
  assert.equal(calls.length, 0);
});

test('the database refusals become plain answers', async () => {
  const err = (message, code) => ask({ data: null, error: { message, code } });
  assert.equal((await sendReport('roshetta', 'a', 'spam', err('not_signed_in'))).status, 'signed_out');
  assert.equal((await sendReport('roshetta', 'a', 'spam', err('x', '42501'))).status, 'signed_out');
  assert.equal((await sendReport('roshetta', 'a', 'spam', err('report_own'))).status, 'own');
  assert.equal((await sendReport('roshetta', 'a', 'spam', err('report_cap'))).status, 'cap');
  assert.equal((await sendReport('roshetta', 'a', 'spam', err('report_not_found'))).status, 'gone');
  assert.equal((await sendReport('roshetta', 'a', 'spam', err('boom'))).status, 'error');
  assert.equal((await sendReport('roshetta', 'a', 'spam', err('x', 'request_timeout'))).status, 'offline');
});

test('offline, a thrown call and an odd answer are handled', async () => {
  assert.equal((await sendReport('roshetta', 'a', 'spam', ask({ data: 'ok' }, () => false))).status, 'offline');
  assert.equal((await sendReport('roshetta', 'a', 'spam', { rpc: () => { throw new Error('x'); }, isOnline: online })).status, 'error');
  assert.equal((await sendReport('roshetta', 'a', 'spam', ask({ data: { status: 'ok' }, error: null }))).status, 'error');
  assert.equal((await sendReport('roshetta', 'a', 'spam', ask({ data: null, error: { message: 'boom' } }, () => false))).status, 'offline');
});

test('the words: a line for every answer, titles by kind, and which answers end the sheet', () => {
  for (const s of ['ok', 'already', 'own', 'cap', 'gone', 'signed_out', 'offline', 'error', 'whatever']) assert.ok(resultText(s).length > 5, s);
  assert.equal(sheetTitle('profile'), 'Report this profile');
  assert.equal(sheetTitle('group'), 'Report this drug group');
  assert.equal(sheetTitle('roshetta'), 'Report this roshetta');
  assert.deepEqual(['ok', 'already', 'gone', 'own'].map(endsSheet), [true, true, true, true]);
  assert.deepEqual(['cap', 'offline', 'error', 'signed_out'].map(endsSheet), [false, false, false, false]);
});

test('the report words never promise a time or name a reporter', () => {
  const all = [resultText('ok'), resultText('already')].join(' ');
  assert.equal(/hour|day|minute|within/i.test(all), false);
});
