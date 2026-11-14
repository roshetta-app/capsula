// Checks for roshettaEditorState.js (step 5.3a). Run with: node --test src/utils/roshettaEditorState.check.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { editorState, editorHint, changeEntry, addTextRows, libraryIdSet } from './roshettaEditorState.js';

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
  assert.equal(editorHint(false), 'Add a drug or a text to start this roshetta.');
  assert.equal(editorHint(true), 'This roshetta is empty.');
  assert.equal(editorHint(), 'Add a drug or a text to start this roshetta.');
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
