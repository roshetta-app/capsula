// Checks for shareCredit.js (Phase L, step 13.2). Run with: node --test src/utils/shareCredit.check.js
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  dayText, creditText, groupCreditLine, nameSwitchText, accountSwitchText,
  readOwner, readCredit, findSavedCopy, sharedBarState,
} from './shareCredit.js';

const NOW = new Date(2026, 10, 21, 9, 30); // Sat 21 Nov 2026
const at = (y, m, d) => new Date(y, m, d, 12).toISOString();

test('the day is a day only: "12 Nov", with the year for an earlier year, never "Today"', () => {
  assert.equal(dayText(at(2026, 10, 12), NOW), '12 Nov');
  assert.equal(dayText(at(2026, 10, 21), NOW), '21 Nov');
  assert.equal(dayText(at(2025, 11, 31), NOW), '31 Dec 2025');
  assert.equal(dayText(at(2026, 0, 1), NOW), '1 Jan');
});

test('an unreadable date gives nothing', () => {
  for (const bad of [undefined, null, '', 'not a date', {}]) assert.equal(dayText(bad, NOW), '', String(bad));
});

test('credit line: name and date, date only when anonymous, name only without a date', () => {
  const d = at(2026, 10, 12);
  assert.equal(creditText({ ownerName: 'Dr Sara', createdAt: d, now: NOW }), 'Created by Dr Sara \u00b7 12 Nov');
  assert.equal(creditText({ ownerName: null, createdAt: d, now: NOW }), 'Created 12 Nov');
  assert.equal(creditText({ ownerName: '   ', createdAt: d, now: NOW }), 'Created 12 Nov');
  assert.equal(creditText({ ownerName: 'Dr Sara', createdAt: undefined, now: NOW }), 'Created by Dr Sara');
  assert.equal(creditText({ ownerName: null, createdAt: 'x', now: NOW }), '');
  assert.equal(creditText(), '');
});

test('the credit line trims the name and keeps an Arabic name as it is', () => {
  assert.equal(creditText({ ownerName: '  Dr Sara ', createdAt: at(2026, 10, 12), now: NOW }), 'Created by Dr Sara \u00b7 12 Nov');
  assert.equal(creditText({ ownerName: 'د. سارة', createdAt: at(2025, 2, 3), now: NOW }), 'Created by د. سارة \u00b7 3 Mar 2025');
});

test('group line: the drug count follows, "1 drug" for one, nothing invented when unknown', () => {
  const d = at(2026, 10, 12);
  assert.equal(groupCreditLine({ ownerName: 'X', createdAt: d, count: 12, now: NOW }), 'Created by X \u00b7 12 Nov \u00b7 12 drugs');
  assert.equal(groupCreditLine({ ownerName: null, createdAt: d, count: 12, now: NOW }), 'Created 12 Nov \u00b7 12 drugs');
  assert.equal(groupCreditLine({ ownerName: null, createdAt: d, count: 1, now: NOW }), 'Created 12 Nov \u00b7 1 drug');
  assert.equal(groupCreditLine({ ownerName: null, createdAt: d, count: 0, now: NOW }), 'Created 12 Nov \u00b7 0 drugs');
  assert.equal(groupCreditLine({ ownerName: null, createdAt: d, now: NOW }), 'Created 12 Nov');
  assert.equal(groupCreditLine({ ownerName: null, createdAt: 'x', count: 3, now: NOW }), '3 drugs');
});

test('share sheet switch words: on, off, and no name in the profile', () => {
  assert.deepEqual(nameSwitchText({ fullName: 'Gh', on: true }),
    { title: 'Show my name', line: 'Created by Gh', prefix: 'Created by ', name: 'Gh' });
  assert.deepEqual(nameSwitchText({ fullName: 'Gh', on: false }),
    { title: 'Show my name', line: 'Anonymous', prefix: '', name: '' });
  for (const none of ['', '  ', null, undefined]) {
    assert.deepEqual(nameSwitchText({ fullName: none, on: true }),
      { title: 'Show my name', line: 'Add your name in Account', prefix: '', name: '' }, String(none));
  }
});

test('Account switch words cover groups and roshettas', () => {
  assert.deepEqual(accountSwitchText({ hasName: true, on: true }), { title: 'Show my name on shared links', line: 'On by default' });
  assert.deepEqual(accountSwitchText({ hasName: true, on: false }), { title: 'Show my name on shared links', line: 'Off by default' });
  assert.equal(accountSwitchText({ hasName: false, on: true }).line, 'Add your name in Edit Profile first.');
});

test('owner: only a true flag with an id counts; everything else is a visitor', () => {
  assert.deepEqual(readOwner({ is_owner: true, own_id: 'abc' }), { isOwner: true, ownId: 'abc' });
  for (const raw of [null, undefined, {}, { is_owner: true }, { is_owner: true, own_id: '' }, { is_owner: 'true', own_id: 'abc' },
    { is_owner: false, own_id: 'abc' }, { own_id: 'abc' }, { is_owner: true, own_id: 7 }]) {
    assert.deepEqual(readOwner(raw), { isOwner: false, ownId: null }, JSON.stringify(raw));
  }
});

test('already saved: finds the copy that came from this link, never matches an empty code', () => {
  const items = [{ id: 'a', sourceCode: null }, { id: 'b', sourceCode: 'code-1' }, { id: 'c' }, null, { id: 'd', sourceCode: 'code-2' }];
  assert.equal(findSavedCopy(items, 'code-2').id, 'd');
  assert.equal(findSavedCopy(items, 'code-1').id, 'b');
  assert.equal(findSavedCopy(items, 'code-3'), null);
  assert.equal(findSavedCopy(items, ''), null);
  assert.equal(findSavedCopy(items, null), null);
  assert.equal(findSavedCopy(undefined, 'code-1'), null);
  assert.equal(findSavedCopy([{ id: 'x', sourceCode: '' }], ''), null);
});

test('bottom bar: owner first, then already saved, else the normal Save bar', () => {
  assert.deepEqual(sharedBarState({ kind: 'roshetta', isOwner: true, ownId: 'r1' }),
    { mode: 'owner', text: 'This is your roshetta', button: 'Open', targetId: 'r1' });
  assert.deepEqual(sharedBarState({ kind: 'group', isOwner: true, ownId: 'g1' }),
    { mode: 'owner', text: 'This is your group', button: 'Open', targetId: 'g1' });
  assert.deepEqual(sharedBarState({ kind: 'roshetta', isOwner: false, savedId: 'r2' }),
    { mode: 'saved', text: 'Already in your roshettas', button: 'View', targetId: 'r2' });
  assert.deepEqual(sharedBarState({ kind: 'group', savedId: 'g2' }),
    { mode: 'saved', text: 'Already in your groups', button: 'View', targetId: 'g2' });
  assert.equal(sharedBarState({ kind: 'group', isOwner: true, ownId: 'g1', savedId: 'g2' }).mode, 'owner', 'owner wins over saved');
  assert.equal(sharedBarState({ kind: 'group', isOwner: true, savedId: 'g2' }).mode, 'saved', 'a flag with no id is not an owner');
  assert.equal(sharedBarState({ kind: 'roshetta' }).mode, 'save');
  assert.equal(sharedBarState().mode, 'save');
});

test('reading the database answer: name, day and owner, with safe defaults', () => {
  const d = at(2026, 10, 12);
  assert.deepEqual(readCredit({ owner_name: ' Dr Sara ', created_at: d, is_owner: true, own_id: 'g1' }),
    { ownerName: 'Dr Sara', createdAt: d, isOwner: true, ownId: 'g1' });
  assert.deepEqual(readCredit({ owner_name: null, created_at: d }),
    { ownerName: null, createdAt: d, isOwner: false, ownId: null });
  assert.deepEqual(readCredit({ owner_name: '  ', created_at: 'garbage' }),
    { ownerName: null, createdAt: null, isOwner: false, ownId: null });
  for (const bad of [null, undefined, 'x', 5]) {
    assert.deepEqual(readCredit(bad), { ownerName: null, createdAt: null, isOwner: false, ownId: null }, String(bad));
  }
});
