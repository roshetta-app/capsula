/**
 * catalog-publish.mjs — the glue around the catalog build and the Cloudflare upload (Track S, S2.2)
 *
 *   node scripts/catalog-publish.mjs plan [--force]   decide if a rebuild is needed (cheap: one tiny read)
 *   node scripts/catalog-publish.mjs prepare          add the headers file and config.json (S10) to catalog-dist
 *   node scripts/catalog-publish.mjs verify           read the LIVE site back and check every file
 *
 * The build itself is scripts/build-catalog.mjs (S2.1, unchanged). The upload is done by
 * the GitHub Action with Cloudflare's own tool (wrangler). This file changes nothing in the
 * database and nothing in the app; it uses the public key only.
 *
 * Environment: CATALOG_HOST (for example https://capsula-catalog.pages.dev),
 * VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (plan only).
 */

import { createHash } from 'node:crypto'
import { readFile, writeFile, appendFile } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

import { CATALOG_FORMAT, assertPublicKey } from './build-catalog.mjs'
import { FLAT_DRUG_SCHEMA_VERSION, fetchMetadataTimestamps } from '../src/lib/queries.js'

const sha256 = text => createHash('sha256').update(text).digest('hex')
const log = msg => console.log(msg)

/** What the headers file says: any website may read the files (the app lives on another address),
 *  the manifest is always asked again, chunk files never change under their name, no search engines. */
export const HEADERS_FILE = [
  '/*',
  '  Access-Control-Allow-Origin: *',
  '  X-Content-Type-Options: nosniff',
  '  X-Robots-Tag: noindex',
  '/manifest.json',
  '  Cache-Control: no-cache, must-revalidate',
  '/config.json',
  '  Cache-Control: no-cache, must-revalidate',
  '/chunk-*',
  '  Cache-Control: public, max-age=31536000, immutable',
  '',
].join('\n')

/**
 * Decide if the files must be rebuilt. Pure function (checked in catalog-publish.check.mjs).
 * `published` is the manifest now on the host, or null when none can be read.
 */
export function decidePlan({ published, drugsUpdatedAt, schemaVersion, catalogFormat, force }) {
  if (force) return { needsBuild: true, reason: 'run by hand with force' }
  if (!published || typeof published !== 'object') return { needsBuild: true, reason: 'nothing is published yet' }
  if (published.catalogFormat !== catalogFormat) return { needsBuild: true, reason: 'the file format changed' }
  if (published.schemaVersion !== schemaVersion) return { needsBuild: true, reason: 'the app list shape changed' }
  if (!published.drugsUpdatedAt || published.drugsUpdatedAt !== drugsUpdatedAt) {
    return { needsBuild: true, reason: 'the drug data changed since the last publish' }
  }
  return { needsBuild: false, reason: 'the published files are already up to date' }
}

/** Compare the manifest read back from the live host with the one we built. Returns a list of problems. */
export function manifestProblems(local, live) {
  const problems = []
  if (!live || typeof live !== 'object') return ['the live manifest could not be read']
  if (live.builtAt !== local.builtAt) problems.push('the live manifest is not the new one (another build time)')
  if (live.drugsUpdatedAt !== local.drugsUpdatedAt) problems.push('the live version stamp differs')
  if (live.auditCursor !== local.auditCursor) problems.push('the live change-log bookmark differs')
  const a = JSON.stringify((live.chunks ?? []).map(c => [c.index, c.file, c.hash]))
  const b = JSON.stringify(local.chunks.map(c => [c.index, c.file, c.hash]))
  if (a !== b) problems.push('the live chunk list differs')
  return problems
}

async function setOutput(name, value) {
  if (process.env.GITHUB_OUTPUT) await appendFile(process.env.GITHUB_OUTPUT, `${name}=${value}\n`)
}
async function summary(text) {
  if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, text + '\n')
}

function hostBase() {
  const host = (process.env.CATALOG_HOST || '').trim().replace(/\/+$/, '')
  if (!/^https:\/\/[a-z0-9.-]+$/i.test(host)) throw new Error('CATALOG_HOST must be an https address such as https://capsula-catalog.pages.dev')
  return host
}

async function fetchLiveManifest(host) {
  try {
    const res = await fetch(`${host}/manifest.json?nocache=${Date.now()}`, { cache: 'no-store' })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

async function plan(args) {
  const host = hostBase()
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
  const key = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
  if (!url || !key) throw new Error('Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY')
  assertPublicKey(key)
  const { createClient } = await import('@supabase/supabase-js')
  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
  const { drugsUpdatedAt } = await fetchMetadataTimestamps(supabase)
  const published = await fetchLiveManifest(host)
  const d = decidePlan({
    published,
    drugsUpdatedAt,
    schemaVersion: FLAT_DRUG_SCHEMA_VERSION,
    catalogFormat: CATALOG_FORMAT,
    force: args.includes('--force'),
  })
  log(`Version stamp now: ${drugsUpdatedAt}`)
  log(`Published stamp:   ${published?.drugsUpdatedAt ?? '(none)'}`)
  log(d.needsBuild ? `Rebuild needed: ${d.reason}` : `No rebuild: ${d.reason}`)
  await setOutput('needs_build', d.needsBuild ? 'true' : 'false')
  await summary(d.needsBuild ? `Rebuilding: ${d.reason}.` : `Nothing to do: ${d.reason}.`)
}

/** S10: the remote address book file. The pair is the one the workflow already holds (public key
 *  only). Announcements are NOT carried here: the app's gate system does that. */
export function buildConfigFile(env) {
  const url = String(env.VITE_SUPABASE_URL ?? '').trim()
  const anon = String(env.VITE_SUPABASE_ANON_KEY ?? '').trim()
  if (!/^https:\/\//.test(url) || anon.length < 20) throw new Error('config.json: the server address or key is missing or not valid. Not publishing.')
  return JSON.stringify({ v: 1, url, anon }) + '\n'
}

async function prepare(outDir) {
  const manifest = JSON.parse(await readFile(path.join(outDir, 'manifest.json'), 'utf8'))
  if (!Array.isArray(manifest.chunks) || manifest.chunks.length === 0) throw new Error('The manifest has no chunks. Not publishing.')
  await writeFile(path.join(outDir, '_headers'), HEADERS_FILE)
  await writeFile(path.join(outDir, 'config.json'), buildConfigFile(process.env))
  log(`Added _headers to ${outDir} (${manifest.chunks.length} chunk files, built ${manifest.builtAt})`)
}

const sleep = ms => new Promise(r => setTimeout(r, ms))

async function verify(outDir) {
  const host = hostBase()
  const local = JSON.parse(await readFile(path.join(outDir, 'manifest.json'), 'utf8'))

  // The new version can take a little while to appear everywhere: ask again for up to about 2 minutes.
  let live = null
  let problems = ['not tried']
  for (let i = 0; i < 12; i++) {
    live = await fetchLiveManifest(host)
    problems = manifestProblems(local, live)
    if (problems.length === 0) break
    await sleep(10000)
  }
  if (problems.length) throw new Error(`The live site does not show the new files: ${problems.join('; ')}`)

  const head = await fetch(`${host}/manifest.json?nocache=${Date.now()}`, { cache: 'no-store' })
  const cors = head.headers.get('access-control-allow-origin')
  if (cors !== '*') throw new Error(`The live manifest does not allow other websites to read it (Access-Control-Allow-Origin is "${cors}").`)

  // S10: the address book file must be live and identical to the one just built.
  const localConfig = (await readFile(path.join(outDir, 'config.json'), 'utf8')).trim()
  const liveConfigRes = await fetch(`${host}/config.json?nocache=${Date.now()}`, { cache: 'no-store' })
  if (!liveConfigRes.ok) throw new Error(`config.json answered ${liveConfigRes.status} on the live site`)
  if ((await liveConfigRes.text()).trim() !== localConfig) throw new Error('config.json on the live site is not the one just built')

  let bytes = 0
  for (const c of local.chunks) {
    const res = await fetch(`${host}/${c.file}`)
    if (!res.ok) throw new Error(`${c.file} answered ${res.status} on the live site`)
    const text = await res.text()
    if (sha256(text) !== c.hash) throw new Error(`${c.file} on the live site does not match its hash`)
    bytes += Buffer.byteLength(text)
  }
  log(`Live check passed: ${local.chunks.length} files match their hashes (${(bytes / 1048576).toFixed(2)} MB), manifest readable by other websites.`)
  await summary(`Published and checked live: ${local.chunks.length} chunk files, ${local.totals.brands} brands, version stamp ${local.drugsUpdatedAt}.`)
}

async function main() {
  await import('dotenv/config')
  const [cmd, ...args] = process.argv.slice(2)
  const outDir = path.resolve('catalog-dist')
  if (cmd === 'plan') return plan(args)
  if (cmd === 'prepare') return prepare(outDir)
  if (cmd === 'verify') return verify(outDir)
  throw new Error('Use: plan [--force] | prepare | verify')
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(err => {
    console.error('\nPUBLISH STEP FAILED: ' + (err?.message ?? err))
    process.exit(1)
  })
}
