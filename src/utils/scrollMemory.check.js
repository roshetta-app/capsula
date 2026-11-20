import test from 'node:test';
import assert from 'node:assert/strict';
import { rememberScroll, recalledScroll, clearScrollMemory, startPosition } from './scrollMemory.js';

test('startPosition: Back brings the kept place back', () => {
  assert.equal(startPosition('POP', 640), 640);
});

test('startPosition: a fresh open (PUSH or REPLACE) always starts at 0', () => {
  assert.equal(startPosition('PUSH', 640), 0);
  assert.equal(startPosition('REPLACE', 640), 0);
});

test('startPosition: Back with nothing kept, or rubbish kept, starts at 0', () => {
  assert.equal(startPosition('POP', undefined), 0);
  assert.equal(startPosition('POP', null), 0);
  assert.equal(startPosition('POP', NaN), 0);
  assert.equal(startPosition('POP', 0), 0);
});

test('startPosition: a negative place (sideways row in a right-to-left page) is kept as it is', () => {
  assert.equal(startPosition('POP', -320), -320);
});

test('rememberScroll / recalledScroll: each key keeps its own place; a new place replaces the old', () => {
  clearScrollMemory();
  rememberScroll('list:roshettas', 100);
  rememberScroll('list:groups', 250);
  rememberScroll('list:roshettas', 400);
  assert.equal(recalledScroll('list:roshettas'), 400);
  assert.equal(recalledScroll('list:groups'), 250);
  assert.equal(recalledScroll('list:other'), undefined);
});

test('rememberScroll: rubbish numbers and empty keys are ignored, a kept place is not wiped', () => {
  clearScrollMemory();
  rememberScroll('list:a', 90);
  rememberScroll('list:a', NaN);
  rememberScroll('list:a', undefined);
  rememberScroll(null, 50);
  assert.equal(recalledScroll('list:a'), 90);
  assert.equal(recalledScroll(null), undefined);
});

test('clearScrollMemory: forgets everything', () => {
  rememberScroll('list:a', 90);
  clearScrollMemory();
  assert.equal(recalledScroll('list:a'), undefined);
});
