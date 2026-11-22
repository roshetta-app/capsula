// Checks for ownerViews.js (Track H, step H4). Run with: node --test src/utils/ownerViews.check.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  VIEW_WORDS, formatCount, parseViews, itemViewsLines, profileTiles, loadItemViews, loadProfileViews,
} from './ownerViews.js';

const ID = '11111111-1111-1111-1111-111111111111';
const online = () => true;
const deps = (reply, isOnline = online, calls = []) => ({
  rpc: async (fn, args) => { calls.push({ fn, args }); return typeof reply === 'function' ? reply() : reply; },
  isOnline,
  timeLimitMs: 50,
});

test('formatCount separates thousands with a comma and never shows a bad number', () => {
  assert.equal(formatCount(0), '0');
  assert.equal(formatCount(7), '7');
  assert.equal(formatCount(1234), '1,234');
  assert.equal(formatCount(1234567), '1,234,567');
  assert.equal(formatCount('2500'), '2,500');
  assert.equal(formatCount(-3), '0');
  assert.equal(formatCount(null), '0');
  assert.equal(formatCount(NaN), '0');
  assert.equal(formatCount('abc'), '0');
});

test('parseViews takes only an ok answer with two real counts, and caps the last 7 days at the total', () => {
  assert.deepEqual(parseViews({ status: 'ok', total: 12, last7: 5 }), { total: 12, last7: 5 });
  assert.deepEqual(parseViews({ status: 'ok', total: '12', last7: '5' }), { total: 12, last7: 5 });
  assert.deepEqual(parseViews({ status: 'ok', total: 3, last7: 9 }), { total: 3, last7: 3 });
  assert.equal(parseViews({ status: 'not_found' }), null);
  assert.equal(parseViews({ status: 'not_signed_in' }), null);
  assert.equal(parseViews({ status: 'ok', total: -1, last7: 0 }), null);
  assert.equal(parseViews({ status: 'ok', total: 4 }), null);
  assert.equal(parseViews({ status: 'ok', total: 'x', last7: 1 }), null);
  assert.equal(parseViews(null), null);
  assert.equal(parseViews('ok'), null);
});

test('the item box: a new link reads No views yet; otherwise the total and the last 7 days, marked approximate', () => {
  assert.equal(itemViewsLines(null), null);
  assert.deepEqual(itemViewsLines({ total: 0, last7: 0 }), { empty: true, title: 'No views yet', sub: VIEW_WORDS.noViewsLine });
  assert.deepEqual(itemViewsLines({ total: 1, last7: 1 }), { empty: false, title: '1 unique view', sub: '1 in the last 7 days · approximate' });
  assert.deepEqual(itemViewsLines({ total: 1204, last7: 38 }), { empty: false, title: '1,204 unique views', sub: '38 in the last 7 days · approximate' });
  // Views total but none lately still shows the line with a zero, not "No views yet".
  assert.equal(itemViewsLines({ total: 9, last7: 0 }).sub, '0 in the last 7 days · approximate');
});

test('the profile tiles: two tiles, and nothing when the numbers are not known', () => {
  assert.equal(profileTiles(null), null);
  assert.deepEqual(profileTiles({ total: 2048, last7: 61 }), [
    { label: 'Unique views', value: '2,048' },
    { label: 'Last 7 days', value: '61' },
  ]);
  assert.equal(VIEW_WORDS.profileNote, 'Approximate. Only you see these numbers.');
});

test('the words never name a visitor, promise a time or mention who looked', () => {
  const all = Object.values(VIEW_WORDS).join(' ').toLowerCase();
  assert.ok(!/\b(who|visitor|visitors|people|viewed by)\b/.test(all));
  assert.ok(!/\b(within|hours|minutes|seconds)\b/.test(all));
  assert.ok(/approximate/.test(all));
});

test('loadItemViews asks owner_item_views with the kind and id and returns the two counts', async () => {
  const calls = [];
  const r = await loadItemViews('roshetta', ID, deps({ data: { status: 'ok', total: 8, last7: 3 }, error: null }, online, calls));
  assert.deepEqual(r, { status: 'ok', total: 8, last7: 3 });
  assert.deepEqual(calls, [{ fn: 'owner_item_views', args: { p_kind: 'roshetta', p_id: ID } }]);
  const g = await loadItemViews('group', ` ${ID} `, deps({ data: { status: 'ok', total: 0, last7: 0 }, error: null }, online, calls));
  assert.deepEqual(g, { status: 'ok', total: 0, last7: 0 });
  assert.equal(calls[1].args.p_id, ID);
});

test('loadItemViews never reaches the database for a bad kind or an empty id', async () => {
  const calls = [];
  const d = deps({ data: { status: 'ok', total: 1, last7: 1 }, error: null }, online, calls);
  assert.equal((await loadItemViews('profile', ID, d)).status, 'error');
  assert.equal((await loadItemViews('drug', ID, d)).status, 'error');
  assert.equal((await loadItemViews('roshetta', '', d)).status, 'error');
  assert.equal((await loadItemViews('roshetta', '   ', d)).status, 'error');
  assert.equal((await loadItemViews('roshetta', null, d)).status, 'error');
  assert.equal(calls.length, 0);
});

test('every refusal or failure is a plain answer, and an item that is not the person\'s is an error, never a zero', async () => {
  assert.equal((await loadItemViews('roshetta', ID, deps({ data: { status: 'not_found' }, error: null }))).status, 'error');
  assert.equal((await loadItemViews('roshetta', ID, deps({ data: { status: 'not_signed_in' }, error: null }))).status, 'signed_out');
  assert.equal((await loadItemViews('roshetta', ID, deps({ data: null, error: { message: 'not_signed_in' } }))).status, 'signed_out');
  assert.equal((await loadItemViews('roshetta', ID, deps({ data: null, error: { code: '42501', message: 'denied' } }))).status, 'signed_out');
  assert.equal((await loadItemViews('roshetta', ID, deps({ data: null, error: { message: 'boom' } }))).status, 'error');
  assert.equal((await loadItemViews('roshetta', ID, deps({ data: { status: 'ok', total: 'x' }, error: null }))).status, 'error');
  assert.equal((await loadItemViews('roshetta', ID, deps(() => { throw new Error('x'); }))).status, 'error');
});

test('offline never calls the database and a slow answer counts as offline', async () => {
  const calls = [];
  const off = await loadItemViews('roshetta', ID, deps({ data: null, error: null }, () => false, calls));
  assert.deepEqual(off, { status: 'offline' });
  assert.equal(calls.length, 0);
  const slow = await loadItemViews('roshetta', ID, { rpc: () => new Promise(() => {}), isOnline: online, timeLimitMs: 10 });
  assert.equal(slow.status, 'offline');
  assert.deepEqual(await loadProfileViews(deps({ data: null, error: null }, () => false)), { status: 'offline' });
});

test('loadProfileViews asks owner_profile_views with no arguments', async () => {
  const calls = [];
  const r = await loadProfileViews(deps({ data: { status: 'ok', total: 40, last7: 11 }, error: null }, online, calls));
  assert.deepEqual(r, { status: 'ok', total: 40, last7: 11 });
  assert.deepEqual(calls, [{ fn: 'owner_profile_views', args: undefined }]);
  assert.equal((await loadProfileViews(deps({ data: { status: 'not_signed_in' }, error: null }))).status, 'signed_out');
});

test('the new files never write to the phone (local storage, session storage, the browser database, a cache)', () => {
  const files = ['ownerViews.js', 'ownerViewsContent.js', '../hooks/useOwnerViews.js', '../components/ui/OwnerViews.jsx'];
  for (const f of files) {
    const text = readFileSync(new URL(f, import.meta.url), 'utf8')
      .split('\n').filter(l => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
    assert.ok(!/localStorage|sessionStorage|indexedDB|caches\.|\.setItem\(/.test(text), `${f} must not write to the phone`);
  }
});
