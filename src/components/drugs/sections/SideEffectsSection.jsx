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
 *
 * 2026-09-23: neither the "See all"/"See less" toggle nor the truncated
 * items themselves animated — the button swapped ChevronUp/ChevronDown
 * icons instantly and the extra items past TRUNCATE_AT just appeared or
 * vanished. Brought in line with UsesSection.jsx's already-established
 * pattern: a single chevron that rotates 180° (transform+transition) on
 * the button, and the extra items fade in/out (two-frame opacity
 * transition, same as UsesSection.jsx/InlineTruncatedList in
 * sectionPrimitives.jsx) instead of popping instantly.
 */

import { useState, useRef, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'

const TRUNCATE_AT = 3

export default function SideEffectsSection({ drug }) {
  const [expanded, setExpanded] = useState(false)
  // showExtra: the past-3 items are in the layout at all. extraVisible:
  // they're opaque. Kept separate (same pattern as UsesSection.jsx) so a
  // fade-out can finish before the items are removed.
  const [showExtra, setShowExtra]       = useState(false)
  const [extraVisible, setExtraVisible] = useState(false)
  const timerRef = useRef(null)
  const rafRef   = useRef(null)

  useEffect(() => () => {
    clearTimeout(timerRef.current)
    cancelAnimationFrame(rafRef.current)
  }, [])

  const { sideEffects = [] } = drug

  if (sideEffects.length === 0) {
    return null
  }

  const hasMore = sideEffects.length > TRUNCATE_AT
  const visible = sideEffects.slice(0, TRUNCATE_AT)
  const extra   = sideEffects.slice(TRUNCATE_AT)

  function handleToggle() {
    clearTimeout(timerRef.current)
    cancelAnimationFrame(rafRef.current)
    if (!expanded) {
      setExpanded(true)
      setShowExtra(true)
      // Two frames so the extra items paint once at opacity 0 before
      // fading in, instead of popping straight to opacity 1.
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = requestAnimationFrame(() => setExtraVisible(true))
      })
    } else {
      setExpanded(false)
      setExtraVisible(false)
      timerRef.current = setTimeout(() => setShowExtra(false), 200)
    }
  }

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
            onClick={handleToggle}
            aria-label={expanded ? 'See less' : 'See all'}
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
            <ChevronDown
              size={14}
              style={{
                transform:  expanded ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s ease',
              }}
            />
          </button>
        )}
      </div>

      <ul style={{ margin: 0, padding: 0, listStyle: 'disc', paddingLeft: 'var(--space-4)' }}>
        {visible.map((se, i) => (
          <li key={`v${i}`} style={{
            fontSize:     14,
            color:        'var(--color-text-primary)',
            lineHeight:   1.6,
            marginBottom: 'var(--space-2)',
          }}>
            {se}
          </li>
        ))}
        {hasMore && showExtra && extra.map((se, i) => (
          <li
            key={`x${i}`}
            style={{
              fontSize:     14,
              color:        'var(--color-text-primary)',
              lineHeight:   1.6,
              marginBottom: 'var(--space-2)',
              opacity:      extraVisible ? 1 : 0,
              transition:   'opacity 0.2s ease',
            }}
          >
            {se}
          </li>
        ))}
      </ul>
    </div>
  )
}
