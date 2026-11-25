// S3.4b checks: the old GitHub Pages address only forwards, and its worker removes itself.
// Run: npm run forwarder:check  (plain node, no browser, no network)
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'

const read = rel => fs.readFileSync(new URL(rel, import.meta.url), 'utf8')
const NEW_SITE = 'https://capsula-app.pages.dev'
const noComments = html => html.replace(/<!--[\s\S]*?-->/g, '')
const inlineScripts = html => [...noComments(html).matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1])

const pages = { 'index.html': read('../forwarder/index.html'), '404.html': read('../forwarder/404.html') }

function forward(address, script) {
  const u = new URL(address)
  let sentTo = null
  const location = { pathname: u.pathname, search: u.search, hash: u.hash, replace(url) { sentTo = url } }
  vm.runInNewContext(script, { window: { location } })
  return sentTo
}

test('index.html and 404.html carry the same single script', () => {
  const a = inlineScripts(pages['index.html'])
  const b = inlineScripts(pages['404.html'])
  assert.equal(a.length, 1)
  assert.equal(b.length, 1)
  assert.equal(a[0], b[0])
})

for (const [file, html] of Object.entries(pages)) {
  const script = inlineScripts(html)[0]
  test(`${file}: every old address goes to the same path on the new address`, () => {
    const cases = {
      'https://roshetta-app.github.io/capsula/': NEW_SITE + '/',
      'https://roshetta-app.github.io/capsula': NEW_SITE + '/',
      'https://roshetta-app.github.io/capsula/r/AbC123': NEW_SITE + '/r/AbC123',
      'https://roshetta-app.github.io/capsula/g/XyZ789?from=share#top': NEW_SITE + '/g/XyZ789?from=share#top',
      'https://roshetta-app.github.io/capsula/drugs/Panadol%20Extra': NEW_SITE + '/drugs/Panadol%20Extra',
      'https://roshetta-app.github.io/capsula/conditions/acute-cholecystitis': NEW_SITE + '/conditions/acute-cholecystitis',
      'https://roshetta-app.github.io/capsula/admin/reports': NEW_SITE + '/admin/reports',
      'https://roshetta-app.github.io/capsula/u/someone': NEW_SITE + '/u/someone',
    }
    for (const [from, to] of Object.entries(cases)) assert.equal(forward(from, script), to, from)
  })
  test(`${file}: it can only ever send people to the new address`, () => {
    for (const odd of ['https://x.github.io/', 'https://x.github.io/other/page', 'https://x.github.io/capsula//evil.example/a', 'https://x.github.io/capsulaX/a']) {
      const to = forward(odd, script)
      assert.ok(to.startsWith(NEW_SITE + '/'), `${odd} -> ${to}`)
    }
  })
}

test('link previews show Capsula with the picture on the new address, and search engines are asked to skip', () => {
  for (const html of Object.values(pages)) {
    const tags = noComments(html)
    assert.ok(tags.includes(`content="${NEW_SITE}/icons/icon-512.png"`))
    assert.ok(tags.includes('property="og:title" content="Capsula"'))
    assert.ok(tags.includes('name="robots" content="noindex"'))
    assert.ok(!tags.includes('github.io'), 'an old address is still written in the page')
    assert.ok(tags.includes(`href="${NEW_SITE}/"`), 'no plain link to the new address')
  }
})

test('the old worker file removes the old saved files, reloads open tabs and unregisters itself', async () => {
  const src = read('../forwarder/sw.js')
  const handlers = {}
  const log = { deleted: [], claimed: 0, unregistered: 0, navigated: [], skipWaiting: 0 }
  const self = {
    addEventListener: (name, fn) => { handlers[name] = fn },
    skipWaiting: () => { log.skipWaiting += 1 },
    clients: {
      claim: async () => { log.claimed += 1 },
      matchAll: async () => [
        { url: 'https://roshetta-app.github.io/capsula/drugs/x', navigate: async u => { log.navigated.push(u) } },
        { url: 'https://roshetta-app.github.io/capsula/', navigate: async u => { log.navigated.push(u) } },
      ],
    },
    registration: { unregister: async () => { log.unregistered += 1; return true } },
  }
  const caches = { keys: async () => ['capsula-v1', 'capsula-images', 'other'], delete: async k => { log.deleted.push(k); return true } }
  vm.runInNewContext(src, { self, caches })
  assert.deepEqual(Object.keys(handlers).sort(), ['activate', 'install'], 'only install and activate: it never answers requests')
  handlers.install()
  assert.equal(log.skipWaiting, 1)
  let work
  handlers.activate({ waitUntil: p => { work = p } })
  await work
  assert.deepEqual(log.deleted.sort(), ['capsula-images', 'capsula-v1', 'other'])
  assert.equal(log.claimed, 1)
  assert.equal(log.unregistered, 1)
  assert.deepEqual(log.navigated, ['https://roshetta-app.github.io/capsula/drugs/x', 'https://roshetta-app.github.io/capsula/'])
})

test('the old worker still finishes when the browser refuses a step', async () => {
  const src = read('../forwarder/sw.js')
  const handlers = {}
  let unregistered = 0
  const self = {
    addEventListener: (name, fn) => { handlers[name] = fn },
    skipWaiting() {},
    clients: { claim: async () => { throw new Error('no') }, matchAll: async () => { throw new Error('no') } },
    registration: { unregister: async () => { unregistered += 1 } },
  }
  vm.runInNewContext(src, { self, caches: { keys: async () => { throw new Error('no') }, delete: async () => true } })
  let work
  handlers.activate({ waitUntil: p => { work = p } })
  await work
  assert.equal(unregistered, 1)
})

test('the old address holds only the three forwarder files, and nothing of the app', () => {
  assert.deepEqual(fs.readdirSync(new URL('../forwarder/', import.meta.url)).sort(), ['404.html', 'index.html', 'sw.js'])
})

test('the old-site workflow publishes the forwarder, builds no app and holds no app secret', () => {
  const wf = read('../.github/workflows/deploy.yml')
  assert.ok(/path:\s*forwarder\b/.test(wf), 'does not upload the forwarder folder')
  assert.ok(!/npm (ci|run build)/.test(wf), 'still builds the app')
  assert.ok(!wf.includes('secrets.'), 'still uses app secrets')
  assert.ok(wf.includes("'forwarder/**'") && wf.includes('workflow_dispatch'), 'no path filter or no by-hand run')
  assert.ok(wf.includes('scripts/forwarder.check.mjs'), 'the checks are not run before publishing')
  assert.ok(wf.includes('deployment_retry'), 'the second try is gone')
})

test('only one deploy builds the app: the Cloudflare workflow, on every push', () => {
  const cf = read('../.github/workflows/deploy-app-cloudflare.yml')
  assert.ok(/on:\s*\n\s*push:\s*\n\s*branches:\s*\[main\]/.test(cf), 'Cloudflare no longer runs on every push')
  assert.ok(cf.includes('npm run build'), 'Cloudflare does not build the app')
})

test('the app no longer ships the GitHub Pages deep-link page', () => {
  assert.equal(fs.existsSync(new URL('../public/404.html', import.meta.url)), false)
})
