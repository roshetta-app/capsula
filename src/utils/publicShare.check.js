// Checks for publicShare.js (step 14.5a). Run with: node --test src/utils/publicShare.check.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { shareMode, itemRefusalReason, isItemRefusal, refusalText, canMakePublic, ITEM_TEXT_MESSAGE, COPY_NOTICE, MAKE_PRIVATE_MESSAGE } from './publicShare.js';

test('mode: no link is private, a link on the profile is public, any other link is old', () => {
  assert.equal(shareMode(null, false), 'private');
  assert.equal(shareMode(undefined, true), 'private');
  assert.equal(shareMode('', true), 'private');
  assert.equal(shareMode('c'.repeat(64), true), 'public');
  assert.equal(shareMode('c'.repeat(64), false), 'old');
  assert.equal(shareMode('c'.repeat(64), null), 'old');
  assert.equal(shareMode('c'.repeat(64), 'yes'), 'old');
});

test('refusal: item_web and item_phone are found in the database message, nothing else is', () => {
  assert.equal(itemRefusalReason({ message: 'item_web' }), 'item_web');
  assert.equal(itemRefusalReason({ message: 'ERROR: item_phone' }), 'item_phone');
  assert.equal(itemRefusalReason({ message: 'row-level security' }), null);
  assert.equal(itemRefusalReason(null), null);
  assert.equal(isItemRefusal('item_web'), true);
  assert.equal(isItemRefusal('offline'), false);
  assert.equal(refusalText('item_phone'), ITEM_TEXT_MESSAGE);
  assert.equal(refusalText('error'), null);
});

test('make public needs a username; unknown counts as no', () => {
  assert.equal(canMakePublic(true), true);
  assert.equal(canMakePublic(false), false);
  assert.equal(canMakePublic(null), false);
  assert.equal(canMakePublic(undefined), false);
});

test('the fixed words match the plan', () => {
  assert.equal(COPY_NOTICE, 'Anyone with the link can save and change their own copy.');
  assert.match(MAKE_PRIVATE_MESSAGE, /^The link stops working for new visits at once\./);
  assert.match(MAKE_PRIVATE_MESSAGE, /keeps their copy\.$/);
});
