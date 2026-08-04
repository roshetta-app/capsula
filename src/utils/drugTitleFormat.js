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

// Release-mechanism tags (decision 25, 2026-08-04) — the only form_modifier
// tags treated as "same underlying fact, different word" duplicates of one
// another. Live data audit (2026-08-04) confirmed CR/ER/MR/SR/PR/DR
// co-occur on ~34 formulations almost entirely from inconsistent synonym
// tagging, not genuinely distinct facts. Real, separate physical
// properties (film_coated, chewable, effervescent, etc.) are NOT in this
// set and are never collapsed — they keep showing in full everywhere they
// already did.
const RELEASE_MECHANISM_TAGS = [
  'extended_release', 'sustained_release', 'modified_release',
  'controlled_release', 'prolonged_release', 'delayed_release',
]

// Trade-name hint tokens (decision 25) — confirmed live 2026-08-04 against
// every published brand/formulation row: whenever a trade name contains
// one of these as a standalone word, it matches the paired tag with
// essentially zero mismatches (0-1 out of hundreds checked). Reliable
// enough to trust as "the package itself already says this."
// "retard"/"dr"/"pr"/"la" were inconsistent or had no supporting live
// data and are deliberately left out rather than guessed at.
const RELEASE_NAME_HINT_TOKENS = {
  xr: 'extended_release',
  xl: 'extended_release',
  sr: 'sustained_release',
  mr: 'modified_release',
  cr: 'controlled_release',
}

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
// General duplication guard (decision 23-follow-up, 2026-08-04): a tag is
// also dropped if it's identical to the drug's own form (e.g. an
// "effervescent" tablet form tagged with the "effervescent" modifier used
// to render "Eff Eff." back to back) — not a one-off patch for that word,
// applies to any tag/form collision.
function abbreviateFormModifiers(formModifier, form) {
  if (!formModifier || formModifier.length === 0) return ''
  return formModifier
    .filter(tag => tag !== form)
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

// True if this specific brand's own trade name already spells out one of
// the release-mechanism tags present on it (e.g. "Aig Alfuzosin XR"
// already says "extended release" via "XR") — used so the abbreviation
// isn't shown a second time right next to a name that already announces it.
// Checked per brand, not per formulation: two brands sharing the same
// formulation/tags can have completely different trade names, so this
// can't be decided once for the whole formulation.
function nameAlreadyAnnouncesRelease(tradenameClean, releaseTags) {
  if (!tradenameClean || releaseTags.length === 0) return false
  return Object.entries(RELEASE_NAME_HINT_TOKENS).some(([token, tag]) => {
    if (!releaseTags.includes(tag)) return false
    const re = new RegExp(`\\b${token}\\b`, 'i')
    return re.test(tradenameClean)
  })
}

// Collapses a drug's release-mechanism tags (decision 25) down to at most
// one shown abbreviation, instead of comma-joining every synonym tagged on
// the row:
//   - If this brand's own trade name already announces one of them (e.g.
//     "XR"), nothing is shown here — it would just repeat what the name
//     already says.
//   - Otherwise, shows the abbreviation for whichever release tag appears
//     first in this row's own formModifier array (no global priority
//     order — decision 25: the data doesn't support one well enough to be
//     worth maintaining, and the row's own tagging order is as good a
//     signal as any arbitrary fixed list).
function getReleaseModifierAbbrev(formModifier, tradenameClean) {
  if (!formModifier || formModifier.length === 0) return ''
  const releaseTags = formModifier.filter(tag => RELEASE_MECHANISM_TAGS.includes(tag))
  if (releaseTags.length === 0) return ''
  if (nameAlreadyAnnouncesRelease(tradenameClean, releaseTags)) return ''
  return FORM_MODIFIER_ABBREVIATIONS[releaseTags[0]] || ''
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

  // Decision 25: release-mechanism tags (ER/SR/MR/CR/PR/DR) collapse to at
  // most one shown abbreviation via getReleaseModifierAbbrev; every other
  // modifier tag (chewable, effervescent, film_coated, etc.) still shows
  // in full, same as before — only the release-mechanism synonym pile-up
  // was the actual problem.
  const nonReleaseModifiers = (drug.formModifier || []).filter(
    tag => !RELEASE_MECHANISM_TAGS.includes(tag)
  )
  const releaseAbbrev = getReleaseModifierAbbrev(drug.formModifier, drug.tradenameClean)
  const nonReleaseAbbrev = abbreviateFormModifiers(nonReleaseModifiers, drug.form)
  const modifierAbbrev = [releaseAbbrev, nonReleaseAbbrev].filter(Boolean).join(', ')

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

// New (decision 24, 2026-08-04) — prescription sheet drug display: modifier
// and route-details abbreviations only, deliberately excluding pack
// size/fill volume (the sheet never shows those, unlike getDrugTitleSuffix's
// search-card use above). Reuses the exact same abbreviation logic as
// getDrugTitleSuffix — just the modifier/route pieces on their own, since
// the sheet already renders concentration and form as their own separate
// pieces and only needs these two added in.
// UPDATED (decision 25, 2026-08-04): the sheet only ever shows a
// release-mechanism tag (never chewable/effervescent/film_coated/etc.),
// and now via the same collapse-to-one-tag + name-redundancy-guard logic
// as the card, instead of comma-joining every modifier tag on the row.
export function getDrugModifierAndRouteSuffix(drug) {
  if (!drug) return { modifierAbbrev: '', routeAbbrev: '' }
  return {
    modifierAbbrev: getReleaseModifierAbbrev(drug.formModifier, drug.tradenameClean),
    routeAbbrev: drug.route === 'injection' ? abbreviateRouteDetails(drug.routeDetails) : '',
  }
}
