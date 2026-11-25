// Checks for catalogChunks.js (Track S, step S2.1). Run with: node --test src/utils/catalogChunks.check.js
import test from 'node:test'
import assert from 'node:assert/strict'
import { FULL_BRAND_SELECT, mapFlatDrugRows } from '../lib/queries.js'
import {
  CATALOG_COLUMNS, CATALOG_CHUNK_COUNT, splitSelectColumns, hashId, chunkIndexFor,
  buildChunks, chunksToRawBrandRows, flattenChunks, compareFlatLists,
} from './catalogChunks.js'
import { makeTables, fixtureId } from '../../scripts/catalogFixture.mjs'

// The nested rows the database would return for FULL_BRAND_SELECT, built straight from the tables
// (the independent route the chunk route is checked against).
function directNestedRows({ generics, formulations, brands }) {
  const g = new Map(generics.map(r => [r.id, r]))
  const f = new Map(formulations.map(r => [r.id, r]))
  const pickCols = (row, cols) => Object.fromEntries(cols.map(c => [c, row[c]]))
  return brands.filter(b => b.is_published === true).map(b => {
    const form = f.get(b.formulation_id)
    const gen = g.get(form.generic_id)
    return {
      ...pickCols(b, CATALOG_COLUMNS.brand),
      formulations: { ...pickCols(form, CATALOG_COLUMNS.formulation), generics: pickCols(gen, CATALOG_COLUMNS.generic) },
    }
  })
}

test('the select is split into the three levels, with the columns the app reads today', () => {
  assert.equal(CATALOG_COLUMNS.brand.length, 11)
  assert.equal(CATALOG_COLUMNS.formulation.length, 13)
  assert.equal(CATALOG_COLUMNS.generic.length, 24)
  assert.ok(CATALOG_COLUMNS.brand.includes('price') && CATALOG_COLUMNS.brand.includes('name_ar_full'))
  assert.ok(CATALOG_COLUMNS.formulation.includes('doses_structured'))
  assert.ok(CATALOG_COLUMNS.generic.includes('ingredients') && CATALOG_COLUMNS.generic.includes('mechanism_of_action'))
  // every column of the real select is accounted for exactly once
  const all = [...CATALOG_COLUMNS.brand, ...CATALOG_COLUMNS.formulation, ...CATALOG_COLUMNS.generic]
  assert.equal(new Set(all).size, all.length - 6, 'only id, slug and is_published repeat, at all three levels')
  assert.ok(FULL_BRAND_SELECT.includes('formulations ('))
})

test('a select with a different shape is refused, not misread', () => {
  assert.throws(() => splitSelectColumns('id, name'), /unexpected select shape/)
  assert.throws(() => splitSelectColumns('id, formulations ( id, generics ( id, extra ( x ) ) )'), /unexpected select shape|nested or odd/)
})

test('the chunk of a generic is stable, in range, and spread over all 32 chunks', () => {
  assert.equal(CATALOG_CHUNK_COUNT, 32)
  assert.equal(chunkIndexFor(fixtureId('g', 7)), chunkIndexFor(fixtureId('g', 7)))
  assert.equal(hashId('abc'), 0x1A47E90B) // fixed value: changing the hash would move every generic
  const counts = new Array(32).fill(0)
  for (let n = 1; n <= 7240; n++) {
    const i = chunkIndexFor(fixtureId('g', n))
    assert.ok(Number.isInteger(i) && i >= 0 && i < 32)
    counts[i]++
  }
  assert.ok(counts.every(c => c > 0), 'no empty chunk')
  assert.ok(Math.max(...counts) < 1.5 * (7240 / 32), 'no chunk much bigger than the average')
})

test('only published rows with a fully published chain are kept; empty parents are left out', () => {
  const t = makeTables()
  const { chunks, stats } = buildChunks(t)
  const brandIds = chunks.flat().flatMap(g => g.formulations.flatMap(f => f.brands.map(b => b.id)))
  assert.equal(stats.brands, brandIds.length)
  assert.equal(new Set(brandIds).size, brandIds.length, 'no brand twice')
  const published = t.brands.filter(b => b.is_published)
  assert.equal(stats.droppedBrands, t.brands.length - brandIds.length)
  assert.ok(brandIds.length < published.length, 'brands under an unpublished parent are dropped')
  for (const g of chunks.flat()) {
    assert.equal(g.is_published, true)
    assert.ok(g.formulations.length > 0, 'a generic with no kept formulation is left out')
    for (const f of g.formulations) { assert.equal(f.is_published, true); assert.ok(f.brands.length > 0) }
  }
})

test('files hold the selected columns only: no parent link columns, no unselected columns', () => {
  const { chunks } = buildChunks(makeTables())
  const g = chunks.flat()[0]
  assert.deepEqual(Object.keys(g).filter(k => k !== 'formulations'), CATALOG_COLUMNS.generic)
  assert.deepEqual(Object.keys(g.formulations[0]).filter(k => k !== 'brands'), CATALOG_COLUMNS.formulation)
  assert.deepEqual(Object.keys(g.formulations[0].brands[0]), CATALOG_COLUMNS.brand)
  assert.ok(!JSON.stringify(chunks).includes('internal_note'))
  assert.ok(!JSON.stringify(chunks).includes('generic_id') && !JSON.stringify(chunks).includes('formulation_id'))
})

test('the flat list from the chunks equals the app mapping of the direct nested rows (row by row)', () => {
  const t = makeTables({ generics: 60, brands: 200 })
  const { chunks } = buildChunks(t)
  const viaChunks = flattenChunks(JSON.parse(JSON.stringify(chunks)))      // through JSON, like a file
  const direct = mapFlatDrugRows(directNestedRows(t))
  const cmp = compareFlatLists(direct, viaChunks)
  assert.equal(cmp.identical, true, JSON.stringify(cmp))
  assert.equal(viaChunks.length, direct.length)
  assert.ok(viaChunks.length > 100)
  // spot check one row's shape against the app's FlatDrug fields
  const row = viaChunks[0]
  for (const k of ['id', 'name', 'price', 'formulationId', 'genericId', 'genericName', 'ingredients', 'doses', 'textbookDoseNotes']) {
    assert.ok(k in row, `FlatDrug field ${k}`)
  }
  assert.equal(chunksToRawBrandRows(chunks).length, viaChunks.length)
})

test('one edit changes exactly one chunk', () => {
  const t = makeTables({ generics: 200, brands: 500 })
  const before = buildChunks(t).chunks.map(c => JSON.stringify(c))
  const t2 = structuredClone(t)
  const b = t2.brands[123]
  b.price = b.price + 1
  const after = buildChunks(t2).chunks.map(c => JSON.stringify(c))
  const changed = after.map((c, i) => (c !== before[i] ? i : -1)).filter(i => i >= 0)
  assert.equal(changed.length, 1)
  const form = t.formulations.find(f => f.id === b.formulation_id)
  assert.equal(changed[0], chunkIndexFor(form.generic_id))
})

test('the same data always builds the same bytes', () => {
  const t = makeTables({ generics: 80, brands: 250 })
  const shuffled = { generics: [...t.generics].reverse(), formulations: [...t.formulations].reverse(), brands: [...t.brands].reverse() }
  assert.equal(JSON.stringify(buildChunks(t).chunks), JSON.stringify(buildChunks(shuffled).chunks))
})

test('the comparison finds a changed price, a missing row, an extra row and a duplicate; ignores order', () => {
  const t = makeTables()
  const flat = flattenChunks(buildChunks(t).chunks)
  assert.equal(compareFlatLists(flat, [...flat].reverse()).identical, true)

  const changed = structuredClone(flat); changed[3].price += 1
  const c1 = compareFlatLists(flat, changed)
  assert.equal(c1.identical, false)
  assert.deepEqual(c1.different, [{ id: flat[3].id, fields: ['price'] }])

  const c2 = compareFlatLists(flat, flat.slice(1))
  assert.deepEqual(c2.onlyInA, [flat[0].id])

  const c3 = compareFlatLists(flat.slice(1), flat)
  assert.deepEqual(c3.onlyInB, [flat[0].id])

  const c4 = compareFlatLists(flat, [...flat, flat[0]])
  assert.equal(c4.identical, false)
  assert.deepEqual(c4.duplicatesB, [flat[0].id])

  const nested = structuredClone(flat); nested[5].doses = [{ x: 1 }]
  assert.deepEqual(compareFlatLists(flat, nested).different[0].fields, ['doses'])
})
