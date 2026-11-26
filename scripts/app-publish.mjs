// S3.2: put the built website on the free Cloudflare Pages project and read it back.
//   node scripts/app-publish.mjs prepare   -> fixes up dist/ (no 404.html, adds _headers)
//   node scripts/app-publish.mjs verify    -> reads the live site back and checks it
// The workflow .github/workflows/deploy-app-cloudflare.yml runs both. Nothing here talks to
// Supabase and no key is used.
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { buildStaticPages } from './static-pages.mjs'
import { DEFAULT_PUBLIC_SITE } from './siteBase.mjs'

// Cloudflare Pages shows the app's start page for any address that is not a real file, but ONLY
// when the upload has no top-level 404.html (public/404.html is the GitHub Pages trick and must
// not go up). The start page, the worker and the install file are never cached hard, so a new
// deploy reaches phones; built files carry a hash in their name and are cached for a year.
export const HEADERS_TEXT = `/
  Cache-Control: no-cache
/index.html
  Cache-Control: no-cache
/sw.js
  Cache-Control: no-cache
/manifest.json
  Cache-Control: no-cache
/assets/*
  Cache-Control: public, max-age=31536000, immutable
`

export function prepareDist(distDir, site = DEFAULT_PUBLIC_SITE) {
  if (!fs.existsSync(path.join(distDir, 'index.html'))) {
    throw new Error(`No built site in ${distDir}: run the build first`)
  }
  const removed404 = fs.existsSync(path.join(distDir, '404.html'))
  fs.rmSync(path.join(distDir, '404.html'), { force: true })
  fs.writeFileSync(path.join(distDir, '_headers'), HEADERS_TEXT, 'utf8')
  // Google branding review: plain About, Privacy and Terms pages that need no script or sign-in.
  const staticPages = buildStaticPages(distDir, site)
  return { removed404, staticPages }
}

const get = async (fetchImpl, url) => {
  const res = await fetchImpl(url, { redirect: 'follow' })
  const body = await res.text()
  return { status: res.status, headers: res.headers, body }
}

// Returns a list of plain-language problems; empty means the live site is as it should be.
export async function verifyLive(host, fetchImpl = fetch) {
  const base = host.replace(/\/+$/, '')
  const problems = []
  const check = (cond, text) => { if (!cond) problems.push(text) }

  const home = await get(fetchImpl, `${base}/`)
  check(home.status === 200, `Start page answered ${home.status}, not 200`)
  check(home.body.includes('id="root"'), 'Start page does not look like the app')
  check(home.body.includes(`${base}/icons/icon-512.png`), 'Link-preview picture does not point at the new address')

  // The three public pages must be real, readable pages (not the app shell) with their key words.
  const expect = [
    ['/about', 'About page', ['Capsula', 'Do I need an account?', 'Sign in with Google']],
    ['/account/privacy', 'Privacy Policy page', ['What we keep', 'Deleting your account']],
    ['/account/terms', 'Terms of Use page', ['Information only, not medical advice', 'Your account']],
  ]
  for (const [route, label, words] of expect) {
    const page = await get(fetchImpl, `${base}${route}`)
    check(page.status === 200, `${label} answered ${page.status}, not 200`)
    check(!page.body.includes('id="root"'), `${label} is the app shell, not the plain page`)
    for (const w of words) check(page.body.includes(w), `${label} is missing the words "${w}"`)
  }

  const deep = await get(fetchImpl, `${base}/drugs/some-deep-link-check`)
  check(deep.status === 200, `A deep link answered ${deep.status}, not 200 (is a 404.html still in the upload?)`)
  check(deep.body.includes('id="root"'), 'A deep link does not open the app')

  const manifest = await get(fetchImpl, `${base}/manifest.json`)
  let m = null
  try { m = JSON.parse(manifest.body) } catch { problems.push('Install file is not valid') }
  if (m) {
    check(m.scope === '/' && m.start_url === '/' && m.id === '/', 'Install file still has a path prefix')
    check((m.icons || []).every(i => String(i.src).startsWith('/icons/')), 'Install file icons have a path prefix')
  }

  const sw = await get(fetchImpl, `${base}/sw.js`)
  check(sw.status === 200, `Worker answered ${sw.status}, not 200`)
  check(/no-cache|no-store|max-age=0/.test(sw.headers.get('cache-control') || ''), 'Worker file is not marked no-cache')
  check(sw.body.includes("'/icons/icon-192.png'"), 'Worker file still has a path prefix in its saved-files list')
  check(sw.body.includes("'/'.slice(0, -1)"), 'Worker notification target still has a path prefix')

  const icon = await get(fetchImpl, `${base}/icons/icon-192.png`)
  check(icon.status === 200, `App icon answered ${icon.status}, not 200`)

  return problems
}

async function main() {
  const cmd = process.argv[2]
  if (cmd === 'prepare') {
    const dist = path.resolve(process.argv[3] || 'dist')
    const { removed404, staticPages } = prepareDist(dist, process.env.VITE_PUBLIC_SITE || DEFAULT_PUBLIC_SITE)
    console.log(`Prepared ${dist}: ${removed404 ? '404.html removed, ' : ''}_headers written, ${staticPages.length} public pages written`)
  } else if (cmd === 'verify') {
    const host = process.env.APP_HOST
    if (!host) throw new Error('APP_HOST is not set')
    let problems = []
    for (let attempt = 1; attempt <= 6; attempt++) {
      try { problems = await verifyLive(host) } catch (e) { problems = [`Could not read the site: ${e.message}`] }
      if (problems.length === 0) break
      console.log(`Attempt ${attempt}: ${problems.length} problem(s); waiting 15 s for the upload to spread`)
      await new Promise(r => setTimeout(r, 15000))
    }
    if (problems.length) {
      for (const p of problems) console.error('PROBLEM: ' + p)
      process.exit(1)
    }
    console.log(`Live check passed for ${host}`)
  } else {
    console.error('Usage: node scripts/app-publish.mjs prepare [dist] | verify')
    process.exit(2)
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(e => { console.error(e.message); process.exit(1) })
}
