// S3.1 checks: the website address is one setting, and the default changes nothing.
// Run: npm run site:check  (plain node, no browser, no network)
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {
  normalizeBase, normalizePublicSite, rewriteSitePrefix, rewritePublicSite,
  DEFAULT_SITE_BASE, DEFAULT_PUBLIC_SITE,
} from './siteBase.mjs'

const read = rel => fs.readFileSync(new URL(rel, import.meta.url), 'utf8')
const sw = read('../public/sw.js')
const manifestText = read('../public/manifest.json')

test('default base is today\'s /capsula/', () => {
  assert.equal(DEFAULT_SITE_BASE, '/capsula/')
  for (const empty of [undefined, null, '', '   ']) assert.equal(normalizeBase(empty), '/capsula/')
})

test('base is always written with a leading and a closing slash', () => {
  assert.equal(normalizeBase('/'), '/')
  assert.equal(normalizeBase('app'), '/app/')
  assert.equal(normalizeBase('/app'), '/app/')
  assert.equal(normalizeBase('//app//x/'), '/app/x/')
})

test('public site address loses a closing slash and falls back to today\'s address', () => {
  assert.equal(normalizePublicSite(undefined), DEFAULT_PUBLIC_SITE)
  assert.equal(normalizePublicSite('https://x.pages.dev/'), 'https://x.pages.dev')
  assert.equal(normalizePublicSite('https://x.pages.dev'), 'https://x.pages.dev')
})

test('default build: service worker and install file come out unchanged', () => {
  assert.equal(rewriteSitePrefix(sw, undefined), sw)
  assert.equal(rewriteSitePrefix(sw, '/capsula/'), sw)
  assert.equal(rewriteSitePrefix(manifestText, '/capsula/'), manifestText)
  assert.equal(rewritePublicSite('a', undefined), 'a')
})

test('root build: no /capsula/ path is left in the service worker', () => {
  const out = rewriteSitePrefix(sw, '/')
  const left = out.split('\n').filter(l => /(?<![A-Za-z0-9.\-])\/capsula(?![A-Za-z0-9_])/.test(l) && !/^\s*(\/\/|\*|\/\*)/.test(l))
  assert.deepEqual(left, [], 'code lines still holding /capsula/: ' + left.join(' | '))
  assert.ok(out.includes("'/index.html'"), 'offline start page path')
  assert.ok(out.includes('/icons/icon-192.png'))
  assert.ok(!out.includes('//icons'), 'no double slash')
})

test('root build: notification tap target gets no prefix, default build keeps /capsula', () => {
  const root = rewriteSitePrefix(sw, '/')
  const line = root.split('\n').find(l => l.includes('const target ='))
  assert.equal(eval('`' + line.split('= `')[1].replace(/`\s*$/, '').replace('${rawTarget}', '/drugs/x') + '`'), '/drugs/x')
  const dflt = sw.split('\n').find(l => l.includes('const target ='))
  assert.equal(eval('`' + dflt.split('= `')[1].replace(/`\s*$/, '').replace('${rawTarget}', '/drugs/x') + '`'), '/capsula/drugs/x')
})

test('root build: install file points at the root', () => {
  const m = JSON.parse(rewriteSitePrefix(manifestText, '/'))
  assert.equal(m.id, '/')
  assert.equal(m.start_url, '/')
  assert.equal(m.scope, '/')
  for (const icon of m.icons) assert.ok(icon.src.startsWith('/icons/'), icon.src)
})

test('another prefix works the same way', () => {
  const m = JSON.parse(rewriteSitePrefix(manifestText, 'app'))
  assert.equal(m.scope, '/app/')
  assert.equal(m.icons[0].src, '/app/icons/icon-192.png')
})

test('an absolute address is never mangled by the path rewrite', () => {
  const t = 'href="https://roshetta-app.github.io/capsula/icons/icon-512.png" and \'/capsula/x\''
  assert.equal(
    rewriteSitePrefix(t, '/'),
    'href="https://roshetta-app.github.io/capsula/icons/icon-512.png" and \'/x\'',
  )
})

test('link-preview pictures follow the public site address', () => {
  const html = read('../index.html')
  assert.ok(html.includes(DEFAULT_PUBLIC_SITE + '/icons/icon-512.png'))
  const out = rewritePublicSite(html, 'https://capsula-app.pages.dev/')
  assert.ok(out.includes('https://capsula-app.pages.dev/icons/icon-512.png'))
  const tags = out.replace(/<!--[\s\S]*?-->/g, '')
  assert.ok(!tags.includes('github.io'), 'a link-preview tag still points at github.io')
})

test('no source file writes the website prefix by hand any more', () => {
  const main = read('../src/main.jsx')
  assert.ok(!/register\(\s*['"]\/capsula\//.test(main), 'main.jsx registers the worker with a fixed path')
  const index = read('../index.html')
  assert.ok(!/href="\/capsula\/"/.test(index) && !/replace\('\/capsula\//.test(index), 'index.html boot retry')
  const app = read('../src/App.jsx')
  assert.ok(!/ROUTER_BASENAME\s*=.*'\/capsula'/.test(app), 'App.jsx router prefix')
  for (const f of ['shareConditionLink', 'shareRoshettaLink', 'shareGroupLink']) {
    assert.ok(!/const PUBLIC_SITE\s*=/.test(read(`../src/utils/${f}.js`)), f + ' has its own copy of the address')
  }
  const shareDrug = read('../src/utils/shareDrugLink.js')
  assert.ok(!/PUBLIC_SITE\s*=\s*'https/.test(shareDrug))
})

test('public site constant: default is today\'s address', async () => {
  const mod = await import('../src/lib/siteAddress.js')
  assert.equal(mod.PUBLIC_SITE, DEFAULT_PUBLIC_SITE)
})
