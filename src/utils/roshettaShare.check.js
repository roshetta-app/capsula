// Checks for roshettaShare.js (step 6.1b). Run with: node --test src/utils/roshettaShare.check.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { readShareCode, createShare, removeShare, shareErrorReason } from './roshettaShare.js';

// A fake database for the roshetta_shares table: records every call, answers from a script.
function fake({ select = { data: null, error: null }, insert = { data: { share_code: 'c'.repeat(64) }, error: null }, del = { error: null } } = {}) {
  const calls = [];
  const client = {
    from(table) {
      calls.push(['from', table]);
      return {
        select(cols) { calls.push(['select', cols]); return { eq(c, v) { calls.push(['eq', c, v]); return { maybeSingle: () => Promise.resolve(select) }; } }; },
        insert(row) { calls.push(['insert', row]); return { select(cols) { calls.push(['select', cols]); return { single: () => Promise.resolve(insert) }; } }; },
        delete() { calls.push(['delete']); return { eq(c, v) { calls.push(['eq', c, v]); return Promise.resolve(del); } }; },
      };
    },
  };
  return { client, calls };
}
const TIMEOUT = { code: 'request_timeout', message: 'request_timeout' };

test('read: a live code is returned, none is null', async () => {
  const a = fake({ select: { data: { share_code: 'x'.repeat(64) }, error: null } });
  assert.deepEqual(await readShareCode(a.client, 'r1'), { ok: true, code: 'x'.repeat(64) });
  assert.deepEqual(a.calls.slice(0, 3), [['from', 'roshetta_shares'], ['select', 'share_code'], ['eq', 'roshetta_id', 'r1']]);
  assert.deepEqual(await readShareCode(fake().client, 'r1'), { ok: true, code: null });
});

test('read: a timeout counts as offline, any other error as error', async () => {
  assert.deepEqual(await readShareCode(fake({ select: { data: null, error: TIMEOUT } }).client, 'r1'), { ok: false, reason: 'offline' });
  assert.deepEqual(await readShareCode(fake({ select: { data: null, error: { code: 'XX000' } } }).client, 'r1'), { ok: false, reason: 'error' });
});

test('create: inserts only the roshetta id (the database makes the code) and says the link is new', async () => {
  const f = fake();
  assert.deepEqual(await createShare(f.client, 'r1'), { ok: true, code: 'c'.repeat(64), created: true });
  assert.deepEqual(f.calls.find(c => c[0] === 'insert'), ['insert', { roshetta_id: 'r1' }]);
});

test('create: already shared (another phone or a double tap) returns the live code, not new', async () => {
  const f = fake({ insert: { data: null, error: { code: '23505' } }, select: { data: { share_code: 'l'.repeat(64) }, error: null } });
  assert.deepEqual(await createShare(f.client, 'r1'), { ok: true, code: 'l'.repeat(64), created: false });
  const none = fake({ insert: { data: null, error: { code: '23505' } } });
  assert.deepEqual(await createShare(none.client, 'r1'), { ok: false, reason: 'error' });
});

test('create: refusals are named (refused by the row rule, offline, other); a refused insert is never called read only', async () => {
  const r = async (error) => createShare(fake({ insert: { data: null, error } }).client, 'r1');
  assert.deepEqual(await r({ code: '42501', message: 'new row violates row-level security policy' }), { ok: false, reason: 'refused' });
  assert.deepEqual(await r(TIMEOUT), { ok: false, reason: 'offline' });
  assert.deepEqual(await r({ code: 'XX000' }), { ok: false, reason: 'error' });
  assert.deepEqual(await createShare(fake({ insert: { data: {}, error: null } }).client, 'r1'), { ok: false, reason: 'error' });
});

test('remove: deletes the share row of this roshetta only', async () => {
  const f = fake();
  assert.deepEqual(await removeShare(f.client, 'r1'), { ok: true });
  assert.deepEqual(f.calls, [['from', 'roshetta_shares'], ['delete'], ['eq', 'roshetta_id', 'r1']]);
  assert.deepEqual(await removeShare(fake({ del: { error: TIMEOUT } }).client, 'r1'), { ok: false, reason: 'offline' });
  assert.deepEqual(await removeShare(fake({ del: { error: { code: 'XX000' } } }).client, 'r1'), { ok: false, reason: 'error' });
});

test('every request goes through the time limit given in', async () => {
  let n = 0;
  const limit = (x) => { n++; return x; };
  await readShareCode(fake().client, 'r1', limit);
  await createShare(fake().client, 'r1', limit);
  await removeShare(fake().client, 'r1', limit);
  assert.equal(n, 3);
});

test('error names: a row rule refusal is "refused", anything unknown is "error"', () => {
  assert.equal(shareErrorReason(null), 'error');
  assert.equal(shareErrorReason({ code: '42501' }), 'refused');
  assert.equal(shareErrorReason({ message: 'violates row-level security policy' }), 'refused');
  assert.equal(shareErrorReason({ code: 'XX000' }), 'error');
});
