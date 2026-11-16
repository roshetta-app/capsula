// Checks for the specialty on a roshetta through the data layer (Phase I step 10.4).
// Run with: node --test src/utils/roshettaSpecialtyData.check.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { mapRoshettaRow } from './roshettaLoad.js';
import { prepareCreate, prepareSave } from './roshettaEdit.js';
import { applyChange, makeChange } from './roshettaChanges.js';
import { sendChange } from './roshettaSync.js';
import { copyFields } from './roshettaSaveCopy.js';

const T = '2026-11-16T10:00:00.000Z';
const txt = (s) => [{ row_type: 'plain_text', content: s }];
const NOW = () => '2026-11-16T12:00:00.000Z';
const R = (extra = {}) => ({ id: 'r1', name: 'A', description: '', rows: txt('x'), createdAt: T, updatedAt: T, ...extra });

// A fake server: remembers what it was sent, refuses an unknown specialty like the real foreign key.
function server({ known = ['s1'] } = {}) {
  const s = { row: null, sent: [] };
  const fk = { data: null, error: { code: '23503', message: 'insert or update on table "roshettas" violates foreign key constraint "roshettas_specialty_id_fkey"' }, status: 409 };
  s.client = { from() {
    let op, payload;
    const b = {
      insert(p) { op = 'insert'; payload = p; return b; },
      update(p) { op = 'update'; payload = p; return b; },
      select() { return b; }, eq() { return b; },
      then(res, rej) {
        return Promise.resolve().then(() => {
          s.sent.push([op, payload]);
          if ('specialty_id' in payload && payload.specialty_id !== null && !known.includes(payload.specialty_id)) return fk;
          if (op === 'insert') { s.row = { ...payload }; return { data: null, error: null, status: 201 }; }
          s.row = { ...s.row, ...payload };
          return { data: [{ id: 'r1' }], error: null, status: 200 };
        }).then(res, rej);
      },
    };
    return b;
  } };
  return s;
}

// ── load ──
test('load: the specialty id comes through; none, empty or odd values become null', () => {
  const row = { id: 'a', name: 'N', description: '', rows: [], created_at: T, updated_at: T };
  assert.equal(mapRoshettaRow({ ...row, specialty_id: 's1' }).specialtyId, 's1');
  for (const v of [null, undefined, '', 5, {}]) assert.equal(mapRoshettaRow({ ...row, specialty_id: v }).specialtyId, null, String(v));
});

// ── create ──
test('create: the specialty rides on the change; left out, the change has none', () => {
  const withIt = prepareCreate({ name: 'A', specialtyId: 's1' }, { makeId: () => 'i', now: NOW });
  assert.deepEqual(withIt.change.data, { name: 'A', description: '', rows: [], specialtyId: 's1', createdAt: NOW() });
  const without = prepareCreate({ name: 'A' }, { makeId: () => 'i', now: NOW });
  assert.equal('specialtyId' in without.change.data, false);
  assert.equal(prepareCreate({ name: 'A', specialtyId: null }, { makeId: () => 'i', now: NOW }).change.data.specialtyId, null);
});

test('create and save refuse a specialty that is not text or null (or is far too long)', () => {
  for (const bad of [5, {}, '', 'x'.repeat(65), true]) {
    assert.deepEqual([prepareCreate({ name: 'A', specialtyId: bad }).ok, prepareCreate({ name: 'A', specialtyId: bad }).detail], [false, 'specialty_invalid'], String(bad));
    assert.equal(prepareSave([R()], 'r1', { specialtyId: bad }).ok, false, String(bad));
  }
});

// ── save ──
test('save: a left-out specialty keeps the current value; a given one replaces it; null clears it', () => {
  const list = [R({ specialtyId: 's1' })];
  assert.equal(prepareSave(list, 'r1', { name: 'B' }).change.data.specialtyId, 's1');
  assert.equal(prepareSave(list, 'r1', { specialtyId: 's2' }).change.data.specialtyId, 's2');
  assert.equal(prepareSave(list, 'r1', { specialtyId: null }).change.data.specialtyId, null);
});

test('save: an old copy with no specialty field sends none, so the server value is never wiped', () => {
  assert.equal('specialtyId' in prepareSave([R()], 'r1', { name: 'B' }).change.data, false);
});

// ── shown at once ──
test('shown at once: create and save put the specialty on the roshetta; a save without one keeps it', () => {
  const made = applyChange([], makeChange('create', 'r1', { name: 'A', description: '', rows: [], specialtyId: 's1', createdAt: T }));
  assert.equal(made[0].specialtyId, 's1');
  const kept = applyChange(made, makeChange('save', 'r1', { name: 'B', description: '', rows: [] }));
  assert.equal(kept[0].specialtyId, 's1');
  const cleared = applyChange(kept, makeChange('save', 'r1', { name: 'B', description: '', rows: [], specialtyId: null }));
  assert.equal(cleared[0].specialtyId, null);
});

// ── sending ──
test('sending: create and save send specialty_id only when the change carries one', async () => {
  const s = server();
  await sendChange(s.client, makeChange('create', 'r1', { name: 'A', description: '', rows: [], createdAt: T }));
  assert.equal('specialty_id' in s.sent[0][1], false);
  await sendChange(s.client, makeChange('save', 'r1', { name: 'A', description: '', rows: [], specialtyId: 's1' }));
  assert.equal(s.sent[1][1].specialty_id, 's1');
  await sendChange(s.client, makeChange('save', 'r1', { name: 'A', description: '', rows: [], specialtyId: null }));
  assert.equal(s.sent[2][1].specialty_id, null);
  assert.equal(s.row.specialty_id, null);
});

test('sending: a specialty an admin removed does not lose the roshetta: it is made without it', async () => {
  const s = server({ known: [] });
  const out = await sendChange(s.client, makeChange('create', 'r1', { name: 'A', description: '', rows: [], specialtyId: 'gone', createdAt: T }));
  assert.deepEqual(out, { status: 'done', counted: true });
  assert.equal(s.sent.length, 2);
  assert.equal('specialty_id' in s.row, false);
  assert.equal(s.row.name, 'A');
});

test('sending: the same for a save; the name and rows still go through', async () => {
  const s = server({ known: [] });
  const out = await sendChange(s.client, makeChange('save', 'r1', { name: 'New', description: '', rows: txt('n'), specialtyId: 'gone' }));
  assert.equal(out.status, 'done');
  assert.equal(s.row.name, 'New');
  assert.equal('specialty_id' in s.row, false);
});

test('sending: a different foreign key error is not mistaken for a removed specialty', async () => {
  const client = { from() { const b = { insert() { return b; }, then(res) { return Promise.resolve({ data: null, error: { code: '23503', message: 'violates foreign key constraint "roshettas_user_id_fkey"' }, status: 409 }).then(res); } }; return b; } };
  const out = await sendChange(client, makeChange('create', 'r1', { name: 'A', description: '', rows: [], specialtyId: 's1', createdAt: T }));
  assert.deepEqual(out, { status: 'refused', reason: 'error' });
});

// ── save a copy ──
test('save a copy: keeps the specialty of the shared roshetta; with none, the copy has none', () => {
  assert.deepEqual(copyFields({ name: 'A', description: 'd', rows: [], specialtyId: 's1' }), { name: 'A', description: 'd', rows: [], specialtyId: 's1' });
  for (const v of [undefined, null, '', 5]) assert.equal('specialtyId' in copyFields({ name: 'A', specialtyId: v }), false, String(v));
});
