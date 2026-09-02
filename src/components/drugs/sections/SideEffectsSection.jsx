/**
 * src/components/drugs/sections/SideEffectsSection.jsx
 * Drug Detail Screen rebuild — Phase 1, step 1.4 (decision 4.12, §10 Section 11)
 *
 * Side Effects as its own standalone section, split out of SafetySection.jsx.
 * The old Common/Serious tag distinction is dropped: side_effects_common and
 * side_effects_serious are merged app-side into one flat plain-bullet list,
 * common items first then serious — no colors, no icons, no per-item styling
 * of any kind.
 *
 * Past 3 merged items, the list truncates behind a "See all"/"See less" text
 * + chevron toggle in the top-right of the section's title row (hidden
 * entirely, not just inert, at or under 3 items). No SectionHeader slot
 * exists for a trailing action (confirmed in the plan's own audit), so the
 * title row is built locally here rather than changing the shared component
 * — same approach already used for Uses' own See more/See less control.
 *
 * Props: drug — flat drug object from DrugContext
 *
 * Correction, 2026-07-25 (against the real app screenshots, not the original
 * mockup): title and the "See all"/"See less" trigger were first built using
 * the small uppercase SectionHeader style shared with Contraindications/
 * Pregnancy — corrected to match Dosage's bold title (17px/700/text-primary)
 * and its "Dose adjustments" trigger's exact button style (13px/600/
 * text-primary), and the bullet text now matches Dosage's instruction text
 * color/line-height. Trailing Divider() also removed, per the page-wide
 * no-divider-between-sections rule already established for Uses/Dosage.
 *
 * Correction, 2026-08-03 (decision 8, plan §7 step 4): side_effects_common
 * and side_effects_serious merged into one DB column, side_effects, mapped
 * app-side as sideEffects — this component now reads it directly and no
 * longer performs its own merge.
 *
 * Phase 6 (re-scoped, 2026-09-03, plan §4.9): empty-state changed from the
 * EmptySection "Not yet added" placeholder to rendering nothing at all —
 * now matches every other section's hide-when-empty rule. See DoseSection.jsx
 * for the fuller note on why the three-status loading model is no longer
 * needed (Phase 1's 1.18 single-unified-download change).
 */

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

const TRUNCATE_AT = 3

export default function SideEffectsSection({ drug }) {
  const [expanded, setExpanded] = useState(false)

  const { sideEffects = [] } = drug

  if (sideEffects.length === 0) {
    return null
  }

  const hasMore = sideEffects.length > TRUNCATE_AT
  const shown = expanded ? sideEffects : sideEffects.slice(0, TRUNCATE_AT)

  return (
    <div style={{ marginBottom: 'var(--space-5)' }}>
      <div style={{
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'space-between',
        marginBottom:   'var(--space-3)',
      }}>
        <div style={{
          fontSize:   17,
          fontWeight: 700,
          color:      'var(--color-text-primary)',
        }}>
          Side Effects
        </div>

        {hasMore && (
          <button
            onClick={() => setExpanded(e => !e)}
            style={{
              display:    'flex',
              alignItems: 'center',
              gap:        2,
              background: 'none',
              border:     'none',
              cursor:     'pointer',
              padding:    0,
              fontFamily: 'var(--font-body)',
              fontSize:   13,
              fontWeight: 600,
              color:      'var(--color-text-primary)',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            {expanded ? 'See less' : 'See all'}
            {expanded
              ? <ChevronUp size={14} />
              : <ChevronDown size={14} />
            }
          </button>
        )}
      </div>

      <ul style={{ margin: 0, padding: 0, listStyle: 'disc', paddingLeft: 'var(--space-4)' }}>
        {shown.map((se, i) => (
          <li key={i} style={{
            fontSize:     14,
            color:        'var(--color-text-primary)',
            lineHeight:   1.6,
            marginBottom: 'var(--space-2)',
          }}>
            {se}
          </li>
        ))}
      </ul>
    </div>
  )
}
