import test from 'node:test';
import assert from 'node:assert/strict';
import { newRowGate, claimRowSlot, rowDelayMs, rowFinishMs, ROW_STAGGER_MAX, ROW_WINDOW_MS } from './rowEntrance.js';

test('claimRowSlot: no gate means no animation', () => {
  assert.equal(claimRowSlot(null, 0), -1);
  assert.equal(claimRowSlot(undefined, 0), -1);
});

test('claimRowSlot: slots are given in order and stop at the maximum', () => {
  const gate = newRowGate();
  for (let i = 0; i < ROW_STAGGER_MAX; i += 1) assert.equal(claimRowSlot(gate, 1000), i);
  assert.equal(claimRowSlot(gate, 1000), -1);
  assert.equal(claimRowSlot(gate, 1001), -1);
});

test('claimRowSlot: the window opens at the first card, so a late first card still animates', () => {
  const gate = newRowGate();
  assert.equal(claimRowSlot(gate, 5000), 0);
  assert.equal(claimRowSlot(gate, 5000 + ROW_WINDOW_MS), 1);
});

test('claimRowSlot: a card that appears after the window never animates', () => {
  const gate = newRowGate();
  assert.equal(claimRowSlot(gate, 100), 0);
  assert.equal(claimRowSlot(gate, 100 + ROW_WINDOW_MS + 1), -1);
});

test('delays grow by one step per slot and the finish time follows the last fade', () => {
  assert.equal(rowDelayMs(0), 60);
  assert.equal(rowDelayMs(7), 270);
  assert.ok(rowFinishMs(7) > rowDelayMs(7) + 200);
});
