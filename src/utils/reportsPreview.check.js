// Checks for the admin preview rules in reportsAdmin.js (step 14.9c-2). Run with: node --test src/utils/reportsPreview.check.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { parsePreview, loadPreview, PREVIEW_WORDS, previewStatusText } from './reportsAdmin.js';

const ID = '22222222-2222-2222-2222-222222222222';
const row = (kind = 'roshetta') => ({ kind, targetId: ID });
const online = () => true;
const deps = (reply, isOnline = online, calls = []) => ({
  rpc: async (fn, args) => { calls.push({ fn, args }); return typeof reply === 'function' ? reply() : reply; },
  isOnline, timeLimitMs: 50,
});

const roshetta = (over = {}) => ({
  kind: 'roshetta', name: ' Chest pain ', description: ' ED plan ', created_at: '2026-11-01T10:00:00Z', row_count: 4, truncated: false,
  rows: [
    { row_type: 'plain_text', content: '  Rest and fluids  ' },
    { row_type: 'drug', brand_name: 'Motinorm', concentration: '10mg', form: 'tablet', dose: '1 tab daily', note: 'after food', drug_note: null },
    { row_type: 'plain_text', content: '   ' },
    { row_type: 'drug', brand_name: '', dose: null },
    { row_type: 'mystery', content: 'Odd row' },
    { row_type: 'mystery' },
  ],
  ...over,
});

test('a roshetta keeps its text and drug rows in order, trimmed, and drops empty ones', () => {
  const p = parsePreview(roshetta());
  assert.equal(p.kind, 'roshetta');
  assert.equal(p.name, 'Chest pain');
  assert.equal(p.description, 'ED plan');
  assert.deepEqual(p.items.map(i => i.type), ['text', 'drug', 'text']);
  assert.equal(p.items[0].text, 'Rest and fluids');
  assert.equal(p.items[1].title, 'Motinorm');
  assert.equal(p.items[1].meta, '10mg \u00b7 tablet');
  assert.deepEqual(p.items[1].lines, ['Dose: 1 tab daily', 'Note: after food']);
  assert.equal(p.items[2].text, 'Odd row');
  assert.equal(p.count, 4);
  assert.equal(p.truncated, false);
});

test('a long roshetta says it is only showing the first part', () => {
  const p = parsePreview(roshetta({ row_count: 75, truncated: true }));
  assert.equal(p.truncated, true);
  assert.equal(p.count, 75);
});

test('a group keeps drug names, drops empty ones, and a profile keeps its bio', () => {
  const g = parsePreview({ kind: 'group', name: 'Insulins', description: null, created_at: null, drugs: [{ name: ' abasaglar ' }, { name: '' }, null, { name: 'Lantus' }], drug_count: 55, truncated: false });
  assert.deepEqual(g.drugs, ['abasaglar', 'Lantus']);
  assert.equal(g.count, 55);
  assert.equal(g.description, '');
  const pr = parsePreview({ kind: 'profile', name: 'Sara', handle: 'sara', bio: ' Hello ', created_at: '2026-11-01T10:00:00Z' });
  assert.equal(pr.bio, 'Hello');
  assert.equal(pr.handle, 'sara');
  assert.equal(parsePreview({ kind: 'profile', name: null, handle: null, bio: null }).bio, '');
});

test('anything that is not a well-formed preview is refused, and only text ever comes out', () => {
  for (const bad of [null, undefined, 'x', 5, [], {}, { kind: 'nope' }]) assert.equal(parsePreview(bad), null);
  const p = parsePreview(roshetta({ name: 42, rows: [{ row_type: 'plain_text', content: 7 }, { row_type: 'plain_text', content: '<b>hi</b>' }] }));
  assert.equal(p.name, '');
  assert.deepEqual(p.items.map(i => i.text), ['<b>hi</b>']);
  assert.equal(parsePreview(roshetta({ rows: 'x' })).items.length, 0);
});

test('loadPreview asks the database for exactly this item and returns the preview', async () => {
  const calls = [];
  const r = await loadPreview(row('group'), deps({ data: { kind: 'group', name: 'G', drugs: [], drug_count: 0 }, error: null }, online, calls));
  assert.equal(r.status, 'ok');
  assert.equal(r.preview.kind, 'group');
  assert.deepEqual(calls, [{ fn: 'admin_report_preview', args: { p_kind: 'group', p_id: ID } }]);
});

test('loadPreview turns every failure into a plain answer and never calls when offline', async () => {
  const calls = [];
  assert.equal((await loadPreview(row(), deps({ data: null, error: null }, () => false, calls))).status, 'offline');
  assert.equal(calls.length, 0);
  assert.equal((await loadPreview(row(), deps({ data: null, error: { message: 'forbidden' } }))).status, 'forbidden');
  assert.equal((await loadPreview(row(), deps({ data: null, error: { message: 'not_found' } }))).status, 'gone');
  assert.equal((await loadPreview(row(), deps({ data: null, error: { message: 'not_reported' } }))).status, 'not_reported');
  assert.equal((await loadPreview(row(), deps({ data: null, error: { message: 'boom' } }))).status, 'error');
  assert.equal((await loadPreview(row(), deps({ data: { kind: 'nope' }, error: null }))).status, 'error');
  assert.equal((await loadPreview(row(), deps(() => { throw new Error('x'); }))).status, 'error');
  assert.equal((await loadPreview({ kind: 'nope', targetId: ID }, deps({ data: null, error: null }, online, calls))).status, 'error');
  assert.equal(calls.length, 0);
});

test('every preview answer and word is one short plain line', () => {
  for (const s of ['forbidden', 'offline', 'gone', 'not_reported', 'error', 'whatever']) {
    const t = previewStatusText(s);
    assert.ok(typeof t === 'string' && t.length > 4 && t.length < 90, s);
  }
  for (const [k, v] of Object.entries(PREVIEW_WORDS)) {
    if (typeof v === 'function') { const t = v(60, 75); assert.ok(t.length > 4 && t.length < 90, k); }
    else assert.ok(v.length > 2 && v.length < 90, k);
  }
  assert.equal(PREVIEW_WORDS.more(60, 75), 'Showing the first 60 of 75');
});
