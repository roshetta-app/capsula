// Checks for hiddenRules.js (step 14.9b-2). Run with: node --test src/utils/hiddenRules.check.js
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  HIDDEN_WORDS, parseFlags, findFlag, noticeFor, loadMyFlags, askForReview, reviewResultText,
} from './hiddenRules.js';

const ID = '11111111-1111-1111-1111-111111111111';
const ID2 = '22222222-2222-2222-2222-222222222222';
const online = () => true;
const deps = (reply, isOnline = online, calls = []) => ({
  rpc: async (fn, args) => { calls.push({ fn, args }); return typeof reply === 'function' ? reply() : reply; },
  isOnline,
  timeLimitMs: 50,
});

test('parseFlags keeps well-formed rows only and never keeps a name or anything else', () => {
  const rows = [
    { kind: 'roshetta', id: ID, name: 'Private name', appeal_used: false, stays_hidden: false },
    { kind: 'group', id: ID2, name: 'x', appeal_used: true, stays_hidden: false },
    { kind: 'profile', id: ID, name: null, appeal_used: true, stays_hidden: true },
    { kind: 'drug', id: ID, appeal_used: false, stays_hidden: false },
    { kind: 'roshetta', id: '', appeal_used: false, stays_hidden: false },
    { kind: 'roshetta', appeal_used: false, stays_hidden: false },
    null, 'x', 7,
  ];
  assert.deepEqual(parseFlags(rows), [
    { kind: 'roshetta', id: ID, appealUsed: false, staysHidden: false },
    { kind: 'group', id: ID2, appealUsed: true, staysHidden: false },
    { kind: 'profile', id: ID, appealUsed: true, staysHidden: true },
  ]);
  for (const bad of [null, undefined, {}, 'x', 3]) assert.deepEqual(parseFlags(bad), []);
});

test('findFlag matches kind and id together', () => {
  const flags = parseFlags([{ kind: 'roshetta', id: ID, appeal_used: false, stays_hidden: false }]);
  assert.ok(findFlag(flags, 'roshetta', ID));
  assert.equal(findFlag(flags, 'group', ID), null);
  assert.equal(findFlag(flags, 'roshetta', ID2), null);
  assert.equal(findFlag(flags, 'roshetta', ''), null);
  assert.equal(findFlag(flags, 'roshetta', undefined), null);
  assert.equal(findFlag(null, 'roshetta', ID), null);
});

test('no flag, no notice', () => {
  assert.equal(noticeFor('roshetta', null), null);
  assert.equal(noticeFor('roshetta', undefined), null);
});

test('a hidden item says so, can ask for review, and never names a reporter or a reason of theirs', () => {
  const n = noticeFor('roshetta', { kind: 'roshetta', id: ID, appealUsed: false, staysHidden: false });
  assert.equal(n.state, 'hidden');
  assert.equal(n.title, 'Hidden after a report');
  assert.equal(n.canAsk, true);
  assert.match(n.body, /still open and edit/i);
  assert.doesNotMatch(n.body + n.title, /reporter|reported by|someone reported/i);
});

test('after the one appeal the notice says a review was requested and offers no button', () => {
  const n = noticeFor('group', { kind: 'group', id: ID, appealUsed: true, staysHidden: false });
  assert.equal(n.state, 'requested');
  assert.equal(n.title, 'Review requested');
  assert.equal(n.canAsk, false);
});

test('a final answer reads stays hidden, with no button, even if the appeal flag is somehow off', () => {
  for (const appealUsed of [true, false]) {
    const n = noticeFor('profile', { kind: 'profile', id: ID, appealUsed, staysHidden: true });
    assert.equal(n.state, 'final');
    assert.equal(n.canAsk, false);
    assert.match(n.title, /stays hidden/i);
    assert.match(n.body, /final/i);
  }
});

test('each kind has its own plain body, and the profile one says items stay the person\'s', () => {
  const bodies = ['roshetta', 'group', 'profile'].map(k => noticeFor(k, { kind: k, id: ID, appealUsed: false, staysHidden: false }).body);
  assert.equal(new Set(bodies).size >= 2, true);
  assert.match(bodies[2], /profile/i);
  assert.ok(HIDDEN_WORDS.ask === 'Ask for review');
});

test('the words promise no time', () => {
  const all = JSON.stringify(HIDDEN_WORDS);
  assert.doesNotMatch(all, /\b(hours?|days?|minutes?|within|24|48)\b/i);
});

test('loadMyFlags calls my_flags with no arguments and returns clean rows', async () => {
  const calls = [];
  const r = await loadMyFlags(deps({ data: [{ kind: 'roshetta', id: ID, name: 'n', appeal_used: false, stays_hidden: false }], error: null }, online, calls));
  assert.equal(r.status, 'ok');
  assert.deepEqual(r.flags, [{ kind: 'roshetta', id: ID, appealUsed: false, staysHidden: false }]);
  assert.deepEqual(calls, [{ fn: 'my_flags', args: undefined }]);
});

test('loadMyFlags: nothing hidden is an empty list, a bad answer is an error', async () => {
  assert.deepEqual(await loadMyFlags(deps({ data: [], error: null })), { status: 'ok', flags: [] });
  assert.equal((await loadMyFlags(deps({ data: null, error: null }))).status, 'ok');
  assert.equal((await loadMyFlags(deps({ data: null, error: { message: 'boom' } }))).status, 'error');
});

test('loadMyFlags: offline never calls the database; a timeout counts as offline; signed out is its own answer', async () => {
  const calls = [];
  assert.equal((await loadMyFlags(deps({ data: [], error: null }, () => false, calls))).status, 'offline');
  assert.equal(calls.length, 0);
  assert.equal((await loadMyFlags(deps({ data: null, error: { code: 'request_timeout', message: 'request_timeout' } }))).status, 'offline');
  assert.equal((await loadMyFlags(deps({ data: null, error: { message: 'not_signed_in' } }))).status, 'signed_out');
  assert.equal((await loadMyFlags(deps(() => { throw new Error('x') }))).status, 'error');
});

test('askForReview sends the kind and the id and nothing else', async () => {
  const calls = [];
  const r = await askForReview('group', ID, deps({ data: null, error: null }, online, calls));
  assert.deepEqual(r, { status: 'ok' });
  assert.deepEqual(calls, [{ fn: 'appeal_hidden', args: { p_kind: 'group', p_id: ID } }]);
});

test('askForReview: bad input never reaches the database', async () => {
  const calls = [];
  for (const [k, id] of [['x', ID], ['roshetta', ''], ['roshetta', null], ['', ID], [undefined, undefined]]) {
    assert.deepEqual(await askForReview(k, id, deps({ data: null, error: null }, online, calls)), { status: 'error' });
  }
  assert.equal(calls.length, 0);
});

test('askForReview: the database refusals become plain answers', async () => {
  const err = (message, code) => deps({ data: null, error: { message, code } });
  assert.equal((await askForReview('roshetta', ID, err('not_signed_in'))).status, 'signed_out');
  assert.equal((await askForReview('roshetta', ID, err('appeal_unavailable'))).status, 'unavailable');
  assert.equal((await askForReview('roshetta', ID, err('request_timeout', 'request_timeout'))).status, 'offline');
  assert.equal((await askForReview('roshetta', ID, err('other'))).status, 'error');
  assert.equal((await askForReview('roshetta', ID, deps({ data: null, error: null }, () => false))).status, 'offline');
  assert.equal((await askForReview('roshetta', ID, deps(() => { throw new Error('x') }))).status, 'error');
});

test('every answer has one short line of words', () => {
  for (const s of ['ok', 'unavailable', 'offline', 'signed_out', 'error', 'whatever']) {
    const t = reviewResultText(s);
    assert.ok(typeof t === 'string' && t.length > 4 && t.length < 80, s);
  }
  assert.notEqual(reviewResultText('ok'), reviewResultText('error'));
});
