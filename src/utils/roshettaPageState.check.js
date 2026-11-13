// Checks for roshettaPageState.js (steps 4.2a and 4.2b). Run with: node --test src/utils/roshettaPageState.check.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { pageState, pageRoshetta, pageControls, deleteOutcome, shownRoshetta } from './roshettaPageState.js';

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

// ── Step 4.2b: controls, the delete answer, what the page draws while a delete runs ──

test('pageControls: the menu, the status line and the Edit and Share bar only while a roshetta is shown', () => {
  for (const s of ['ready', 'empty']) {
    assert.deepEqual(pageControls(s), { menu: true, statusLine: true, bar: true }, s);
  }
  for (const s of ['loading', 'guest', 'error', 'missing', 'anything else', undefined]) {
    assert.deepEqual(pageControls(s), { menu: false, statusLine: false, bar: false }, String(s));
  }
});

test('deleteOutcome: done when saved or queued, or already gone; anything else is a failure', () => {
  assert.equal(deleteOutcome({ ok: true, queued: true }), 'done');
  assert.equal(deleteOutcome({ ok: false, reason: 'missing' }), 'done', 'deleted on another device: same result');
  for (const reason of ['guest', 'not_loaded', 'error', 'read_only', 'something new']) {
    assert.equal(deleteOutcome({ ok: false, reason }), 'failed', reason);
  }
  assert.equal(deleteOutcome(undefined), 'failed');
  assert.equal(deleteOutcome(null), 'failed');
  assert.equal(deleteOutcome({}), 'failed');
});

test('shownRoshetta: the live roshetta, or the last copy only while a delete is going on', () => {
  const live = { id: 'a', name: 'Live' };
  const last = { id: 'a', name: 'Last' };
  assert.equal(shownRoshetta({ live, last, deleting: false }), live);
  assert.equal(shownRoshetta({ live, last, deleting: true }), live, 'live wins');
  assert.equal(shownRoshetta({ live: null, last, deleting: true }), last, 'a delete in progress never flashes "not available"');
  assert.equal(shownRoshetta({ live: null, last, deleting: false }), null, 'deleted elsewhere: really gone');
  assert.equal(shownRoshetta({ live: null, last: null, deleting: true }), null);
  assert.equal(shownRoshetta(), null);
});
