// Checks for roshettaSectionState.js (step 4.1d). Run with: node --test src/utils/roshettaSectionState.check.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { sectionState, newTapAnswer, countLine, showArea } from './roshettaSectionState.js';

test('state: loading while the account or the list is loading, never for a guest list', () => {
  assert.equal(sectionState({ authLoading: true, isGuest: false, status: 'ready', count: 2 }), 'loading');
  assert.equal(sectionState({ authLoading: false, isGuest: false, status: 'loading', count: 0 }), 'loading');
  assert.equal(sectionState({ authLoading: false, isGuest: true, status: 'loading', count: 0 }), 'guest');
});

test('state: guest, error (only with nothing to show), empty, list', () => {
  assert.equal(sectionState({ isGuest: true, status: 'ready', count: 0 }), 'guest');
  assert.equal(sectionState({ status: 'error', count: 0 }), 'error');
  assert.equal(sectionState({ status: 'error', count: 2 }), 'list', 'a saved copy is still shown');
  assert.equal(sectionState({ status: 'ready', count: 0 }), 'empty');
  assert.equal(sectionState({ status: 'ready', count: 1 }), 'list');
});

test('New roshetta: guest, then read only, then limit, then open', () => {
  assert.equal(newTapAnswer({ isGuest: true, isReadOnly: true, canCreate: false }), 'signin');
  assert.equal(newTapAnswer({ isReadOnly: true, canCreate: false }), 'readonly');
  assert.equal(newTapAnswer({ isReadOnly: false, canCreate: false }), 'limit');
  assert.equal(newTapAnswer({ isReadOnly: false, canCreate: true }), 'open');
});

test('free count line: none for Pro or an empty list, "Full" at the cap', () => {
  assert.equal(countLine({ isPro: true, count: 5, cap: 100 }), '');
  assert.equal(countLine({ isPro: false, count: 0, cap: 3 }), '');
  assert.equal(countLine({ isPro: false, count: 1, cap: 3 }), '1 of 3 roshettas');
  assert.equal(countLine({ isPro: false, count: 3, cap: 3 }), '3 of 3 roshettas \u00b7 Full');
  assert.equal(countLine({ isPro: false, count: 4, cap: 3 }), '3 of 3 roshettas \u00b7 Full', 'a lapsed account over the limit');
});

test('the area shows on the Topics screen only with no search text and no specialty picked', () => {
  assert.equal(showArea({ isSearching: false, activeSpecialty: 'all' }), true);
  assert.equal(showArea({ isSearching: true, activeSpecialty: 'all' }), false);
  assert.equal(showArea({ isSearching: false, activeSpecialty: 'cardiology' }), false);
  assert.equal(showArea({ isSearching: true, activeSpecialty: 'cardiology' }), false);
  assert.equal(showArea(), true);
});
