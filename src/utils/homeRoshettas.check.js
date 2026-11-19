// Checks for homeRoshettas.js (step 9.4). Run with: node --test src/utils/homeRoshettas.check.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { HOME_ROW_MAX, homeRowCards, showNewCard, newCardMode, limitLine, homeNotice, noticeKind, statusText, cardLabel } from './homeRoshettas.js';

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

test('showNewCard: only a list gets the dashed New card (dimmed when read only)', () => {
  assert.equal(showNewCard({ state: 'list', isReadOnly: false }), true);
  assert.equal(showNewCard({ state: 'list', isReadOnly: true }), true);
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

test('cardLabel: the specialty comes after the name, and is left out when there is none', () => {
  assert.equal(cardLabel({ name: 'Chest pain' }, false, '3 drugs', 'Cardiology'), 'Chest pain, Cardiology, 3 drugs');
  assert.equal(cardLabel({ name: 'Chest pain' }, true, '3 drugs', 'Cardiology'), 'Chest pain, Cardiology, 3 drugs, waiting to save');
  assert.equal(cardLabel({ name: 'Chest pain' }, false, '3 drugs', ''), 'Chest pain, 3 drugs');
  assert.equal(cardLabel({ name: 'Chest pain' }, false, '3 drugs', undefined), 'Chest pain, 3 drugs');
  assert.equal(cardLabel({ name: 'Chest pain' }, false, '', '   '), 'Chest pain');
});

test('noticeKind: the icon follows the same order as the wording', () => {
  assert.equal(noticeKind({ online: true }), '');
  assert.equal(noticeKind({ online: false, failedCount: 0, waitingCount: 0 }), '');
  assert.equal(noticeKind({ online: false, failedCount: 1, waitingCount: 2 }), 'failed');
  assert.equal(noticeKind({ online: false, waitingCount: 1 }), 'offline');
  assert.equal(noticeKind({ online: true, waitingCount: 1, syncState: 'syncing' }), 'syncing');
  assert.equal(noticeKind({ online: true, waitingCount: 1 }), 'waiting');
});

test('statusText: short plain words for every kind', () => {
  assert.equal(statusText('failed', 1), '1 change not saved');
  assert.equal(statusText('failed', 3), '3 changes not saved');
  assert.equal(statusText('offline'), 'Offline \u00b7 saved on this phone');
  assert.equal(statusText('syncing'), 'Saving\u2026');
  assert.equal(statusText('waiting'), 'Waiting to save');
  assert.equal(statusText('refresh'), "Couldn't refresh");
  assert.equal(statusText('saved'), 'All saved');
  assert.equal(statusText(''), '');
});

test('newCardMode: read only first, then the free limit, otherwise plain New', () => {
  assert.equal(newCardMode({ isReadOnly: true, atFreeCap: true }), 'readonly');
  assert.equal(newCardMode({ isReadOnly: true }), 'readonly');
  assert.equal(newCardMode({ atFreeCap: true }), 'locked');
  assert.equal(newCardMode({}), 'new');
  assert.equal(newCardMode(), 'new');
});
