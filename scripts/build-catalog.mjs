/**
 * build-catalog.mjs — build the drug catalog as static chunk files (Track S, S2.1)
 *
 *   node scripts/build-catalog.mjs [--out catalog-dist] [--no-compare]
 *
 * What it does, in order:
 *   1. Reads the version stamp and the change-log bookmark FIRST (the manifest
 *      records them, so a phone can carry on from exactly that point).
 *   2. Reads the published generics, formulations and brands (public key only,
 *      no service key anywhere), page by page.
 *   3. Builds 32 chunk files (generic > formulations > brands) and a manifest.
 *   4. Downloads today's flat list from Supabase (fetchFlatDrugs, the same code
 *      the app runs) and compares it with the flat list rebuilt from the new
 *      files, row by row. Any difference stops the build and NOTHING is written.
 *   5. Only then writes the files, and reads them back to check their hashes.
 *   6. If the version stamp moved while it was reading, it starts again (up to
 *      3 tries), because the files would be a mix of two moments.
 *
 * It changes nothing in the database and nothing in the app. Uploading to
 * Cloudflare is S2.2.
 *
 * Needs: SUPABASE_URL and SUPABASE_ANON_KEY in the environment (or the app's
 * VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY from .env).
 */

import { createHash } from 'node:crypto'
import { mkdir, writeFile, readFile, rm } from 'node:fs/promises'
import path from 'node:path'
import zlib from 'node:zlib'
import { pathToFileURL } from 'node:url'

import {
  FLAT_DRUG_SCHEMA_VERSION,
  fetchFlatDrugs,
  fetchMetadataTimestamps,
  fetchAuditCursorNow,
} from '../src/lib/queries.js'
import {
  CATALOG_COLUMNS,
  CATALOG_CHUNK_COUNT,
  buildChunks,
  flattenChunks,
  compareFlatLists,
} from '../src/utils/catalogChunks.js'

export const CATALOG_FORMAT = 1
const PAGE_SIZE = 1000
const PAGE_BATCH = 4
const REQUEST_ATTEMPTS = 4

const sleep = ms => new Promise(r => setTimeout(r, ms))

async function withRetry(label, fn) {
  let last
  for (let i = 0; i < REQUEST_ATTEMPTS; i++) {
    try { return await fn() } catch (err) {
      last = err
      if (i < REQUEST_ATTEMPTS - 1) await sleep(500 * (i + 1))
    }
  }
  throw new Error(`${label} failed after ${REQUEST_ATTEMPTS} tries: ${last?.message ?? last}`)
}

// ─── Reading one table (published rows, stable order, page by page) ─────────

/** Columns each table needs: the select's own columns plus the link to the parent. */
const TABLES = {
  generics:     { columns: CATALOG_COLUMNS.generic },
  formulations: { columns: [...CATALOG_COLUMNS.formulation, 'generic_id'] },
  brands:       { columns: [...CATALOG_COLUMNS.brand, 'formulation_id'] },
}

async function readTable(supabase, table) {
  const select = TABLES[table].columns.join(', ')
  const { count, error: countError } = await withRetry(`${table} count`, async () => {
    const res = await supabase.from(table).select('id', { count: 'exact', head: true }).eq('is_published', true)
    if (res.error) throw res.error
    return res
  })
  if (countError) throw countError
  const total = count ?? 0
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const rows = []
  for (let start = 0; start < pages; start += PAGE_BATCH) {
    const idx = Array.from({ length: Math.min(PAGE_BATCH, pages - start) }, (_, i) => start + i)
    const results = await Promise.all(idx.map(i => withRetry(`${table} page ${i + 1}`, async () => {
      const { data, error } = await supabase
        .from(table)
        .select(select)
        .eq('is_published', true)
        .order('id', { ascending: true })
        .range(i * PAGE_SIZE, i * PAGE_SIZE + PAGE_SIZE - 1)
      if (error) throw error
      return data ?? []
    })))
    for (const r of results) rows.push(...r)
  }
  if (rows.length !== total) {
    throw new Error(`${table}: the server said ${total} published rows but ${rows.length} came back (a change landed while reading)`)
  }
  const ids = new Set(rows.map(r => r.id))
  if (ids.size !== rows.length) throw new Error(`${table}: duplicate ids while paging (a change landed while reading)`)
  return rows
}

// ─── Small helpers ──────────────────────────────────────────────────────────

const sha256 = text => createHash('sha256').update(text).digest('hex')

function chunkFileName(index, hash) {
  return `chunk-${String(index).padStart(2, '0')}.${hash.slice(0, 12)}.json`
}

const mb = n => (n / 1024 / 1024).toFixed(2) + ' MB'

function describeDifferences(cmp) {
  const lines = [
    `rows in today's Supabase download: ${cmp.countA}, rows rebuilt from the new files: ${cmp.countB}`,
    `only in Supabase download: ${cmp.onlyInA.length}, only in new files: ${cmp.onlyInB.length}, different: ${cmp.different.length}, duplicate ids: ${cmp.duplicatesA.length + cmp.duplicatesB.length}`,
  ]
  for (const d of cmp.different.slice(0, 5)) lines.push(`  different: brand ${d.id} (fields: ${d.fields.join(', ')})`)
  for (const id of cmp.onlyInA.slice(0, 5)) lines.push(`  missing from new files: brand ${id}`)
  for (const id of cmp.onlyInB.slice(0, 5)) lines.push(`  extra in new files: brand ${id}`)
  return lines.join('\n')
}

// ─── The build ──────────────────────────────────────────────────────────────

/**
 * @param {object} o
 * @param {import('@supabase/supabase-js').SupabaseClient} o.supabase
 * @param {string} o.outDir
 * @param {boolean} [o.compare=true]  compare with today's Supabase download (turn off only for a quick look)
 * @param {(msg: string) => void} [o.log]
 * @param {number} [o.chunkCount]
 * @param {number} [o.maxAttempts=3]  tries when the version stamp moves during the read
 * @returns {Promise<{ manifest: object, outDir: string }>}
 */
export async function runBuild({ supabase, outDir, compare = true, log = console.log, chunkCount = CATALOG_CHUNK_COUNT, maxAttempts = 3 }) {
  let attempt = 0
  for (;;) {
    attempt++
    log(`Attempt ${attempt}: reading the version stamp and the change-log bookmark`)
    const before = await withRetry('version stamp', () => fetchMetadataTimestamps(supabase))
    const bookmark = await withRetry('change-log bookmark', () => fetchAuditCursorNow(supabase))
    if (!before.drugsUpdatedAt) throw new Error('The server returned no drugs version stamp')

    log('Reading published generics, formulations and brands')
    const tables = {}
    for (const t of ['generics', 'formulations', 'brands']) {
      tables[t] = await readTable(supabase, t)
      log(`  ${t}: ${tables[t].length} published rows`)
    }

    let download = null
    if (compare) {
      log("Downloading today's flat list from Supabase (the app's own download code), for the comparison")
      download = await fetchFlatDrugs(supabase)
      log(`  flat list: ${download.length} rows`)
    }

    const after = await withRetry('version stamp (after)', () => fetchMetadataTimestamps(supabase))
    if (after.drugsUpdatedAt !== before.drugsUpdatedAt) {
      log(`The version stamp moved while reading (${before.drugsUpdatedAt} to ${after.drugsUpdatedAt}).`)
      if (attempt >= maxAttempts) {
        throw new Error(`The data kept changing while reading (${maxAttempts} tries). Nothing was written. Run it again when no edits are being made.`)
      }
      continue
    }

    // Build, serialise, and check what was serialised (not the in-memory objects)
    const { chunks, stats } = buildChunks(tables, chunkCount)
    if (stats.brands === 0) {
      throw new Error('There are no published drugs to put in the files. A broken read must never become an empty catalog. Nothing was written.')
    }
    const serialised = chunks.map((chunk, index) => {
      const text = JSON.stringify(chunk)
      const hash = sha256(text)
      return { index, text, hash, file: chunkFileName(index, hash), generics: chunk.length, bytes: Buffer.byteLength(text) }
    })

    const rebuilt = flattenChunks(serialised.map(s => JSON.parse(s.text)))
    if (compare) {
      const cmp = compareFlatLists(download, rebuilt)
      if (!cmp.identical) {
        throw new Error(`The new files do NOT match today's Supabase download. Nothing was written.\n${describeDifferences(cmp)}`)
      }
      log(`Check passed: all ${cmp.countA} rows are identical (row by row, by brand id)`)
    } else {
      log('Check SKIPPED (--no-compare): do not publish these files')
    }
    if (rebuilt.length !== stats.brands) {
      throw new Error(`Internal check failed: ${stats.brands} brands built but ${rebuilt.length} rows rebuilt. Nothing was written.`)
    }

    // Write: chunk files first, manifest last
    await rm(outDir, { recursive: true, force: true })
    await mkdir(outDir, { recursive: true })
    for (const s of serialised) await writeFile(path.join(outDir, s.file), s.text)

    const manifest = {
      catalogFormat: CATALOG_FORMAT,
      schemaVersion: FLAT_DRUG_SCHEMA_VERSION,
      drugsUpdatedAt: before.drugsUpdatedAt,
      auditCursor: bookmark,
      builtAt: new Date().toISOString(),
      chunkCount,
      totals: { generics: stats.generics, formulations: stats.formulations, brands: stats.brands },
      chunks: serialised.map(s => ({ index: s.index, file: s.file, hash: s.hash, generics: s.generics, bytes: s.bytes })),
    }
    await writeFile(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2))

    // Read back from disk: every file must hash to what the manifest says
    for (const c of manifest.chunks) {
      const onDisk = await readFile(path.join(outDir, c.file), 'utf8')
      if (sha256(onDisk) !== c.hash) throw new Error(`Read-back check failed for ${c.file}`)
    }

    // Sizes (measured, not guessed)
    const raw = serialised.reduce((n, s) => n + s.bytes, 0)
    let gz = 0
    let br = 0
    for (const s of serialised) {
      const buf = Buffer.from(s.text)
      gz += zlib.gzipSync(buf, { level: 9 }).length
      br += zlib.brotliCompressSync(buf, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 9 } }).length
    }
    log(`Wrote ${manifest.chunks.length} chunk files and manifest.json to ${outDir}`)
    log(`  generics ${stats.generics}, formulations ${stats.formulations}, brands ${stats.brands} (left out: ${stats.droppedBrands} brands not fully published)`)
    log(`  size: ${mb(raw)} raw, ${mb(gz)} gzip, ${mb(br)} brotli (level 9)`)
    log(`  version stamp ${before.drugsUpdatedAt}, bookmark ${bookmark}, format ${FLAT_DRUG_SCHEMA_VERSION}`)
    return { manifest, outDir }
  }
}

// ─── Command line ───────────────────────────────────────────────────────────

/** The build must only ever use the public key. Refuse anything that looks like a service key. */
export function assertPublicKey(key) {
  if (key.startsWith('sb_secret_')) throw new Error('That is a secret key. Use the public (anon / publishable) key only.')
  if (key.split('.').length === 3) {
    try {
      const payload = JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString('utf8'))
      if (payload.role && payload.role !== 'anon') throw new Error(`That key has the role "${payload.role}". Use the public (anon) key only.`)
    } catch (err) {
      if (String(err.message).startsWith('That key')) throw err
    }
  }
}

async function main() {
  await import('dotenv/config')
  const args = process.argv.slice(2)
  const outIdx = args.indexOf('--out')
  const outDir = path.resolve(outIdx >= 0 ? args[outIdx + 1] : 'catalog-dist')
  const compare = !args.includes('--no-compare')

  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const key = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
  if (!url || !key) {
    console.error('Missing SUPABASE_URL / SUPABASE_ANON_KEY (or VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).')
    process.exit(2)
  }
  assertPublicKey(key)

  const { createClient } = await import('@supabase/supabase-js')
  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
  await runBuild({ supabase, outDir, compare })
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(err => {
    console.error('\nBUILD FAILED: ' + (err?.message ?? err))
    process.exit(1)
  })
}
