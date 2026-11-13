// Checks for roshettaEdit.js (step 2.4b). Run with: node --test src/utils/roshettaEdit.check.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { applyQueue, makeChange } from './roshettaChanges.js';
import { prepareCreate, prepareSave, prepareDelete, commitChange } from './roshettaEdit.js';

const T = '2026-11-13T10:00:00.000Z';
const txt = (s) => [{ row_type: 'plain_text', content: s }];
const R = (id, name, rows = txt(name)) => ({ id, name, description: '', rows, createdAt: T, updatedAt: T });
const NOW = () => '2026-11-13T12:00:00.000Z';

test('prepareCreate makes a create change with a new id, trimmed text and the created time', () => {
  const out = prepareCreate({ name: '  Chest pain  ', description: ' adults ', rows: txt('x') }, { makeId: () => 'id-1', now: NOW });
  assert.equal(out.ok, true);
  assert.equal(out.id, 'id-1');
  assert.deepEqual([out.change.type, out.change.roshettaId], ['create', 'id-1']);
  assert.deepEqual(out.change.data, { name: 'Chest pain', description: 'adults', rows: txt('x'), createdAt: NOW() });
});

test('prepareCreate: description and rows may be left out', () => {
  const out = prepareCreate({ name: 'A' }, { makeId: () => 'id-2', now: NOW });
  assert.deepEqual([out.ok, out.change.data.description, out.change.data.rows], [true, '', []]);
});

test('prepareCreate refuses an empty, blank, too long or missing name', () => {
  for (const name of ['', '   ', 'x'.repeat(41), undefined, 5]) {
    const out = prepareCreate({ name });
    assert.deepEqual([out.ok, out.reason], [false, 'invalid'], String(name));
  }
  assert.equal(prepareCreate({ name: 'x'.repeat(40) }).ok, true);
});

test('prepareCreate refuses a description over 200 and rows that break the size rules', () => {
  assert.equal(prepareCreate({ name: 'A', description: 'x'.repeat(201) }).reason, 'invalid');
  assert.equal(prepareCreate({ name: 'A', rows: 'nope' }).reason, 'invalid');
  assert.equal(prepareCreate({ name: 'A', rows: txt('x'.repeat(1001)) }).detail, 'text_too_long');
  assert.equal(prepareCreate({ name: 'A', rows: [{ row_type: 'mystery' }] }).detail, 'bad_row_type');
});

test('prepareSave carries the WHOLE roshetta; a field left out keeps its current value', () => {
  const list = [{ ...R('r1', 'Old', txt('a')), description: 'keep me' }];
  const out = prepareSave(list, 'r1', { name: 'New' });
  assert.equal(out.ok, true);
  assert.equal(out.change.type, 'save');
  assert.deepEqual(out.change.data, { name: 'New', description: 'keep me', rows: txt('a') });
  const rowsOnly = prepareSave(list, 'r1', { rows: txt('b') });
  assert.deepEqual(rowsOnly.change.data, { name: 'Old', description: 'keep me', rows: txt('b') });
});

test('prepareSave: missing roshetta and bad input are refused', () => {
  const list = [R('r1', 'A')];
  assert.deepEqual(prepareSave(list, 'nope', { name: 'X' }), { ok: false, reason: 'missing' });
  assert.equal(prepareSave(list, 'r1', { name: '' }).reason, 'invalid');
  assert.equal(prepareSave(list, 'r1', { rows: txt('x'.repeat(1001)) }).reason, 'invalid');
});

test('prepareDelete gives back the roshetta, its place and a delete change', () => {
  const list = [R('a', 'A'), R('b', 'B'), R('c', 'C')];
  const out = prepareDelete(list, 'b');
  assert.deepEqual([out.ok, out.roshetta.name, out.index, out.change.type, out.change.roshettaId], [true, 'B', 1, 'delete', 'b']);
  assert.deepEqual(prepareDelete(list, 'zzz'), { ok: false, reason: 'missing' });
});

function holderWith(list = [], queue = []) {
  const h = { queue, list };
  const shown = [];
  return { h, shown, show: l => shown.push(l) };
}

test('commitChange: shows at once, keeps the change on the list, and saves the list on the phone', async () => {
  const { h, shown, show } = holderWith([R('r1', 'A')]);
  const c = prepareCreate({ name: 'Made here' }, { makeId: () => 'new1', now: NOW }).change;
  let savedQueue = null;
  const ok = await commitChange(h, c, { persist: async () => { savedQueue = h.queue; return true; }, show });
  assert.equal(ok, true);
  assert.deepEqual(h.list.map(r => r.name).sort(), ['A', 'Made here']);
  assert.equal(savedQueue.length, 1);
  assert.equal(shown.length, 1);
  assert.equal(shown[0], h.list);
});

test('commitChange: the screen changes BEFORE the phone has saved', async () => {
  const { h, shown, show } = holderWith([R('r1', 'A')]);
  let seenWhenSaving = null;
  await commitChange(h, makeChange('delete', 'r1'), { persist: async () => { seenWhenSaving = shown.length; return true; }, show });
  assert.equal(seenWhenSaving, 1);
  assert.deepEqual(h.list, []);
});

test('commitChange: when the phone cannot save, list, queue and screen all go back', async () => {
  const { h, shown, show } = holderWith([R('r1', 'A')]);
  const before = { list: h.list, queue: h.queue };
  const ok = await commitChange(h, makeChange('delete', 'r1'), { persist: async () => false, show });
  assert.equal(ok, false);
  assert.equal(h.list, before.list);
  assert.equal(h.queue, before.queue);
  assert.equal(shown.length, 2);
  assert.equal(shown[1], before.list);
});

test('commitChange: two changes made without waiting build on each other', async () => {
  const { h, show } = holderWith([]);
  const made = prepareCreate({ name: 'First', rows: txt('1') }, { makeId: () => 'n1', now: NOW });
  const slow = () => new Promise(r => setTimeout(() => r(true), 5));
  const p1 = commitChange(h, made.change, { persist: slow, show });
  const edit = prepareSave(h.list, 'n1', { name: 'First edited' });
  const p2 = commitChange(h, edit.change, { persist: slow, show });
  assert.deepEqual(await Promise.all([p1, p2]), [true, true]);
  assert.deepEqual(h.list.map(r => r.name), ['First edited']);
  assert.equal(h.queue.length, 1, 'the save joined the waiting create');
  assert.equal(h.queue[0].type, 'create');
  assert.equal(h.queue[0].data.name, 'First edited');
});

test('commitChange: a failed save does not undo a newer change made in the meantime', async () => {
  const { h, shown, show } = holderWith([R('a', 'A'), R('b', 'B')]);
  const first = commitChange(h, makeChange('delete', 'a'), { persist: () => new Promise(r => setTimeout(() => r(false), 10)), show });
  await commitChange(h, makeChange('delete', 'b'), { persist: async () => true, show });
  assert.equal(await first, false);
  assert.deepEqual(h.list, []);
  assert.equal(h.queue.length, 2);
  assert.equal(shown[shown.length - 1].length, 0);
});

test('a created roshetta shows with every waiting change laid over the server list afterwards', async () => {
  const { h, show } = holderWith([]);
  const made = prepareCreate({ name: 'Offline one' }, { makeId: () => 'n9', now: NOW });
  await commitChange(h, made.change, { persist: async () => true, show });
  const afterReload = applyQueue([R('r1', 'Server')], h.queue);
  assert.deepEqual(afterReload.map(r => r.name).sort(), ['Offline one', 'Server']);
});
