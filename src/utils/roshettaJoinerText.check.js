// Checks for roshettaJoinerText.js (step 5.1a). Run with: node --test src/utils/roshettaJoinerText.check.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { joinerChipInfo } from './roshettaJoinerText.js';

test('joiner chip: "and" is shown as plus, "or" as or, and the tap label names what it switches to', () => {
  assert.deepEqual(joinerChipInfo('or'), { word: 'or', isPlus: false, label: 'or. Tap to change to plus' });
  assert.deepEqual(joinerChipInfo('and'), { word: 'plus', isPlus: true, label: 'plus. Tap to change to or' });
});

test('joiner chip: anything else counts as or, as the viewer does', () => {
  for (const v of [undefined, null, '', 'plus', 'x', 3]) {
    assert.equal(joinerChipInfo(v).word, 'or', String(v));
  }
});
