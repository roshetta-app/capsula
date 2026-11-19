import test from 'node:test';
import assert from 'node:assert/strict';
import { describeFailedRoshettaChange, discardMessage } from './roshettaFailedText.js';

test('describeFailedRoshettaChange: a title per kind of change, quoted name, plain reason', () => {
  const save = describeFailedRoshettaChange({ type: 'save', failed: { reason: 'error' } }, { roshettaName: 'Chest pain' });
  assert.equal(save.title, 'Changes to \u201cChest pain\u201d');
  assert.equal(save.reason, 'Something went wrong. Try again.');
  assert.equal(describeFailedRoshettaChange({ type: 'create', data: { name: 'Cough' } }).title, 'New roshetta \u201cCough\u201d');
  assert.equal(describeFailedRoshettaChange({ type: 'delete' }).title, 'Deleting a roshetta');
  assert.equal(describeFailedRoshettaChange({ type: 'save', failed: { reason: 'drug_limit' } }, { roshettaName: 'X' }).reason, 'Too many drugs for your plan.');
  assert.equal(describeFailedRoshettaChange({ type: 'save', failed: { reason: 'weird' } }, { roshettaName: '  ' }).title, 'Changes to a roshetta');
  assert.equal(describeFailedRoshettaChange(null).title, 'A change to a roshetta');
});

test('discardMessage: warns when a never-saved roshetta will go', () => {
  assert.match(discardMessage([{ type: 'save' }]), /go back to how they were last saved/);
  assert.doesNotMatch(discardMessage([{ type: 'save' }]), /never saved/);
  assert.match(discardMessage([{ type: 'create' }, { type: 'save' }]), /never saved/);
  assert.doesNotMatch(discardMessage(), /never saved/);
});
