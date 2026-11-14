// Checks for roshettaSharedPageState.js (step 6.2b). Run with: node --test src/utils/roshettaSharedPageState.check.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { sharedPageState, sharedProblemText } from './roshettaSharedPageState.js';

test('shared page: each fetch answer maps to one state', () => {
  assert.equal(sharedPageState({ status: 'loading' }), 'loading');
  assert.equal(sharedPageState(undefined), 'loading');
  assert.equal(sharedPageState({ status: 'unavailable' }), 'unavailable');
  assert.equal(sharedPageState({ status: 'offline' }), 'offline');
  assert.equal(sharedPageState({ status: 'error' }), 'error');
  assert.equal(sharedPageState({ status: 'ok', roshetta: { name: 'A', description: '', rows: [{ row_type: 'plain_text' }] } }), 'ready');
});

test('shared page: a roshetta with no rows is empty, and a missing rows list is empty, not a crash', () => {
  assert.equal(sharedPageState({ status: 'ok', roshetta: { name: 'A', description: '', rows: [] } }), 'empty');
  assert.equal(sharedPageState({ status: 'ok', roshetta: { name: 'A' } }), 'empty');
});

test('shared page: problem words, retry for offline and error, Open Capsula for an unavailable link', () => {
  assert.equal(sharedProblemText('offline').action, 'retry');
  assert.equal(sharedProblemText('error').action, 'retry');
  assert.equal(sharedProblemText('unavailable').action, 'open');
  assert.equal(sharedProblemText('unavailable').title, "This link isn't available");
  assert.match(sharedProblemText('error').title, /^Couldn't/);
});
