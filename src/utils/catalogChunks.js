/**
 * catalogChunks.js — the drug catalog as static chunk files (Track S, step S2.1)
 *
 * Pure functions only: no network, no files, no Supabase client. Used by the
 * build script (scripts/build-catalog.mjs) now, and by the app later (S2.3),
 * so both sides turn the files into the SAME flat list the app uses today.
 *
 * Shape of the files (decision D3): a chunk is a list of generics; each generic
 * holds its formulations; each formulation holds its brands. Every generic is
 * written once. The columns are exactly the ones fetchFlatDrugs selects today
 * (FULL_BRAND_SELECT in src/lib/queries.js), split by nesting level.
 *
 * Which chunk a generic lives in (decision D2): FNV-1a hash of the generic's
 * id, modulo the chunk count. Never by position, so a new or changed generic
 * touches exactly one chunk.
 *
 * Turning chunks back into the flat list: the nested rows are rebuilt in the
 * exact shape the database returns for FULL_BRAND_SELECT and handed to the
 * app's own mapFlatDrugRows, so there is one mapping function, not two.
 */

import { FULL_BRAND_SELECT, mapFlatDrugRows } from '../lib/queries.js'

export const CATALOG_CHUNK_COUNT = 32

// ─── Columns by nesting level ──────────────────────────────────────────────

/**
 * Split a select string like FULL_BRAND_SELECT into the columns of each level:
 *   { brand: [...], formulation: [...], generic: [...] }
 * Level 1 is everything before `formulations (`, level 2 is everything between
 * `formulations (` and `generics (`, level 3 is the rest up to the closing
 * bracket. Throws if the string does not have exactly this three-level shape,
 * so a future change to the select cannot be silently misread.
 */
export function splitSelectColumns(select) {
  const flat = select.replace(/\s+/g, ' ').trim()
  const m = flat.match(/^(.*?)formulations\s*\((.*?)generics\s*\((.*?)\)\s*\)$/)
  if (!m) throw new Error('splitSelectColumns: unexpected select shape (expected brands > formulations > generics)')
  const cols = text => text.split(',').map(c => c.trim()).filter(Boolean)
  const brand = cols(m[1])
  const formulation = cols(m[2])
  const generic = cols(m[3])
  for (const [name, list] of [['brand', brand], ['formulation', formulation], ['generic', generic]]) {
    if (list.length === 0) throw new Error(`splitSelectColumns: no ${name} columns found`)
    if (list.some(c => /[()\s]/.test(c))) throw new Error(`splitSelectColumns: ${name} level has a nested or odd column`)
  }
  return { brand, formulation, generic }
}

export const CATALOG_COLUMNS = splitSelectColumns(FULL_BRAND_SELECT)

// ─── Which chunk does a generic live in ─────────────────────────────────────

/** FNV-1a, 32 bit, over the UTF-16 code units of the id (ids are plain ASCII uuids). */
export function hashId(id) {
  let h = 0x811c9dc5
  const s = String(id)
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

export function chunkIndexFor(genericId, chunkCount = CATALOG_CHUNK_COUNT) {
  return hashId(genericId) % chunkCount
}

// ─── Building the nested chunks from the three tables ──────────────────────

function pick(row, columns) {
  const out = {}
  for (const c of columns) out[c] = row[c] === undefined ? null : row[c]
  return out
}

const byId = (a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)

/**
 * Build the chunks from the three table reads.
 *
 * @param {{ generics: object[], formulations: object[], brands: object[] }} tables
 *   formulations carry `generic_id`; brands carry `formulation_id`.
 * @returns {{ chunks: object[][], stats: object }} chunks[i] is a list of nested
 *   generics, in id order. Only published rows whose whole chain is published
 *   are kept (the same rows mapFlatDrugRows keeps). Formulations without a
 *   kept brand, and generics without a kept formulation, are left out: the
 *   flat list is brand-based and has no row for them.
 */
export function buildChunks({ generics, formulations, brands }, chunkCount = CATALOG_CHUNK_COUNT) {
  const pubGenerics = new Map()
  for (const g of generics) if (g.is_published === true) pubGenerics.set(g.id, g)

  const pubForms = new Map()
  for (const f of formulations) {
    if (f.is_published === true && pubGenerics.has(f.generic_id)) pubForms.set(f.id, f)
  }

  const brandsByForm = new Map()
  let droppedBrands = 0
  for (const b of brands) {
    if (b.is_published === true && pubForms.has(b.formulation_id)) {
      if (!brandsByForm.has(b.formulation_id)) brandsByForm.set(b.formulation_id, [])
      brandsByForm.get(b.formulation_id).push(b)
    } else {
      droppedBrands++
    }
  }

  const formsByGeneric = new Map()
  for (const f of pubForms.values()) {
    if (!brandsByForm.has(f.id)) continue
    if (!formsByGeneric.has(f.generic_id)) formsByGeneric.set(f.generic_id, [])
    formsByGeneric.get(f.generic_id).push(f)
  }

  const chunks = Array.from({ length: chunkCount }, () => [])
  let keptBrands = 0
  let keptForms = 0
  let keptGenerics = 0

  for (const g of [...pubGenerics.values()].sort(byId)) {
    const forms = formsByGeneric.get(g.id)
    if (!forms) continue
    const nested = pick(g, CATALOG_COLUMNS.generic)
    nested.formulations = forms.sort(byId).map(f => {
      const bs = brandsByForm.get(f.id).sort(byId)
      keptBrands += bs.length
      keptForms++
      const nf = pick(f, CATALOG_COLUMNS.formulation)
      nf.brands = bs.map(b => pick(b, CATALOG_COLUMNS.brand))
      return nf
    })
    keptGenerics++
    chunks[chunkIndexFor(g.id, chunkCount)].push(nested)
  }

  return {
    chunks,
    stats: { generics: keptGenerics, formulations: keptForms, brands: keptBrands, droppedBrands },
  }
}

// ─── From chunks back to today's flat list ─────────────────────────────────

/** Rebuild the raw brand rows exactly as the database returns FULL_BRAND_SELECT. */
export function chunksToRawBrandRows(chunks) {
  const rows = []
  for (const chunk of chunks) {
    for (const g of chunk) {
      const { formulations, ...generic } = g
      for (const f of formulations) {
        const { brands, ...formulation } = f
        for (const b of brands) {
          rows.push({ ...b, formulations: { ...formulation, generics: generic } })
        }
      }
    }
  }
  return rows
}

/**
 * The one shared function: chunks in, the app's flat list out (FlatDrug[]),
 * in brand-id order so the result is the same every time.
 */
export function flattenChunks(chunks) {
  return mapFlatDrugRows(chunksToRawBrandRows(chunks)).sort(byId)
}

// ─── The row-by-row comparison (decision D3) ───────────────────────────────

function stableStringify(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return '[' + value.map(stableStringify).join(',') + ']'
  const keys = Object.keys(value).sort()
  return '{' + keys.map(k => JSON.stringify(k) + ':' + stableStringify(value[k])).join(',') + '}'
}

/**
 * Compare two flat lists row by row, matched by brand id, ignoring order.
 * Keys are compared in sorted order and `undefined` is treated as missing, so
 * only real differences count.
 *
 * @returns {{ identical: boolean, countA: number, countB: number,
 *             onlyInA: string[], onlyInB: string[], different: Array<{id: string, fields: string[]}> }}
 */
export function compareFlatLists(a, b) {
  const mapA = new Map()
  const mapB = new Map()
  const duplicatesA = []
  const duplicatesB = []
  for (const r of a) { if (mapA.has(r.id)) duplicatesA.push(r.id); mapA.set(r.id, r) }
  for (const r of b) { if (mapB.has(r.id)) duplicatesB.push(r.id); mapB.set(r.id, r) }

  const onlyInA = []
  const onlyInB = []
  const different = []
  for (const [id, ra] of mapA) {
    const rb = mapB.get(id)
    if (!rb) { onlyInA.push(id); continue }
    if (stableStringify(ra) !== stableStringify(rb)) {
      const fields = [...new Set([...Object.keys(ra), ...Object.keys(rb)])]
        .filter(k => stableStringify(ra[k] ?? null) !== stableStringify(rb[k] ?? null))
        .sort()
      different.push({ id, fields })
    }
  }
  for (const id of mapB.keys()) if (!mapA.has(id)) onlyInB.push(id)

  return {
    identical: onlyInA.length === 0 && onlyInB.length === 0 && different.length === 0
      && duplicatesA.length === 0 && duplicatesB.length === 0,
    countA: a.length,
    countB: b.length,
    onlyInA,
    onlyInB,
    different,
    duplicatesA,
    duplicatesB,
  }
}
