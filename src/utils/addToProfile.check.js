// Checks for addToProfile.js (step 14.5c). Run with: node --test src/utils/addToProfile.check.js
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  readSharedIds, candidateList, capLine, togglePick, pickedCount, runBatch, mergeBatches, batchSummary, LIST_CAP,
} from './addToProfile.js';
import { ITEM_TEXT_MESSAGE } from './publicShare.js';

const item = (id, name, at, description = '') => ({ id, name, description, updatedAt: at })

test('shared ids: reads the id column, and an error says offline or error', async () => {
  const ok = { from: () => ({ select: async () => ({ data: [{ roshetta_id: 'a' }, { roshetta_id: 'b' }, {}], error: null }) }) };
  const res = await readSharedIds(ok, 'roshetta_shares', 'roshetta_id');
  assert.equal(res.ok, true);
  assert.deepEqual([...res.ids].sort(), ['a', 'b']);
  const timeout = { from: () => ({ select: async () => ({ data: null, error: { code: 'request_timeout' } }) }) };
  assert.deepEqual(await readSharedIds(timeout, 't', 'x'), { ok: false, reason: 'offline' });
  const bad = { from: () => ({ select: async () => ({ data: null, error: { code: '500' } }) }) };
  assert.deepEqual(await readSharedIds(bad, 't', 'x'), { ok: false, reason: 'error' });
});

test('offer: only items without a link, newest first, a tie keeps its order', () => {
  const list = [item('a', 'Old', '2026-01-01'), item('b', 'New', '2026-03-01'), item('c', 'Shared', '2026-04-01'), item('d', 'Mid', '2026-02-01'), item('e', 'Tie', '2026-02-01')];
  const out = candidateList(list, new Set(['c']));
  assert.deepEqual(out.ok.map(i => i.id), ['b', 'd', 'e', 'a']);
  assert.equal(out.total, 4);
  assert.deepEqual(out.blocked, []);
  assert.deepEqual(candidateList(null, null), { ok: [], blocked: [], total: 0 });
});

test('offer: a web address or phone number in the name or description stays private and is listed', () => {
  const list = [
    item('a', 'Fine', '2026-01-03'),
    item('b', 'Visit www.example.com', '2026-01-02'),
    item('c', 'Call', '2026-01-01', 'ring 01012345678'),
  ];
  const out = candidateList(list, new Set());
  assert.deepEqual(out.ok.map(i => i.id), ['a']);
  assert.deepEqual(out.blocked.map(i => [i.id, i.issue]), [['b', 'web'], ['c', 'phone']]);
  assert.equal(out.total, 3);
});

test('offer: at most 50 are shown and the true total is kept, with the line only past 50', () => {
  const many = Array.from({ length: 63 }, (_, i) => item(`i${i}`, `R${i}`, 1000 + i));
  const out = candidateList(many, new Set());
  assert.equal(out.ok.length + out.blocked.length, LIST_CAP);
  assert.equal(out.total, 63);
  assert.equal(out.ok[0].id, 'i62');
  assert.equal(capLine(50, 63), 'Showing the newest 50 of 63');
  assert.equal(capLine(50, 50), null);
  assert.equal(capLine(3, 3), null);
});

test('ticks: toggling adds then removes, keeps the other tab, and never changes the old value', () => {
  const start = { roshettas: ['a'], groups: [] };
  const one = togglePick(start, 'groups', 'g1');
  assert.deepEqual(one, { roshettas: ['a'], groups: ['g1'] });
  assert.deepEqual(start, { roshettas: ['a'], groups: [] });
  assert.deepEqual(togglePick(one, 'roshettas', 'a'), { roshettas: [], groups: ['g1'] });
  assert.equal(pickedCount(one), 2);
  assert.equal(pickedCount(null), 0);
  assert.deepEqual(togglePick(null, 'roshettas', 'x'), { roshettas: ['x'], groups: [] });
});

test('batch: item refusals and unsent items are skipped, the rest go through', async () => {
  const answers = { a: { ok: true }, b: { ok: false, reason: 'item_web' }, c: { ok: false, reason: 'not_sent' }, d: { ok: true }, e: { ok: false, reason: 'item_phone' } };
  const seen = [];
  const res = await runBatch(['a', 'b', 'c', 'd', 'e'], async (id) => { seen.push(id); return answers[id]; });
  assert.deepEqual(seen, ['a', 'b', 'c', 'd', 'e']);
  assert.deepEqual(res, { made: ['a', 'd'], stayed: ['b', 'e'], unsent: ['c'], stopped: null, left: 0 });
});

test('batch: the first other problem stops it at once and counts what is left', async () => {
  const seen = [];
  const res = await runBatch(['a', 'b', 'c', 'd'], async (id) => { seen.push(id); return id === 'b' ? { ok: false, reason: 'offline' } : { ok: true }; });
  assert.deepEqual(seen, ['a', 'b']);
  assert.deepEqual(res, { made: ['a'], stayed: [], unsent: [], stopped: 'offline', left: 3 });
  const thrown = await runBatch(['x'], async () => { throw new Error('boom'); });
  assert.equal(thrown.stopped, 'error');
  assert.equal(thrown.left, 1);
});

test('batches join, and the line says what happened in plain words', () => {
  const a = { made: ['a'], stayed: [], unsent: [], stopped: null, left: 0 };
  const b = { made: ['g1', 'g2'], stayed: ['g3'], unsent: [], stopped: null, left: 0 };
  const both = mergeBatches(a, b);
  assert.deepEqual(both.made, ['a', 'g1', 'g2']);
  assert.equal(batchSummary(a).text, '1 item is now on your profile.');
  assert.equal(batchSummary(a).allDone, true);
  const s = batchSummary(both);
  assert.equal(s.text, `3 items are now on your profile. 1 stayed private. ${ITEM_TEXT_MESSAGE}`);
  assert.equal(s.allDone, false);
  const off = batchSummary({ made: ['a'], stayed: [], unsent: [], stopped: 'offline', left: 2 });
  assert.equal(off.text, '1 item is now on your profile. No connection. 2 items not made public.');
  assert.equal(off.allDone, false);
  assert.equal(batchSummary({ made: [], stayed: [], unsent: ['u'], stopped: 'read_only', left: 1 }).text,
    "1 isn't saved online yet. Try again once it is sent. This account is read only, so nothing more could be changed.");
  assert.match(batchSummary({ made: [], stayed: [], unsent: [], stopped: 'error', left: 1 }).text, /^Something went wrong\. 1 item not made public/);
});
