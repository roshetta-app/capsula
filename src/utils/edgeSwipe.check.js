import test from 'node:test';
import assert from 'node:assert/strict';
import { startsAtScreenEdge, EDGE_SWIPE_STRIP } from './edgeSwipe.js';

test('startsAtScreenEdge: a touch inside either edge strip belongs to the system swipe', () => {
  assert.equal(startsAtScreenEdge(0, 390), true);
  assert.equal(startsAtScreenEdge(EDGE_SWIPE_STRIP - 1, 390), true);
  assert.equal(startsAtScreenEdge(390, 390), true);
  assert.equal(startsAtScreenEdge(390 - EDGE_SWIPE_STRIP + 1, 390), true);
});

test('startsAtScreenEdge: a touch anywhere else is the screen\'s own', () => {
  assert.equal(startsAtScreenEdge(EDGE_SWIPE_STRIP, 390), false);
  assert.equal(startsAtScreenEdge(195, 390), false);
  assert.equal(startsAtScreenEdge(390 - EDGE_SWIPE_STRIP, 390), false);
});

test('startsAtScreenEdge: rubbish numbers are not an edge', () => {
  assert.equal(startsAtScreenEdge(NaN, 390), false);
  assert.equal(startsAtScreenEdge(10, 0), false);
  assert.equal(startsAtScreenEdge(undefined, 390), false);
});
