/**
 * src/components/drugs/sections/UsesSection.jsx
 * drug_library_ui_ux — Drug Detail Screen rebuild, Phase 1 step 1.2
 * (plan decision 4.10 — see STEPS_DRUG_DETAIL.md §1.2, plan §10 Section 9)
 *
 * Renders the Uses and Indications section for a drug: a bulleted list of
 * uses inside a category-color-tinted box, each entry a bold name with an
 * italic sub-line underneath only when that entry's `context` is present.
 * Past 3 entries the list truncates — a centered "See more"/"See less"
 * text button reveals or re-hides the rest in place, its chevron flipping
 * between the two states. The button is omitted entirely (not just inert)
 * when the count is at or under 3 (4.10, clarified 4.14). If `uses` is
 * empty, the whole section is omitted — no header, no "Not yet added"
 * placeholder — a deliberate exception to the EmptySection convention
 * every other section on this page still uses.
 *
 * Corrected 2026-07-25, session 20, against the real mockup image: the
 * "Uses and indications" label and the See more/See less toggle both live
 * *inside* the tinted box now, not above/below it as first built — matches
 * the mockup, which has no content outside the box at all. The trailing
 * Divider() is also dropped — see the page-wide correction note below.
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
import { tintedBg } from '../../../utils/specialtyTokens.js'

const TRUNCATE_AT = 3

export default function UsesSection({ drug, colors, isDark }) {
  const [open, setOpen] = useState(false)

  const { uses = [] } = drug

  if (uses.length === 0) return null

  const hasMore = uses.length > TRUNCATE_AT
  const shown = open ? uses : uses.slice(0, TRUNCATE_AT)

  return (
    <div style={{
      marginBottom:    'var(--space-5)',
      padding:         'var(--space-4)',
      borderRadius:    'var(--radius-sm)',
      backgroundColor: tintedBg(colors.bg, isDark),
    }}>
      <div style={{
        fontSize:     15,
        fontWeight:   700,
        color:        'var(--color-text-primary)',
        marginBottom: 'var(--space-3)',
      }}>
        Uses and indications:
      </div>

      <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
        {shown.map((use, i) => {
          const { use_name: name, context } = use
          return (
            <li
              key={i}
              style={{ marginBottom: i === shown.length - 1 ? 0 : 'var(--space-2)' }}
            >
              {/* Dot sits in its own flex row with just the name, so it
                  centers against that one line regardless of whether a
                  context sub-line follows below (2026-07-25 alignment fix —
                  previously top-aligned against the whole li block, which
                  put the dot visibly above center once a sub-line existed). */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <span style={{
                  width:           5,
                  height:          5,
                  borderRadius:    '50%',
                  backgroundColor: colors.fg,
                  flexShrink:      0,
                }} />
                <span style={{
                  fontSize:   14,
                  fontWeight: 600,
                  color:      'var(--color-text-primary)',
                }}>
                  {name}
                </span>
              </div>
              {context && (
                <div style={{
                  fontSize:   13,
                  fontStyle:  'italic',
                  color:      'var(--color-text-tertiary)',
                  marginTop:  1,
                  paddingLeft: 'calc(5px + var(--space-2))',
                }}>
                  {context}
                </div>
              )}
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
    </div>
  )
}
