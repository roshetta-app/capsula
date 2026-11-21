// Step 12.12 (F8, K17, K29): runs the REAL 404.html and index.html redirect scripts against a
// fake browser, to prove a refreshed deep address comes back, and reads the real manifest.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read = rel => fs.readFileSync(new URL(rel, import.meta.url), 'utf8');
const scripts = html => [...html.replace(/<!--[\s\S]*?-->/g, '').matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);

const script404   = scripts(read('../../public/404.html'))[0];
const scriptIndex = scripts(read('../../index.html')).find(s => s.includes('gh_pages_redirect'));

function fakeBrowser(urlString, store = new Map()) {
  const u = new URL(urlString);
  const calls = { replaced: null, replaceState: null };
  const location = {
    protocol: u.protocol, hostname: u.hostname, host: u.host, port: u.port,
    pathname: u.pathname, search: u.search, hash: u.hash,
    replace(url) { calls.replaced = url },
  };
  const sessionStorage = {
    getItem: k => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: k => store.delete(k),
  };
  const history = { replaceState(_s, _t, url) { calls.replaceState = url } };
  const context = { window: { location, history }, sessionStorage };
  context.window.sessionStorage = sessionStorage;
  return { context, calls, store };
}

// GitHub Pages serves 404.html for the address; then the root page loads and decodes it.
function refresh(address) {
  const first = fakeBrowser(address);
  vm.runInNewContext(script404, first.context);
  assert.ok(first.calls.replaced, 'the 404 page sends the browser to the root page');
  const second = fakeBrowser(first.calls.replaced, first.store);
  vm.runInNewContext(scriptIndex, second.context);
  return { sentTo: first.calls.replaced, restored: second.calls.replaceState };
}

for (const path of [
  '/capsula/r/AbC123',
  '/capsula/g/XyZ789',
  '/capsula/roshetta/42',
  '/capsula/roshetta/42/edit',
  '/capsula/drugs/Panadol%20Extra',
  '/capsula/drugs/group/7/add',
  '/capsula/conditions/acute-cholecystitis',
]) {
  test(`a refreshed ${path} comes back to the same address`, () => {
    const { sentTo, restored } = refresh(`https://example.github.io${path}`);
    assert.equal(sentTo, 'https://example.github.io/capsula/?p=1');
    assert.equal(restored, `https://example.github.io${path}`);
  });
}

test('a refreshed address keeps its query and hash', () => {
  const { restored } = refresh('https://example.github.io/capsula/r/AbC123?from=share#top');
  assert.equal(restored, 'https://example.github.io/capsula/r/AbC123?from=share#top');
});

test('the root address is left alone (no redirect loop)', () => {
  const b = fakeBrowser('https://example.github.io/capsula/');
  vm.runInNewContext(script404, b.context);
  assert.equal(b.calls.replaced, null);
});

test('manifest: id equals the start address and scope, and a link opens the installed app', () => {
  const m = JSON.parse(read('../../public/manifest.json'));
  assert.equal(m.id, '/capsula/');
  assert.equal(m.id, m.start_url);
  assert.equal(m.scope, '/capsula/');
  assert.deepEqual(m.launch_handler.client_mode, ['navigate-existing', 'auto']);
});
