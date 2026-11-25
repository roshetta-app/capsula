// Made-up catalog rows for the catalog checks. Deterministic: the same call gives the same rows.
// Every column the app selects is present, plus one extra column per table that is NOT selected
// (`internal_note`), so the checks can prove unselected columns never reach the files.

import { CATALOG_COLUMNS } from '../src/utils/catalogChunks.js'

const KIND = { g: '1', f: '2', b: '3' }
export function fixtureId(kind, n) {
  return `${KIND[kind]}0000000-0000-4000-8000-${n.toString(16).padStart(12, '0')}`
}

const JSON_LISTS = new Set([
  'uses_structured', 'warnings_legacy', 'side_effects', 'contraindications', 'drug_interactions',
  'dose_adjustments', 'pharmacokinetics', 'sources', 'textbook_doses', 'form_modifier', 'route_details',
  'doses_structured',
])

function fill(columns, values) {
  const row = {}
  for (const c of columns) row[c] = c in values ? values[c] : JSON_LISTS.has(c) ? [] : null
  return row
}

function makeGeneric(n, published = true) {
  return {
    ...fill(CATALOG_COLUMNS.generic, {
      id: fixtureId('g', n), slug: `generic-${n}`, name_en: `Generic ${n}`,
      category: `Category ${n % 5}`, class: `Class ${n % 9}`, subclass: n % 2 ? `Subclass ${n % 4}` : null,
      uses_structured: [{ use: `use ${n}`, detail: 'a longer line of text about the use' }],
      side_effects: [{ name: `effect ${n}`, frequency: 'common' }],
      pregnancy_category: ['A', 'B', 'C', 'D', 'X'][n % 5], breastfeeding_safety: n % 3 ? 'compatible' : null,
      crosses_placenta: n % 3 === 0 ? true : n % 3 === 1 ? false : null, crosses_bbb: n % 2 === 0,
      drug_interactions: [{ drug: `drug ${n % 17}`, effect: 'raises levels' }],
      pharmacokinetics: [{ half_life: `${n % 12} h` }],
      clinical_relevance: `Clinical text ${n} ${'lorem ipsum '.repeat(n % 7)}`,
      sources: [{ title: `Source ${n % 6}` }],
      mechanism_of_action: `Mechanism ${n}`,
      is_published: published,
      ingredients: n % 10 === 0 ? [`Ingredient ${n}a`, `Ingredient ${n}b`] : null,
    }),
    internal_note: `not selected ${n}`,
  }
}

function makeFormulation(n, genericN, published = true) {
  return {
    ...fill(CATALOG_COLUMNS.formulation, {
      id: fixtureId('f', n), slug: `formulation-${n}`, concentration: `${(n % 8 + 1) * 50} mg`,
      strength_value: (n % 8 + 1) * 50, strength_unit: 'mg', strength_basis: n % 4 === 0 ? 'base' : null,
      form: ['tablet', 'capsule', 'syrup', 'injection'][n % 4], form_modifier: n % 3 === 0 ? ['film-coated'] : [],
      route: n % 4 === 3 ? 'IV' : 'oral', route_details: [],
      doses_structured: [{ population: 'adult', dose: `${n % 5 + 1} per day` }],
      default_dose_override: null, is_published: published,
    }),
    generic_id: fixtureId('g', genericN),
    internal_note: `not selected ${n}`,
  }
}

function makeBrand(n, formulationN, published = true) {
  return {
    ...fill(CATALOG_COLUMNS.brand, {
      id: fixtureId('b', n), slug: `brand-${n}`, name: `Brand ${n}`, name_ar: n % 3 ? `ماركة ${n}` : null,
      name_ar_full: null, tradename_clean: `Brand ${n} clean`, manufacturer: `Maker ${n % 13}`,
      price: Math.round((n % 400 + 5) * 2.5 * 100) / 100, pack_size: n % 4 ? `${n % 5 + 1} x 10` : null,
      fill_volume: null, is_published: published,
    }),
    formulation_id: fixtureId('f', formulationN),
    internal_note: `not selected ${n}`,
  }
}

/**
 * @param {{ generics?: number, brands?: number }} [size]
 * Includes on purpose: a generic with no formulation, a formulation with no brand, an unpublished
 * generic (with a published formulation and brand under it), an unpublished formulation (with a
 * published brand under it), and an unpublished brand.
 */
export function makeTables({ generics = 40, brands = 120 } = {}) {
  const G = []
  const F = []
  const B = []
  let fN = 0
  const liveForms = []
  for (let n = 1; n <= generics; n++) {
    G.push(makeGeneric(n))
    if (n % 11 === 0) continue                       // a generic with no formulation
    const count = 1 + (n % 3)
    for (let k = 0; k < count; k++) {
      fN++
      F.push(makeFormulation(fN, n))
      liveForms.push(fN)
    }
  }
  // a formulation with no brand (last live formulation gets none)
  const withBrands = liveForms.slice(0, -1)
  let bN = 0
  for (let k = 0; k < brands; k++) {
    bN++
    B.push(makeBrand(bN, withBrands[k % withBrands.length]))
  }
  // unpublished generic, with a published formulation and brand under it
  G.push(makeGeneric(generics + 1, false))
  fN++; F.push(makeFormulation(fN, generics + 1)); bN++; B.push(makeBrand(bN, fN))
  // unpublished formulation under a published generic, with a published brand under it
  fN++; F.push(makeFormulation(fN, 1, false)); bN++; B.push(makeBrand(bN, fN))
  // an unpublished brand under a published formulation
  bN++; B.push(makeBrand(bN, withBrands[0], false))
  return { generics: G, formulations: F, brands: B }
}
