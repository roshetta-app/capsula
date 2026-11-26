// Checks for "Already saved" (Phase L step 13.7): a saved copy remembers the link it came from,
// so the same link shows "Already in your ... / View" instead of a second Save.
// Run with: node --test src/utils/alreadySaved.check.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { mapRoshettaRow, ROSHETTA_COLUMNS } from './roshettaLoad.js';
import { prepareCreate, prepareSave } from './roshettaEdit.js';
import { applyChange, addChange, makeChange } from './roshettaChanges.js';
import { sendChange } from './roshettaSync.js';
import { copyFields } from './roshettaSaveCopy.js';
import { findSavedCopy, sharedBarState } from './shareCredit.js';

const CODE = 'a'.repeat(64);
const T = '2026-11-21T10:00:00.000Z';
const NOW = () => '2026-11-21T12:00:00.000Z';
const txt = (s) => [{ row_type: 'plain_text', content: s }];
const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

function server() {
  const s = { sent: [] };
  s.client = { from() {
    let op, payload;
    const b = {
      insert(p) { op = 'insert'; payload = p; return b; },
      update(p) { op = 'update'; payload = p; return b; },
      select() { return b; }, eq() { return b; },
      then(res, rej) {
        return Promise.resolve().then(() => {
          s.sent.push([op, payload]);
          return op === 'insert' ? { data: null, error: null, status: 201 } : { data: [{ id: 'r1' }], error: null, status: 200 };
        }).then(res, rej);
      },
    };
    return b;
  } };
  return s;
}

// ── roshettas: loading ──
test('roshetta load: source_code is read and mapped, anything else is none', () => {
  assert.ok(ROSHETTA_COLUMNS.split(',').map(c => c.trim()).includes('source_code'));
  const row = { id: 'r1', name: 'A', rows: [], created_at: T, updated_at: T };
  assert.equal(mapRoshettaRow({ ...row, source_code: CODE }).sourceCode, CODE);
  for (const v of [null, undefined, '', 5, {}]) assert.equal(mapRoshettaRow({ ...row, source_code: v }).sourceCode, null, String(v));
});

// ── roshettas: making the copy ──
test('prepareCreate carries the source code on the create only when given', () => {
  const withIt = prepareCreate({ name: 'A', sourceCode: CODE }, { makeId: () => 'i', now: NOW });
  assert.equal(withIt.change.data.sourceCode, CODE);
  const without = prepareCreate({ name: 'A' }, { makeId: () => 'i', now: NOW });
  assert.equal('sourceCode' in without.change.data, false);
});

test('prepareCreate refuses a source code that cannot be a share code', () => {
  for (const bad of [5, {}, '', '   ', 'short', 'x'.repeat(129)]) {
    const r = prepareCreate({ name: 'A', sourceCode: bad });
    assert.deepEqual([r.ok, r.detail], [false, 'source_invalid'], String(bad));
  }
});

test('a save never carries or changes the source code (set once, at the create)', () => {
  const list = [{ id: 'r1', name: 'A', description: '', rows: txt('x'), sourceCode: CODE, createdAt: T, updatedAt: T }];
  const made = prepareSave(list, 'r1', { name: 'B', sourceCode: 'z'.repeat(64) });
  assert.equal('sourceCode' in made.change.data, false);
  const after = applyChange(list, made.change);
  assert.equal(after[0].sourceCode, CODE);
});

test('showing the create on screen keeps the source code', () => {
  const list = applyChange([], makeChange('create', 'r1', { name: 'A', description: '', rows: [], sourceCode: CODE, createdAt: T }));
  assert.equal(list[0].sourceCode, CODE);
  assert.equal(findSavedCopy(list, CODE)?.id, 'r1');
});

test('a save that joins a waiting create keeps its source code', () => {
  const create = makeChange('create', 'r1', { name: 'A', description: '', rows: [], sourceCode: CODE, createdAt: T });
  const save = makeChange('save', 'r1', { name: 'B', description: '', rows: txt('y') });
  const queue = addChange([create], save);
  assert.equal(queue.length, 1);
  assert.equal(queue[0].data.sourceCode, CODE);
  assert.equal(queue[0].data.name, 'B');
});

test('sending: create sends source_code only when it has one, a save never does', async () => {
  const s = server();
  await sendChange(s.client, makeChange('create', 'r1', { name: 'A', description: '', rows: [], createdAt: T }));
  assert.equal('source_code' in s.sent[0][1], false);
  await sendChange(s.client, makeChange('create', 'r2', { name: 'A', description: '', rows: [], sourceCode: CODE, createdAt: T }));
  assert.equal(s.sent[1][1].source_code, CODE);
  await sendChange(s.client, makeChange('save', 'r2', { name: 'A', description: '', rows: [], sourceCode: CODE }));
  assert.equal('source_code' in s.sent[2][1], false);
});

test('copyFields passes the trimmed link code, and nothing without one', () => {
  const r = { name: 'A', description: 'd', rows: [] };
  assert.equal(copyFields(r, `  ${CODE} `).sourceCode, CODE);
  for (const v of [undefined, null, '', '   ', 5]) assert.equal('sourceCode' in copyFields(r, v), false, String(v));
  assert.deepEqual(copyFields(r), { name: 'A', description: 'd', rows: [] });
});

// ── the bar ──
test('the bar says Already saved with View when a copy of this link exists', () => {
  const items = [{ id: 'x', sourceCode: 'other' }, { id: 'c1', sourceCode: CODE }];
  const saved = findSavedCopy(items, CODE);
  assert.equal(saved.id, 'c1');
  assert.deepEqual(sharedBarState({ kind: 'roshetta', savedId: saved.id }), { mode: 'saved', text: 'Already in your roshettas', button: 'View', targetId: 'c1' });
  assert.equal(sharedBarState({ kind: 'group', savedId: 'g1' }).text, 'Already in your groups');
  assert.equal(findSavedCopy(items, 'nothing'), null);
});

// ── groups and the two shared pages (read as text, as the other wiring checks do) ──
test('groups: the copy is saved with its source code, read back, and kept when restored', () => {
  const hook = read('../hooks/useDrugGroups.js');
  assert.match(hook, /sourceCode: typeof r\.source_code === 'string'/);
  // S11 (2026-11-26): the two group queries moved from the hook into src/lib/groupQueries.js, so they are read there.
  const queries = read('../lib/groupQueries.js');
  assert.match(queries, /GROUP_WITH_ITEMS = 'id, name, description, color, created_at, source_code, drug_group_items\(brand_id\)'/);
  assert.match(queries, /\.select\(GROUP_WITH_ITEMS\)\s*\.eq\('source_code', sourceCode\)/);
  assert.match(hook, /source_code: sourceCode/);
  assert.match(hook, /saveSharedGroup = useCallback\(async \(\{[^}]*sourceCode/);
  assert.match(queries, /\.select\('id, name, description, color, created_at, source_code'\)/);
});

test('both shared pages pass the link code when saving and show Already saved', () => {
  const g = read('../pages/SharedGroupScreen.jsx');
  assert.match(g, /sourceCode: code/);
  assert.match(g, /findSavedCopy\(groups, code\)/);
  assert.match(g, /savedId/);
  const r = read('../pages/SharedRoshettaScreen.jsx');
  assert.match(r, /copyFields\(result\.roshetta, code\)/);
  assert.match(r, /findSavedCopy\(roshettas, code\)/);
  assert.match(r, /savedId/);
});
