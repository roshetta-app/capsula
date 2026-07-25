/**
 * src/components/drugs/sections/UsesSection.jsx
 * drug_library_ui_ux — Drug Detail Screen rebuild, Phase 1 step 1.2
 * (plan decision 4.10 — see STEPS_DRUG_DETAIL.md §1.2, plan §10 Section 9)
 *
 * Renders the Uses and Indications section for a drug: a bulleted list of
 * uses inside a category-color-tinted box, each entry a bold name with an
 * italic sub-line underneath only when that entry's `context` is present.
 * Past 3 entries the list truncates — a centered "See more"/"See less"
 * text button below the box reveals or re-hides the rest in place, its
 * chevron flipping between the two states. The button is omitted entirely
 * (not just inert) when the count is at or under 3 (4.10, clarified 4.14).
 * If `uses` is empty, the whole section is omitted — no header, no
 * "Not yet added" placeholder — a deliberate exception to the
 * EmptySection convention every other section on this page still uses.
 *
 * Built as its own one-off component per 4.10 — no shared primitive was
 * extracted, since no second consumer needs this shape yet. The tint
 * reuses SpecialtySelector's existing ambient-wash treatment
 * (`tintedBg`, specialtyTokens.js), not a new box style invented here.
 *
 * Props:
 *   drug   — flat drug object from DrugContext
 *   colors — resolved category color token ({ bg, fg, pill }), the same
 *            object DrugHeader already receives from DrugDetailScreen
 *   isDark — current dark-mode state, needed to build the tinted wash
 */

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { SectionHeader, Divider } from './sectionPrimitives.jsx'
import { tintedBg } from '../../../utils/specialtyTokens.js'

const TRUNCATE_AT = 3

export default function UsesSection({ drug, colors, isDark }) {
  const [open, setOpen] = useState(false)

  const { uses = [] } = drug

  if (uses.length === 0) return null

  const hasMore = uses.length > TRUNCATE_AT
  const shown = open ? uses : uses.slice(0, TRUNCATE_AT)

  return (
    <div style={{ marginBottom: 'var(--space-5)' }}>
      <SectionHeader title="Uses" />

      <ul style={{
        margin:          0,
        padding:         'var(--space-3)',
        listStyle:       'none',
        borderRadius:    'var(--radius-sm)',
        backgroundColor: tintedBg(colors.bg, isDark),
      }}>
        {shown.map((use, i) => {
          const name    = typeof use === 'string' ? use : use.use_name
          const context = typeof use === 'object' ? use.context : ''
          return (
            <li
              key={i}
              style={{
                display:      'flex',
                alignItems:   'flex-start',
                gap:          'var(--space-2)',
                marginBottom: i === shown.length - 1 ? 0 : 'var(--space-2)',
              }}
            >
              <span style={{
                width:           5,
                height:          5,
                borderRadius:    '50%',
                backgroundColor: colors.fg,
                marginTop:       7,
                flexShrink:      0,
              }} />
              <div>
                <span style={{
                  fontSize:   14,
                  fontWeight: 600,
                  color:      'var(--color-text-primary)',
                }}>
                  {name}
                </span>
                {context && (
                  <div style={{
                    fontSize:  13,
                    fontStyle: 'italic',
                    color:     'var(--color-text-tertiary)',
                    marginTop: 1,
                  }}>
                    {context}
                  </div>
                )}
              </div>
            </li>
          )
        })}
      </ul>

      {hasMore && (
        <button
          onClick={() => setOpen(o => !o)}
          style={{
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
            gap:            4,
            width:          '100%',
            marginTop:      'var(--space-3)',
            background:     'none',
            border:         'none',
            cursor:         'pointer',
            padding:        0,
            fontFamily:     'var(--font-body)',
            fontSize:       13,
            fontWeight:     600,
            color:          'var(--color-text-secondary)',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          {open ? 'See less' : 'See more'}
          {open
            ? <ChevronUp size={14} />
            : <ChevronDown size={14} />
          }
        </button>
      )}

      <Divider />
    </div>
  )
}
