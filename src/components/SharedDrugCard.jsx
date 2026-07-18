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
 * line; 1d.3 filled in the generic/ingredient line; 1d.4 fills in the
 * category icon badge. Remaining slot lands later:
 *   - trailing control  → 1d.5 / 1d.6 (bookmark, screen-owned per 4.16)
 *
 * Title line (1d.2, decision 4.12): rebuilt fresh from three raw fields —
 * tradenameClean + strength (strengthValue + strengthUnit, with strengthBasis
 * appended after a "/" when present, e.g. "100mg/5ml") + form — replacing the
 * old card's approach of appending a second, already-baked-in strength/form
 * onto a pre-composed name string (which showed both twice). ~43% of
 * published brands have no strength on file, so the fallback is tradename +
 * form only, no gap left behind. `form` itself is never null.
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
 */

import { useState } from 'react'
import { SpecialtyIcon } from '../utils/specialtyIcon'
import { resolveToken, FALLBACK_TOKEN } from '../utils/specialtyTokens'

const ROW_HEIGHT = 64 // tentative — revisit once 1d.2-1d.4 content is in place

export default function SharedDrugCard({ drug, categories, isDark, onTap, isLast = false, trailing = null }) {
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

  // Title line (4.12) — strength only renders when both value and unit are
  // present; basis (e.g. "/5ml") only appends when it exists on top of that.
  const strengthPart = drug.strengthValue && drug.strengthUnit
    ? `${drug.strengthValue}${drug.strengthUnit}${drug.strengthBasis ? `/${drug.strengthBasis}` : ''}`
    : null
  const titleSuffix = strengthPart ? `${strengthPart} ${drug.form}` : drug.form

  // Generic/ingredient line (4.13) — combo generics show first 2 ingredients
  // + a "+N" count; plain generics just show the one genericName.
  const genericLine = drug.ingredients
    ? drug.ingredients.length > 2
      ? `${drug.ingredients.slice(0, 2).join(', ')} +${drug.ingredients.length - 2}`
      : drug.ingredients.join(', ')
    : drug.genericName

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
          fontWeight:   600,
          color:        'var(--color-text-primary)',
          lineHeight:   1.3,
          overflow:     'hidden',
          whiteSpace:   'nowrap',
          textOverflow: 'ellipsis',
        }}>
          {drug.tradenameClean}
          {titleSuffix && (
            <span style={{
              fontWeight: 400,
              fontSize:   13,
              color:      'var(--color-text-tertiary)',
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
            {genericLine}
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
