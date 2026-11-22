// Checks for takedownAdmin.js (step 14.9c-4b). Run with: node --test src/utils/takedownAdmin.check.js
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseSharingOffIds, parsePeople, loadSharingOff, takedownButtons, confirmCopy, runTakedown, resultText, TAKEDOWN_ACTIONS,
} from './takedownAdmin.js';

const A = '11111111-1111-1111-1111-111111111111';
const B = '22222222-2222-2222-2222-222222222222';
const online = () => true;
const offline = () => false;

test('parseSharingOffIds keeps only well-formed ids, once each', () => {
  assert.deepEqual(parseSharingOffIds([A, B, A, '', '  ', 5, null, { x: 1 }]), [A, B]);
  for (const bad of [null, undefined, {}, 'x', 7]) assert.deepEqual(parseSharingOffIds(bad), []);
});

test('parsePeople keeps only name and username, in the order of the ids, and tolerates missing rows', () => {
  const people = parsePeople([B, A], [{ id: A, full_name: ' Sara ', handle: 'sara', email: 'x@y.z' }, null, 'x']);
  assert.deepEqual(people, [
    { profileId: B, name: null, handle: null },
    { profileId: A, name: 'Sara', handle: 'sara' },
  ]);
  assert.deepEqual(parsePeople([A], 'junk'), [{ profileId: A, name: null, handle: null }]);
});

test('loadSharingOff returns the ids and the people', async () => {
  const calls = [];
  const r = await loadSharingOff({
    rpc: async (fn) => { calls.push(fn); return { data: [A, B] }; },
    listProfiles: async (ids) => ({ data: [{ id: A, full_name: 'Sara', handle: 'sara' }], ids }),
    isOnline: online, timeLimitMs: 50,
  });
  assert.equal(r.status, 'ok');
  assert.deepEqual(r.ids, [A, B]);
  assert.deepEqual(r.people.map(p => p.name), ['Sara', null]);
  assert.deepEqual(calls, ['admin_sharing_off_ids']);
});

test('loadSharingOff with nobody blocked does not ask for names', async () => {
  let asked = false;
  const r = await loadSharingOff({ rpc: async () => ({ data: [] }), listProfiles: async () => { asked = true; return { data: [] } }, isOnline: online, timeLimitMs: 50 });
  assert.deepEqual(r, { status: 'ok', ids: [], people: [] });
  assert.equal(asked, false);
});

test('a failed name lookup still gives the ids', async () => {
  for (const lookup of [async () => ({ error: { message: 'boom' } }), async () => { throw new Error('boom') }]) {
    const r = await loadSharingOff({ rpc: async () => ({ data: [A] }), listProfiles: lookup, isOnline: online, timeLimitMs: 50 });
    assert.equal(r.status, 'ok');
    assert.deepEqual(r.ids, [A]);
    assert.equal(r.people[0].name, null);
  }
});

test('loadSharingOff answers forbidden, offline and error plainly', async () => {
  const run = (rpc, isOnline = online) => loadSharingOff({ rpc, listProfiles: async () => ({ data: [] }), isOnline, timeLimitMs: 50 });
  assert.equal((await run(async () => ({ error: { message: 'forbidden' } }))).status, 'forbidden');
  assert.equal((await run(async () => ({ data: [] }), offline)).status, 'offline');
  assert.equal((await run(async () => { throw new Error('x') })).status, 'error');
  assert.equal((await run(async () => ({ error: { message: 'weird' } }), offline)).status, 'offline');
});

test('buttons: sharing on offers Turn off, sharing off offers Restore, unknown offers both, username only with a handle', () => {
  assert.deepEqual(takedownButtons({ handle: 'sara', sharingOff: false }).map(b => b.key), ['sharing_off', 'take_handle']);
  assert.deepEqual(takedownButtons({ handle: 'sara', sharingOff: true }).map(b => b.key), ['sharing_on', 'take_handle']);
  assert.deepEqual(takedownButtons({ handle: 'sara', sharingOff: null }).map(b => b.key), ['sharing_off', 'sharing_on', 'take_handle']);
  assert.deepEqual(takedownButtons({ handle: null, sharingOff: false }).map(b => b.key), ['sharing_off']);
  assert.deepEqual(takedownButtons({ handle: '  ', sharingOff: true }).map(b => b.key), ['sharing_on']);
  const labels = takedownButtons({ handle: 'sara', sharingOff: null }).map(b => b.label);
  assert.deepEqual(labels, ['Turn off sharing', 'Restore sharing', 'Take username back']);
  assert.equal(takedownButtons({ handle: 'sara', sharingOff: null }).find(b => b.key === 'sharing_on').danger, false);
});

test('every action asks first, in plain words, and says what it does', () => {
  for (const a of TAKEDOWN_ACTIONS) {
    const c = confirmCopy(a, { name: 'Sara', handle: 'sara' });
    assert.ok(c.title.includes('Sara'), a);
    assert.ok(c.message.length > 40, a);
    assert.ok(c.confirmLabel, a);
  }
  assert.match(confirmCopy('sharing_off', { name: 'Sara' }).message, /You can restore it later/);
  assert.equal(confirmCopy('sharing_off', {}).confirmVariant, 'danger');
  assert.equal(confirmCopy('sharing_on', {}).confirmVariant, 'primary');
  const t = confirmCopy('take_handle', { handle: 'sara' });
  assert.match(t.message, /cannot be undone/);
  assert.match(t.message, /30 days/);
  assert.match(t.message, /links keep working/);
  assert.equal(t.title.includes('@sara'), true);
  assert.equal(t.confirmVariant, 'danger');
  assert.match(confirmCopy('sharing_off', {}).title, /this person/);
});

test('each action makes the right database call', async () => {
  const calls = [];
  const deps = { rpc: async (fn, args) => { calls.push([fn, args]); return { data: null }; }, isOnline: online, timeLimitMs: 50 };
  for (const a of TAKEDOWN_ACTIONS) assert.deepEqual(await runTakedown(a, A, deps), { status: 'ok' });
  assert.deepEqual(calls, [
    ['admin_set_sharing_off', { p_id: A, p_off: true }],
    ['admin_set_sharing_off', { p_id: A, p_off: false }],
    ['admin_take_handle', { p_id: A }],
  ]);
});

test('bad input never reaches the database', async () => {
  let called = false;
  const deps = { rpc: async () => { called = true; return {}; }, isOnline: online, timeLimitMs: 50 };
  assert.equal((await runTakedown('nope', A, deps)).status, 'error');
  assert.equal((await runTakedown('sharing_off', '', deps)).status, 'error');
  assert.equal((await runTakedown('sharing_off', null, deps)).status, 'error');
  assert.equal((await runTakedown('sharing_off', A, { ...deps, isOnline: offline })).status, 'offline');
  assert.equal(called, false);
});

test('every database refusal becomes a plain answer', async () => {
  const run = async (error) => (await runTakedown('take_handle', A, { rpc: async () => ({ error }), isOnline: online, timeLimitMs: 50 })).status;
  assert.equal(await run({ message: 'not_allowed' }), 'own_account');
  assert.equal(await run({ message: 'no_handle' }), 'no_handle');
  assert.equal(await run({ message: 'not_found' }), 'gone');
  assert.equal(await run({ message: 'forbidden' }), 'forbidden');
  assert.equal(await run({ code: '42501', message: 'x' }), 'forbidden');
  assert.equal(await run({ code: 'request_timeout', message: 'x' }), 'offline');
  assert.equal(await run({ message: 'something else' }), 'error');
  const thrown = await runTakedown('take_handle', A, { rpc: async () => { throw new Error('x') }, isOnline: online, timeLimitMs: 50 });
  assert.equal(thrown.status, 'error');
});

test('every answer has a short line', () => {
  for (const s of ['ok', 'own_account', 'no_handle', 'gone', 'forbidden', 'offline', 'error']) assert.ok(resultText(s).length > 3, s);
  assert.equal(resultText('ok'), 'Done.');
  assert.match(resultText('own_account'), /your own account/);
});
