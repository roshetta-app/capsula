// Checks for viewCount.js (step H3). Run with: node --test src/utils/viewCount.check.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { countViewWhenSeen, SEEN_MS } from './viewCount.js';

const CODE = 'c'.repeat(40);

// A small fake clock and page, so nothing real is waited for.
function rig({ online = true, visible = true, reply = { data: 'counted', error: null } } = {}) {
  const calls = [];
  const timers = new Map();
  let now = 0, nextId = 1, listener = null;
  const state = { online, visible };
  const deps = {
    rpc: async (fn, args) => { calls.push({ fn, args }); if (reply instanceof Error) throw reply; return reply; },
    isOnline: () => state.online,
    isVisible: () => state.visible,
    listen: fn => { listener = fn; },
    unlisten: fn => { if (listener === fn) listener = null; },
    setTimer: (fn, ms) => { const id = nextId++; timers.set(id, { at: now + ms, fn }); return id; },
    clearTimer: id => { timers.delete(id); },
  };
  const advance = ms => {
    now += ms;
    for (const [id, t] of [...timers]) if (t.at <= now) { timers.delete(id); t.fn(); }
  };
  return { deps, calls, state, advance, fire: () => listener && listener(), hasListener: () => listener !== null, pending: () => timers.size };
}

test('nothing is sent before the page has been visible for 2 seconds, then exactly one count is sent', () => {
  const r = rig();
  countViewWhenSeen('roshetta', CODE, r.deps);
  r.advance(SEEN_MS - 1);
  assert.equal(r.calls.length, 0);
  r.advance(1);
  assert.deepEqual(r.calls, [{ fn: 'record_view', args: { p_kind: 'roshetta', p_code: CODE } }]);
  r.advance(10000);
  assert.equal(r.calls.length, 1);
});

test('a group is counted the same way', () => {
  const r = rig();
  countViewWhenSeen('group', CODE, r.deps);
  r.advance(SEEN_MS);
  assert.deepEqual(r.calls[0].args, { p_kind: 'group', p_code: CODE });
});

test('leaving before 2 seconds sends nothing', () => {
  const r = rig();
  const stop = countViewWhenSeen('roshetta', CODE, r.deps);
  r.advance(1500);
  stop();
  r.advance(5000);
  assert.equal(r.calls.length, 0);
  assert.equal(r.hasListener(), false);
});

test('hiding the page restarts the wait: 2 seconds in a row are needed', () => {
  const r = rig();
  countViewWhenSeen('roshetta', CODE, r.deps);
  r.advance(1500);
  r.state.visible = false; r.fire();
  r.advance(5000);
  assert.equal(r.calls.length, 0);
  r.state.visible = true; r.fire();
  r.advance(1999);
  assert.equal(r.calls.length, 0);
  r.advance(1);
  assert.equal(r.calls.length, 1);
});

test('a page that is never visible sends nothing (a preview builder)', () => {
  const r = rig({ visible: false });
  countViewWhenSeen('roshetta', CODE, r.deps);
  r.advance(60000);
  assert.equal(r.calls.length, 0);
  assert.equal(r.pending(), 0);
});

test('offline at the 2 second mark waits for the connection, then sends once', () => {
  const r = rig({ online: false });
  countViewWhenSeen('roshetta', CODE, r.deps);
  r.advance(SEEN_MS);
  assert.equal(r.calls.length, 0);
  r.state.online = true; r.fire();
  r.advance(SEEN_MS);
  assert.equal(r.calls.length, 1);
});

test('a failed or throwing call never reaches the page', async () => {
  for (const reply of [new Error('network'), { data: null, error: { message: 'x' } }]) {
    const r = rig({ reply });
    countViewWhenSeen('roshetta', CODE, r.deps);
    assert.doesNotThrow(() => r.advance(SEEN_MS));
    await Promise.resolve();
    assert.equal(r.calls.length, 1);
  }
});

test('a bad kind or a short code is never sent', () => {
  for (const [k, c] of [['profile', CODE], ['roshetta', 'short'], ['roshetta', ''], ['roshetta', null], ['x', undefined]]) {
    const r = rig();
    const stop = countViewWhenSeen(k, c, r.deps);
    r.advance(10000);
    assert.equal(r.calls.length, 0, `${k} ${c}`);
    assert.equal(typeof stop, 'function');
  }
});

test('stopping after the count was sent changes nothing and the listener is gone', () => {
  const r = rig();
  const stop = countViewWhenSeen('roshetta', CODE, r.deps);
  r.advance(SEEN_MS);
  assert.equal(r.hasListener(), false);
  assert.doesNotThrow(stop);
  assert.equal(r.calls.length, 1);
});

test('the new files never write to the phone, and both shared pages use the hook but not for the owner', () => {
  const words = /localStorage|sessionStorage|indexedDB|caches\.|cookie|navigator\.storage|serviceWorker|setItem|getItem|Preferences\./;
  for (const f of ['./viewCount.js', './viewCountContent.js', '../hooks/useViewCount.js']) {
    const code = readFileSync(new URL(f, import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    assert.ok(!words.test(code), f);
  }
  const roshetta = readFileSync(new URL('../pages/SharedRoshettaScreen.jsx', import.meta.url), 'utf8');
  const group = readFileSync(new URL('../pages/SharedGroupScreen.jsx', import.meta.url), 'utf8');
  assert.match(roshetta, /useViewCount\('roshetta', code, result\.status === 'ok' && !result\.roshetta\?\.isOwner\)/);
  assert.match(group, /useViewCount\('group', code, result\.status === 'ok' && !result\.group\?\.isOwner\)/);
});
