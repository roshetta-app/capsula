// Checks for roshettaChanges.js (step 2.3a). Run with: node --test src/utils/roshettaChanges.check.js
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  newId,
  makeChange,
  newestChangedFirst,
  applyChange,
  applyQueue,
  addChange,
  markSending,
  clearSending,
  removeChange,
  markFailed,
  nextToSend,
  retryFailed,
  discardFailed,
  dropRoshetta,
} from './roshettaChanges.js';

const rows = (n) => [{ type: 'plain_text', content: `t${n}` }];
const R = (id, name, updatedAt = '2026-11-13T10:00:00.000Z', extra = {}) => ({
  id, name, description: '', rows: [], createdAt: '2026-11-13T09:00:00.000Z', updatedAt, ...extra,
});
const create = (id, name = 'Chest pain', n = 0) =>
  makeChange('create', id, { name, description: '', rows: rows(n), createdAt: '2026-11-13T09:00:00.000Z' });
const save = (id, name, n) => makeChange('save', id, { name, description: 'd', rows: rows(n) });
const del = (id) => makeChange('delete', id);
const sending = (c) => ({ ...c, sending: true });
const failed = (c) => ({ ...c, failed: { reason: 'error' } });

test('newId gives different ids in the usual id format', () => {
  const a = newId(); const b = newId();
  assert.notEqual(a, b);
  assert.match(a, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
});

test('makeChange builds a change with id, type, roshettaId, data and time', () => {
  const c = makeChange('save', 'r1', { name: 'x' });
  assert.equal(c.type, 'save');
  assert.equal(c.roshettaId, 'r1');
  assert.deepEqual(c.data, { name: 'x' });
  assert.ok(c.id && c.at);
  assert.deepEqual(makeChange('delete', 'r1').data, {});
});

test('newestChangedFirst orders by last changed and does not change the input', () => {
  const list = [R('a', 'A', '2026-11-13T08:00:00.000Z'), R('b', 'B', '2026-11-13T12:00:00.000Z'), R('c', 'C', '2026-11-13T10:00:00.000Z')];
  const copy = list.slice();
  assert.deepEqual(newestChangedFirst(list).map(r => r.id), ['b', 'c', 'a']);
  assert.deepEqual(list, copy);
});

test('applyChange create adds the roshetta with defaults', () => {
  const out = applyChange([], makeChange('create', 'r1', { name: 'N' }));
  assert.equal(out.length, 1);
  assert.equal(out[0].id, 'r1');
  assert.equal(out[0].name, 'N');
  assert.equal(out[0].description, '');
  assert.deepEqual(out[0].rows, []);
  assert.ok(out[0].createdAt && out[0].updatedAt);
});

test('applyChange create of a roshetta already in the list changes nothing', () => {
  const list = [R('r1', 'Old')];
  assert.equal(applyChange(list, create('r1', 'New')), list);
});

test('applyChange create puts the newest changed on top', () => {
  const list = [R('a', 'A', '2000-01-01T00:00:00.000Z')];
  assert.equal(applyChange(list, create('r1'))[0].id, 'r1');
});

test('applyChange save replaces name, description and rows and bumps the changed time', () => {
  const list = [R('r1', 'Old', '2000-01-01T00:00:00.000Z', { rows: rows(1) }), R('r2', 'Other')];
  const c = save('r1', 'New', 2);
  const out = applyChange(list, c);
  const r1 = out.find(r => r.id === 'r1');
  assert.equal(r1.name, 'New');
  assert.equal(r1.description, 'd');
  assert.deepEqual(r1.rows, rows(2));
  assert.equal(r1.updatedAt, c.at);
  assert.equal(r1.createdAt, '2026-11-13T09:00:00.000Z');
  assert.equal(out.find(r => r.id === 'r2').name, 'Other');
});

test('applyChange save for a roshetta that is not in the list changes nothing', () => {
  const list = [R('r1', 'A')];
  assert.deepEqual(applyChange(list, save('zzz', 'X', 1)), list);
});

test('applyChange delete removes only that roshetta', () => {
  const out = applyChange([R('r1', 'A'), R('r2', 'B')], del('r1'));
  assert.deepEqual(out.map(r => r.id), ['r2']);
});

test('applyChange ignores an unknown change type', () => {
  const list = [R('r1', 'A')];
  assert.equal(applyChange(list, makeChange('bogus', 'r1')), list);
});

test('applyQueue lays every waiting change on the list in order', () => {
  const q = [create('r1', 'First', 1), save('r1', 'Second', 2), create('r2', 'Other'), del('r2')];
  const out = applyQueue([], q);
  assert.deepEqual(out.map(r => r.id), ['r1']);
  assert.equal(out[0].name, 'Second');
  assert.deepEqual(out[0].rows, rows(2));
});

test('addChange puts a create on the end', () => {
  const q = addChange([], create('r1'));
  assert.equal(q.length, 1);
  assert.equal(q[0].type, 'create');
});

test('a save joins a waiting create: one create with the latest content', () => {
  const q = addChange([create('r1', 'A', 1)], save('r1', 'B', 2));
  assert.equal(q.length, 1);
  assert.equal(q[0].type, 'create');
  assert.equal(q[0].data.name, 'B');
  assert.deepEqual(q[0].data.rows, rows(2));
  assert.equal(q[0].data.createdAt, '2026-11-13T09:00:00.000Z');
});

test('a later save replaces an earlier waiting save of the same roshetta', () => {
  let q = addChange([], save('r1', 'A', 1));
  q = addChange(q, save('r1', 'B', 2));
  q = addChange(q, save('r1', 'C', 3));
  assert.equal(q.length, 1);
  assert.equal(q[0].type, 'save');
  assert.equal(q[0].data.name, 'C');
  assert.deepEqual(q[0].data.rows, rows(3));
});

test('a replacing save keeps nothing of the older save (it is one whole document)', () => {
  const first = makeChange('save', 'r1', { name: 'A', description: 'long text', rows: rows(1) });
  const second = makeChange('save', 'r1', { name: 'B', description: '', rows: [] });
  const q = addChange([first], second);
  assert.equal(q[0].data.description, '');
  assert.deepEqual(q[0].data.rows, []);
});

test('a save never joins a change that is on its way: it goes after it', () => {
  const q = addChange([sending(save('r1', 'A', 1))], save('r1', 'B', 2));
  assert.equal(q.length, 2);
  assert.equal(q[0].sending, true);
  assert.equal(q[0].data.name, 'A');
  assert.equal(q[1].data.name, 'B');
});

test('a save after a create that is on its way goes after it, and a further save replaces that one', () => {
  let q = addChange([sending(create('r1', 'A', 1))], save('r1', 'B', 2));
  assert.deepEqual(q.map(c => c.type), ['create', 'save']);
  q = addChange(q, save('r1', 'C', 3));
  assert.deepEqual(q.map(c => c.type), ['create', 'save']);
  assert.equal(q[0].data.name, 'A');
  assert.equal(q[1].data.name, 'C');
});

test('a save never replaces a failed change: it goes after it', () => {
  const q = addChange([failed(save('r1', 'A', 1))], save('r1', 'B', 2));
  assert.equal(q.length, 2);
  assert.ok(q[0].failed);
  assert.equal(q[1].data.name, 'B');
});

test('saves of different roshettas stay apart', () => {
  let q = addChange([], save('r1', 'A', 1));
  q = addChange(q, save('r2', 'B', 2));
  q = addChange(q, save('r1', 'C', 3));
  assert.equal(q.length, 2);
  assert.equal(q.find(c => c.roshettaId === 'r1').data.name, 'C');
  assert.equal(q.find(c => c.roshettaId === 'r2').data.name, 'B');
});

test('a save for a roshetta that is waiting to be deleted is ignored', () => {
  const q = [del('r1')];
  assert.equal(addChange(q, save('r1', 'A', 1)), q);
});

test('a delete of a roshetta made here and never sent leaves no trace of it', () => {
  const q = addChange([create('r1'), create('r2', 'Keep')], del('r1'));
  assert.deepEqual(q.map(c => c.roshettaId), ['r2']);
});

test('a delete of a roshetta whose create failed also leaves no trace', () => {
  const q = addChange([failed(create('r1')), create('r2')], del('r1'));
  assert.deepEqual(q.map(c => c.roshettaId), ['r2']);
});

test('a delete cancels the waiting saves of that roshetta and goes on the end', () => {
  const q = addChange([save('r1', 'A', 1), save('r2', 'B', 2)], del('r1'));
  assert.deepEqual(q.map(c => `${c.type}:${c.roshettaId}`), ['save:r2', 'delete:r1']);
});

test('a delete also cancels a failed save, so it does not wait behind it', () => {
  const q = addChange([failed(save('r1', 'A', 1))], del('r1'));
  assert.deepEqual(q.map(c => c.type), ['delete']);
});

test('a delete keeps a save that is on its way and goes after it', () => {
  const q = addChange([sending(save('r1', 'A', 1)), save('r1', 'B', 2)], del('r1'));
  assert.deepEqual(q.map(c => c.type), ['save', 'delete']);
  assert.equal(q[0].sending, true);
});

test('a delete after a create that is on its way keeps the create and goes after it', () => {
  const q = addChange([sending(create('r1'))], del('r1'));
  assert.deepEqual(q.map(c => c.type), ['create', 'delete']);
});

test('a second delete of the same roshetta is not added twice', () => {
  const q = [save('r2', 'B', 1), del('r1')];
  assert.equal(addChange(q, del('r1')), q);
});

test('addChange does not change the list or the changes it was given', () => {
  const a = create('r1', 'A', 1);
  const q = [a];
  const snapshot = JSON.stringify(q);
  addChange(q, save('r1', 'B', 2));
  addChange(q, del('r1'));
  assert.equal(JSON.stringify(q), snapshot);
});

// ── Step 2.3b: the marks the sending step uses ──────────────────────────────

test('markSending marks only that change, and does not change the input', () => {
  const a = create('r1'); const b = save('r2', 'B', 1);
  const q = [a, b];
  const out = markSending(q, b.id);
  assert.equal(out[0].sending, undefined);
  assert.equal(out[1].sending, true);
  assert.equal(q[1].sending, undefined);
});

test('clearSending takes the mark off every change (what reopening the app does)', () => {
  const q = [sending(create('r1')), sending(save('r2', 'B', 1)), save('r3', 'C', 1)];
  const out = clearSending(q);
  assert.ok(out.every(c => c.sending === undefined));
  assert.equal(out.length, 3);
});

test('removeChange removes one change by id', () => {
  const a = create('r1'); const b = create('r2');
  assert.deepEqual(removeChange([a, b], a.id).map(c => c.id), [b.id]);
});

test('markFailed marks the change with the reason and clears its sending mark', () => {
  const a = sending(save('r1', 'A', 1));
  const out = markFailed([a], a.id, 'error');
  assert.deepEqual(out[0].failed, { reason: 'error' });
  assert.equal(out[0].sending, undefined);
});

test('nextToSend gives the oldest change that can go', () => {
  const a = create('r1'); const b = create('r2');
  assert.equal(nextToSend([a, b]), a);
  assert.equal(nextToSend([]), null);
});

test('nextToSend gives nothing while a change is on its way', () => {
  assert.equal(nextToSend([sending(create('r1')), create('r2')]), null);
});

test('nextToSend skips a failed change, and what waits behind it for the same roshetta', () => {
  const f = failed(save('r1', 'A', 1)); const behind = save('r1', 'B', 2); const other = save('r2', 'C', 3);
  assert.equal(nextToSend([f, behind, other]), other);
  assert.equal(nextToSend([f, behind]), null);
});

test('retryFailed takes the failed mark off so the change is sent again', () => {
  const out = retryFailed([failed(save('r1', 'A', 1)), save('r2', 'B', 1)]);
  assert.ok(out.every(c => c.failed === undefined));
});

test('discardFailed removes failed changes and keeps the rest', () => {
  const keep = save('r2', 'B', 1);
  const out = discardFailed([failed(save('r1', 'A', 1)), keep]);
  assert.deepEqual(out, [keep]);
});

test('discardFailed of a failed create also drops everything waiting for that roshetta', () => {
  const keep = save('r2', 'B', 1);
  const out = discardFailed([failed(create('r1')), save('r1', 'X', 1), keep]);
  assert.deepEqual(out, [keep]);
});

test('dropRoshetta removes every waiting change for one roshetta', () => {
  const keep = save('r2', 'B', 1);
  assert.deepEqual(dropRoshetta([create('r1'), keep, del('r1')], 'r1'), [keep]);
});

test('summarizeQueue counts waiting and failed, lists the roshettas with something waiting and the failed changes', async () => {
  const { summarizeQueue } = await import('./roshettaChanges.js');
  const a = save('r1', 'A', 1); const b = failed(save('r2', 'B', 2)); const c = del('r3');
  const s = summarizeQueue([a, b, c]);
  assert.deepEqual([s.waiting, s.failed], [2, 1]);
  assert.deepEqual(s.ids.sort(), ['r1', 'r2', 'r3']);
  assert.deepEqual(s.failedList.map(x => x.id), [b.id]);
  assert.deepEqual(summarizeQueue([]), { failed: 0, waiting: 0, ids: [], failedList: [] });
});

test('sameSummary is true only when nothing the screens show has changed', async () => {
  const { summarizeQueue, sameSummary } = await import('./roshettaChanges.js');
  const a = save('r1', 'A', 1); const b = failed(save('r2', 'B', 2));
  assert.equal(sameSummary(summarizeQueue([a, b]), summarizeQueue([a, b])), true);
  assert.equal(sameSummary(summarizeQueue([a, b]), summarizeQueue([a])), false);
  assert.equal(sameSummary(summarizeQueue([a]), summarizeQueue([a, del('r2')])), false);
  assert.equal(sameSummary(summarizeQueue([a]), summarizeQueue([del('r1')])), true, 'same count and same roshetta: nothing the screens show changed');
  assert.equal(sameSummary(summarizeQueue([a, b]), summarizeQueue([b, a])), true);
});
