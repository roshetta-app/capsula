// Checks for roshettaEditorState.js (step 5.3a). Run with: node --test src/utils/roshettaEditorState.check.js
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  editorState, editorHint, changeEntry, addTextRows, libraryIdSet,
  AUTOSAVE_DELAY_MS, saveAnswer, saveRefused, saveStatus,
  moveEntryById, deleteEntryById, deleteNeedsQuestion, deleteQuestion,
  barCounts, addRefusal, limitMessage,
} from './roshettaEditorState.js';

test('editorState: loading, guest, error and missing come first; no cards is empty, cards is ready', () => {
  assert.equal(editorState({ authLoading: true }), 'loading');
  assert.equal(editorState({ isGuest: true, status: 'ready' }), 'guest');
  assert.equal(editorState({ status: 'loading' }), 'loading');
  assert.equal(editorState({ status: 'error', listCount: 0 }), 'error');
  assert.equal(editorState({ status: 'ready', found: false, listCount: 2 }), 'missing');
  assert.equal(editorState({ status: 'ready', found: true, rowCount: 0 }), 'empty');
  assert.equal(editorState({ status: 'ready', found: true, rowCount: 3 }), 'ready');
});

test('editorHint: one plain line, a different one when the roshetta cannot be changed', () => {
  assert.equal(editorHint(false), 'Add a drug or some text to start this roshetta.');
  assert.equal(editorHint(true), 'This roshetta is empty.');
  assert.equal(editorHint(), 'Add a drug or some text to start this roshetta.');
});

test('changeEntry: replaces only the entry with that id, never changes the old list', () => {
  const rows = [{ id: 'a', content: '1' }, { id: 'b', content: '2' }];
  const out = changeEntry(rows, 'b', { id: 'b', content: 'x' });
  assert.deepEqual(out, [{ id: 'a', content: '1' }, { id: 'b', content: 'x' }]);
  assert.equal(out[0], rows[0]);
  assert.equal(rows[1].content, '2');
  assert.equal(changeEntry(rows, 'zzz', { id: 'zzz' }), rows);
  assert.deepEqual(changeEntry(undefined, 'a', {}), []);
});

test('addTextRows: one empty text block at the end', () => {
  const rows = [{ row_type: 'drug', id: 'd1' }];
  const out = addTextRows(rows);
  assert.equal(out.length, 2);
  assert.equal(out[0], rows[0]);
  assert.equal(out[1].row_type, 'plain_text');
  assert.equal(out[1].content, '');
  assert.ok(out[1].id);
  assert.equal(rows.length, 1);
  assert.equal(addTextRows(undefined).length, 1);
});

test('libraryIdSet: null while the library is not loaded, otherwise the brand ids', () => {
  assert.equal(libraryIdSet([{ id: 1 }], true), null);
  assert.equal(libraryIdSet(undefined, false), null);
  assert.equal(libraryIdSet([], false), null);
  const set = libraryIdSet([{ id: 1 }, { id: 'b' }, {}], false);
  assert.ok(set.has(1) && set.has('b'));
  assert.equal(set.size, 2);
});

test('AUTOSAVE_DELAY_MS: a short wait, long enough for a word to be typed', () => {
  assert.ok(AUTOSAVE_DELAY_MS >= 500 && AUTOSAVE_DELAY_MS <= 1500);
});

test('saveAnswer: reads the saving answer like the Add drug screen; only saved is not refused', () => {
  assert.equal(saveAnswer({ ok: true, queued: true }), 'saved');
  assert.equal(saveAnswer({ ok: false, reason: 'drug_limit' }), 'drugs_full');
  assert.equal(saveAnswer({ ok: false, reason: 'read_only' }), 'read_only');
  assert.equal(saveAnswer({ ok: false, reason: 'guest' }), 'sign_in');
  assert.equal(saveAnswer({ ok: false, reason: 'missing' }), 'gone');
  assert.equal(saveAnswer({ ok: false, reason: 'error' }), 'silent');
  assert.equal(saveAnswer({ ok: false, reason: 'invalid' }), 'failed');
  assert.equal(saveAnswer({ ok: false, reason: 'not_loaded' }), 'failed');
  assert.equal(saveAnswer(undefined), 'failed');
  assert.equal(saveRefused('saved'), false);
  for (const a of ['drugs_full', 'read_only', 'sign_in', 'gone', 'silent', 'failed']) assert.equal(saveRefused(a), true);
});

test('saveStatus: nothing to say until something is changed or waiting', () => {
  assert.equal(saveStatus({}), null);
  assert.equal(saveStatus(), null);
  assert.equal(saveStatus({ online: false }), null);
});

test('saveStatus: Saving while typing or while a save runs, then Saved', () => {
  assert.deepEqual(saveStatus({ touched: true, typing: true }), { word: 'Saving', tone: 'neutral' });
  assert.deepEqual(saveStatus({ touched: true, saving: true }), { word: 'Saving', tone: 'neutral' });
  assert.deepEqual(saveStatus({ touched: true }), { word: 'Saved', tone: 'neutral' });
});

test('saveStatus: a change that is on the phone but not sent says Waiting to save, Saving while it is sent', () => {
  assert.equal(saveStatus({ touched: true, waitingHere: true, online: false }).word, 'Waiting to save');
  assert.equal(saveStatus({ touched: true, waitingHere: true, online: true, syncState: 'idle' }).word, 'Saving', 'online: never says Waiting to save');
  assert.equal(saveStatus({ touched: true, waitingHere: true, online: true, syncState: 'syncing' }).word, 'Saving');
  assert.equal(saveStatus({ waitingHere: true, online: false }).word, 'Waiting to save');
  assert.equal(saveStatus({ touched: true, waitingHere: true, syncState: 'syncing', online: false }).word, 'Waiting to save');
});

test('saveStatus: a refused save or a failed change says Couldn\'t save and beats every other word', () => {
  const warn = { word: "Couldn't save", tone: 'warning' };
  assert.deepEqual(saveStatus({ touched: true, refused: true }), warn);
  assert.deepEqual(saveStatus({ failedHere: true }), warn);
  assert.deepEqual(saveStatus({ touched: true, typing: true, saving: true, waitingHere: true, refused: true }), warn);
});

test('moveEntryById: moves one place by id, never past the ends, never changes the old list', () => {
  const rows = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
  assert.deepEqual(moveEntryById(rows, 'b', 'up').map(r => r.id), ['b', 'a', 'c']);
  assert.deepEqual(moveEntryById(rows, 'b', 'down').map(r => r.id), ['a', 'c', 'b']);
  assert.deepEqual(moveEntryById(rows, 'a', 'up').map(r => r.id), ['a', 'b', 'c']);
  assert.deepEqual(moveEntryById(rows, 'c', 'down').map(r => r.id), ['a', 'b', 'c']);
  assert.equal(moveEntryById(rows, 'zzz', 'up'), rows);
  assert.deepEqual(rows.map(r => r.id), ['a', 'b', 'c']);
  assert.deepEqual(moveEntryById(undefined, 'a', 'up'), []);
});

test('deleteEntryById: removes only that entry; an unknown id changes nothing', () => {
  const rows = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
  assert.deepEqual(deleteEntryById(rows, 'b').map(r => r.id), ['a', 'c']);
  assert.deepEqual(deleteEntryById([{ id: 'a' }], 'a'), []);
  assert.equal(deleteEntryById(rows, 'zzz'), rows);
  assert.equal(rows.length, 3);
});

test('deleteNeedsQuestion: only a card with something typed asks first', () => {
  assert.equal(deleteNeedsQuestion({ row_type: 'drug', dose: '1 tab' }), true);
  assert.equal(deleteNeedsQuestion({ row_type: 'drug', dose: '  ' }), false);
  assert.equal(deleteNeedsQuestion({ row_type: 'drug', dose: null }), false);
  assert.equal(deleteNeedsQuestion({ row_type: 'plain_text', content: 'Take with food.' }), true);
  assert.equal(deleteNeedsQuestion({ row_type: 'plain_text', content: '' }), false);
  assert.equal(deleteNeedsQuestion(undefined), false);
});

test('deleteQuestion: plain words for a drug group and for a text', () => {
  assert.equal(deleteQuestion({ row_type: 'drug' }).title, 'Delete this drug group?');
  assert.equal(deleteQuestion({ row_type: 'plain_text' }).title, 'Delete this text?');
  assert.ok(deleteQuestion({ row_type: 'drug' }).message.length > 10);
});

const drugRow = (n, partners = 0) => ({ row_type: 'drug', id: 'd' + n, alternatives: Array.from({ length: partners }, () => ({})) });
const textRow = n => ({ row_type: 'plain_text', id: 't' + n, content: '' });

test('barCounts: counts every drug including partners, and whether each is full', () => {
  const rows = [drugRow(1, 2), drugRow(2), textRow(1)];
  assert.deepEqual(barCounts(rows, 10), { drugs: '4 of 10 drugs', texts: '1 of 10 text blocks', drugsFull: false, textsFull: false });
  assert.equal(barCounts([drugRow(1, 9)], 10).drugsFull, true);
  assert.equal(barCounts(Array.from({ length: 10 }, (_, i) => textRow(i)), 30).textsFull, true);
  assert.equal(barCounts([], 30).drugs, '0 of 30 drugs');
  assert.equal(barCounts(undefined, 10).texts, '0 of 10 text blocks');
});

test('addRefusal: drug limit, text limit and entry limit, each at the tap', () => {
  const full = [drugRow(1, 9)];
  assert.equal(addRefusal('drug', full, 10), 'drugs');
  assert.equal(addRefusal('partner', full, 10), 'drugs');
  assert.equal(addRefusal('drug', [drugRow(1, 8)], 10), null);
  assert.equal(addRefusal('partner', [drugRow(1, 8)], 10), null);
  const texts = Array.from({ length: 10 }, (_, i) => textRow(i));
  assert.equal(addRefusal('text', texts, 10), 'texts');
  assert.equal(addRefusal('text', texts.slice(1), 10), null);
  assert.equal(addRefusal('drug', texts, 10), null);
  const forty = [...Array.from({ length: 30 }, (_, i) => drugRow(i)), ...Array.from({ length: 10 }, (_, i) => textRow(i))];
  assert.equal(addRefusal('text', forty, 100), 'entries');
  assert.equal(addRefusal('drug', forty, 100), 'entries');
  assert.equal(addRefusal('partner', forty, 100), null);
  assert.equal(addRefusal('text', [], 10), null);
});

test('limitMessage: plain words for text blocks and entries only', () => {
  assert.equal(limitMessage('texts'), 'A roshetta can have up to 10 text blocks.');
  assert.equal(limitMessage('entries'), 'A roshetta can have up to 40 cards. Delete one to add another.');
  assert.equal(limitMessage('drugs'), null);
  assert.equal(limitMessage(null), null);
});
