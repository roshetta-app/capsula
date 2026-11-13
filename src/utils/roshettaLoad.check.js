// Checks for roshettaLoad.js (step 2.4a). Run with: node --test src/utils/roshettaLoad.check.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeChange, addChange } from './roshettaChanges.js';
import { mapRoshettaRow, withTimeLimit, fetchRoshettas, loadRoshettas, viewFor } from './roshettaLoad.js';

const T1 = '2026-11-10T10:00:00.000Z';
const T2 = '2026-11-12T10:00:00.000Z';
const T3 = '2026-11-13T10:00:00.000Z';
const txt = (s) => [{ row_type: 'plain_text', content: s }];
const R = (id, name, updatedAt = T1, rows = txt(name)) => ({ id, name, description: '', rows, createdAt: T1, updatedAt });
const dbRow = (id, name, updated_at = T1) => ({ id, name, description: 'd', rows: txt(name), created_at: T1, updated_at });

// Runs loadRoshettas with fakes and records every state shown.
async function run({ cache = null, live = [], liveError = null, offline = false, waiting = [], queue = null, stale = () => false } = {}) {
  const shown = []; const calls = { queue: 0, cache: 0, live: 0 };
  const result = await loadRoshettas({
    userId: 'u1',
    queue,
    readQueue: async () => { calls.queue++; return waiting; },
    readCache: async () => { calls.cache++; return cache; },
    fetchLive: async () => { calls.live++; return liveError ? { data: null, error: liveError } : { data: live, error: null }; },
    isOffline: () => offline,
    isStale: stale,
    show: s => shown.push(s),
  });
  return { shown, calls, result, last: shown[shown.length - 1] };
}
const names = (s) => s.roshettas.map(r => r.name);

test('mapRoshettaRow renames the columns and fills gaps', () => {
  const r = mapRoshettaRow({ id: 'a', name: 'N', description: null, rows: null, created_at: T1, updated_at: T2 });
  assert.deepEqual(r, { id: 'a', name: 'N', description: '', rows: [], createdAt: T1, updatedAt: T2 });
  assert.deepEqual(mapRoshettaRow(dbRow('b', 'B')).rows, txt('B'));
});

test('withTimeLimit passes the answer, and turns silence or a throw into an error', async () => {
  assert.deepEqual(await withTimeLimit(Promise.resolve({ data: [1], error: null }), 50), { data: [1], error: null });
  const slow = await withTimeLimit(new Promise(() => {}), 10);
  assert.equal(slow.error.code, 'request_timeout');
  const boom = await withTimeLimit(Promise.reject(new TypeError('Failed to fetch')), 50);
  assert.match(boom.error.message, /Failed to fetch/);
});

test('fetchRoshettas asks the roshettas table for the right columns, newest changed first, and maps the rows', async () => {
  const seen = {};
  const client = { from(t) {
    seen.table = t;
    const b = {
      select(c) { seen.cols = c; return b; },
      order(c, o) { seen.order = [c, o]; return b; },
      then(res) { return Promise.resolve({ data: [dbRow('r1', 'Chest pain')], error: null }).then(res); },
    };
    return b;
  } };
  const out = await fetchRoshettas(client, x => x);
  assert.equal(seen.table, 'roshettas');
  assert.equal(seen.cols, 'id, name, description, rows, created_at, updated_at');
  assert.deepEqual(seen.order, ['updated_at', { ascending: false }]);
  assert.equal(out.error, null);
  assert.deepEqual(out.data, [{ id: 'r1', name: 'Chest pain', description: 'd', rows: txt('Chest pain'), createdAt: T1, updatedAt: T1 }]);
});

test('fetchRoshettas hands the error on and gives no data', async () => {
  const client = { from() { const b = { select() { return b; }, order() { return b; }, then(res) { return Promise.resolve({ data: null, error: { message: 'boom' } }).then(res); } }; return b; } };
  const out = await fetchRoshettas(client, x => x);
  assert.equal(out.data, null);
  assert.equal(out.error.message, 'boom');
});

test('online with a saved copy: the copy shows first, then the live list replaces it', async () => {
  const { shown } = await run({ cache: { data: [R('r1', 'Old')] }, live: [R('r1', 'New', T2)] });
  assert.equal(shown.length, 2);
  assert.deepEqual([shown[0].fromCache, shown[0].status], [true, 'ready']);
  assert.deepEqual(names(shown[0]), ['Old']);
  assert.deepEqual([shown[1].fromCache, shown[1].status, shown[1].loadError], [false, 'ready', false]);
  assert.deepEqual(names(shown[1]), ['New']);
});

test('a roshetta deleted on another phone disappears once the live list arrives', async () => {
  const { last } = await run({ cache: { data: [R('r1', 'A'), R('r2', 'B')] }, live: [R('r2', 'B')] });
  assert.deepEqual(names(last), ['B']);
});

test('online with no saved copy: loading first, then the live list; a loaded roshetta keeps all its fields', async () => {
  const { shown, calls } = await run({ cache: null, live: [R('r1', 'Chest pain', T2)] });
  assert.deepEqual([shown[0].status, shown[0].roshettas.length], ['loading', 0]);
  assert.equal(shown[1].status, 'ready');
  assert.deepEqual(shown[1].roshettas[0], R('r1', 'Chest pain', T2));
  assert.equal(calls.live, 1);
});

test('an empty live list is a real empty list, not an error', async () => {
  const { last } = await run({ cache: null, live: [] });
  assert.deepEqual([last.status, last.roshettas.length, last.loadError, last.fromCache], ['ready', 0, false, false]);
});

test('offline with a saved copy: stays on the copy, flags the failed refresh, never asks the server', async () => {
  const { last, calls } = await run({ cache: { data: [R('r1', 'A')] }, offline: true });
  assert.equal(calls.live, 0);
  assert.deepEqual([last.status, last.fromCache, last.loadError], ['ready', true, true]);
  assert.deepEqual(names(last), ['A']);
});

test('offline with no saved copy: an error state, nothing to show', async () => {
  const { last } = await run({ cache: null, offline: true });
  assert.deepEqual([last.status, last.roshettas.length], ['error', 0]);
});

test('server fails with a saved copy: the copy stays and the failure is flagged', async () => {
  const { last } = await run({ cache: { data: [R('r1', 'A')] }, liveError: { code: 'request_timeout' } });
  assert.deepEqual([last.status, last.fromCache, last.loadError], ['ready', true, true]);
  assert.deepEqual(names(last), ['A']);
});

test('server fails with no saved copy: an error state', async () => {
  const { last } = await run({ cache: null, liveError: { message: 'boom' } });
  assert.deepEqual([last.status, last.roshettas.length], ['error', 0]);
});

test('a saved copy that is not a list is ignored like no copy', async () => {
  const { shown } = await run({ cache: { data: 'junk' }, live: [R('r1', 'A')] });
  assert.equal(shown[0].status, 'loading');
  assert.deepEqual(names(shown[shown.length - 1]), ['A']);
});

test('waiting changes are laid over both the saved copy and the live list', async () => {
  const q = [
    makeChange('create', 'new1', { name: 'Made offline', description: '', rows: txt('x'), createdAt: T3 }),
    makeChange('save', 'r1', { name: 'Edited offline', description: '', rows: txt('e') }),
    makeChange('delete', 'r2'),
  ].reduce((list, c) => addChange(list, c), []);
  const { shown } = await run({ cache: { data: [R('r1', 'A'), R('r2', 'B')] }, live: [R('r1', 'A'), R('r2', 'B')], waiting: q });
  for (const s of shown) {
    assert.deepEqual(names(s).sort(), ['Edited offline', 'Made offline']);
  }
});

test('live roshettas come newest changed first', async () => {
  const { last } = await run({ cache: null, live: [R('a', 'A', T1), R('b', 'B', T3), R('c', 'C', T2)] });
  assert.deepEqual(names(last), ['B', 'C', 'A']);
});

test('reopening the app: a leftover "sending" mark is cleared on the list that comes back', async () => {
  const c = { ...makeChange('save', 'r1', { name: 'X', description: '', rows: [] }), sending: true };
  const { result, calls } = await run({ cache: { data: [R('r1', 'A')] }, live: [R('r1', 'A')], waiting: [c] });
  assert.equal(calls.queue, 1);
  assert.equal(result.queue.length, 1);
  assert.equal('sending' in result.queue[0], false);
});

test('the waiting list is read once: when it is already known it is not read again', async () => {
  const known = [makeChange('delete', 'r2')];
  const { result, calls, last } = await run({ queue: known, cache: { data: [R('r1', 'A'), R('r2', 'B')] }, live: [R('r1', 'A'), R('r2', 'B')] });
  assert.equal(calls.queue, 0);
  assert.equal(result.queue, known);
  assert.deepEqual(names(last), ['A']);
});

test('sign-out or a newer load in between: nothing more is shown and the result says stale', async () => {
  let n = 0;
  const { shown, result } = await run({ cache: { data: [R('r1', 'A')] }, live: [R('r1', 'B')], stale: () => ++n >= 2 });
  assert.equal(result.stale, true);
  assert.equal(shown.length, 0);
});

test('onQueue reports the cleared waiting list once, and not at all when the list was already known', async () => {
  const c = { ...makeChange('delete', 'r9'), sending: true };
  const got = [];
  await loadRoshettas({
    userId: 'u1', queue: null, readQueue: async () => [c], readCache: async () => null,
    fetchLive: async () => ({ data: [], error: null }), isOffline: () => false, isStale: () => false,
    show: () => {}, onQueue: l => got.push(l),
  });
  assert.equal(got.length, 1);
  assert.equal('sending' in got[0][0], false);
  const again = [];
  await loadRoshettas({
    userId: 'u1', queue: [], readQueue: async () => [c], readCache: async () => null,
    fetchLive: async () => ({ data: [], error: null }), isOffline: () => false, isStale: () => false,
    show: () => {}, onQueue: l => again.push(l),
  });
  assert.equal(again.length, 0);
});

test('guest: ready with nothing to show and isGuest true, whatever was loaded before', () => {
  const loaded = { userId: 'u1', roshettas: [R('r1', 'A')], status: 'ready', fromCache: false, loadError: false };
  const v = viewFor({ userId: null, authLoading: false, loaded });
  assert.deepEqual([v.status, v.roshettas.length, v.isGuest], ['ready', 0, true]);
});

test('still checking who is signed in: loading, and not a guest yet', () => {
  const v = viewFor({ userId: null, authLoading: true, loaded: null });
  assert.deepEqual([v.status, v.isGuest, v.roshettas.length], ['loading', false, 0]);
});

test('signed in: loading until this person\'s list is there, and never another person\'s list', () => {
  const other = { userId: 'u1', roshettas: [R('r1', 'A')], status: 'ready', fromCache: false, loadError: false };
  assert.equal(viewFor({ userId: 'u2', authLoading: false, loaded: null }).status, 'loading');
  const v = viewFor({ userId: 'u2', authLoading: false, loaded: other });
  assert.deepEqual([v.status, v.roshettas.length, v.isGuest], ['loading', 0, false]);
  const mine = viewFor({ userId: 'u1', authLoading: false, loaded: other });
  assert.deepEqual([mine.status, mine.roshettas.length, mine.fromCache, mine.loadError, mine.isGuest], ['ready', 1, false, false, false]);
});

test('the empty list for guests and loading is always the same object (screens do not redraw for nothing)', () => {
  const a = viewFor({ userId: null, authLoading: false, loaded: null }).roshettas;
  const b = viewFor({ userId: 'u9', authLoading: false, loaded: null }).roshettas;
  assert.equal(a, b);
});
