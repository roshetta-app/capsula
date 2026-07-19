/**
 * src/components/SharedDrugCard.jsx
 * drug_library_ui_ux — step 1d.1 (decision 4.11)
 *
 * Shell only. Temporary top-level filename/location — the old, boxed
 * src/components/DrugCard.jsx is still in active use by FavouritesScreen
 * until step 1d.8 swaps every caller over and retires it, so this can't
 * take that file's name or path yet.
 *
 * No card box — flat row, icon-left, hairline divider between rows (same
 * isLast-suppresses-last-divider pattern as ConditionCard.jsx), one shared
 * component for both the Drugs screen and the Favourites screen. Unlike
 * ConditionCard.jsx, this row is a FIXED height rather than flexing per
 * content — decision 4.11 calls for that specifically, since inconsistent
 * row heights are the root cause of the sticky-header scroll flicker
 * (plan §0, 4.28's correction note). ROW_HEIGHT is a tentative value; it
 * may need revisiting once the real title/generic-line content lands.
 *
 * 1d.1 built the outer shell and its slot layout; 1d.2 filled in the title
 *   line → 1d.3 / 1d.4 (generic line, category icon)
 *   trailing control  → 1d.5 / 1d.6 (bookmark, screen-owned per 4.16)
 *
 * Title line (1d.2, decision 4.12; corrected 2026-07-19): tradenameClean +
 * concentration + form — replacing the old card's approach of appending a
 * second, already-baked-in strength/form onto a pre-composed name string
 * (which showed both twice). Originally rebuilt the suffix from the raw
 * strengthValue/strengthUnit/strengthBasis fields instead of using
 * `concentration`, which printed strengthBasis's raw storage code literally
 * (e.g. "100mg/per_5ml" instead of "100mg / 5ml") — fixed by using
 * `drug.concentration` directly, which is already correctly formatted for
 * every basis type and still avoids the original double-display bug. ~43%
 * of published brands have no strength on file, so the fallback is
 * tradename + form only, no gap left behind. `form` itself is never null.
 *
 * Title suffix, extended (drug_card_title_suffix plan, step C.1, decisions
 * 4.35-4.43, locked 2026-07-20): 4.12's suffix didn't show pack size or
 * fill volume, so two real, different products (e.g. a 60ml and a 115ml
 * bottle of the same brand/strength/form) rendered as identical cards.
 * Now the suffix is built per form category:
 *   - Solid/countable forms (tablet, capsule, sachet, etc.):
 *     concentration + pack_size + form_modifier abbreviation(s) + form
 *     abbreviation, e.g. "200mg 2 FC Tab."
 *   - Liquid/topical forms, plus vial/ampoule (4.42):
 *     concentration + form abbreviation + fill_volume, e.g.
 *     "200mg / 5ml Susp. 30ml"
 * Any field missing on a given drug is dropped silently (4.39) — never a
 * blank gap or stray separator. Form abbreviations come from
 * config/forms.js's DRUG_FORM_SUFFIXES (4.40); form_modifier abbreviations
 * come from config/formModifiers.js's FORM_MODIFIER_ABBREVIATIONS — any
 * form_modifier tag with no entry there (e.g. "scored") is dropped the same
 * way (4.41). Multiple modifier abbreviations are comma-joined in the
 * array's original order (4.43). `titleSegments` (the tradenameClean +
 * highlightMatch logic, below) is untouched.
 *
 * Generic/ingredient line (1d.3, decision 4.13): `drug.ingredients` is only
 * populated for combo generics (2+ active ingredients) — confirmed live, a
 * plain array of lowercase ingredient-name strings, e.g. ["calcium", "vitamin
 * a", "zinc"]. Shows the first 2, then "+N" for the rest (real data has combo
 * rows with up to 26 ingredients). For plain (non-combo) generics, `ingredients`
 * is null and the line just shows `drug.genericName` instead.
 *
 * Category icon badge (1d.4, decisions 4.14/4.30): sources category data
 * entirely from the live `categories` prop (from `useCategories()`, passed
 * down by the screen) and the shared `resolveToken`/`FALLBACK_TOKEN`
 * color-token system — the exact same pattern `DrugListRow`/`CategoryRow`
 * already use in `DrugsScreen.jsx`, not `config/categories.js`'s static
 * label list or `DrugCard.jsx`'s old hardcoded hex map (both go away once
 * `1d.8` retires that file). `drug.category` holds the category's stable
 * slug; matched against `categories` for its `icon_type`/`icon_name` and
 * `color_token`. No separate icon-color column exists — `resolveToken`
 * already derives the icon's foreground shade from the same token, so no
 * new derivation logic was needed here.
 *
 * Props (final shape — trailing is unused until 1d.5/1d.6 wire it up; drug
 * and isLast were already in place from 1d.1):
 *   drug        FlatDrug
 *   categories  Category[]  — from useCategories(), passed down by the screen
 *   isDark      boolean     — from useIsDark(), for resolveToken's dark-mode variant
 *   onTap       (drug) => void   — required, matches old DrugCard.jsx's
 *                                  convention (no navigate fallback guessed)
 *   isLast      boolean          — suppresses the bottom divider on the last row
 *   trailing    ReactNode (optional) — rendered in the right-hand slot
 *   highlight   string  (optional) — current search query; empty string when not
 *                                     searching. Same convention as ConditionCard.jsx.
 *   searchMode  string  (optional) — 'brand' | 'generic'. Scopes which line the
 *                                     highlight applies to: Brand mode only ever
 *                                     matches on tradenameClean, Generic mode only
 *                                     ever matches on genericName or an individual
 *                                     ingredient — so only that line gets bolded,
 *                                     never both, to avoid bolding a coincidental
 *                                     substring in a field that had nothing to do
 *                                     with why the row actually matched.
 */

import { useState } from 'react'
import { SpecialtyIcon } from '../utils/specialtyIcon'
import { resolveToken, FALLBACK_TOKEN } from '../utils/specialtyTokens'
import { highlightMatch } from '../utils/highlightMatch'
import { DRUG_FORM_SUFFIXES } from '../config/forms'
import { FORM_MODIFIER_ABBREVIATIONS } from '../config/formModifiers'

const ROW_HEIGHT = 64 // tentative — revisit once 1d.2-1d.4 content is in place

// Forms that use fill_volume in the title suffix instead of pack_size
// (drug_card_title_suffix plan, decision 4.38 + 4.42, confirmed 2026-07-20).
// Locked by the plan: the "drops" family, spray, cream/gel/ointment/lotion,
// syrup/suspension/solution, and vial/ampoule (4.42's override). Everything
// else not explicitly named there — confirmed with the user 2026-07-20 —
// falls in here too where it's genuinely liquid/topical (eye ointment,
// washes, oils, injection, vaccine, inhaler, etc.); every remaining form
// defaults to the pack_size/solid formula below.
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

// Collapses redundant whitespace and normalizes spacing around "/" so
// "200mg / 5ml"-style values render consistently regardless of how they
// were entered (plan §2 — raw concentration/pack_size/fill_volume spacing
// is inconsistent in the source data). Does not touch unit spelling
// ("g" vs "gm") — that's a data question, not a formatting one.
function normalizeSpacing(value) {
  if (!value) return value
  return value.trim().replace(/\s+/g, ' ').replace(/\s*\/\s*/g, ' / ')
}

// Comma-joins the known form_modifier abbreviations for a drug, in the
// array's original order (4.43). Tags with no entry in
// FORM_MODIFIER_ABBREVIATIONS (currently just "scored") are dropped
// silently (4.41), same as any other missing field (4.39).
function abbreviateFormModifiers(formModifier) {
  if (!formModifier || formModifier.length === 0) return ''
  return formModifier
    .map(tag => FORM_MODIFIER_ABBREVIATIONS[tag])
    .filter(Boolean)
    .join(', ')
}

export default function SharedDrugCard({
  drug,
  categories,
  isDark,
  onTap,
  isLast = false,
  trailing = null,
  highlight = '',
  searchMode = 'brand',
}) {
  const [pressed, setPressed] = useState(false)

  function handleTap() {
    onTap(drug)
  }

  // Category icon badge (4.14/4.30) — drug.category holds the stable slug;
  // matched against the live categories list for its icon + color token,
  // same lookup DrugListRow already does. Falls back to FALLBACK_TOKEN if
  // the stored slug doesn't match any live category (e.g. stale data).
  const matchedCategory = categories.find(c => c.slug === drug.category)
  const iconType  = matchedCategory?.icon_type || 'lucide'
  const iconValue = iconType === 'custom'
    ? (matchedCategory?.icon_url  || '')
    : (matchedCategory?.icon_name || 'Pill')
  const categoryColors = resolveToken(matchedCategory?.color_token || FALLBACK_TOKEN, isDark)

  // Title suffix (4.38, locked) — built per form category. Solid/countable
  // forms show pack_size + form_modifier abbreviations; liquid/topical
  // forms (plus vial/ampoule, 4.42) show fill_volume instead. Any field
  // missing on this particular drug drops out silently (4.39) via the
  // .filter(Boolean) below — never a blank gap or stray separator.
  const normalizedConcentration = normalizeSpacing(drug.concentration)
  const formAbbrev = DRUG_FORM_SUFFIXES[drug.form] || drug.form
  const modifierAbbrev = abbreviateFormModifiers(drug.formModifier)

  const titleSuffix = LIQUID_FORMS.has(drug.form)
    ? [normalizedConcentration, formAbbrev, normalizeSpacing(drug.fillVolume)]
        .filter(Boolean)
        .join(' ')
    : [normalizedConcentration, normalizeSpacing(drug.packSize), modifierAbbrev, formAbbrev]
        .filter(Boolean)
        .join(' ')

  // Generic/ingredient line (4.13) — combo generics show first 2 ingredients
  // + a "+N" count; plain generics just show the one genericName.
  const genericLine = drug.ingredients
    ? drug.ingredients.length > 2
      ? `${drug.ingredients.slice(0, 2).join(', ')} +${drug.ingredients.length - 2}`
      : drug.ingredients.join(', ')
    : drug.genericName

  // Search-match highlighting — scoped by mode (see prop doc above): Brand
  // mode only ever matches tradenameClean, Generic mode only ever matches
  // genericName/ingredients, so each line only asks highlightMatch to bold
  // against the query when that's the mode actually in use. highlightMatch
  // itself already returns a single, unbolded segment when passed an empty
  // query, so passing '' for the non-active mode is enough — no extra
  // branching needed here.
  const titleSegments   = highlightMatch(drug.tradenameClean, searchMode === 'brand'   ? highlight : '')
  const genericSegments = highlightMatch(genericLine || '',   searchMode === 'generic' ? highlight : '')

  return (
    <div
      onClick={handleTap}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && handleTap()}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      onPointerCancel={() => setPressed(false)}
      style={{
        display:                 'flex',
        alignItems:              'center',
        height:                  ROW_HEIGHT,
        gap:                     'var(--space-3)',
        borderBottom:            isLast ? 'none' : '1px solid var(--color-border-subtle)',
        cursor:                  'pointer',
        outline:                 'none',
        WebkitTapHighlightColor: 'transparent',
        backgroundColor:         pressed ? 'var(--color-surface-muted)' : 'transparent',
        transform:               pressed ? 'scale(0.99)' : 'scale(1)',
        transition:              'background-color var(--motion-fast) var(--ease-settle), transform var(--motion-fast) var(--ease-settle)',
      }}
    >
      {/* Left: category icon badge (1d.4) — icon-only, tinted square, live drug_categories data */}
      <div style={{
        width:           36,
        height:          36,
        flexShrink:      0,
        borderRadius:    'var(--radius-md)',
        backgroundColor: categoryColors.bg,
        display:         'flex',
        alignItems:      'center',
        justifyContent:  'center',
      }}>
        <SpecialtyIcon iconType={iconType} iconValue={iconValue} size={16} color={categoryColors.fg} />
      </div>

      {/* Middle: text content — title line (1d.2) + generic line (1d.3) */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize:     16,
          fontWeight:   500,
          color:        'var(--color-text-primary)',
          lineHeight:   1.3,
          overflow:     'hidden',
          whiteSpace:   'nowrap',
          textOverflow: 'ellipsis',
        }}>
          {titleSegments.map((seg, i) =>
            seg.bold
              ? <strong key={i} style={{ fontWeight: 800 }}>{seg.text}</strong>
              : <span key={i}>{seg.text}</span>
          )}
          {titleSuffix && (
            <span style={{
              fontWeight: 400,
              fontSize:   13,
              color:      'var(--color-text-primary)',
            }}>
              {' '}{titleSuffix}
            </span>
          )}
        </div>

        {genericLine && (
          <div style={{
            fontSize:     13,
            fontWeight:   500,
            color:        'var(--color-accent)',
            lineHeight:   1.4,
            marginTop:    2,
            overflow:     'hidden',
            whiteSpace:   'nowrap',
            textOverflow: 'ellipsis',
          }}>
            {genericSegments.map((seg, i) =>
              seg.bold
                ? <strong key={i} style={{ fontWeight: 800 }}>{seg.text}</strong>
                : <span key={i}>{seg.text}</span>
            )}
          </div>
        )}
      </div>

      {/* Right: trailing slot — bookmark control wired in 1d.5/1d.6, screen-owned per decision 4.16 */}
      <div style={{ flexShrink: 0 }}>
        {trailing}
      </div>
    </div>
  )
}
