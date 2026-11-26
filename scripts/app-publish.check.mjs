// S3.2 checks for scripts/app-publish.mjs: no network, a fake site stands in for the live one.
// Run: npm run app:check
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { HEADERS_TEXT, prepareDist, verifyLive } from './app-publish.mjs'
import { aboutPageHtml, legalPageHtml, esc, STATIC_PAGES, GOOGLE_SITE_VERIFICATION } from './static-pages.mjs'
import { CONTACT_EMAIL } from '../src/utils/legalText.js'

const HOST = 'https://capsula-app.pages.dev'
const GOOD = {
  home: `<html><meta name="google-site-verification" content="${GOOGLE_SITE_VERIFICATION}"><meta property="og:image" content="${HOST}/icons/icon-512.png"><div id="root"></div></html>`,
  manifest: JSON.stringify({ id: '/', start_url: '/', scope: '/', icons: [{ src: '/icons/icon-192.png' }, { src: '/icons/icon-512.png' }] }),
  sw: "const PRE = ['/icons/icon-192.png']\nconst target = `${'/'.slice(0, -1)}${rawTarget}`",
}

function fakeSite(over = {}) {
  const site = { ...GOOD, ...over }
  return async (url) => {
    const p = new URL(url).pathname
    const make = (status, body, headers = {}) => ({ status, text: async () => body, headers: new Headers(headers) })
    if (p === '/manifest.json') return make(200, site.manifest)
    if (p === '/sw.js') return make(200, site.sw, { 'cache-control': site.swCache ?? 'no-cache' })
    if (p === '/icons/icon-192.png') return make(site.iconStatus ?? 200, 'png')
    if (p === '/') return make(200, site.home)
    if (p === '/about') return make(site.aboutStatus ?? 200, site.about ?? aboutPageHtml(HOST))
    if (p === '/account/privacy') return make(200, site.privacy ?? legalPageHtml('privacy', HOST))
    if (p === '/account/terms') return make(200, site.terms ?? legalPageHtml('terms', HOST))
    return make(site.deepStatus ?? 200, site.deepBody ?? site.home)
  }
}

test('a correct site has no problems', async () => {
  assert.deepEqual(await verifyLive(HOST, fakeSite()), [])
})

test('a deep link that 404s is caught (404.html left in the upload)', async () => {
  const p = await verifyLive(HOST, fakeSite({ deepStatus: 404, deepBody: 'Not found' }))
  assert.ok(p.some(t => t.includes('deep link')), p.join('|'))
})

test('a path prefix left in the install file is caught', async () => {
  const bad = JSON.stringify({ id: '/capsula/', start_url: '/capsula/', scope: '/capsula/', icons: [{ src: '/capsula/icons/icon-192.png' }] })
  const p = await verifyLive(HOST, fakeSite({ manifest: bad }))
  assert.ok(p.some(t => t.includes('Install file')), p.join('|'))
})

test('a worker file that may be cached hard is caught', async () => {
  const p = await verifyLive(HOST, fakeSite({ swCache: 'public, max-age=31536000' }))
  assert.ok(p.some(t => t.includes('no-cache')), p.join('|'))
})

test('a worker file still holding the old prefix is caught', async () => {
  const p = await verifyLive(HOST, fakeSite({ sw: "const PRE = ['/capsula/icons/icon-192.png']\nconst target = `${'/capsula/'.slice(0, -1)}${rawTarget}`" }))
  assert.equal(p.filter(t => t.includes('Worker')).length >= 2, true, p.join('|'))
})

test('a link-preview picture on the old address is caught', async () => {
  const p = await verifyLive(HOST, fakeSite({ home: '<meta content="https://roshetta-app.github.io/capsula/icons/icon-512.png"><div id="root"></div>' }))
  assert.ok(p.some(t => t.includes('Link-preview')), p.join('|'))
})

test('prepare removes 404.html and writes the headers file', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dist-'))
  fs.writeFileSync(path.join(dir, 'index.html'), '<div id="root"></div>')
  fs.writeFileSync(path.join(dir, '404.html'), 'x')
  const r = prepareDist(dir)
  assert.equal(r.removed404, true)
  assert.equal(fs.existsSync(path.join(dir, '404.html')), false)
  assert.equal(fs.readFileSync(path.join(dir, '_headers'), 'utf8'), HEADERS_TEXT)
})

test('prepare refuses when nothing was built', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'empty-'))
  assert.throws(() => prepareDist(dir), /build/)
})

test('headers: worker, start page and install file are never cached hard; built files are', () => {
  for (const f of ['/sw.js', '/index.html', '/manifest.json']) {
    assert.match(HEADERS_TEXT, new RegExp(`${f.replace('.', '\\.')}\\n  Cache-Control: no-cache`))
  }
  assert.match(HEADERS_TEXT, /\/assets\/\*\n  Cache-Control: public, max-age=31536000, immutable/)
  assert.ok(HEADERS_TEXT.split('\n').filter(l => l && !l.startsWith(' ')).length <= 100)
})

test('a public page that is really the app shell is caught', async () => {
  const p = await verifyLive(HOST, fakeSite({ privacy: GOOD.home }))
  assert.ok(p.some(t => t.includes('Privacy Policy page is the app shell')), p.join('|'))
})

test('a public page that is missing or empty is caught', async () => {
  const p = await verifyLive(HOST, fakeSite({ aboutStatus: 404, about: '<p>Not found</p>' }))
  assert.ok(p.some(t => t.includes('About page answered 404')), p.join('|'))
  assert.ok(p.some(t => t.includes('About page is missing the words')), p.join('|'))
})

test('prepare writes the three public pages at the exact addresses', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pages-'))
  fs.writeFileSync(path.join(dir, 'index.html'), '<div id="root"></div>')
  const r = prepareDist(dir, HOST)
  assert.deepEqual(r.staticPages, STATIC_PAGES)
  for (const f of STATIC_PAGES) assert.ok(fs.existsSync(path.join(dir, f)), f)
})

test('public pages need no script, name the operator contact, and link to each other', () => {
  const pages = [aboutPageHtml(HOST), legalPageHtml('privacy', HOST), legalPageHtml('terms', HOST)]
  for (const html of pages) {
    assert.equal(/<script/i.test(html), false)
    assert.equal(html.includes('id="root"'), false)
    assert.ok(html.includes('href="/account/privacy"') && html.includes('href="/account/terms"') && html.includes('href="/about"'))
  }
  assert.ok(pages[0].includes(`mailto:${CONTACT_EMAIL}`))
  assert.ok(pages[1].includes(CONTACT_EMAIL) && pages[2].includes(CONTACT_EMAIL))
  assert.ok(pages[0].includes(`${HOST}/about`) && pages[1].includes(`${HOST}/account/privacy`))
})

test('page text is escaped', () => {
  assert.equal(esc('a<b>&"c'), 'a&lt;b&gt;&amp;&quot;c')
  assert.ok(legalPageHtml('terms', HOST).includes('&quot;Not available&quot;'))
})

test('the Google ownership tag is on the start page file and every plain page', () => {
  const tag = `name="google-site-verification" content="${GOOGLE_SITE_VERIFICATION}"`
  assert.ok(fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8').includes(tag))
  for (const html of [aboutPageHtml(HOST), legalPageHtml('privacy', HOST), legalPageHtml('terms', HOST)]) assert.ok(html.includes(tag))
})

test('a start page without the Google ownership tag is caught', async () => {
  const p = await verifyLive(HOST, fakeSite({ home: GOOD.home.replace(/<meta name="google-site-verification"[^>]*>/, '') }))
  assert.ok(p.some(t => t.includes('Google ownership tag')), p.join('|'))
})
