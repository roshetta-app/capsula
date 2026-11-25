/**
 * catalogStatic.js — read the drug catalog from the static host (Track S, step S2.3)
 *
 * The 32 chunk files and manifest.json are published to Cloudflare Pages by the catalog
 * publish workflow (S2.2). This file is the app's side of it: ask the manifest what the
 * files are, download the chunks 4 at a time, check each one against the hash in the
 * manifest, and turn them into the same flat list the app builds from Supabase today
 * (the one shared function, flattenChunks in utils/catalogChunks.js).
 *
 * It only ever replaces a FULL download. Normal opens, the version stamp check and the
 * change-log update are untouched. It is used behind a remote on/off switch (a row in
 * cms_config, key CATALOG_SWITCH_KEY): no row, or any value other than 'true', means OFF.
 * Any problem at all (switch unreadable, host down, wrong format, bad file) makes the caller
 * fall back to today's Supabase download, so the worst case is the old behaviour.
 *
 * What a successful download hands back: the list, plus the manifest's own version stamp
 * and change-log bookmark. The caller saves THOSE with the list (not the live ones), so the
 * normal change-log update brings the phone up to date from exactly the point the files were
 * built at.
 *
 * No Supabase data is read here except the one small switch row.
 */

import { FLAT_DRUG_SCHEMA_VERSION } from './queries.js'
import { flattenChunks } from '../utils/catalogChunks.js'

/** Where the files live (S2.2, Cloudflare Pages). */
export const CATALOG_HOST = 'https://capsula-catalog.pages.dev'

/** Must equal CATALOG_FORMAT in scripts/build-catalog.mjs (a check compares them). */
export const CATALOG_FORMAT = 1

/** The remote switch: a cms_config row with this key and the value 'true' turns the static path on. */
export const CATALOG_SWITCH_KEY = 'catalog_static_enabled'

const SWITCH_TIMEOUT_MS = 4000
const MANIFEST_TIMEOUT_MS = 10000
const CHUNK_TIMEOUT_MS = 30000
const CHUNK_FILE_PATTERN = /^chunk-\d{2}\.[0-9a-f]{12}\.json$/

export class StaticCatalogError extends Error {
  constructor(code, message) {
    super(message)
    this.name = 'StaticCatalogError'
    this.code = code
  }
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

// ─── The remote switch ──────────────────────────────────────────────────────

/**
 * Is the static path switched on? Reads one small row. Missing row, a read error, a slow
 * answer or any value other than 'true' all mean OFF, so the switch can never break a download.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {number} [timeoutMs]
 * @returns {Promise<boolean>}
 */
export async function isStaticCatalogEnabled(supabase, timeoutMs = SWITCH_TIMEOUT_MS) {
  let timer
  try {
    const request = supabase.from('cms_config').select('value').eq('key', CATALOG_SWITCH_KEY).maybeSingle()
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error('switch read timed out')), timeoutMs)
    })
    const { data, error } = await Promise.race([request, timeout])
    if (error) return false
    return String(data?.value ?? '').trim().toLowerCase() === 'true'
  } catch {
    return false
  } finally {
    clearTimeout(timer)
  }
}

// ─── Small helpers ──────────────────────────────────────────────────────────

async function request(fetchImpl, url, timeoutMs, extra = {}) {
  const controller = typeof AbortController === 'function' ? new AbortController() : null
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null
  try {
    return await fetchImpl(url, { ...extra, ...(controller ? { signal: controller.signal } : {}) })
  } finally {
    if (timer) clearTimeout(timer)
  }
}

/** SHA-256 of a string as lowercase hex, or null when this environment has no crypto.subtle. */
async function sha256Hex(text) {
  const subtle = globalThis.crypto?.subtle
  if (!subtle) return null
  const digest = await subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('')
}

// ─── The manifest ───────────────────────────────────────────────────────────

function checkManifest(manifest, schemaVersion) {
  if (!manifest || typeof manifest !== 'object') {
    throw new StaticCatalogError('manifest-unusable', 'The manifest is not an object')
  }
  if (manifest.catalogFormat !== CATALOG_FORMAT) {
    throw new StaticCatalogError('manifest-unusable', `Catalog format ${manifest.catalogFormat} is not the one this app reads (${CATALOG_FORMAT})`)
  }
  if (manifest.schemaVersion !== schemaVersion) {
    throw new StaticCatalogError('manifest-unusable', 'The files were built for a different drug list shape than this app version')
  }
  if (typeof manifest.drugsUpdatedAt !== 'string' || !manifest.drugsUpdatedAt) {
    throw new StaticCatalogError('manifest-unusable', 'The manifest has no version stamp')
  }
  if (typeof manifest.auditCursor !== 'string' || !manifest.auditCursor) {
    throw new StaticCatalogError('manifest-unusable', 'The manifest has no change-log bookmark')
  }
  if (!Array.isArray(manifest.chunks) || manifest.chunks.length === 0 || manifest.chunks.length !== manifest.chunkCount) {
    throw new StaticCatalogError('manifest-unusable', 'The manifest chunk list is missing or does not match its count')
  }
  if (!manifest.totals || !(manifest.totals.brands > 0)) {
    throw new StaticCatalogError('manifest-unusable', 'The manifest says there are no drugs')
  }
  for (const c of manifest.chunks) {
    if (typeof c?.file !== 'string' || !CHUNK_FILE_PATTERN.test(c.file) || typeof c.hash !== 'string' || !c.hash) {
      throw new StaticCatalogError('manifest-unusable', 'The manifest lists a chunk with a bad name or no hash')
    }
  }
}

async function readManifest(base, fetchImpl, schemaVersion) {
  let res
  try {
    res = await request(fetchImpl, `${base}/manifest.json`, MANIFEST_TIMEOUT_MS, { cache: 'no-store' })
  } catch (err) {
    throw new StaticCatalogError('manifest-unreadable', `The manifest could not be reached: ${err?.message ?? err}`)
  }
  if (!res.ok) throw new StaticCatalogError('manifest-unreadable', `The manifest answered ${res.status}`)
  let manifest
  try {
    manifest = await res.json()
  } catch {
    throw new StaticCatalogError('manifest-unreadable', 'The manifest is not valid JSON')
  }
  checkManifest(manifest, schemaVersion)
  return manifest
}

// ─── One chunk, and all of them ─────────────────────────────────────────────

/**
 * One chunk file, checked against the manifest (hash and generic count). A missing file (404)
 * or content that does not match is reported as 'chunk-gone' / 'chunk-bad': the files were
 * most likely replaced by a newer publish since the manifest was read, so the caller asks
 * for the manifest again. Network trouble is retried here a few times first.
 */
async function readChunk(base, fetchImpl, entry, { attempts, retryDelayMs, verifyHashes }) {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const res = await request(fetchImpl, `${base}/${entry.file}`, CHUNK_TIMEOUT_MS)
      if (res.status === 404) throw new StaticCatalogError('chunk-gone', `${entry.file} is no longer on the host`)
      if (!res.ok) throw new Error(`${entry.file} answered ${res.status}`)
      const text = await res.text()
      if (verifyHashes) {
        const actual = await sha256Hex(text)
        if (actual !== null && actual !== entry.hash) {
          throw new StaticCatalogError('chunk-bad', `${entry.file} does not match the hash in the manifest`)
        }
      }
      let parsed
      try {
        parsed = JSON.parse(text)
      } catch {
        throw new StaticCatalogError('chunk-bad', `${entry.file} is not valid JSON`)
      }
      if (!Array.isArray(parsed) || (Number.isInteger(entry.generics) && parsed.length !== entry.generics)) {
        throw new StaticCatalogError('chunk-bad', `${entry.file} does not hold the expected generics`)
      }
      return parsed
    } catch (err) {
      if (err?.code === 'chunk-gone' || attempt === attempts) throw err
      await sleep(retryDelayMs * attempt)
    }
  }
  throw new StaticCatalogError('chunk-bad', `${entry.file} could not be read`)
}

async function readAllChunks(base, fetchImpl, manifest, { concurrency, onProgress, ...chunkOptions }) {
  const total = manifest.chunks.length
  const results = new Array(total)
  let next = 0
  let loaded = 0
  let failure = null
  onProgress?.(0, total)

  async function worker() {
    while (!failure) {
      const index = next++
      if (index >= total) return
      try {
        results[index] = await readChunk(base, fetchImpl, manifest.chunks[index], chunkOptions)
        loaded++
        onProgress?.(loaded, total)
      } catch (err) {
        failure = failure ?? err
        return
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, total) }, worker))
  if (failure) throw failure
  return results
}

// ─── The whole download ─────────────────────────────────────────────────────

/**
 * Download the whole catalog from the static host.
 *
 * @param {object} [options]
 * @param {(loaded: number, total: number) => void} [options.onProgress] chunks loaded so far / chunks in all
 * @param {string} [options.host]
 * @param {typeof fetch} [options.fetchImpl]
 * @returns {Promise<{ drugs: object[], drugsUpdatedAt: string, auditCursor: string, manifest: object }>}
 *   drugs is the flat list (FlatDrug[]); drugsUpdatedAt and auditCursor are the manifest's own
 *   version stamp and change-log bookmark, to be saved with the list.
 * @throws {StaticCatalogError} on any problem; the caller falls back to the Supabase download.
 */
export async function fetchStaticCatalog({
  host = CATALOG_HOST,
  fetchImpl = (...args) => globalThis.fetch(...args),
  onProgress,
  schemaVersion = FLAT_DRUG_SCHEMA_VERSION,
  concurrency = 4,
  chunkAttempts = 3,
  retryDelayMs = 600,
  manifestRounds = 2,
  verifyHashes = true,
} = {}) {
  const base = host.replace(/\/+$/, '')

  for (let round = 1; round <= manifestRounds; round++) {
    const manifest = await readManifest(base, fetchImpl, schemaVersion)
    try {
      const chunks = await readAllChunks(base, fetchImpl, manifest, {
        concurrency, onProgress, attempts: chunkAttempts, retryDelayMs, verifyHashes,
      })
      const drugs = flattenChunks(chunks)
      if (drugs.length !== manifest.totals.brands) {
        throw new StaticCatalogError('count-mismatch', `The files gave ${drugs.length} drugs but the manifest says ${manifest.totals.brands}`)
      }
      return { drugs, drugsUpdatedAt: manifest.drugsUpdatedAt, auditCursor: manifest.auditCursor, manifest }
    } catch (err) {
      // The host was republished while we were downloading: ask for the manifest again, once.
      const replaced = err?.code === 'chunk-gone' || err?.code === 'chunk-bad'
      if (replaced && round < manifestRounds) continue
      throw err
    }
  }
  throw new StaticCatalogError('manifest-unreadable', 'The catalog could not be read')
}
