// Checks for roshettaDetailsText.js (step 4.1b). Run with: node --test src/utils/roshettaDetailsText.check.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { countText, limitText, nameProblem, saveFailureMessage } from './roshettaDetailsText.js';
import { checkName } from './roshettaRows.js';

test('counting and cutting use characters as people count them (an emoji is one)', () => {
  assert.equal(countText('abc'), 3);
  assert.equal(countText('a💊b'), 3);
  assert.equal(countText('التهاب'), 6);
  assert.equal(countText(undefined), 0);
  assert.equal(limitText('abcdef', 4), 'abcd');
  assert.equal(limitText('abc', 4), 'abc');
  assert.equal(limitText('💊💊💊💊💊', 3), '💊💊💊', 'never cuts an emoji in half');
  assert.equal(limitText(null, 4), '');
});

test('a name cut to 40 characters always passes the real name rule; 41 does not', () => {
  const cut = limitText('x'.repeat(60), 40);
  assert.equal(countText(cut), 40);
  assert.equal(checkName(cut).ok, true);
  assert.equal(checkName('x'.repeat(41)).ok, false);
});

test('name problem: empty or blank asks for a name, anything else is fine', () => {
  assert.equal(nameProblem(''), 'Enter a roshetta name');
  assert.equal(nameProblem('   '), 'Enter a roshetta name');
  assert.equal(nameProblem(undefined), 'Enter a roshetta name');
  assert.equal(nameProblem(' Chest pain '), '');
});

test('refusal words: every reason has plain words, and the limit words follow the real limits', () => {
  for (const r of ['guest', 'not_loaded', 'read_only', 'limit', 'drug_limit', 'invalid', 'missing', 'error', 'something_else', undefined]) {
    assert.ok(saveFailureMessage(r, false).length > 10, String(r));
    assert.ok(saveFailureMessage(r, true).length > 10, String(r));
  }
  assert.match(saveFailureMessage('limit', false), /free limit of 3 roshettas/);
  assert.match(saveFailureMessage('limit', true), /limit of 100 roshettas/);
  assert.match(saveFailureMessage('drug_limit', false), /free limit of 10 drugs/);
  assert.match(saveFailureMessage('drug_limit', true), /limit of 30 drugs/);
  assert.equal(saveFailureMessage('weird', false), "Couldn't save your roshetta. Try again.");
});

test('a Pro account is never told about the free limit', () => {
  assert.doesNotMatch(saveFailureMessage('limit', true), /free/);
  assert.doesNotMatch(saveFailureMessage('drug_limit', true), /free|upgrade/);
  assert.doesNotMatch(saveFailureMessage('read_only', true).replace(/Delete a roshetta or upgrade to edit\./, ''), /free/);
});
