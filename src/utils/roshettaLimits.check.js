// Checks for roshettaLimits.js (step 2.4c). Run with: node --test src/utils/roshettaLimits.check.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { roshettaCap, roshettaDrugCap, isReadOnly, canCreate, tapRefusal, rowsRefusal, sheetForEvents, afterRun } from './roshettaLimits.js';

const drugs = (n) => Array.from({ length: n }, (_, i) => ({ row_type: 'drug', brand_name: `d${i}` }));
const R = (id, n = 0) => ({ id, name: id, description: '', rows: drugs(n) });
const many = (n, drugsEach = 0) => Array.from({ length: n }, (_, i) => R(`r${i}`, drugsEach));

test('the four limits are the plan\'s: free 3 and 10, Pro 100 and 30', () => {
  assert.deepEqual([roshettaCap(false), roshettaDrugCap(false)], [3, 10]);
  assert.deepEqual([roshettaCap(true), roshettaDrugCap(true)], [100, 30]);
});

test('read only: a free account over 3 roshettas, or with one over 10 drugs; never Pro', () => {
  assert.equal(isReadOnly(many(3, 10), false), false, 'exactly at the limits is fine');
  assert.equal(isReadOnly(many(4), false), true);
  assert.equal(isReadOnly([R('a', 11)], false), true);
  assert.equal(isReadOnly(many(4, 11), true), false);
  assert.equal(isReadOnly([], false), false);
});

test('a partner drug counts like any drug in the drug limit', () => {
  const row = { row_type: 'drug', brand_name: 'x', alternatives: Array.from({ length: 10 }, () => ({ brand_name: 'p' })) };
  assert.equal(isReadOnly([{ id: 'a', rows: [row] }], false), true);
  assert.equal(rowsRefusal([row], false), 'drug_limit');
});

test('canCreate: false when full or read only, true below the limit', () => {
  assert.equal(canCreate(many(2), false), true);
  assert.equal(canCreate(many(3), false), false);
  assert.equal(canCreate(many(4), false), false);
  assert.equal(canCreate(many(3), true), true);
  assert.equal(canCreate(many(100), true), false);
});

test('tapRefusal create: read only first, then a full list, otherwise allowed', () => {
  assert.equal(tapRefusal('create', many(2), false), null);
  assert.equal(tapRefusal('create', many(3), false), 'limit');
  assert.equal(tapRefusal('create', many(4), false), 'read_only');
  assert.equal(tapRefusal('create', [R('a', 11)], false), 'read_only');
  assert.equal(tapRefusal('create', many(100), true), 'limit');
  assert.equal(tapRefusal('create', many(99), true), null);
});

test('tapRefusal save: allowed unless read only; a full list does not stop a save', () => {
  assert.equal(tapRefusal('save', many(3), false), null);
  assert.equal(tapRefusal('save', many(4), false), 'read_only');
  assert.equal(tapRefusal('save', many(4), true), null);
});

test('tapRefusal delete: always allowed, also when read only', () => {
  assert.equal(tapRefusal('delete', many(4), false), null);
  assert.equal(tapRefusal('delete', [R('a', 11)], false), null);
});

test('rowsRefusal: free allows 10 drugs, Pro 30', () => {
  assert.equal(rowsRefusal(drugs(10), false), null);
  assert.equal(rowsRefusal(drugs(11), false), 'drug_limit');
  assert.equal(rowsRefusal(drugs(30), true), null);
  assert.equal(rowsRefusal(drugs(31), true), 'drug_limit');
  assert.equal(rowsRefusal([], false), null);
});

test('sheetForEvents: the roshetta limit opens the roshettas sheet, also for a lapsed account\'s create', () => {
  const s = sheetForEvents([{ kind: 'roshetta_limit', name: 'Chest pain' }, { kind: 'roshetta_limit', name: 'Asthma' }, { kind: 'roshetta_limit', name: 'Asthma' }]);
  assert.deepEqual(s, { kind: 'roshettas', names: ['Chest pain', 'Asthma'] });
});

test('sheetForEvents: drug limit opens the drugs sheet; read only opens the read only sheet', () => {
  assert.deepEqual(sheetForEvents([{ kind: 'drug_limit', name: 'Big one' }]), { kind: 'drugs', names: ['Big one'] });
  assert.deepEqual(sheetForEvents([{ kind: 'read_only' }]), { kind: 'readonly', names: [] });
});

test('sheetForEvents: one sheet only, the roshetta limit before drugs before read only', () => {
  const all = [{ kind: 'read_only' }, { kind: 'drug_limit', name: 'B' }, { kind: 'roshetta_limit', name: 'A' }];
  assert.equal(sheetForEvents(all).kind, 'roshettas');
  assert.equal(sheetForEvents(all.slice(0, 2)).kind, 'drugs');
});

test('sheetForEvents: nothing to say, or only events that need no sheet, opens nothing', () => {
  assert.equal(sheetForEvents([]), null);
  assert.equal(sheetForEvents(), null);
  assert.equal(sheetForEvents([{ kind: 'roshetta_gone', name: 'X' }]), null);
});

test('afterRun: a limit opens the sheet and its message is not said twice; other news is still told', () => {
  const out = afterRun({ events: [{ kind: 'roshetta_limit', name: 'A' }, { kind: 'roshetta_gone', name: 'B' }], failed: 1, sent: 2 });
  assert.deepEqual(out.sheet, { kind: 'roshettas', names: ['A'] });
  assert.equal(out.messages.length, 2);
  assert.match(out.messages[0], /B.*deleted on another device/);
  assert.equal(out.messages[1], '1 change could not be saved.');
  assert.equal(out.severe, true);
  assert.equal(out.success, false);
});

test('afterRun: only a limit means a sheet and no message at all; nothing wrong means a success note', () => {
  const lim = afterRun({ events: [{ kind: 'drug_limit', name: 'Big' }], sent: 1 });
  assert.deepEqual([lim.sheet.kind, lim.messages.length, lim.success], ['drugs', 0, false]);
  const fine = afterRun({ events: [], failed: 0, sent: 3 });
  assert.deepEqual([fine.sheet, fine.messages, fine.success], [null, [], true]);
  const nothing = afterRun({ events: [], failed: 0, sent: 0 });
  assert.equal(nothing.success, false);
  assert.deepEqual(afterRun(), { sheet: null, messages: [], severe: false, success: false });
});
