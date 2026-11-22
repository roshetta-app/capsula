// Checks for libraryReportRules.js (Track I, step I3). Run with: node --test src/utils/libraryReportRules.check.js
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  LIBRARY_REASONS, LIBRARY_REPORT_WORDS, NOTE_MAX, isLibraryKind, isLibraryReason, isUrgentReason, sortReasons,
  reasonLabel, sheetTitle, cleanNote, noteCounter, resultText, endsSheet, sendLibraryReport,
} from './libraryReportRules.js';

const online = () => true;
const ask = (reply, isOnline = online, calls = []) => ({
  rpc: async (fn, args) => { calls.push({ fn, args }); return typeof reply === 'function' ? reply() : reply; },
  isOnline,
  timeLimitMs: 50,
});

test('the reasons are exactly the six the database accepts for page kinds, dose first', () => {
  assert.deepEqual(LIBRARY_REASONS.map(r => r.key), ['wrong_dose', 'wrong_info', 'missing', 'typo', 'broken', 'other']);
  for (const r of LIBRARY_REASONS) assert.ok(r.label.length > 5, r.key);
  assert.equal(isLibraryReason('typo'), true);
  for (const bad of ['', 'x', null, undefined, 'WRONG_DOSE', 'medical', 'spam']) assert.equal(isLibraryReason(bad), false, String(bad));
  assert.deepEqual(['topic', 'brand', 'generic'].map(isLibraryKind), [true, true, true]);
  for (const bad of ['roshetta', 'group', 'profile', '', null]) assert.equal(isLibraryKind(bad), false, String(bad));
});

test('only a wrong dose is urgent, and urgent reasons sort first', () => {
  assert.equal(isUrgentReason('wrong_dose'), true);
  assert.equal(isUrgentReason('wrong_info'), false);
  assert.deepEqual(sortReasons(['typo', 'wrong_dose', 'missing', 'typo', 'nope']), ['wrong_dose', 'missing', 'typo']);
  assert.deepEqual(sortReasons(null), []);
  assert.equal(reasonLabel('broken'), 'Something is broken on this page');
  assert.equal(reasonLabel('nope'), '');
});

test('a good report calls report_library with kind, slug, reason and the cleaned note', async () => {
  const calls = [];
  const r = await sendLibraryReport('brand', '  panadol-500  ', 'wrong_dose', '  too high  ', ask({ data: 'ok', error: null }, online, calls));
  assert.deepEqual(r, { status: 'ok' });
  assert.deepEqual(calls, [{ fn: 'report_library', args: { p_kind: 'brand', p_slug: 'panadol-500', p_reason: 'wrong_dose', p_note: 'too high' } }]);
});

test('no note sends nothing for the note', async () => {
  for (const n of [undefined, null, '', '   \n ', 42]) {
    const calls = [];
    await sendLibraryReport('topic', 'asthma', 'missing', n, ask({ data: 'ok', error: null }, online, calls));
    assert.equal(calls[0].args.p_note, null, String(n));
  }
});

test('already reported is its own answer', async () => {
  assert.deepEqual(await sendLibraryReport('generic', 'paracetamol', 'other', '', ask({ data: 'already', error: null })), { status: 'already' });
});

test('bad input never reaches the database', async () => {
  const calls = [];
  for (const [k, s, r] of [['x', 'a', 'typo'], ['roshetta', 'a', 'typo'], ['topic', '', 'typo'], ['topic', '   ', 'typo'], ['topic', 'a', 'spam'], ['topic', 'a', 'nope'], ['topic', null, 'typo']]) {
    assert.deepEqual(await sendLibraryReport(k, s, r, '', ask({ data: 'ok', error: null }, online, calls)), { status: 'error' });
  }
  assert.equal(calls.length, 0);
});

test('the database refusals become plain answers', async () => {
  const err = (message, code) => ask({ data: null, error: { message, code } });
  const go = e => sendLibraryReport('topic', 'a', 'typo', '', e);
  assert.equal((await go(err('not_signed_in'))).status, 'signed_out');
  assert.equal((await go(err('x', '42501'))).status, 'signed_out');
  assert.equal((await go(err('report_cap'))).status, 'cap');
  assert.equal((await go(err('report_not_found'))).status, 'gone');
  assert.equal((await go(err('report_invalid'))).status, 'error');
  assert.equal((await go(err('boom'))).status, 'error');
  assert.equal((await go(err('x', 'request_timeout'))).status, 'offline');
});

test('offline, a thrown call and an odd answer are handled', async () => {
  const go = e => sendLibraryReport('topic', 'a', 'typo', '', e);
  assert.equal((await go(ask({ data: 'ok' }, () => false))).status, 'offline');
  assert.equal((await go({ rpc: () => { throw new Error('x'); }, isOnline: online })).status, 'error');
  assert.equal((await go(ask({ data: { status: 'ok' }, error: null }))).status, 'error');
  assert.equal((await go(ask({ data: null, error: { message: 'boom' } }, () => false))).status, 'offline');
});

test('the note: trimmed, cut at 300 letters, blank is nothing, nothing else changed', () => {
  assert.equal(NOTE_MAX, 300);
  assert.equal(cleanNote('  hello  '), 'hello');
  assert.equal(cleanNote(''), null);
  assert.equal(cleanNote('  \n\t '), null);
  assert.equal(cleanNote(undefined), null);
  assert.equal(cleanNote('a'.repeat(300)).length, 300);
  assert.equal(cleanNote('a'.repeat(301)).length, 300);
  assert.equal(cleanNote('a'.repeat(5000)), 'a'.repeat(300));
  // links, tags and new lines stay exactly as typed (drawn as plain text by the screen)
  const odd = 'see https://x.test <b>no</b>\nline two';
  assert.equal(cleanNote(odd), odd);
});

test('the note is cut by letters, never in the middle of an emoji or an Arabic letter pair', () => {
  const emoji = '😀'.repeat(301);
  const cut = cleanNote(emoji);
  assert.equal(Array.from(cut).length, 300);
  assert.equal(cut, '😀'.repeat(300));
  const arabic = 'جرعة'.repeat(100);
  assert.equal(Array.from(cleanNote(arabic)).length, 300);
});

test('the note counter counts letters and never goes below zero', () => {
  assert.deepEqual(noteCounter(''), { used: 0, left: 300, max: 300 });
  assert.deepEqual(noteCounter('abc'), { used: 3, left: 297, max: 300 });
  assert.deepEqual(noteCounter('😀😀'), { used: 2, left: 298, max: 300 });
  assert.deepEqual(noteCounter('a'.repeat(350)), { used: 350, left: 0, max: 300 });
  assert.deepEqual(noteCounter(null), { used: 0, left: 300, max: 300 });
});

test('the words: a line for every answer, titles by kind, and which answers end the sheet', () => {
  for (const s of ['ok', 'already', 'cap', 'gone', 'signed_out', 'offline', 'error', 'whatever']) assert.ok(resultText(s).length > 5, s);
  assert.equal(sheetTitle('topic'), 'Report a problem with this topic');
  assert.equal(sheetTitle('generic'), 'Report a problem with this drug');
  assert.equal(sheetTitle('brand'), 'Report a problem with this brand');
  assert.deepEqual(['ok', 'already', 'gone'].map(endsSheet), [true, true, true]);
  assert.deepEqual(['cap', 'offline', 'error', 'signed_out'].map(endsSheet), [false, false, false, false]);
});

test('the words never promise a time and never say who reported or that anything is hidden', () => {
  const all = [
    ...['ok', 'already', 'cap', 'gone', 'signed_out', 'offline', 'error'].map(resultText),
    ...Object.values(LIBRARY_REPORT_WORDS),
    ...LIBRARY_REASONS.map(r => r.label),
    ...['topic', 'brand', 'generic'].map(sheetTitle),
  ].join(' ');
  assert.equal(/\b(hours?|days?|minutes?|within|tomorrow)\b/i.test(all.replace('Try again tomorrow.', '')), false);
  assert.equal(/reporter|who reported|hidden|hide|removed/i.test(all), false);
});
