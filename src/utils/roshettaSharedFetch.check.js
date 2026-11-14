// Checks for roshettaSharedFetch.js (step 6.2a). Run with: node --test src/utils/roshettaSharedFetch.check.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { MIN_CODE_LENGTH, mapSharedRoshetta, loadSharedRoshetta } from './roshettaSharedFetch.js';

const CODE = 'k'.repeat(64);
const drug = { row_type: 'drug', id: 'd1', drug_name: 'Panadol', dose: '500 mg' };
const text = { row_type: 'plain_text', id: 't1', content: 'Review in 48 hours' };

// Runs loadSharedRoshetta with a fake rpc and records what it was asked.
async function run(code, { reply = { data: { name: 'Chest pain', description: 'd', rows: [drug, text] }, error: null }, online = true, throws = false, slow = false } = {}) {
  const asked = [];
  const result = await loadSharedRoshetta(code, {
    rpc: (fn, args) => { asked.push([fn, args]); if (throws) return Promise.reject(new Error('x')); return slow ? new Promise(() => {}) : Promise.resolve(reply); },
    isOnline: () => online,
    timeLimitMs: 30,
  });
  return { result, asked };
}

test('a good code: name, description and rows come back, asked through get_shared_roshetta with the code as given', async () => {
  const { result, asked } = await run(CODE);
  assert.deepEqual(result, { status: 'ok', roshetta: { name: 'Chest pain', description: 'd', rows: [drug, text] } });
  assert.deepEqual(asked, [['get_shared_roshetta', { p_code: CODE }]]);
});

test('a short, empty or non-text code is unavailable and the database is never asked', async () => {
  for (const c of ['', '   ', 'abc', 'k'.repeat(MIN_CODE_LENGTH - 1), null, undefined, 42]) {
    const { result, asked } = await run(c);
    assert.deepEqual(result, { status: 'unavailable' }, String(c));
    assert.equal(asked.length, 0, String(c));
  }
  assert.equal((await run('k'.repeat(MIN_CODE_LENGTH))).result.status, 'ok');
});

test('the code is trimmed before it is asked', async () => {
  const { asked } = await run(`  ${CODE}\n`);
  assert.equal(asked[0][1].p_code, CODE);
});

test('a wrong or stopped code (the database says nothing) is unavailable, the same answer for both', async () => {
  for (const data of [null, undefined, 'x', 7, [], {}, { name: 5 }]) {
    assert.deepEqual((await run(CODE, { reply: { data, error: null } })).result, { status: 'unavailable' }, JSON.stringify(data));
  }
});

test('no connection: offline without asking; a silent database counts as offline; a failure is an error', async () => {
  const off = await run(CODE, { online: false });
  assert.deepEqual(off.result, { status: 'offline' });
  assert.equal(off.asked.length, 0);
  assert.deepEqual((await run(CODE, { slow: true })).result, { status: 'offline' });
  assert.deepEqual((await run(CODE, { reply: { data: null, error: { code: 'XX000' } } })).result, { status: 'error' });
  assert.deepEqual((await run(CODE, { throws: true })).result, { status: 'error' });
  // an error that arrives while the phone is offline reads as offline
  const asked = [];
  const r = await loadSharedRoshetta(CODE, { rpc: () => { asked.push(1); return Promise.resolve({ data: null, error: { code: 'XX000' } }); }, isOnline: (() => { let n = 0; return () => (n++ === 0); })(), timeLimitMs: 30 });
  assert.deepEqual(r, { status: 'offline' });
});

test('only drug and text rows are kept; anything else (a free_text row would be drawn as HTML) is dropped, order kept', () => {
  const bad = [{ row_type: 'free_text', content: '<img src=x onerror=alert(1)>' }, { row_type: 'section' }, null, 'x', 3, {}];
  const m = mapSharedRoshetta({ name: 'N', description: null, rows: [bad[0], drug, bad[1], bad[2], text, bad[3], bad[4], bad[5]] });
  assert.deepEqual(m.rows, [drug, text]);
  assert.equal(m.description, '');
});

test('rows that are not a list become an empty list; only name, description and rows are passed on', () => {
  assert.deepEqual(mapSharedRoshetta({ name: 'N', description: 'd', rows: 'x', owner: 'u1', user_id: 'u1' }), { name: 'N', description: 'd', rows: [] });
});
