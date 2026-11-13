// Checks for roshettaLimitText.js (step 4.1c). Run with: node --test src/utils/roshettaLimitText.check.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { limitSheetWords, notSavedLine } from './roshettaLimitText.js';
import {
  ROSHETTAS_CAP_FREE,
  ROSHETTAS_CAP_PRO,
  ROSHETTA_DRUGS_CAP_FREE,
  ROSHETTA_DRUGS_CAP_PRO,
} from '../constants/features.js';

const say = w => w.message.map(p => p.text).join('');

test('free account at the roshetta limit: count line, Pro bolded, upgrade wording', () => {
  const w = limitSheetWords('roshettas', false);
  assert.equal(w.headline, 'Roshetta limit reached');
  assert.equal(w.countLabel, `${ROSHETTAS_CAP_FREE} of ${ROSHETTAS_CAP_FREE} roshettas used`);
  assert.equal(say(w), `Free accounts can have ${ROSHETTAS_CAP_FREE} roshettas. Pro lets you add many more.`);
  assert.deepEqual(w.message.filter(p => p.strong).map(p => p.text), ['Pro']);
  assert.equal(w.dismissLabel, 'Not now');
});

test('Pro account at the roshetta limit: no count line, no mention of Pro or upgrading', () => {
  const w = limitSheetWords('roshettas', true);
  assert.equal(w.countLabel, undefined);
  assert.equal(say(w), "You've reached the most roshettas an account can have. Delete one to add another.");
  assert.ok(!/pro|upgrade/i.test(say(w)));
  assert.ok(!say(w).includes(String(ROSHETTAS_CAP_PRO)), 'the safety cap is never shown as a number');
});

test('drug limit: free and Pro numbers come from the real limits', () => {
  const free = limitSheetWords('drugs', false);
  assert.equal(free.headline, 'This roshetta is full');
  assert.equal(free.countLabel, `${ROSHETTA_DRUGS_CAP_FREE} of ${ROSHETTA_DRUGS_CAP_FREE} drugs used`);
  assert.equal(say(free), `Free accounts can have ${ROSHETTA_DRUGS_CAP_FREE} drugs in a roshetta. Pro lets you have up to ${ROSHETTA_DRUGS_CAP_PRO}.`);
  const pro = limitSheetWords('drugs', true);
  assert.equal(pro.countLabel, `${ROSHETTA_DRUGS_CAP_PRO} of ${ROSHETTA_DRUGS_CAP_PRO} drugs used`);
  assert.equal(say(pro), `A roshetta can hold up to ${ROSHETTA_DRUGS_CAP_PRO} drugs. Remove one to add another.`);
  assert.ok(!/upgrade/i.test(say(pro)));
});

test('read only: same words for free and Pro, no count line', () => {
  for (const isPro of [false, true]) {
    const w = limitSheetWords('readonly', isPro);
    assert.equal(w.headline, 'Your roshettas are read only');
    assert.equal(w.countLabel, undefined);
    assert.equal(say(w), 'Delete a roshetta or upgrade to Pro to edit them.');
  }
});

test('an unknown kind is treated as the roshetta limit, never as nothing', () => {
  assert.equal(limitSheetWords(undefined, false).headline, 'Roshetta limit reached');
  assert.equal(limitSheetWords('whatever', true).headline, 'Roshetta limit reached');
});

test('not saved line: none, one, two, three, and more than three', () => {
  assert.equal(notSavedLine([]), '');
  assert.equal(notSavedLine(undefined), '');
  assert.equal(notSavedLine(['Chest pain']), 'Not saved: Chest pain.');
  assert.equal(notSavedLine(['A', 'B']), 'Not saved: A and B.');
  assert.equal(notSavedLine(['A', 'B', 'C']), 'Not saved: A, B and C.');
  assert.equal(notSavedLine(['A', 'B', 'C', 'D']), 'Not saved: A, B, C and 1 more.');
  assert.equal(notSavedLine(['A', 'B', 'C', 'D', 'E', 'F']), 'Not saved: A, B, C and 3 more.');
});

test('not saved line leaves out blank and repeated names, and keeps names as typed', () => {
  assert.equal(notSavedLine(['', '  ', null, 7]), '');
  assert.equal(notSavedLine(['A', 'A', 'B']), 'Not saved: A and B.');
  assert.equal(notSavedLine(['<b>x</b> 💊']), 'Not saved: <b>x</b> 💊.');
});
