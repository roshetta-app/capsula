// Checks for roshettaDetailsText.js (step 4.1b). Run with: node --test src/utils/roshettaDetailsText.check.js
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  countText, limitText, nameProblem, saveFailureMessage,
  specialtyRowText, detailsFields, SPECIALTY_NONE_TEXT,
} from './roshettaDetailsText.js';
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

test('specialty row words: the name, or None when there is no usable specialty', () => {
  assert.equal(SPECIALTY_NONE_TEXT, 'None');
  assert.equal(specialtyRowText({ id: 'a', name: ' Cardiology ' }), 'Cardiology');
  assert.equal(specialtyRowText(null), 'None');
  assert.equal(specialtyRowText(undefined), 'None');
  assert.equal(specialtyRowText({ id: 'a', name: '   ' }), 'None');
  assert.equal(specialtyRowText({ id: 'a' }), 'None');
});

test('a specialty left alone is not sent, so a rename never touches it', () => {
  const start = { name: 'A', description: '', specialtyId: 'sp-1' };
  assert.deepEqual(
    detailsFields({ name: ' B ', description: ' x ', specialtyId: 'sp-1', start }),
    { name: 'B', description: 'x' },
  );
  assert.equal('specialtyId' in detailsFields({ name: 'B', description: '', specialtyId: 'sp-1', start }), false);
  // a roshetta that opened with none, still none
  assert.equal('specialtyId' in detailsFields({ name: 'B', description: '', specialtyId: null, start: { specialtyId: null } }), false);
  assert.equal('specialtyId' in detailsFields({ name: 'B', description: '', specialtyId: '', start: { specialtyId: undefined } }), false);
});

test('a changed specialty is sent; clearing it sends null', () => {
  const start = { specialtyId: 'sp-1' };
  assert.equal(detailsFields({ name: 'B', description: '', specialtyId: 'sp-2', start }).specialtyId, 'sp-2');
  const cleared = detailsFields({ name: 'B', description: '', specialtyId: null, start });
  assert.equal(cleared.specialtyId, null);
  assert.equal('specialtyId' in cleared, true);
  // a new roshetta (opened with none) that picks one sends it
  assert.equal(detailsFields({ name: 'B', description: '', specialtyId: 'sp-3', start: { specialtyId: null } }).specialtyId, 'sp-3');
});

test('bad input never throws and sends nothing odd', () => {
  assert.deepEqual(detailsFields(), { name: '', description: '' });
  assert.deepEqual(detailsFields({ name: 5, description: null, specialtyId: 7, start: undefined }), { name: '', description: '' });
});
