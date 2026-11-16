// Checks for homeGroups.js (step 9.5). Run with: node --test src/utils/homeGroups.check.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { HOME_GROUPS_MAX, homeGroupCards, groupLimitLine, groupCountText, groupCardLabel } from './homeGroups.js';

const mk = (id, name, createdAt) => ({ id, name, createdAt });

test('homeGroupCards: newest first by default, the first ten, never changes the list', () => {
  const list = Array.from({ length: 14 }, (_, i) => mk('g' + i, 'G' + i, `2026-11-${String(i + 1).padStart(2, '0')}T10:00:00Z`));
  const copy = list.slice();
  const cards = homeGroupCards(list, 'newest');
  assert.equal(HOME_GROUPS_MAX, 10);
  assert.equal(cards.length, 10);
  assert.equal(cards[0].id, 'g13');
  assert.equal(cards[9].id, 'g4');
  assert.deepEqual(list, copy);
  assert.deepEqual(homeGroupCards(undefined), []);
  assert.equal(homeGroupCards([mk('a', 'A', '2026-01-01')]).length, 1);
});

test('homeGroupCards: A to Z follows the order the person chose, ignoring case', () => {
  const list = [mk('1', 'cardio', '2026-01-03'), mk('2', 'Ward', '2026-01-02'), mk('3', 'ayurvedic', '2026-01-01')];
  assert.deepEqual(homeGroupCards(list, 'az').map(g => g.id), ['3', '1', '2']);
  assert.deepEqual(homeGroupCards(list, 'newest').map(g => g.id), ['1', '2', '3']);
  assert.deepEqual(homeGroupCards(list, 'anything else').map(g => g.id), ['1', '2', '3']);
});

test('groupLimitLine: only a full free account sees the line, in the groups wording', () => {
  assert.equal(groupLimitLine({ isPro: false, count: 3, cap: 3 }), '3 of 3 groups \u00b7 Full');
  assert.equal(groupLimitLine({ isPro: false, count: 2, cap: 3 }), '');
  assert.equal(groupLimitLine({ isPro: true, count: 3, cap: 3 }), '');
  assert.equal(groupLimitLine(), '');
});

test('groupCountText: none, one, many', () => {
  assert.equal(groupCountText(0), 'No drugs yet');
  assert.equal(groupCountText(1), '1 drug');
  assert.equal(groupCountText(12), '12 drugs');
  assert.equal(groupCountText(undefined), 'No drugs yet');
});

test('groupCardLabel: name, count, then waiting', () => {
  assert.equal(groupCardLabel({ name: 'ICU', brandIds: ['a', 'b'] }, false), 'ICU, 2 drugs');
  assert.equal(groupCardLabel({ name: 'ICU', brandIds: ['a'] }, true), 'ICU, 1 drug, waiting to save');
  assert.equal(groupCardLabel({ name: 'Empty' }), 'Empty, No drugs yet');
  assert.equal(groupCardLabel(null), '');
});
