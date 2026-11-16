// Checks for homeRoshettas.js (step 9.4). Run with: node --test src/utils/homeRoshettas.check.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { HOME_ROW_MAX, homeRowCards, showNewCard, limitLine, homeNotice, cardLabel } from './homeRoshettas.js';

test('homeRowCards: the first ten, in the given order, never changes the list', () => {
  const list = Array.from({ length: 14 }, (_, i) => ({ id: 'r' + i }));
  const cards = homeRowCards(list);
  assert.equal(HOME_ROW_MAX, 10);
  assert.equal(cards.length, 10);
  assert.equal(cards[0].id, 'r0');
  assert.equal(cards[9].id, 'r9');
  assert.equal(list.length, 14);
  assert.deepEqual(homeRowCards(undefined), []);
  assert.equal(homeRowCards([{ id: 'a' }]).length, 1);
});

test('showNewCard: only a list that can be changed gets the dashed New card', () => {
  assert.equal(showNewCard({ state: 'list', isReadOnly: false }), true);
  assert.equal(showNewCard({ state: 'list', isReadOnly: true }), false);
  for (const s of ['loading', 'guest', 'error', 'empty']) assert.equal(showNewCard({ state: s }), false);
  assert.equal(showNewCard(), true);
});

test('limitLine: only a full free account sees the line, with the real numbers', () => {
  assert.equal(limitLine({ isPro: false, count: 3, cap: 3, proCap: 100 }), '3 of 3 on the free plan. Upgrade to Pro for 100.');
  assert.equal(limitLine({ isPro: false, count: 2, cap: 3, proCap: 100 }), '');
  assert.equal(limitLine({ isPro: true, count: 3, cap: 100, proCap: 100 }), '');
  assert.equal(limitLine({ isPro: false, count: 5, cap: 5, proCap: 100 }), '5 of 5 on the free plan. Upgrade to Pro for 100.');
  assert.equal(limitLine(), '');
});

test('homeNotice: nothing waiting or refused means no notice; otherwise the existing wording', () => {
  assert.equal(homeNotice({ online: false, waitingCount: 0, failedCount: 0 }), null);
  assert.equal(homeNotice({ online: true, syncState: 'saved' }), null);
  assert.deepEqual(homeNotice({ online: false, waitingCount: 1 }), { tone: 'neutral', title: 'Offline. Changes are saved on this phone.' });
  assert.deepEqual(homeNotice({ online: true, waitingCount: 2 }), { tone: 'neutral', title: 'Changes are waiting to be saved.' });
  assert.deepEqual(homeNotice({ online: true, failedCount: 1 }), { tone: 'warning', title: "1 change couldn't be saved." });
});

test('cardLabel: name, summary and waiting, in that order', () => {
  assert.equal(cardLabel({ name: 'Chest pain' }, false, '3 drugs'), 'Chest pain, 3 drugs');
  assert.equal(cardLabel({ name: 'Chest pain' }, true, '3 drugs'), 'Chest pain, 3 drugs, waiting to save');
  assert.equal(cardLabel({ name: 'X' }), 'X');
  assert.equal(cardLabel(null), '');
});
