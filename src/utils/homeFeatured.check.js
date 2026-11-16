// Checks for homeFeatured.js (Phase H, step 9.2). Run with: node --test src/utils/homeFeatured.check.js
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  cardTitle, cardLabel, cardLine, cardButton, cardPath, blockedReason, canShow,
  countSummary, summaryText, pickFeatured, cleanTagline, TAGLINE_MAX,
} from './homeFeatured.js'

const topic = (extra = {}, cond = {}) => ({
  id: 't1', kind: 'condition', condition_id: 'c1', brand_id: null, tagline: null, is_active: true,
  conditions: { id: 'c1', name: 'Acute Cholecystitis', slug: 'acute-cholecystitis', is_published: true, specialties: { name_en: 'Gastroenterology' }, ...cond },
  brands: null, ...extra,
})
const drug = (extra = {}, brand = {}) => ({
  id: 'd1', kind: 'brand', condition_id: null, brand_id: 'b1', tagline: null, is_active: true,
  conditions: null,
  brands: { id: 'b1', tradename_clean: 'Motinorm', slug: 'motinorm-10', is_published: true, formulations: { is_published: true, generics: { class: 'Prokinetic', is_published: true } }, ...brand },
  ...extra,
})

test('title, label, button and path for a topic and a drug', () => {
  assert.equal(cardTitle(topic()), 'Acute Cholecystitis')
  assert.equal(cardLabel(topic()), 'Topic \u00b7 Gastroenterology')
  assert.equal(cardButton(topic()), 'Open topic')
  assert.equal(cardPath(topic()), '/conditions/acute-cholecystitis')
  assert.equal(cardTitle(drug()), 'Motinorm')
  assert.equal(cardLabel(drug()), 'Drug \u00b7 Prokinetic')
  assert.equal(cardButton(drug()), 'Open drug')
  assert.equal(cardPath(drug()), '/drugs/motinorm-10')
})

test('label falls back to the plain word; Arabic titles pass through untouched', () => {
  assert.equal(cardLabel(topic({}, { specialties: null })), 'Topic')
  assert.equal(cardLabel(drug({}, { formulations: null })), 'Drug')
  assert.equal(cardLabel({ kind: 'brand', brands: null }), 'Drug')
  assert.equal(cardTitle(topic({}, { name: '  \u0627\u0644\u062a\u0647\u0627\u0628 \u0627\u0644\u0645\u0631\u0627\u0631\u0629  ' })), '\u0627\u0644\u062a\u0647\u0627\u0628 \u0627\u0644\u0645\u0631\u0627\u0631\u0629')
})

test('the line: own line wins, blank falls back to the default for the kind', () => {
  assert.equal(cardLine(topic({ tagline: 'Know the signs' })), 'Know the signs')
  assert.equal(cardLine(topic({ tagline: '   ' })), 'Overview and key points')
  assert.equal(cardLine(drug()), 'Brands, strengths and doses')
})

test('can it show: on and published only, with the reason when not', () => {
  assert.equal(canShow(topic()), true)
  assert.equal(canShow(drug()), true)
  assert.equal(blockedReason(topic({ is_active: false })), 'Switched off')
  assert.equal(blockedReason(topic({ conditions: null })), 'This topic is no longer in the library')
  assert.equal(blockedReason(drug({ brands: null })), 'This drug is no longer in the library')
  assert.equal(blockedReason(topic({}, { is_published: false })), 'This topic is not published')
  assert.equal(blockedReason(drug({}, { is_published: false })), 'This drug is not published')
  assert.equal(blockedReason(drug({}, { formulations: { is_published: false, generics: { is_published: true } } })), 'This drug is not published')
  assert.equal(blockedReason(drug({}, { formulations: { is_published: true, generics: { is_published: false } } })), 'This drug is not published')
  assert.equal(canShow(null), false)
})

test('counts and the summary line', () => {
  const items = [topic(), drug({ id: 'd2' }, { is_published: false }), topic({ id: 't2', is_active: false })]
  assert.deepEqual(countSummary(items), { total: 3, showing: 1 })
  assert.equal(summaryText(items), '1 of 3 can show now')
  assert.equal(summaryText([]), 'Nothing on the list yet')
  assert.deepEqual(countSummary(undefined), { total: 0, showing: 0 })
})

test('random pick: only showable items, never the last one when there is a choice', () => {
  const a = topic({ id: 'a' }), b = drug({ id: 'b' }), off = topic({ id: 'c', is_active: false })
  assert.equal(pickFeatured([], null), null)
  assert.equal(pickFeatured([off], null), null)
  assert.equal(pickFeatured([a], 'a').id, 'a')
  assert.equal(pickFeatured([a, b, off], 'a', () => 0).id, 'b')
  assert.equal(pickFeatured([a, b, off], 'b', () => 0.99).id, 'a')
  assert.equal(pickFeatured([a, b], null, () => 0).id, 'a')
  assert.equal(pickFeatured([a, b], null, () => 0.99).id, 'b')
})

test('short line input: trimmed, blank means none, over the limit is refused', () => {
  assert.deepEqual(cleanTagline('  Know the signs  '), { value: 'Know the signs', error: null })
  assert.deepEqual(cleanTagline('   '), { value: null, error: null })
  assert.deepEqual(cleanTagline(undefined), { value: null, error: null })
  assert.equal(cleanTagline('x'.repeat(TAGLINE_MAX)).error, null)
  assert.ok(cleanTagline('x'.repeat(TAGLINE_MAX + 1)).error)
})

import { resolveFromLibrary } from './homeFeatured.js'

test('Home: rows are matched to the saved library; a missing item gets no joined row and cannot show', () => {
  const rows = [
    { id: 'r1', kind: 'condition', condition_id: 'c1', brand_id: null, tagline: null, is_active: true },
    { id: 'r2', kind: 'brand', condition_id: null, brand_id: 'b1', tagline: 'Gut motility', is_active: true },
    { id: 'r3', kind: 'condition', condition_id: 'gone', brand_id: null, tagline: null, is_active: true },
    { id: 'r4', kind: 'brand', condition_id: null, brand_id: 'gone', tagline: null, is_active: true },
  ]
  const conditions = [{ id: 'c1', slug: 'acute-cholecystitis', name: 'Acute Cholecystitis', specialtyName: 'Gastroenterology' }]
  const drugs = [{ id: 'b1', slug: 'motinorm-10', tradenameClean: 'Motinorm', class: 'Prokinetic' }]
  const items = resolveFromLibrary(rows, conditions, drugs)
  assert.equal(cardTitle(items[0]), 'Acute Cholecystitis')
  assert.equal(cardLabel(items[0]), 'Topic \u00b7 Gastroenterology')
  assert.equal(cardPath(items[0]), '/conditions/acute-cholecystitis')
  assert.equal(cardTitle(items[1]), 'Motinorm')
  assert.equal(cardLabel(items[1]), 'Drug \u00b7 Prokinetic')
  assert.equal(cardLine(items[1]), 'Gut motility')
  assert.equal(cardPath(items[1]), '/drugs/motinorm-10')
  assert.deepEqual(items.map(canShow), [true, true, false, false])
  assert.deepEqual(resolveFromLibrary(undefined, undefined, undefined), [])
  assert.equal(resolveFromLibrary([{ id: 'x', kind: 'condition', condition_id: 'c1', is_active: true }], conditions, [])[0].conditions.specialties.name_en, 'Gastroenterology')
  assert.equal(resolveFromLibrary([{ id: 'x', kind: 'condition', condition_id: 'c1', is_active: true }], [{ id: 'c1', slug: 's', name: 'N', specialtyName: null }], [])[0].conditions.specialties, null)
})
