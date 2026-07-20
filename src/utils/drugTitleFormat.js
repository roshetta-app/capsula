/**
 * src/utils/drugTitleFormat.js
 * drug_library_ui_ux — extracted from SharedDrugCard.jsx (2026-07-20, step
 * 2b) so DrugHeader.jsx can reuse the exact same title-suffix formatting
 * instead of re-deriving it. This logic has already been corrected
 * multiple times (decisions 4.35-4.43 plus several follow-up fixes) — one
 * shared source stops the two call sites drifting apart on the next one.
 *
 * Exports:
 *   toTitleCase(str)         — cosmetic-only title-casing for display
 *   getDrugTitleSuffix(drug) — concentration + pack_size/fill_volume +
 *                               form + modifier/route abbreviations, e.g.
 *                               "200mg 2 FC Tab." or "200mg / 5ml Susp. 30ml"
 */

import { DRUG_FORM_SUFFIXES } from '../config/forms'
import { FORM_MODIFIER_ABBREVIATIONS } from '../config/formModifiers'
import { ROUTE_DETAIL_ABBREVIATIONS } from '../config/routeDetails'

// Forms that use fill_volume in the title suffix instead of pack_size
// (drug_card_title_suffix plan, decision 4.38 + 4.42, confirmed 2026-07-20).
// Locked by the plan: the "drops" family, spray, cream/gel/ointment/lotion,
// syrup/suspension/solution, and vial/ampoule (4.42's override). Everything
// else not explicitly named there falls in here too where it's genuinely
// liquid/topical; every remaining form defaults to the pack_size/solid
// formula below.
const LIQUID_FORMS = new Set([
  'syrup', 'suspension', 'solution',
  'drops', 'eye drops', 'oral drops', 'ear drops', 'nasal drops', 'mouth drops',
  'spray', 'cream', 'gel', 'ointment', 'lotion',
  'vial', 'ampoule', // 4.42 — always fill_volume, never pack_size
  'eye ointment', 'shampoo', 'mouth wash', 'vaginal douche',
  'serum', 'hair oil', 'oil',
  'antiseptic solution', 'inhalation solution', 'paint', 'enema',
  'facial wash', 'conditioner', 'foam',
  'injection', 'vaccine', 'inhaler',
])

// Collapses redundant whitespace and strips spacing around "/" so
// concentration values render consistently regardless of how they were
// entered — matches the plan's own locked example format ("200mg/5ml").
function normalizeSpacing(value) {
  if (!value) return value
  return value.trim().replace(/\s+/g, ' ').replace(/\s*\/\s*/g, '/')
}

// pack_size and fill_volume additionally need a space inserted between a
// bare number and its unit letters where one is missing (e.g. "100ml" ->
// "100 ml"). concentration is left untouched — it's already 100%
// consistent with no space.
function normalizeUnitSpacing(value) {
  if (!value) return value
  return normalizeSpacing(value).replace(/(\d)([a-zA-Z])/g, '$1 $2')
}

// Comma-joins the known form_modifier abbreviations for a drug, in the
// array's original order (4.43). Tags with no entry in
// FORM_MODIFIER_ABBREVIATIONS are dropped silently (4.41), same as any
// other missing field (4.39).
function abbreviateFormModifiers(formModifier) {
  if (!formModifier || formModifier.length === 0) return ''
  return formModifier
    .map(tag => FORM_MODIFIER_ABBREVIATIONS[tag])
    .filter(Boolean)
    .join(', ')
}

// Comma-joins the known route_details abbreviations for an injection
// formulation, in the array's original order — same convention as
// abbreviateFormModifiers above. Tags with no entry are dropped silently.
function abbreviateRouteDetails(routeDetails) {
  if (!routeDetails || routeDetails.length === 0) return ''
  return routeDetails
    .map(tag => ROUTE_DETAIL_ABBREVIATIONS[tag])
    .filter(Boolean)
    .join(', ')
}

// Title-case for display only — capitalizes the first letter of each
// word/hyphen-separated segment, e.g. "dolo-d" -> "Dolo-D". Purely
// cosmetic: underlying values used for search matching, ranking, and sort
// order are completely untouched.
export function toTitleCase(str) {
  if (!str) return str
  return str.replace(/[^\s-]+/g, word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
}

// Title suffix (4.38, locked; extended by follow-up decisions
// 2026-07-20) — built per form category. Solid/countable forms show
// pack_size + form_modifier abbreviations; liquid/topical forms show
// fill_volume instead. Any field missing on this particular drug drops
// out silently (4.39) — never a blank gap or stray separator.
export function getDrugTitleSuffix(drug) {
  const normalizedConcentration = normalizeSpacing(drug.concentration)
  const formAbbrev = DRUG_FORM_SUFFIXES[drug.form] || drug.form
  const modifierAbbrev = abbreviateFormModifiers(drug.formModifier)

  // Vial/ampoule (4.42, reopened 2026-07-20): falls back to pack_size when
  // fill_volume is missing, still preferring fill_volume when both exist.
  const isVialOrAmpoule = drug.form === 'vial' || drug.form === 'ampoule'

  let afterConcentration
  if (isVialOrAmpoule) {
    const size = normalizeUnitSpacing(drug.fillVolume) || normalizeUnitSpacing(drug.packSize)
    afterConcentration = [formAbbrev, size].filter(Boolean)
  } else if (LIQUID_FORMS.has(drug.form)) {
    afterConcentration = [formAbbrev, normalizeUnitSpacing(drug.fillVolume)].filter(Boolean)
  } else {
    afterConcentration = [normalizeUnitSpacing(drug.packSize), modifierAbbrev, formAbbrev].filter(Boolean)
  }

  // Dash after concentration — only inserted when there's both a
  // concentration AND something following it, so a drug with only one of
  // the two never ends up with a stray dash.
  const mainSuffix = normalizedConcentration && afterConcentration.length > 0
    ? [normalizedConcentration, '-', ...afterConcentration].join(' ')
    : [normalizedConcentration, ...afterConcentration].filter(Boolean).join(' ')

  // Route details — injection formulations only, appended at the very end
  // with a dash before it. Same dash-only-when-needed guard as above.
  const routeAbbrev = drug.route === 'injection' ? abbreviateRouteDetails(drug.routeDetails) : ''
  return routeAbbrev
    ? (mainSuffix ? `${mainSuffix} - ${routeAbbrev}` : routeAbbrev)
    : mainSuffix
}
