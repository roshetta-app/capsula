import test from 'node:test';
import assert from 'node:assert/strict';
import { homeEntranceStyle, HOME_ENTRANCE_STAGGER_MS } from './homeEntrance.js';

test('homeEntranceStyle: nothing when off or done, so no leftover transform', () => {
  assert.deepEqual(homeEntranceStyle({ phase: 'off', stage: 2 }), {});
  assert.deepEqual(homeEntranceStyle({ phase: 'done', stage: 2 }), {});
  assert.deepEqual(homeEntranceStyle(), {});
});

test('homeEntranceStyle: hidden first, then in; each stage waits one step longer', () => {
  const hidden = homeEntranceStyle({ phase: 'hidden', stage: 1 });
  assert.equal(hidden.opacity, 0);
  assert.equal(hidden.transform, 'translateY(6px)');
  const shown = homeEntranceStyle({ phase: 'in', stage: 3 });
  assert.equal(shown.opacity, 1);
  assert.equal(shown.transform, 'translateY(0)');
  assert.ok(shown.transition.includes(`${3 * HOME_ENTRANCE_STAGGER_MS}ms`));
  assert.ok(homeEntranceStyle({ phase: 'in', stage: 0 }).transition.includes(' 0ms'));
});
