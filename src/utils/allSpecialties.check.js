// Checks for allSpecialties.js. Run with: node --test src/utils/allSpecialties.check.js
import test from 'node:test'
import assert from 'node:assert/strict'
import { mapSpecialtyRow, mergeSpecialties, UNCATEGORIZED_ID } from './allSpecialties.js'

const row = (id, name, sort, extra = {}) => ({ id, name_en: name, slug: name.toLowerCase(), sort_order: sort, is_active: true, icon_type: 'lucide', icon_name: 'Heart', color_token: 'rose', ...extra })

test('mapSpecialtyRow: maps a row to the picker shape, bad input answers null', () => {
  const s = mapSpecialtyRow(row('a', 'Cardiology', 8))
  assert.equal(s.id, 'a'); assert.equal(s.name, 'Cardiology'); assert.equal(s.iconType, 'lucide')
  assert.equal(s.iconValue, 'Heart'); assert.equal(s.colorToken, 'rose'); assert.equal(s.sortOrder, 8)
  assert.equal(mapSpecialtyRow(null), null)
  assert.equal(mapSpecialtyRow({}), null)
  assert.equal(mapSpecialtyRow({ id: 'x', name_en: '  ' }), null)
})

test('mapSpecialtyRow: a custom icon uses its url, a missing icon falls back to the stethoscope', () => {
  assert.equal(mapSpecialtyRow(row('a', 'A', 1, { icon_type: 'custom', icon_url: 'https://x/y.svg' })).iconValue, 'https://x/y.svg')
  assert.equal(mapSpecialtyRow(row('a', 'A', 1, { icon_name: null })).iconValue, 'Stethoscope')
})

test('mergeSpecialties: a specialty with no topics is added to the list', () => {
  const fromTopics = [{ id: 'a', name: 'Pediatrics', sortOrder: 3 }]
  const fetched = [row('a', 'Pediatrics', 3), row('c', 'Cardiology', 8)]
  const out = mergeSpecialties(fromTopics, fetched)
  assert.deepEqual(out.map(s => s.id), ['a', 'c'])
})

test('mergeSpecialties: the topics\' own entry wins when both have the same id', () => {
  const fromTopics = [{ id: 'a', name: 'Pediatrics', sortOrder: 3, colorToken: 'from-topics' }]
  const out = mergeSpecialties(fromTopics, [row('a', 'Pediatrics', 3, { color_token: 'from-table' })])
  assert.equal(out.length, 1); assert.equal(out[0].colorToken, 'from-topics')
})

test('mergeSpecialties: Uncategorized and inactive specialties are left out', () => {
  const out = mergeSpecialties([], [row(UNCATEGORIZED_ID, 'Uncategorized', 1), row('b', 'Old', 2, { is_active: false }), row('c', 'Cardiology', 8)])
  assert.deepEqual(out.map(s => s.id), ['c'])
})

test('mergeSpecialties: before the fetch answers (or offline) the topics\' list is kept as it is', () => {
  const fromTopics = [{ id: 'b', name: 'B', sortOrder: 2 }, { id: 'a', name: 'A', sortOrder: 1 }]
  assert.deepEqual(mergeSpecialties(fromTopics, null).map(s => s.id), ['a', 'b'])
  assert.deepEqual(mergeSpecialties(undefined, undefined), [])
})

test('mergeSpecialties: sorted by the admin order, then by name', () => {
  const out = mergeSpecialties([], [row('z', 'Zed', 5), row('y', 'Alpha', 5), row('x', 'First', 1)])
  assert.deepEqual(out.map(s => s.name), ['First', 'Alpha', 'Zed'])
})
