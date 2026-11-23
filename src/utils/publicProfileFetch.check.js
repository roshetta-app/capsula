// Checks for publicProfileFetch.js (step 14.6). Run with: node --test src/utils/publicProfileFetch.check.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { mapPublicProfile, loadPublicProfile, checkHandleAvailable } from './publicProfileFetch.js';

const CODE = 'k'.repeat(64);
const GOOD = {
  status: 'ok', handle: 'sara-two', name: 'Sara Ahmed', bio: 'hello', avatar_code: 'heart-rose', redirected: false, is_owner: false,
  user_id: 'secret', id: 'secret',
  roshettas: { total: 53, items: [{ name: 'Chest pain', drug_count: 2, created_at: '2026-11-01T10:00:00Z', share_code: CODE, user_id: 'x' }, { name: 'No code', share_code: '' }, null] },
  groups: { total: 1, items: [{ name: 'Antibiotics', drug_count: 4, created_at: '2026-10-01T10:00:00Z', share_code: CODE, color: 'blue' }] },
};

async function load(handle, { reply = { data: GOOD, error: null }, online = true, throws = false, slow = false } = {}) {
  const asked = [];
  const result = await loadPublicProfile(handle, {
    rpc: (fn, args) => { asked.push([fn, args]); if (throws) return Promise.reject(new Error('x')); return slow ? new Promise(() => {}) : Promise.resolve(reply); },
    isOnline: () => online,
    timeLimitMs: 30,
  });
  return { result, asked };
}

test('a good answer is mapped: only what the page shows, items without a code dropped, the true total kept', async () => {
  const { result, asked } = await load('  sara-two ');
  assert.deepEqual(asked, [['get_public_profile', { p_handle: 'sara-two' }]]);
  assert.equal(result.status, 'ok');
  const p = result.profile;
  assert.equal(p.handle, 'sara-two');
  assert.equal(p.name, 'Sara Ahmed');
  assert.equal(p.avatarCode, 'heart-rose');
  assert.equal(p.roshettas.total, 53);
  assert.deepEqual(p.roshettas.items, [{ name: 'Chest pain', drugCount: 2, createdAt: '2026-11-01T10:00:00Z', code: CODE, stars: null }]);
  assert.deepEqual(p.groups.items, [{ name: 'Antibiotics', drugCount: 4, createdAt: '2026-10-01T10:00:00Z', code: CODE, stars: null, color: 'blue' }]);
  assert.equal(JSON.stringify(p).includes('secret'), false);
  assert.equal(JSON.stringify(p).includes('user_id'), false);
});

test('missing pieces are tolerated: empty name and bio, no avatar, zero counts', () => {
  const p = mapPublicProfile({ status: 'ok', handle: 'a-b', roshettas: {}, groups: null });
  assert.deepEqual(p, { handle: 'a-b', name: '', bio: '', avatarCode: null, redirected: false, isOwner: false, hidden: false, roshettas: { total: 0, items: [] }, groups: { total: 0, items: [] } });
});

test('redirected and owner flags only count when exactly true', () => {
  const p = mapPublicProfile({ ...GOOD, redirected: 'yes', is_owner: 1 });
  assert.equal(p.redirected, false);
  assert.equal(p.isOwner, false);
  const q = mapPublicProfile({ ...GOOD, redirected: true, is_owner: true });
  assert.equal(q.redirected, true);
  assert.equal(q.isOwner, true);
});

test('every dead end is the same answer, and an empty handle does not ask the database', async () => {
  const a = await load('nobody', { reply: { data: { status: 'not_found' }, error: null } });
  assert.deepEqual(a.result, { status: 'not_found' });
  const b = await load('   ');
  assert.deepEqual(b.result, { status: 'not_found' });
  assert.deepEqual(b.asked, []);
  const c = await load('x', { reply: { data: null, error: null } });
  assert.equal(c.result.status, 'error');
  const d = await load('x', { reply: { data: { status: 'ok' }, error: null } });
  assert.deepEqual(d.result, { status: 'not_found' });
});

test('too many tries, no connection, silence and a failure are told apart', async () => {
  assert.deepEqual((await load('x', { reply: { data: { status: 'too_many' }, error: null } })).result, { status: 'too_many' });
  const offline = await load('x', { online: false });
  assert.deepEqual(offline.result, { status: 'offline' });
  assert.deepEqual(offline.asked, []);
  assert.deepEqual((await load('x', { slow: true })).result, { status: 'offline' });
  assert.deepEqual((await load('x', { reply: { data: null, error: { code: '500', message: 'boom' } } })).result, { status: 'error' });
  assert.deepEqual((await load('x', { throws: true })).result, { status: 'error' });
});

async function check(handle, reply, online = true) {
  const asked = [];
  const result = await checkHandleAvailable(handle, { rpc: (fn, args) => { asked.push([fn, args]); return Promise.resolve(reply); }, isOnline: () => online, timeLimitMs: 30 });
  return { result, asked };
}

test('username check: available, taken, and the refusals', async () => {
  const ok = await check(' sara ', { data: { status: 'available' }, error: null });
  assert.deepEqual(ok.asked, [['handle_available', { p_handle: 'sara' }]]);
  assert.deepEqual(ok.result, { status: 'available' });
  assert.deepEqual((await check('sara', { data: { status: 'taken' }, error: null })).result, { status: 'taken' });
  assert.deepEqual((await check('', { data: null, error: null })).result, { status: 'taken' });
  assert.deepEqual((await check('sara', { data: null, error: { message: 'too_many' } })).result, { status: 'too_many' });
  assert.deepEqual((await check('sara', { data: null, error: { message: 'not_signed_in' } })).result, { status: 'signed_out' });
  assert.deepEqual((await check('sara', { data: null, error: { code: '42501', message: 'permission denied' } })).result, { status: 'signed_out' });
  assert.deepEqual((await check('sara', { data: null, error: { code: 'request_timeout' } })).result, { status: 'offline' });
  assert.deepEqual((await check('sara', { data: { status: 'maybe' }, error: null })).result, { status: 'error' });
  const off = await check('sara', { data: null, error: null }, false);
  assert.deepEqual(off.result, { status: 'offline' });
  assert.deepEqual(off.asked, []);
});

test('nothing here keeps anything on the phone: no storage or cache words in the three files', () => {
  const words = /localStorage|sessionStorage|indexedDB|caches\.|\.cache|cookie|navigator\.storage|serviceWorker|setItem|getItem/;
  for (const f of ['publicProfileFetch.js', 'publicProfile.js']) {
    const text = readFileSync(new URL(`./${f}`, import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    assert.equal(words.test(text), false, `${f} mentions storage`);
  }
});

test('the service worker lets other websites\' requests through untouched, so the database answers are never kept', () => {
  const sw = readFileSync(new URL('../../public/sw.js', import.meta.url), 'utf8');
  assert.match(sw, /if \(url\.origin !== location\.origin\) return/);
});

test('14.9: a hidden profile answers hidden; only the owner ever gets hidden: true on a normal answer', async () => {
  assert.deepEqual((await load('x', { reply: { data: { status: 'hidden' }, error: null } })).result, { status: 'hidden' });
  assert.equal(mapPublicProfile({ ...GOOD, hidden: true }).hidden, true);
  for (const v of [false, 'true', 1, null, undefined]) assert.equal(mapPublicProfile({ ...GOOD, hidden: v }).hidden, false, String(v));
});
