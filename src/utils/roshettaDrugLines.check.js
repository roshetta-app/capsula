// Checks for roshettaDrugLines.js (step 5.1c). Run with: node --test src/utils/roshettaDrugLines.check.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { drugLines, drugDetail, switchChip, removeDrugAction } from './roshettaDrugLines.js';
import { newDrugGroup, addPartner } from './roshettaRows.js';

const ids = (() => { let n = 0; return () => `row-${++n}`; })();
const lib = (id, name, extra = {}) => ({ id, name, ...extra });

function sample() {
  let row = newDrugGroup(lib('b1', 'Panadol', { genericName: 'Paracetamol', concentration: '500 mg', form: 'Tablet' }), ids);
  row = addPartner(row, lib('b2', 'Brufen', { genericName: 'Ibuprofen' }), 'or');
  row = addPartner(row, lib('b3', 'Zantac'), 'and');
  return row;
}

test('drugLines: main drug first, then partners with the chip in front of each', () => {
  const lines = drugLines(sample(), null);
  assert.deepEqual(lines.map(l => l.name), ['Panadol', 'Brufen', 'Zantac']);
  assert.deepEqual(lines.map(l => l.position), [0, 1, 2]);
  assert.deepEqual(lines.map(l => l.joiner), [null, 'or', 'and']);
  assert.deepEqual(drugLines(null, null), []);
  assert.deepEqual(drugLines(undefined, null), []);
});

test('drugLines: "no longer available" only when the library is loaded and the drug is not in it', () => {
  const row = sample();
  assert.deepEqual(drugLines(row, null).map(l => l.available), [true, true, true], 'library not loaded');
  assert.deepEqual(drugLines(row, undefined).map(l => l.available), [true, true, true]);
  assert.deepEqual(drugLines(row, new Set(['b1', 'b3'])).map(l => l.available), [true, false, true]);
  assert.deepEqual(drugLines(row, new Set()).map(l => l.available), [false, false, false]);
  assert.equal(drugLines(row, new Set(['b1']))[1].name, 'Brufen', 'the saved name is kept');
});

test('drugLines: a missing name gets a plain stand-in, an unknown joiner counts as or', () => {
  const row = { row_type: 'drug', id: 'x', brand_id: 'b9', brand_name: '  ', alternatives: [{ brand_id: 'b8', brand_name: 'Aspirin', joiner: 'weird' }] };
  const lines = drugLines(row, null);
  assert.equal(lines[0].name, 'Unnamed drug');
  assert.equal(lines[1].joiner, 'or');
});

test('drugDetail: generic, strength and form joined, empty parts left out', () => {
  const lines = drugLines(sample(), null);
  assert.equal(drugDetail(lines[0]), 'Paracetamol \u00B7 500 mg \u00B7 Tablet');
  assert.equal(drugDetail(lines[1]), 'Ibuprofen');
  assert.equal(drugDetail(lines[2]), '');
  assert.equal(drugDetail(null), '');
});

test('switchChip: flips one chip, leaves the rest, bad index gives null and changes nothing', () => {
  const row = sample();
  const next = switchChip(row, 0);
  assert.equal(next.alternatives[0].joiner, 'and');
  assert.equal(next.alternatives[1].joiner, 'and');
  assert.equal(row.alternatives[0].joiner, 'or', 'the original is not changed');
  assert.equal(switchChip(row, 2), null);
  assert.equal(switchChip(row, -1), null);
  assert.equal(switchChip({ row_type: 'plain_text' }, 0), null);
});

test('removeDrugAction: partner removed, main promotes the first partner, last drug deletes the group', () => {
  const row = sample();
  const p = removeDrugAction(row, 2);
  assert.equal(p.kind, 'change');
  assert.deepEqual(drugLines(p.row, null).map(l => l.name), ['Panadol', 'Brufen']);

  const m = removeDrugAction(row, 0);
  assert.equal(m.kind, 'change');
  assert.deepEqual(drugLines(m.row, null).map(l => l.name), ['Brufen', 'Zantac']);
  assert.equal(m.row.id, row.id, 'the group keeps its id');

  const single = newDrugGroup(lib('b1', 'Panadol'), ids);
  assert.deepEqual(removeDrugAction(single, 0), { kind: 'delete_group' });
  assert.deepEqual(removeDrugAction(row, 5), { kind: 'none' });
});
