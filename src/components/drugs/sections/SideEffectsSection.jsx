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
 */

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { Divider, EmptySection } from './sectionPrimitives.jsx'

const TRUNCATE_AT = 3

export default function SideEffectsSection({ drug }) {
  const [expanded, setExpanded] = useState(false)

  const {
    sideEffectsCommon = [],
    sideEffectsSerious = [],
  } = drug

  const merged = [...sideEffectsCommon, ...sideEffectsSerious]

  if (merged.length === 0) {
    return <EmptySection title="Side Effects" />
  }

  const hasMore = merged.length > TRUNCATE_AT
  const shown = expanded ? merged : merged.slice(0, TRUNCATE_AT)

  return (
    <div style={{ marginBottom: 'var(--space-5)' }}>
      <div style={{
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'space-between',
        marginBottom:   'var(--space-3)',
      }}>
        <div style={{
          fontSize:      10,
          fontWeight:    700,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color:         'var(--color-text-tertiary)',
        }}>
          Side Effects
        </div>

        {hasMore && (
          <button
            onClick={() => setExpanded(e => !e)}
            style={{
              display:    'flex',
              alignItems: 'center',
              gap:        'var(--space-1)',
              background: 'none',
              border:     'none',
              cursor:     'pointer',
              padding:    0,
              fontSize:   13,
              fontWeight: 500,
              color:      'var(--color-text-secondary)',
              fontFamily: 'var(--font-body)',
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
            color:        'var(--color-text-secondary)',
            lineHeight:   1.4,
            marginBottom: 'var(--space-2)',
          }}>
            {se}
          </li>
        ))}
      </ul>

      <Divider />
    </div>
  )
}
