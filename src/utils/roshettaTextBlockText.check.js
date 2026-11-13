// Checks for roshettaTextBlockText.js (step 5.1b). Run with: node --test src/utils/roshettaTextBlockText.check.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { textBlockCounter, moveState, typedTextBlock } from './roshettaTextBlockText.js';

test('counter: counts as people count and shows the limit', () => {
  assert.equal(textBlockCounter(''), '0/1000');
  assert.equal(textBlockCounter('abc'), '3/1000');
  assert.equal(textBlockCounter('a\uD83D\uDE00b'), '3/1000', 'an emoji is one');
  assert.equal(textBlockCounter(undefined), '0/1000');
  assert.equal(textBlockCounter('x'.repeat(1000)), '1000/1000');
});

test('typedTextBlock: typing stops at the limit, never cuts an emoji, keeps line breaks', () => {
  assert.equal(typedTextBlock('hello\nworld'), 'hello\nworld');
  assert.equal(typedTextBlock('x'.repeat(1005)).length, 1000);
  const emojis = '\uD83D\uDE00'.repeat(1001);
  assert.equal(Array.from(typedTextBlock(emojis)).length, 1000);
  assert.equal(typedTextBlock(null), '');
});

test('moveState: first cannot go up, last cannot go down, a single card neither', () => {
  assert.deepEqual(moveState(0, 3), { canUp: false, canDown: true });
  assert.deepEqual(moveState(1, 3), { canUp: true, canDown: true });
  assert.deepEqual(moveState(2, 3), { canUp: true, canDown: false });
  assert.deepEqual(moveState(0, 1), { canUp: false, canDown: false });
  assert.deepEqual(moveState(undefined, undefined), { canUp: false, canDown: false });
});
