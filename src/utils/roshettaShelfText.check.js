// Checks for roshettaShelfText.js (Phase G, steps 8.1 and 8.2). Run with: node --test src/utils/roshettaShelfText.check.js
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  drugPreviewText, shortDateText, shelfRows, filterRoshettas, sortRoshettas, groupRoshettas, listMeta, SHELF_MAX,
} from './roshettaShelfText.js';

const NOW = new Date(2026, 10, 13, 9, 30); // Fri 13 Nov 2026
const at = (y, m, d) => new Date(y, m, d, 12).toISOString();
const drug = (name, extras = {}, alternatives = []) => ({ row_type: 'drug', id: name, brand_id: `b-${name}`, brand_name: name, alternatives, ...extras });
const partner = name => ({ brand_id: `b-${name}`, brand_name: name, joiner: 'or' });

test('preview: none, one, two, and "+N" for the rest (partners count too)', () => {
  assert.equal(drugPreviewText([]), 'No drugs yet');
  assert.equal(drugPreviewText(undefined), 'No drugs yet');
  assert.equal(drugPreviewText([{ row_type: 'plain_text', content: 'x' }]), 'No drugs yet');
  assert.equal(drugPreviewText([drug('Motinorm')]), 'Motinorm');
  assert.equal(drugPreviewText([drug('Motinorm'), drug('Notussil')]), 'Motinorm, Notussil');
  assert.equal(drugPreviewText([drug('Motinorm'), drug('Notussil'), drug('Herbana', {}, [partner('Pro-S')])]), 'Motinorm, Notussil +2');
});

test('preview: the library full name is cut to the clean brand name', () => {
  assert.equal(drugPreviewText([drug('Tussistop 60mg \u2014 20 Tablets', { concentration: '60mg' })]), 'Tussistop');
});

test('short date: today, yesterday, weekday inside a week, then the date', () => {
  assert.equal(shortDateText(at(2026, 10, 13), NOW), 'Today');
  assert.equal(shortDateText(at(2026, 10, 12), NOW), 'Yesterday');
  assert.equal(shortDateText(at(2026, 10, 11), NOW), 'Wed');
  assert.equal(shortDateText(at(2026, 10, 7), NOW), 'Sat');
  assert.equal(shortDateText(at(2026, 10, 6), NOW), '6 Nov');
  assert.equal(shortDateText(at(2025, 11, 31), NOW), '31 Dec 2025');
  assert.equal(shortDateText(undefined, NOW), '');
  assert.equal(shortDateText('nope', NOW), '');
});

test('shelf: shows three, "See all" only when there are more', () => {
  const mk = n => Array.from({ length: n }, (_, i) => ({ id: String(i) }));
  assert.equal(SHELF_MAX, 3);
  assert.deepEqual(shelfRows(mk(2)), { rows: mk(2), hasMore: false });
  assert.equal(shelfRows(mk(3)).hasMore, false);
  assert.equal(shelfRows(mk(4)).rows.length, 3);
  assert.equal(shelfRows(mk(4)).hasMore, true);
  assert.deepEqual(shelfRows(null), { rows: [], hasMore: false });
});

const LIST = [
  { id: 'a', name: 'Chest pain', updatedAt: at(2026, 10, 13), rows: [drug('Aspirin', { generic_name: 'acetylsalicylic acid' })] },
  { id: 'b', name: 'piles treatment', updatedAt: at(2026, 10, 12), rows: [drug('Motinorm')] },
  { id: 'c', name: 'Migraine', updatedAt: at(2026, 10, 9), rows: [drug('Sumatriptan')] },
  { id: 'd', name: 'Allergic rhinitis', updatedAt: at(2026, 9, 2), rows: [] },
  { id: 'e', name: '2nd line', updatedAt: at(2026, 9, 1), rows: [] },
];

test('filter: by name, by drug name, every word must match, empty query keeps all', () => {
  assert.equal(filterRoshettas(LIST, '').length, 5);
  assert.equal(filterRoshettas(LIST, '   ').length, 5);
  assert.deepEqual(filterRoshettas(LIST, 'PILES').map(r => r.id), ['b']);
  assert.deepEqual(filterRoshettas(LIST, 'sumatr').map(r => r.id), ['c']);
  assert.deepEqual(filterRoshettas(LIST, 'chest aspirin').map(r => r.id), ['a']);
  assert.deepEqual(filterRoshettas(LIST, 'chest motinorm'), []);
  assert.deepEqual(filterRoshettas(null, 'x'), []);
});

test('sort: recent first (ties by name), A to Z ignoring case, input untouched', () => {
  assert.deepEqual(sortRoshettas(LIST, 'recent').map(r => r.id), ['a', 'b', 'c', 'd', 'e']);
  assert.deepEqual(sortRoshettas(LIST, 'az').map(r => r.id), ['e', 'd', 'a', 'c', 'b']);
  assert.equal(LIST[0].id, 'a');
  const tie = [{ id: 'z', name: 'Zeta', updatedAt: at(2026, 10, 1) }, { id: 'y', name: 'Alpha', updatedAt: at(2026, 10, 1) }];
  assert.deepEqual(sortRoshettas(tie).map(r => r.id), ['y', 'z']);
});

test('group: Today, This week, Earlier by calendar day; letters with # for digits', () => {
  const g = groupRoshettas(LIST, 'recent', NOW);
  assert.deepEqual(g.map(x => x.label), ['Today', 'This week', 'Earlier']);
  assert.deepEqual(g.map(x => x.items.map(r => r.id)), [['a'], ['b', 'c'], ['d', 'e']]);
  const az = groupRoshettas(LIST, 'az', NOW);
  assert.deepEqual(az.map(x => x.label), ['#', 'A', 'C', 'M', 'P']);
  assert.deepEqual(groupRoshettas([], 'recent', NOW), []);
});

test('meta line', () => {
  assert.equal(listMeta({ count: 40, cap: 100 }), '40 of 100 roshettas');
  assert.equal(listMeta({ count: 3, cap: 3 }), '3 of 3 roshettas');
  assert.equal(listMeta({ count: 1, cap: 1 }), '1 of 1 roshetta');
  assert.equal(listMeta({ count: -4, cap: 3 }), '0 of 3 roshettas');
});
