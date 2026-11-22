// Checks for legalText.js (step 14.10). Run with: node --test src/utils/legalText.check.js
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  LEGAL_UPDATED, OPERATOR_NAME, CONTACT_EMAIL, updatedLine, termsSections, privacySections,
  legalDocument, DELETE_ACCOUNT_WARNING,
} from './legalText.js';

const textOf = (sections) => sections.flatMap((s) => [s.title, ...s.paragraphs, ...(s.list ?? [])]);
const BAD = /<|>|\{|\}|\[\[|TODO|placeholder|undefined|null|lorem/i;

test('the date reads as a plain line and bad input is left alone', () => {
  assert.equal(updatedLine('2026-11-22'), 'Last updated 22 November 2026');
  assert.equal(updatedLine('2027-01-05'), 'Last updated 5 January 2027');
  assert.equal(updatedLine('soon'), 'soon');
  assert.equal(updatedLine('2026-13-01'), '2026-13-01');
  assert.match(LEGAL_UPDATED, /^\d{4}-\d{2}-\d{2}$/);
});

test('both documents have a title, a date and several sections, all plain words', () => {
  for (const kind of ['terms', 'privacy']) {
    const doc = legalDocument(kind);
    assert.ok(doc.title && /^Last updated /.test(doc.updated), kind);
    assert.ok(doc.sections.length >= 6, kind);
    for (const s of doc.sections) {
      assert.ok(s.title.trim().length > 0, `${kind}: a title`);
      assert.ok(s.paragraphs.length + (s.list?.length ?? 0) > 0, `${kind}: ${s.title} is not empty`);
    }
    for (const t of textOf(doc.sections)) {
      assert.equal(typeof t, 'string');
      assert.ok(t.trim().length > 0, `${kind}: empty line`);
      assert.doesNotMatch(t, BAD, `${kind}: "${t}"`);
    }
  }
  assert.equal(legalDocument('x'), null);
  assert.equal(legalDocument(undefined), null);
});

test('who runs Capsula and the contact line appear only when they are set; nothing is invented', () => {
  assert.equal(OPERATOR_NAME, '', 'not known yet: fill in legalText.js');
  assert.equal(CONTACT_EMAIL, '', 'not known yet: fill in legalText.js');
  const none = textOf(termsSections()).concat(textOf(privacySections())).join('\n');
  assert.doesNotMatch(none, /run by|contact us at/);
  const set = textOf(termsSections({ operator: 'Acme', email: 'hi@example.com' })).join('\n');
  assert.match(set, /Capsula is run by Acme\./);
  assert.match(set, /contact us at hi@example\.com\./);
  const onlyEmail = textOf(privacySections({ operator: '', email: 'hi@example.com' })).join('\n');
  assert.doesNotMatch(onlyEmail, /run by/);
  assert.match(onlyEmail, /hi@example\.com/);
});

test('the Terms say the things the app really does', () => {
  const t = textOf(termsSections()).join('\n');
  for (const must of [
    'not medical advice', 'Doses and text in a roshetta are written by you', 'patient names',
    'save their own copy', 'not checked', 'stops working for new visits at once',
    'keeps their copy', 'ask for one review', 'final', 'without telling you first',
    'Links you shared before public profiles existed',
  ]) assert.ok(t.includes(must), `Terms: ${must}`);
});

test('the Privacy text names what is kept and does not call usage records anonymous', () => {
  const p = textOf(privacySections()).join('\n');
  for (const must of [
    'email address', 'phone number', 'optional', 'device code', 'session code', 'Crash records',
    'Send me offers and deals', 'untick', 'reserved', 'Reports you sent', 'keep their copy',
    'scrambled code', 'cleared every night', 'run Capsula can see your account details',
  ]) assert.ok(p.includes(must), `Privacy: ${must}`);
  // The device and session codes stay on usage records after deletion, so these words would be untrue.
  assert.doesNotMatch(p + DELETE_ACCOUNT_WARNING, /anonymous|anonymi[sz]ed|no personal data/i);
});

test('the delete warning lists what goes and what stays, and still asks for DELETE', () => {
  for (const must of ['profile', 'roshettas', 'drug groups', 'favourites', 'notes', 'search history', 'recent views',
    'username stays reserved', 'Usage records stay', "can't be undone", 'DELETE']) {
    assert.ok(DELETE_ACCOUNT_WARNING.includes(must), `delete warning: ${must}`);
  }
});

test('the page-report lines say what the database really does with a report and its note (Track I, I6)', () => {
  const t = textOf(termsSections()).join('\n');
  for (const must of ['Topic or a drug page', 'never hides it', 'only reaches us', 'Do not put patient details']) {
    assert.ok(t.includes(must), `Terms: ${must}`);
  }
  const p = textOf(privacySections()).join('\n');
  for (const must of ['Notes on page reports', 'up to 300 letters', 'Only the people who run Capsula see it',
    'after the report is closed', 'after you delete your account, without your name', 'with any note you wrote, without your name']) {
    assert.ok(p.includes(must), `Privacy: ${must}`);
  }
  // No keeping time is decided yet for report notes, so the lines about reports and notes must not promise one.
  const reportLines = textOf(termsSections()).concat(textOf(privacySections())).filter((l) => /report|note/i.test(l)).join('\n');
  assert.doesNotMatch(reportLines, /deleted after|removed after|kept for \d|held for \d|within \d+ (days|months|years)/i);
});

test('the view count lines say what the database really does and make no promise it does not keep (Track H, H5)', () => {
  const t = textOf(termsSections()).join('\n');
  for (const must of ['approximate count of how many visitors opened it', 'counted once', 'does not show who visited']) {
    assert.ok(t.includes(must), `Terms: ${must}`);
  }
  const p = textOf(privacySections()).join('\n');
  for (const must of [
    'View counts:', 'as a number only', 'held for 90 days', 'one running total', 'Only the person who made the item sees them',
    'Your own visits while signed in are not counted', 'We count visits without knowing who visited', 'couple of seconds',
    'cannot be turned back into the address', 'not linked to any account', 'cleared every night',
    'Nothing about the count is saved on the visitor', 'approximate', 'one shared network', 'with their links and view counts',
  ]) assert.ok(p.includes(must), `Privacy: ${must}`);
  // Counting is not hidden: the old idea of no visitor tracking at all would now be untrue.
  assert.doesNotMatch(t + p, /no visitor tracking|never track|we do not track/i);
  // A count is not a list: nothing says or implies the owner can see who looked.
  assert.doesNotMatch(t + p, /who opened it|see who|who viewed|names of visitors/i);
});

test('the saved-copy lines say what the database really does and show owners a number only (Track H, H6c)', () => {
  const t = textOf(termsSections()).join('\n');
  for (const must of ['how many other people saved a copy from its link', 'does not show who saved it']) {
    assert.ok(t.includes(must), `Terms: ${must}`);
  }
  const p = textOf(privacySections()).join('\n');
  for (const must of [
    'Saved copies:', 'remembers which link it came from', 'cannot be saved twice by you',
    'only how many other people hold a copy, never who', 'you are no longer counted', 'how many people saved a copy',
  ]) assert.ok(p.includes(must), `Privacy: ${must}`);
  // A number is not a list: nothing says or implies the owner can learn who saved a copy.
  assert.doesNotMatch(t + p, /see who saved|who saved a copy of your|names of people who saved/i);
});
