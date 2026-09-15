/**
 * src/components/conditions/SpecialtyFilterBanner.jsx
 *
 * Extracted verbatim from src/pages/FavouritesScreen.jsx (Favourites Screen
 * Refactor plan, Phase 1) — no behavior change. Conditions-tab only.
 *
 * Sits between the tab bar and the results list whenever a specialty filter
 * is active on the Conditions tab — a standing reminder of what's currently
 * narrowing the list (and how many results that leaves), with its own X so
 * clearing it doesn't require reopening FavouritesManagerSheet. Distinct
 * from SpecialtyEmptyState (FavouritesEmptyStates.jsx): this renders
 * whenever the filter is on, regardless of whether it happens to match
 * zero, one, or many conditions.
 *
 * Props:
 *   specialty          object | null  — the active specialty; component
 *                                       renders nothing when falsy
 *   count               number         — result count under the filter
 *   isOpen              boolean        — whether SpecialtiesBottomSheet is
 *                                        currently open (flips the chevron)
 *   onOpenSpecialties   () => void
 *   onClear             () => void
 */

import { X } from 'lucide-react'
import { SpecialtyIcon, useIsDark } from '../../utils/specialtyIcon'
import { resolveToken, FALLBACK_TOKEN, tintedBg } from '../../utils/specialtyTokens'

export default function SpecialtyFilterBanner({ specialty, count, isOpen, onOpenSpecialties, onClear }) {
  const isDark = useIsDark()
  if (!specialty) return null

  // Same token → background-wash pattern used by SpecialtySelector's active
  // card and ConditionCard's icon bubble elsewhere in the app — tintedBg()
  // keeps the wash math identical instead of hand-rolling a new opacity here.
  const tokenKey = specialty.colorToken ?? FALLBACK_TOKEN
  const { bg, fg } = resolveToken(tokenKey, isDark)

  return (
    <div
      onClick={onOpenSpecialties}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onOpenSpecialties()
        }
      }}
      aria-label="Change specialty filter"
      style={{
        display:         'flex',
        alignItems:      'center',
        justifyContent:  'space-between',
        gap:             10,
        padding:         '8px 10px',
        marginBottom:    10,
        backgroundColor: tintedBg(bg, isDark),
        borderRadius:    'var(--radius-md)',
        cursor:          'pointer',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
        <SpecialtyIcon
          iconType={specialty.iconType   ?? 'lucide'}
          iconValue={specialty.iconValue ?? 'Stethoscope'}
          size={15}
          color={fg}
        />
        <span style={{
          fontSize:     13,
          fontWeight:   600,
          color:        fg,
          overflow:     'hidden',
          textOverflow: 'ellipsis',
          whiteSpace:   'nowrap',
        }}>
          {specialty.name}
        </span>
        <span style={{ fontSize: 13, color: 'var(--color-text-tertiary)', flexShrink: 0 }}>
          · {count} {count === 1 ? 'result' : 'results'}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
        {/* Now purely a visual indicator — the whole row (outer div above)
            is the actual tap target that opens the specialty selector.
            Unrotated, this path is a down-pointing chevron — that's the
            idle state (matches the standard "opens a picker" affordance).
            Flips to point up while SpecialtiesBottomSheet is actually
            open, rather than staying rotated -90° to always point right
            like FavouritesManagerSheet's own (non-toggling) drill-in row. */}
        <span
          aria-hidden="true"
          style={{
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
            flexShrink:     0,
            width:          22,
            height:         22,
          }}
        >
          <svg width="13" height="13" viewBox="0 0 12 12" fill="none" aria-hidden="true"
            style={{
              color:      'var(--color-text-tertiary)',
              transform:  isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.15s ease',
            }}>
            <path d="M2 4.5L6 8.5L10 4.5" stroke="currentColor" strokeWidth="1.6"
              strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <button
          onClick={(e) => {
            // Row above also has onClick={onOpenSpecialties} — without
            // stopping propagation here, clearing the filter would
            // immediately re-open the specialty selector via the bubbled
            // click, which defeats the point of a dedicated clear button.
            e.stopPropagation()
            onClear()
          }}
          aria-label="Clear specialty filter"
          style={{
            display:                 'flex',
            alignItems:              'center',
            justifyContent:          'center',
            flexShrink:              0,
            width:                   22,
            height:                  22,
            borderRadius:            '50%',
            border:                  'none',
            background:              'none',
            cursor:                  'pointer',
            outline:                 'none',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          <X size={13} strokeWidth={2} color="var(--color-text-tertiary)" aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}
