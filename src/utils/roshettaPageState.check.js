// Checks for roshettaPageState.js (step 4.2a). Run with: node --test src/utils/roshettaPageState.check.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { pageState, pageRoshetta } from './roshettaPageState.js';

test('page: loading while the account loads, or the list loads and this roshetta is not shown yet', () => {
  assert.equal(pageState({ authLoading: true, found: true, rowCount: 3 }), 'loading');
  assert.equal(pageState({ status: 'loading', found: false }), 'loading');
  assert.equal(pageState({ status: 'loading', found: true, rowCount: 2 }), 'ready', 'a saved copy shows at once');
  assert.equal(pageState({ isGuest: true, status: 'loading' }), 'guest', 'a guest never waits for a list');
});

test('page: guest, error (only with nothing to show), missing, empty, ready', () => {
  assert.equal(pageState({ isGuest: true, status: 'ready' }), 'guest');
  assert.equal(pageState({ status: 'error', found: false, listCount: 0 }), 'error');
  assert.equal(pageState({ status: 'error', found: false, listCount: 2 }), 'missing', 'other roshettas loaded, this one is gone');
  assert.equal(pageState({ status: 'error', found: true, rowCount: 1, listCount: 1 }), 'ready', 'a saved copy is still shown');
  assert.equal(pageState({ status: 'ready', found: false, listCount: 0 }), 'missing');
  assert.equal(pageState({ status: 'ready', found: true, rowCount: 0, listCount: 1 }), 'empty');
  assert.equal(pageState({ status: 'ready', found: true, rowCount: 4, listCount: 1 }), 'ready');
});

test('pageRoshetta: finds by id, nothing for a missing or blank id or a bad list', () => {
  const list = [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }];
  assert.equal(pageRoshetta(list, 'b').name, 'B');
  assert.equal(pageRoshetta(list, 'zzz'), null);
  assert.equal(pageRoshetta(list, ''), null);
  assert.equal(pageRoshetta(list, undefined), null);
  assert.equal(pageRoshetta(null, 'a'), null);
  assert.equal(pageRoshetta([null, { id: 'a' }], 'a').id, 'a');
});
