// Checks for roshettaShare.js (step 6.1b). Run with: node --test src/utils/roshettaShare.check.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { readShareCode, createShare, removeShare, setShareName, shareErrorReason } from './roshettaShare.js';

// A fake database for the roshetta_shares table: records every call, answers from a script.
function fake({ select = { data: null, error: null }, insert = { data: { share_code: 'c'.repeat(64) }, error: null }, del = { error: null }, update = { data: [{ roshetta_id: 'r1' }], error: null } } = {}) {
  const calls = [];
  const client = {
    from(table) {
      calls.push(['from', table]);
      return {
        select(cols) { calls.push(['select', cols]); return { eq(c, v) { calls.push(['eq', c, v]); return { maybeSingle: () => Promise.resolve(select) }; } }; },
        insert(row) { calls.push(['insert', row]); return { select(cols) { calls.push(['select', cols]); return { single: () => Promise.resolve(insert) }; } }; },
        delete() { calls.push(['delete']); return { eq(c, v) { calls.push(['eq', c, v]); return Promise.resolve(del); } }; },
        update(row) { calls.push(['update', row]); return { eq(c, v) { calls.push(['eq', c, v]); return { select(cols) { calls.push(['select', cols]); return Promise.resolve(update); } }; } }; },
      };
    },
  };
  return { client, calls };
}
const TIMEOUT = { code: 'request_timeout', message: 'request_timeout' };

test('read: a live code is returned, none is null', async () => {
  const a = fake({ select: { data: { share_code: 'x'.repeat(64) }, error: null } });
  assert.deepEqual(await readShareCode(a.client, 'r1'), { ok: true, code: 'x'.repeat(64), showName: null });
  assert.deepEqual(a.calls.slice(0, 3), [['from', 'roshetta_shares'], ['select', 'share_code, show_name'], ['eq', 'roshetta_id', 'r1']]);
  assert.deepEqual(await readShareCode(fake().client, 'r1'), { ok: true, code: null, showName: null });
});

// Phase L step 13.5: the owner's choice for this link comes back as true, false, or null (follows the account).
test('read: the name choice of this link is true, false, or null when the owner never chose', async () => {
  const read = async (show_name) => readShareCode(fake({ select: { data: { share_code: 'x'.repeat(64), show_name }, error: null } }).client, 'r1');
  assert.equal((await read(true)).showName, true);
  assert.equal((await read(false)).showName, false);
  assert.equal((await read(null)).showName, null);
  assert.equal((await read(undefined)).showName, null);
  assert.equal((await read('yes')).showName, null);
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

test('create: the name choice is sent only when it is true or false, so an empty one follows the account setting', async () => {
  const sent = async (show) => { const f = fake(); await createShare(f.client, 'r1', x => x, show); return f.calls.find(c => c[0] === 'insert')[1]; };
  assert.deepEqual(await sent(true), { roshetta_id: 'r1', show_name: true });
  assert.deepEqual(await sent(false), { roshetta_id: 'r1', show_name: false });
  for (const v of [undefined, null, 'true', 1, 0]) assert.deepEqual(await sent(v), { roshetta_id: 'r1' }, String(v));
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

test('set name: changes only this roshetta\'s link, and only the name choice', async () => {
  const on = fake();
  assert.deepEqual(await setShareName(on.client, 'r1', true), { ok: true });
  assert.deepEqual(on.calls, [['from', 'roshetta_shares'], ['update', { show_name: true }], ['eq', 'roshetta_id', 'r1'], ['select', 'roshetta_id']]);
  const off = fake();
  assert.deepEqual(await setShareName(off.client, 'r1', false), { ok: true });
  assert.deepEqual(off.calls.find(c => c[0] === 'update'), ['update', { show_name: false }]);
});

test('set name: a change that touched no row (not the owner, read only, link stopped) is refused; offline and other errors are named', async () => {
  assert.deepEqual(await setShareName(fake({ update: { data: [], error: null } }).client, 'r1', true), { ok: false, reason: 'refused' });
  assert.deepEqual(await setShareName(fake({ update: { data: null, error: null } }).client, 'r1', true), { ok: false, reason: 'refused' });
  assert.deepEqual(await setShareName(fake({ update: { data: null, error: { code: '42501', message: 'row-level security' } } }).client, 'r1', true), { ok: false, reason: 'refused' });
  assert.deepEqual(await setShareName(fake({ update: { data: null, error: TIMEOUT } }).client, 'r1', true), { ok: false, reason: 'offline' });
  assert.deepEqual(await setShareName(fake({ update: { data: null, error: { code: 'XX000' } } }).client, 'r1', true), { ok: false, reason: 'error' });
});

test('every request goes through the time limit given in', async () => {
  let n = 0;
  const limit = (x) => { n++; return x; };
  await readShareCode(fake().client, 'r1', limit);
  await createShare(fake().client, 'r1', limit);
  await removeShare(fake().client, 'r1', limit);
  await setShareName(fake().client, 'r1', true, limit);
  assert.equal(n, 4);
});

test('error names: a row rule refusal is "refused", anything unknown is "error"', () => {
  assert.equal(shareErrorReason(null), 'error');
  assert.equal(shareErrorReason({ code: '42501' }), 'refused');
  assert.equal(shareErrorReason({ message: 'violates row-level security policy' }), 'refused');
  assert.equal(shareErrorReason({ code: 'XX000' }), 'error');
});
