// Checks for homeTaglines.js (Phase J step 11.1). Run with: node --test src/utils/homeTaglines.check.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { HOME_TAGLINES, nextTaglineIndex, TAGLINE_VISIBLE_MS, TAGLINE_FADE_MS } from './homeTaglines.js';

test('the three old Topics lines, in their old order', () => {
  assert.deepEqual([...HOME_TAGLINES], ['Treat With Confidence', 'Medicine At Your Fingertips', 'The Clinic In Your Pocket']);
});

test('the next line wraps round to the first', () => {
  assert.equal(nextTaglineIndex(0), 1);
  assert.equal(nextTaglineIndex(1), 2);
  assert.equal(nextTaglineIndex(2), 0);
});

test('a bad position or count starts again at the first line', () => {
  for (const bad of [-1, 3, 99, 1.5, NaN, null, undefined, '1']) assert.equal(nextTaglineIndex(bad), 0, String(bad));
  assert.equal(nextTaglineIndex(0, 0), 0);
  assert.equal(nextTaglineIndex(0, 'x'), 0);
});

test('each line stays long enough to read and the fade is shorter than that', () => {
  assert.ok(TAGLINE_VISIBLE_MS >= 5000 && TAGLINE_VISIBLE_MS <= 8000);
  assert.ok(TAGLINE_FADE_MS >= 300 && TAGLINE_FADE_MS < TAGLINE_VISIBLE_MS);
});
