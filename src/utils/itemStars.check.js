// Checks for itemStars.js (Track H, step H7). Run with: node --test src/utils/itemStars.check.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  STAR_WORDS, starSignInId, isStarRequest, wholeStars, readStars, starCountText, starsLine, afterTap, starNotice, sendStar,
} from './itemStars.js';
import { parseViews, itemViewsLines } from './ownerViews.js';
import { mapPublicProfile } from './publicProfileFetch.js';
import { mapSharedRoshetta } from './roshettaSharedFetch.js';

const CODE = 'a'.repeat(64);
const online = () => true;
const deps = (reply, isOnline = online, calls = []) => ({
  rpc: async (fn, args) => { calls.push({ fn, args }); return typeof reply === 'function' ? reply() : reply; },
  isOnline,
  timeLimitMs: 50,
});

test('the waiting sign-in request is its own id and only matches its own link', () => {
  assert.equal(starSignInId(CODE), `rstar:${CODE}`);
  assert.equal(isStarRequest({ type: 'groups', id: `rstar:${CODE}` }, CODE), true);
  assert.equal(isStarRequest({ type: 'groups', id: `rsave:${CODE}` }, CODE), false);
  assert.equal(isStarRequest({ type: 'groups', id: `rstar:${'b'.repeat(64)}` }, CODE), false);
  assert.equal(isStarRequest({ type: 'drugs', id: `rstar:${CODE}` }, CODE), false);
  assert.equal(isStarRequest(null, CODE), false);
});

test('only whole, non-negative numbers count as stars', () => {
  assert.equal(wholeStars(0), 0);
  assert.equal(wholeStars(13), 13);
  assert.equal(wholeStars('13'), 13);
  assert.equal(wholeStars(2.9), 2);
  for (const bad of [-1, '-1', 'x', null, undefined, NaN, Infinity, {}, []]) assert.equal(wholeStars(bad), null, String(bad));
});

test('an answer without a star count shows no star; starred is true only when the answer says so', () => {
  assert.deepEqual(readStars({ name: 'x' }), { stars: null, starred: false });
  assert.deepEqual(readStars(null), { stars: null, starred: false });
  assert.deepEqual(readStars({ stars: 0, starred: false }), { stars: 0, starred: false });
  assert.deepEqual(readStars({ stars: 5, starred: true }), { stars: 5, starred: true });
  assert.deepEqual(readStars({ stars: 5, starred: 'true' }), { stars: 5, starred: false });
  assert.deepEqual(readStars({ stars: 'x', starred: true }), { stars: null, starred: false });
});

test('the count shows only when someone starred; thousands use commas', () => {
  assert.equal(starCountText(0), '');
  assert.equal(starCountText(null), '');
  assert.equal(starCountText(7), '7');
  assert.equal(starCountText(1234), '1,234');
  assert.equal(starsLine(0), null);
  assert.equal(starsLine(undefined), null);
  assert.equal(starsLine(1), '1 star');
  assert.equal(starsLine(13), '13 stars');
  assert.equal(starsLine(12345), '12,345 stars');
});

test('a tap moves the number at once, never below zero, and does nothing twice', () => {
  assert.deepEqual(afterTap({ stars: 12, starred: false }, true), { stars: 13, starred: true });
  assert.deepEqual(afterTap({ stars: 13, starred: true }, false), { stars: 12, starred: false });
  assert.deepEqual(afterTap({ stars: 13, starred: true }, true), { stars: 13, starred: true });
  assert.deepEqual(afterTap({ stars: 0, starred: false }, false), { stars: 0, starred: false });
  assert.deepEqual(afterTap({ stars: 0, starred: true }, false), { stars: 0, starred: false });
  assert.deepEqual(afterTap({ stars: null, starred: false }, true), { stars: 1, starred: true });
});

test('every refusal has a plain sentence, and none names a person', () => {
  assert.equal(starNotice('capped'), STAR_WORDS.capped);
  assert.equal(starNotice('offline'), STAR_WORDS.offline);
  assert.equal(starNotice('unavailable'), STAR_WORDS.unavailable);
  assert.equal(starNotice('error'), STAR_WORDS.error);
  assert.equal(starNotice('anything else'), STAR_WORDS.error);
  for (const w of Object.values(STAR_WORDS)) assert.doesNotMatch(w, /who starred|anonymous/i);
});

test('sendStar asks the database with the right words and reads every answer', async () => {
  const calls = [];
  const ok = await sendStar('roshetta', CODE, true, deps({ data: { status: 'ok', starred: true, stars: 3 } }, online, calls));
  assert.deepEqual(ok, { status: 'ok', starred: true, stars: 3 });
  assert.deepEqual(calls, [{ fn: 'star_item', args: { p_kind: 'roshetta', p_code: CODE, p_on: true } }]);
  assert.deepEqual(await sendStar('group', CODE, false, deps({ data: { status: 'ok', starred: false, stars: 0 } })), { status: 'ok', starred: false, stars: 0 });
  assert.deepEqual(await sendStar('group', CODE, true, deps({ data: { status: 'not_signed_in' } })), { status: 'signed_out' });
  assert.deepEqual(await sendStar('group', CODE, true, deps({ data: { status: 'not_found' } })), { status: 'unavailable' });
  assert.deepEqual(await sendStar('group', CODE, true, deps({ data: { status: 'own_item' } })), { status: 'own' });
  assert.deepEqual(await sendStar('group', CODE, true, deps({ data: { status: 'capped' } })), { status: 'capped' });
  assert.deepEqual(await sendStar('group', CODE, true, deps({ data: { status: 'ok', stars: 'x', starred: true } })), { status: 'error' });
  assert.deepEqual(await sendStar('group', CODE, true, deps({ data: null })), { status: 'error' });
});

test('sendStar never asks when it cannot: bad input, or offline', async () => {
  const calls = [];
  assert.deepEqual(await sendStar('nope', CODE, true, deps({ data: {} }, online, calls)), { status: 'error' });
  assert.deepEqual(await sendStar('roshetta', '  ', true, deps({ data: {} }, online, calls)), { status: 'error' });
  assert.deepEqual(await sendStar('roshetta', CODE, 'yes', deps({ data: {} }, online, calls)), { status: 'error' });
  assert.deepEqual(await sendStar('roshetta', CODE, true, deps({ data: {} }, () => false, calls)), { status: 'offline' });
  assert.equal(calls.length, 0);
});

test('sendStar sorts failures: offline, signed out, other', async () => {
  assert.deepEqual(await sendStar('roshetta', CODE, true, deps({ error: { message: 'x' } }, () => false)), { status: 'offline' });
  assert.deepEqual(await sendStar('roshetta', CODE, true, deps({ error: { code: '42501', message: 'x' } })), { status: 'signed_out' });
  assert.deepEqual(await sendStar('roshetta', CODE, true, deps({ error: { message: 'not_signed_in' } })), { status: 'signed_out' });
  assert.deepEqual(await sendStar('roshetta', CODE, true, deps({ error: { message: 'boom' } })), { status: 'error' });
  assert.deepEqual(await sendStar('roshetta', CODE, true, deps(() => { throw new Error('x'); })), { status: 'error' });
  const slow = { rpc: () => new Promise(() => {}), isOnline: online, timeLimitMs: 20 };
  assert.deepEqual(await sendStar('roshetta', CODE, true, slow), { status: 'offline' });
});

test('the owner box carries the stars line, and only when someone starred', () => {
  assert.equal(parseViews({ status: 'ok', total: 4, last7: 2, stars: 13 }).stars, 13);
  assert.equal('stars' in parseViews({ status: 'ok', total: 4, last7: 2 }), false);
  assert.equal(itemViewsLines({ total: 4, last7: 2, stars: 13 }).stars, '13 stars');
  assert.equal('stars' in itemViewsLines({ total: 4, last7: 2, stars: 0 }), false);
  assert.equal('stars' in itemViewsLines({ total: 4, last7: 2 }), false);
  assert.equal(itemViewsLines({ total: 0, last7: 0, stars: 1 }).stars, '1 star');
  const both = itemViewsLines({ total: 4, last7: 2, saved: 3, stars: 13 });
  assert.equal(both.saved, 'Saved by 3 people');
  assert.equal(both.stars, '13 stars');
});

test('profile cards and shared answers carry only the star number', () => {
  const item = { name: 'N', share_code: CODE, drug_count: 2, created_at: '2026-11-22T00:00:00Z' };
  const p = mapPublicProfile({
    handle: 'sara', roshettas: { total: 2, items: [{ ...item, stars: 13 }, item] }, groups: { total: 1, items: [{ ...item, stars: '4', color: 'blue' }] },
  });
  assert.equal(p.roshettas.items[0].stars, 13);
  assert.equal(p.roshettas.items[1].stars, null);
  assert.equal(p.groups.items[0].stars, 4);
  const r = mapSharedRoshetta({ name: 'R', rows: [], stars: 6, starred: true, is_owner: false });
  assert.equal(r.stars, 6);
  assert.equal(r.starred, true);
  const none = mapSharedRoshetta({ name: 'R', rows: [] });
  assert.equal(none.stars, null);
  assert.equal(none.starred, false);
});

test('the screens use the star only through the hook and keep Save a copy as it was', () => {
  for (const f of ['src/pages/SharedRoshettaScreen.jsx', 'src/pages/SharedGroupScreen.jsx']) {
    const t = readFileSync(f, 'utf8');
    assert.match(t, /useItemStar\(/, f);
    assert.match(t, /<StarButton star=\{star\} \/>/, f);
    assert.match(t, /handleSaveTap/, f);
    assert.doesNotMatch(t, /localStorage|sessionStorage/, f);
  }
  const hook = readFileSync('src/hooks/useItemStar.js', 'utf8');
  assert.doesNotMatch(hook, /localStorage|sessionStorage/);
  assert.match(hook, /promptSignIn\('groups', starSignInId\(code\)\)/);
});
