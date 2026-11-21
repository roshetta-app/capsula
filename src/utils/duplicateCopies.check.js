// Checks for step 13.8 (Phase L follow-up): one link makes one copy per person, even when two
// phones save at once, and the bar says when the copy has fewer drugs than the link.
// Run with: node --test src/utils/duplicateCopies.check.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { makeChange, addChange } from './roshettaChanges.js';
import * as rs from './roshettaSync.js';
import * as gs from './groupSync.js';
import { sharedBarState } from './shareCredit.js';
import { removeWithRetry } from './groupSaveCleanup.js';

const CODE = 'a'.repeat(64);
const NOW = '2026-11-21T12:00:00.000Z';
const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const dupRoshetta = { code: '23505', message: 'duplicate key value violates unique constraint "roshettas_user_source_unique"' };
const dupGroup = { code: '23505', message: 'duplicate key value violates unique constraint "drug_groups_user_source_unique"' };

// ── roshettas: the database refuses a second copy of one link ──
test('roshetta: a second copy of the same link is its own answer, not "already there"', () => {
  assert.deepEqual(rs.classifyError(dupRoshetta, 409), { kind: 'refused', reason: rs.REFUSAL.ALREADY_SAVED });
  assert.equal(rs.REFUSAL.ALREADY_SAVED, 'already_saved');
});

test('roshetta: the same id sent twice is still "already there"', () => {
  const pk = { code: '23505', message: 'duplicate key value violates unique constraint "roshettas_pkey"' };
  assert.deepEqual(rs.classifyError(pk, 409), { kind: 'exists' });
});

test('roshetta: a waiting create refused for a second copy is dropped with an event, the rest carry on', async () => {
  let queue = addChange(addChange([], makeChange('create', 'r1', { name: 'A', rows: [], createdAt: NOW, sourceCode: CODE })), makeChange('create', 'r2', { name: 'B', rows: [], createdAt: NOW }));
  const send = async (c) => (c.roshettaId === 'r1'
    ? { status: 'refused', reason: rs.REFUSAL.ALREADY_SAVED }
    : { status: 'done', counted: true });
  const out = await rs.runSync({
    getQueue: () => queue,
    update: async (fn) => { queue = fn(queue); },
    send, canRun: () => true,
  });
  assert.equal(out.failed, 0);
  assert.equal(out.sent, 1);
  assert.deepEqual(out.events.map(e => e.kind), ['already_saved']);
  assert.equal(queue.length, 0);
});

test('roshetta: the message says the link is already saved, and is not shown as a loss', () => {
  const d = rs.describeEvents([{ kind: 'already_saved', roshettaId: 'r1', name: 'Dr X list' }], 0);
  assert.equal(d.messages.length, 1);
  assert.match(d.messages[0], /already in your roshettas/i);
  assert.equal(d.severe, false);
  const mixed = rs.describeEvents([{ kind: 'already_saved', name: 'A' }, { kind: 'roshetta_gone', name: 'B' }], 0);
  assert.equal(mixed.severe, true);
});

// ── groups: the same two answers, and a restored group never fails over its link ──
test('group: a second copy of the same link is its own answer; name clash and same id keep theirs', () => {
  assert.deepEqual(gs.classifyError(dupGroup, 409), { kind: 'refused', reason: gs.REFUSAL.SOURCE_TAKEN });
  assert.equal(gs.isSourceClash(dupGroup), true);
  assert.equal(gs.isSourceClash({ code: '23505', message: 'violates unique constraint "drug_groups_user_name_unique"' }), false);
  assert.equal(gs.isSourceClash({ code: '23505', message: 'violates unique constraint "drug_groups_pkey"' }), false);
  assert.equal(gs.isSourceClash(null), false);
  assert.deepEqual(gs.classifyError({ code: '23505', message: 'violates unique constraint "drug_groups_user_name_unique"' }, 409), { kind: 'refused', reason: gs.REFUSAL.NAME_TAKEN });
  assert.deepEqual(gs.classifyError({ code: '23505', message: 'violates unique constraint "drug_groups_pkey"' }, 409), { kind: 'exists' });
});

test('group: a restored group whose link was saved again meanwhile is made without the link', async () => {
  const sent = [];
  const client = { from() {
    let payload;
    const b = {
      insert(p) { payload = p; return b; },
      then(res, rej) {
        return Promise.resolve().then(() => {
          sent.push(payload);
          return payload.source_code
            ? { data: null, error: dupGroup, status: 409 }
            : { data: null, error: null, status: 201 };
        }).then(res, rej);
      },
    };
    return b;
  } };
  const out = await gs.sendChange(client, { type: 'create', groupId: 'g1', data: { name: 'HPB', createdAt: NOW, sourceCode: CODE } });
  assert.equal(out.status, 'done');
  assert.equal(sent.length, 2);
  assert.equal(sent[0].source_code, CODE);
  assert.equal('source_code' in sent[1], false);
});

// ── the bar says when the copy is smaller than the link ──
test('bar: a copy with fewer drugs than the link says so; equal or more says nothing extra', () => {
  const base = { kind: 'roshetta', savedId: 'c1' };
  assert.equal(sharedBarState({ ...base, savedCount: 10, totalCount: 14 }).text, 'Already in your roshettas \u00b7 10 of 14 drugs');
  assert.equal(sharedBarState({ ...base, savedCount: 0, totalCount: 14 }).text, 'Already in your roshettas \u00b7 0 of 14 drugs');
  assert.equal(sharedBarState({ ...base, savedCount: 14, totalCount: 14 }).text, 'Already in your roshettas');
  assert.equal(sharedBarState({ ...base, savedCount: 20, totalCount: 14 }).text, 'Already in your roshettas');
  assert.equal(sharedBarState({ ...base }).text, 'Already in your roshettas');
  assert.equal(sharedBarState({ kind: 'group', savedId: 'g', savedCount: 3, totalCount: 5 }).text, 'Already in your groups \u00b7 3 of 5 drugs');
  assert.equal(sharedBarState({ ...base, savedCount: 'x', totalCount: 14 }).text, 'Already in your roshettas');
  // the owner bar and the Save state are untouched
  assert.equal(sharedBarState({ kind: 'group', isOwner: true, ownId: 'o', savedId: 'g', savedCount: 1, totalCount: 9 }).text, 'This is your group');
  assert.equal(sharedBarState({ kind: 'group', savedCount: 1, totalCount: 9 }).mode, 'save');
});

// ── a group copy cannot be left empty ──
test('cleanup: the delete of a half-made group is checked and tried again', async () => {
  let calls = 0;
  const ok = await removeWithRetry(async () => { calls += 1; return calls < 3 ? { error: { message: 'Failed to fetch' } } : { error: null }; }, 3, async () => {});
  assert.equal(ok, true);
  assert.equal(calls, 3);
  let n = 0;
  const bad = await removeWithRetry(async () => { n += 1; return { error: { message: 'Failed to fetch' } }; }, 3, async () => {});
  assert.equal(bad, false);
  assert.equal(n, 3);
  const thrown = await removeWithRetry(async () => { throw new Error('boom'); }, 2, async () => {});
  assert.equal(thrown, false);
});

// ── the screens and the hook (drawn code, read as text, as in 13.7) ──
test('group hook: a source clash answers already_saved and brings the existing copy into the list; cleanup is checked', () => {
  const src = read('../hooks/useDrugGroups.js');
  assert.match(src, /isSourceClash/);
  assert.match(src, /already_saved/);
  assert.match(src, /removeWithRetry/);
});

test('both shared pages hand the bar the two drug counts', () => {
  for (const f of ['../pages/SharedGroupScreen.jsx', '../pages/SharedRoshettaScreen.jsx']) {
    const src = read(f);
    assert.match(src, /savedCount:/, f);
    assert.match(src, /totalCount:/, f);
  }
});
