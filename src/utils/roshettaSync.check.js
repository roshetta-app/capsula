// Checks for roshettaSync.js (step 2.3b). Run with: node --test src/utils/roshettaSync.check.js
// A small fake server follows the live database rules (plan section 7, Stage 1):
// limits 3 / 10 (free), the refusal words, and the quiet "no row changed" answer
// of a read-only account on update.
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeChange, addChange, clearSending } from './roshettaChanges.js';
import { REFUSAL, classifyError, sendChange, runSync } from './roshettaSync.js';

const rows = (n, drugs = 0) => [
  ...Array.from({ length: drugs }, (_, i) => ({ row_type: 'drug', name: `d${i}` })),
  { row_type: 'plain_text', content: `t${n}` },
];
const NOW = '2026-11-13T09:00:00.000Z';
const mkCreate = (id, name = 'N', drugs = 0) => makeChange('create', id, { name, description: '', rows: rows(1, drugs), createdAt: NOW });
const mkSave = (id, name, drugs = 0) => makeChange('save', id, { name, description: 'd', rows: rows(2, drugs) });
const mkDel = (id) => makeChange('delete', id);

function fakeServer({ cap = 3, drugCap = 10 } = {}) {
  const s = { online: true, readOnly: false, rows: new Map(), log: [], cap, drugCap, throwOnce: false };
  const err = (message, code, status = 400) => ({ data: null, error: { message, code }, status });
  const countDrugs = r => r.filter(x => x.row_type === 'drug').length;
  s.client = {
    from(table) {
      assert.equal(table, 'roshettas');
      let op = null; let payload = null; let id = null; let wantRows = false;
      const b = {
        insert(p) { op = 'insert'; payload = p; return b; },
        update(p) { op = 'update'; payload = p; return b; },
        delete() { op = 'delete'; return b; },
        select() { if (!op) op = 'select'; wantRows = true; return b; },
        eq(_col, v) { id = v; return b; },
        then(resolve, reject) { return Promise.resolve().then(run).then(resolve, reject); },
      };
      function run() {
        if (s.throwOnce) { s.throwOnce = false; throw new TypeError('Failed to fetch'); }
        if (!s.online) return { data: null, error: { message: 'Failed to fetch' }, status: 0 };
        if (op === 'insert') {
          s.log.push(`insert:${payload.id}`);
          if (s.readOnly) return err('new row violates row-level security policy for table "roshettas"', '42501', 403);
          if (s.rows.has(payload.id)) return err('duplicate key value violates unique constraint "roshettas_pkey"', '23505', 409);
          if (s.rows.size >= s.cap) return err('roshetta_limit_reached', 'P0001');
          if (countDrugs(payload.rows) > s.drugCap) return err('roshetta_drug_limit_reached', 'P0001');
          s.rows.set(payload.id, { id: payload.id, ...payload });
          return { data: null, error: null, status: 201 };
        }
        if (op === 'update') {
          s.log.push(`update:${id}`);
          if (s.readOnly || !s.rows.has(id)) return { data: [], error: null, status: 200 };
          if (countDrugs(payload.rows) > s.drugCap) return err('roshetta_drug_limit_reached', 'P0001');
          s.rows.set(id, { ...s.rows.get(id), ...payload });
          return { data: [{ id }], error: null, status: 200 };
        }
        if (op === 'delete') {
          s.log.push(`delete:${id}`);
          s.rows.delete(id);
          return { data: null, error: null, status: 204 };
        }
        if (op === 'select') {
          s.log.push(`select:${id}`);
          return { data: s.rows.has(id) ? [{ id }] : [], error: null, status: 200 };
        }
        throw new Error('unexpected op');
      }
      void wantRows;
      return b;
    },
  };
  return s;
}

// A phone: holds the waiting list, saves it after every update, can be online or not.
function fakePhone(server, startQueue = []) {
  const p = { queue: startQueue, saved: 0, seenSending: false, online: true, sentCount: [] };
  p.update = async fn => { p.queue = fn(p.queue); p.saved += 1; if (p.queue.some(c => c.sending)) p.seenSending = true; };
  p.run = (extra = {}) => runSync({
    getQueue: () => p.queue,
    update: p.update,
    send: c => sendChange(server.client, c),
    canRun: () => p.online,
    onSent: c => p.sentCount.push(c.type),
    ...extra,
  });
  return p;
}

// ── classifyError ───────────────────────────────────────────────────────────

test('classifyError: no error is ok', () => {
  assert.deepEqual(classifyError(null), { kind: 'ok' });
});

test('classifyError: no connection, time out, sign-in hiccup and server errors are retried later', () => {
  assert.equal(classifyError({ message: 'Failed to fetch' }, 0).kind, 'retry');
  assert.equal(classifyError({ code: 'request_timeout' }).kind, 'retry');
  assert.equal(classifyError({ message: 'JWT expired' }, 401).kind, 'retry');
  assert.equal(classifyError({ code: 'PGRST301' }).kind, 'retry');
  assert.equal(classifyError({ message: 'boom' }, 503).kind, 'retry');
});

test('classifyError: a roshetta that is already there counts as done', () => {
  assert.equal(classifyError({ code: '23505', message: 'duplicate key' }, 409).kind, 'exists');
});

test('classifyError: the database refusal words', () => {
  assert.deepEqual(classifyError({ message: 'roshetta_limit_reached' }, 400), { kind: 'refused', reason: REFUSAL.ROSHETTA_LIMIT });
  assert.deepEqual(classifyError({ message: 'roshetta_drug_limit_reached' }, 400), { kind: 'refused', reason: REFUSAL.DRUG_LIMIT });
  assert.deepEqual(classifyError({ code: '42501', message: 'x' }, 403), { kind: 'refused', reason: REFUSAL.READ_ONLY });
  assert.deepEqual(classifyError({ message: 'violates row-level security policy' }, 403), { kind: 'refused', reason: REFUSAL.READ_ONLY });
});

test('classifyError: anything else is a plain error to keep for Retry or Discard', () => {
  assert.equal(classifyError({ code: '23514', message: 'roshettas_name_check' }, 400).reason, REFUSAL.ERROR);
  assert.equal(classifyError({ code: '23503', message: 'fkey' }, 409).reason, REFUSAL.ERROR);
  assert.equal(classifyError({ message: 'weird' }, 400).reason, REFUSAL.ERROR);
});

// ── sendChange ──────────────────────────────────────────────────────────────

test('sendChange create adds the row with the right columns, and counts as newly taken', async () => {
  const s = fakeServer();
  const out = await sendChange(s.client, mkCreate('r1', 'Chest pain', 2));
  assert.deepEqual(out, { status: 'done', counted: true });
  const row = s.rows.get('r1');
  assert.equal(row.name, 'Chest pain');
  assert.equal(row.created_at, NOW);
  assert.equal(row.description, '');
  assert.equal(row.rows.length, 3);
  assert.equal('user_id' in row, false);
});

test('sendChange create twice is not an error the second time and is not counted', async () => {
  const s = fakeServer();
  const c = mkCreate('r1');
  await sendChange(s.client, c);
  assert.deepEqual(await sendChange(s.client, c), { status: 'done', counted: false });
});

test('sendChange save replaces the whole roshetta on the server', async () => {
  const s = fakeServer();
  await sendChange(s.client, mkCreate('r1', 'A', 3));
  const out = await sendChange(s.client, mkSave('r1', 'B', 1));
  assert.deepEqual(out, { status: 'done', counted: false });
  assert.equal(s.rows.get('r1').name, 'B');
  assert.equal(s.rows.get('r1').rows.length, 2);
});

test('sendChange save of a roshetta the server no longer has is refused as gone', async () => {
  const s = fakeServer();
  assert.deepEqual(await sendChange(s.client, mkSave('zzz', 'B')), { status: 'refused', reason: REFUSAL.ROSHETTA_GONE });
});

test('sendChange save by a read-only account (no row changed, no error) is refused as read only, not gone', async () => {
  const s = fakeServer();
  await sendChange(s.client, mkCreate('r1'));
  s.readOnly = true;
  assert.deepEqual(await sendChange(s.client, mkSave('r1', 'B')), { status: 'refused', reason: REFUSAL.READ_ONLY });
});

test('sendChange save with no connection is retried later', async () => {
  const s = fakeServer();
  await sendChange(s.client, mkCreate('r1'));
  s.online = false;
  assert.deepEqual(await sendChange(s.client, mkSave('r1', 'B')), { status: 'retry' });
});

test('sendChange create over the roshetta limit and save over the drug limit are refused with their reason', async () => {
  const s = fakeServer({ cap: 1, drugCap: 2 });
  await sendChange(s.client, mkCreate('r1'));
  assert.deepEqual(await sendChange(s.client, mkCreate('r2')), { status: 'refused', reason: REFUSAL.ROSHETTA_LIMIT });
  assert.deepEqual(await sendChange(s.client, mkSave('r1', 'B', 3)), { status: 'refused', reason: REFUSAL.DRUG_LIMIT });
});

test('sendChange delete removes the row, and deleting what is not there counts as done', async () => {
  const s = fakeServer();
  await sendChange(s.client, mkCreate('r1'));
  assert.deepEqual(await sendChange(s.client, mkDel('r1')), { status: 'done', counted: false });
  assert.equal(s.rows.size, 0);
  assert.deepEqual(await sendChange(s.client, mkDel('r1')), { status: 'done', counted: false });
});

test('sendChange: a request that throws is retried later, an unknown change type is an error', async () => {
  const s = fakeServer();
  s.throwOnce = true;
  assert.deepEqual(await sendChange(s.client, mkCreate('r1')), { status: 'retry' });
  assert.deepEqual(await sendChange(s.client, makeChange('bogus', 'r1')), { status: 'refused', reason: REFUSAL.ERROR });
});

// ── runSync ─────────────────────────────────────────────────────────────────

test('offline create, save and delete are sent in order once online', async () => {
  const s = fakeServer({ cap: 10 });
  let q = [];
  q = addChange(q, mkCreate('r1', 'First'));
  q = addChange(q, mkCreate('r2', 'Second'));
  q = addChange(q, mkSave('r2', 'Second v2'));
  q = addChange(q, mkCreate('r3', 'Third'));
  q = addChange(q, mkDel('r3'));
  q = addChange(q, mkCreate('r4', 'Fourth'));
  const p = fakePhone(s, q);
  p.online = false;
  const blocked = await p.run();
  assert.equal(blocked.stopped, 'blocked');
  assert.equal(p.queue.length, 3);
  assert.deepEqual(s.log, []);
  p.online = true;
  const done = await p.run();
  assert.equal(done.stopped, 'empty');
  assert.equal(done.sent, 3);
  assert.deepEqual(s.log, ['insert:r1', 'insert:r2', 'insert:r4']);
  assert.equal(s.rows.get('r2').name, 'Second v2');
  assert.equal(p.queue.length, 0);
});

test('a roshetta made and deleted offline never reaches the server', async () => {
  const s = fakeServer();
  let q = addChange([], mkCreate('r1'));
  q = addChange(q, mkDel('r1'));
  const p = fakePhone(s, q);
  const out = await p.run();
  assert.equal(out.sent, 0);
  assert.deepEqual(s.log, []);
});

test('a change shows the sending mark while it is on its way, and the list is saved on the phone', async () => {
  const s = fakeServer();
  const p = fakePhone(s, addChange([], mkCreate('r1')));
  await p.run();
  assert.equal(p.seenSending, true);
  assert.ok(p.saved >= 2);
  assert.equal(p.queue.length, 0);
});

test('losing the connection mid-way stops sending, clears the mark and keeps the rest', async () => {
  const s = fakeServer({ cap: 10 });
  let q = addChange([], mkCreate('r1'));
  q = addChange(q, mkCreate('r2'));
  const p = fakePhone(s, q);
  const send = c => (c.roshettaId === 'r2' ? Promise.resolve({ status: 'retry' }) : sendChange(s.client, c));
  const out = await p.run({ send });
  assert.equal(out.stopped, 'retry');
  assert.equal(out.sent, 1);
  assert.equal(p.queue.length, 1);
  assert.equal(p.queue[0].roshettaId, 'r2');
  assert.equal(p.queue[0].sending, undefined);
});

test('a change left marked as sending by a closed app is sent again, and the server already having it is no error', async () => {
  const s = fakeServer();
  const c = mkCreate('r1');
  await sendChange(s.client, c); // the server took it, then the app was killed before the phone knew
  const p = fakePhone(s, clearSending([{ ...c, sending: true }]));
  const out = await p.run();
  assert.equal(out.sent, 1);
  assert.equal(out.failed, 0);
  assert.deepEqual(p.sentCount, []);
  assert.equal(p.queue.length, 0);
});

test('onSent is called once for a roshetta the server newly took, not for a save', async () => {
  const s = fakeServer();
  let q = addChange([], mkCreate('r1'));
  const p = fakePhone(s, q);
  await p.run();
  assert.deepEqual(p.sentCount, ['create']);
  p.queue = addChange(p.queue, mkSave('r1', 'B'));
  await p.run();
  assert.deepEqual(p.sentCount, ['create']);
});

test('a plain refusal is kept as failed; the same roshetta waits behind it, others carry on', async () => {
  const s = fakeServer({ cap: 10 });
  const bad = mkSave('r1', 'B');
  let q = [bad, mkCreate('r2')];
  const p = fakePhone(s, q);
  const send = c => (c.id === bad.id ? Promise.resolve({ status: 'refused', reason: REFUSAL.ERROR }) : sendChange(s.client, c));
  const out = await p.run({ send });
  assert.equal(out.failed, 1);
  assert.equal(out.sent, 1);
  assert.equal(p.queue.length, 1);
  assert.deepEqual(p.queue[0].failed, { reason: REFUSAL.ERROR });
  p.queue = addChange(p.queue, mkSave('r1', 'C'));
  const again = await p.run({ send });
  assert.equal(again.sent, 0);
  assert.equal(p.queue.length, 2);
});

test('a save for a roshetta deleted on another device drops everything waiting for it and tells the person', async () => {
  const s = fakeServer({ cap: 10 });
  let q = [mkSave('gone', 'B'), mkSave('gone', 'C'), mkCreate('r2')];
  const p = fakePhone(s, q);
  const out = await p.run({ roshettaName: () => 'Chest pain' });
  assert.equal(p.queue.length, 0);
  assert.deepEqual(out.events, [{ kind: 'roshetta_gone', roshettaId: 'gone', name: 'Chest pain' }]);
  assert.ok(s.rows.has('r2'));
});

test('a create over the roshetta limit is dropped with everything waiting for it', async () => {
  const s = fakeServer({ cap: 1 });
  let q = addChange([], mkCreate('r1'));
  q = addChange(q, mkCreate('r2', 'Two'));
  q = addChange(q, mkSave('r2', 'Two again'));
  const p = fakePhone(s, q);
  const out = await p.run();
  assert.equal(p.queue.length, 0);
  assert.equal(s.rows.size, 1);
  assert.equal(out.events.length, 1);
  assert.equal(out.events[0].kind, 'roshetta_limit');
  assert.equal(out.events[0].roshettaId, 'r2');
});

test('a save over the drug limit drops only that save; a later save still goes', async () => {
  const s = fakeServer({ drugCap: 2 });
  await sendChange(s.client, mkCreate('r1'));
  const tooBig = mkSave('r1', 'Big', 3);
  const p = fakePhone(s, [tooBig]);
  const out = await p.run();
  assert.equal(out.events[0].kind, 'drug_limit');
  assert.equal(p.queue.length, 0);
  p.queue = addChange(p.queue, mkSave('r1', 'Small', 1));
  const again = await p.run();
  assert.equal(again.sent, 1);
  assert.equal(s.rows.get('r1').name, 'Small');
});

test('a create over the drug limit is dropped with everything waiting for it', async () => {
  const s = fakeServer({ drugCap: 2 });
  let q = addChange([], mkCreate('r1', 'Big', 3));
  const p = fakePhone(s, q);
  const out = await p.run();
  assert.equal(out.events[0].kind, 'drug_limit');
  assert.equal(p.queue.length, 0);
  assert.equal(s.rows.size, 0);
});

test('a read-only account: waiting saves and creates are dropped, deletes are kept and sent', async () => {
  const s = fakeServer({ cap: 10 });
  await sendChange(s.client, mkCreate('old'));
  s.readOnly = true;
  let q = [mkSave('old', 'B'), mkCreate('new'), mkDel('old')];
  const p = fakePhone(s, q);
  // The delete is allowed for a read-only account in the live database: the fake lets it through.
  const out = await p.run();
  assert.equal(out.events[0].kind, 'read_only');
  assert.equal(s.rows.has('old'), false);
  assert.equal(s.rows.has('new'), false);
  assert.equal(p.queue.length, 0);
});

test('a refused delete is kept as failed, not treated as read only', async () => {
  const s = fakeServer();
  const d = mkDel('r1');
  const p = fakePhone(s, [d]);
  const out = await p.run({ send: () => Promise.resolve({ status: 'refused', reason: REFUSAL.READ_ONLY }) });
  assert.equal(out.failed, 1);
  assert.deepEqual(p.queue[0].failed, { reason: REFUSAL.READ_ONLY });
});

test('changes added while sending are picked up in the same run', async () => {
  const s = fakeServer({ cap: 10 });
  const p = fakePhone(s, addChange([], mkCreate('r1')));
  let added = false;
  const send = async c => {
    const out = await sendChange(s.client, c);
    if (!added) { added = true; p.queue = addChange(p.queue, mkCreate('r2')); }
    return out;
  };
  const out = await p.run({ send });
  assert.equal(out.sent, 2);
  assert.equal(p.queue.length, 0);
});

// ── Step 2.3c: the cases that broke last time ───────────────────────────────

test('reopening the app: a mark left by a closed app would block sending for ever, so it must be cleared first', async () => {
  const s = fakeServer();
  const stuck = { ...mkSave('r1', 'B'), sending: true };
  const blockedPhone = fakePhone(s, [stuck]);
  const out = await blockedPhone.run();
  assert.equal(out.sent, 0);
  assert.equal(blockedPhone.queue.length, 1);
});

test('reopening the app: after the mark is cleared the change is sent and the server has the content', async () => {
  const s = fakeServer();
  await sendChange(s.client, mkCreate('r1', 'A'));
  const saved = [{ ...mkSave('r1', 'B', 1), sending: true }]; // the list as the closed app left it
  const p = fakePhone(s, clearSending(saved));
  const out = await p.run();
  assert.equal(out.sent, 1);
  assert.equal(s.rows.get('r1').name, 'B');
  assert.equal(p.queue.length, 0);
});

test('reopening after the app was killed while a create was on its way: the create and the save behind it both go, in order', async () => {
  const s = fakeServer();
  const create = mkCreate('r1', 'A');
  await sendChange(s.client, create); // the server took it, the phone never heard
  const saved = [{ ...create, sending: true }, mkSave('r1', 'B', 1)];
  const p = fakePhone(s, clearSending(saved));
  const out = await p.run();
  assert.equal(out.sent, 2);
  assert.equal(out.failed, 0);
  assert.deepEqual(s.log.filter(x => !x.startsWith('select')), ['insert:r1', 'insert:r1', 'update:r1']);
  assert.equal(s.rows.get('r1').name, 'B');
  assert.deepEqual(p.sentCount, []);
});

test('reopening after the app was killed while a delete was on its way: the delete is sent again and is no error', async () => {
  const s = fakeServer();
  await sendChange(s.client, mkCreate('r1'));
  const del = mkDel('r1');
  await sendChange(s.client, del); // the server took it, the phone never heard
  const p = fakePhone(s, clearSending([{ ...del, sending: true }]));
  const out = await p.run();
  assert.equal(out.sent, 1);
  assert.equal(out.failed, 0);
  assert.equal(p.queue.length, 0);
});

test('last save wins on one phone: many offline saves are one request carrying the final content', async () => {
  const s = fakeServer();
  await sendChange(s.client, mkCreate('r1', 'A'));
  s.log.length = 0;
  let q = [];
  for (let i = 1; i <= 6; i += 1) q = addChange(q, mkSave('r1', `Version ${i}`, 1));
  assert.equal(q.length, 1);
  const p = fakePhone(s, q);
  await p.run();
  assert.deepEqual(s.log, ['update:r1']);
  assert.equal(s.rows.get('r1').name, 'Version 6');
});

test('last save wins on one phone: an edit made while the earlier save is on its way arrives after it', async () => {
  const s = fakeServer();
  await sendChange(s.client, mkCreate('r1', 'A'));
  const p = fakePhone(s, addChange([], mkSave('r1', 'First', 1)));
  let added = false;
  const send = async c => {
    if (!added) { added = true; p.queue = addChange(p.queue, mkSave('r1', 'Second', 1)); }
    return sendChange(s.client, c);
  };
  const out = await p.run({ send });
  assert.equal(out.sent, 2);
  assert.equal(s.rows.get('r1').name, 'Second');
});

test('last save wins across two phones: whichever save reaches the server last is what stays', async () => {
  const s = fakeServer();
  await sendChange(s.client, mkCreate('r1', 'Start'));
  const a = fakePhone(s, addChange([], mkSave('r1', 'From phone A', 1)));
  const b = fakePhone(s, addChange([], mkSave('r1', 'From phone B', 1)));
  await a.run();
  await b.run();
  assert.equal(s.rows.get('r1').name, 'From phone B');
  const s2 = fakeServer();
  await sendChange(s2.client, mkCreate('r1', 'Start'));
  const a2 = fakePhone(s2, addChange([], mkSave('r1', 'From phone A', 1)));
  const b2 = fakePhone(s2, addChange([], mkSave('r1', 'From phone B', 1)));
  await b2.run();
  await a2.run();
  assert.equal(s2.rows.get('r1').name, 'From phone A');
});

test('two phones: a roshetta deleted on one phone makes the other phone\'s later save drop, with a message', async () => {
  const s = fakeServer();
  await sendChange(s.client, mkCreate('r1', 'Start'));
  const a = fakePhone(s, addChange([], mkDel('r1')));
  const b = fakePhone(s, addChange([], mkSave('r1', 'Edited offline', 1)));
  await a.run();
  const out = await b.run();
  assert.equal(s.rows.has('r1'), false);
  assert.equal(b.queue.length, 0);
  assert.equal(out.events.length, 1);
  assert.equal(out.events[0].kind, 'roshetta_gone');
});

test('two phones: a save that reaches the server after another phone\'s delete does not bring the roshetta back', async () => {
  const s = fakeServer();
  await sendChange(s.client, mkCreate('r1', 'Start'));
  const b = fakePhone(s, addChange([], mkSave('r1', 'Edited', 1)));
  await sendChange(s.client, mkDel('r1'));
  await b.run();
  assert.equal(s.rows.size, 0);
});
