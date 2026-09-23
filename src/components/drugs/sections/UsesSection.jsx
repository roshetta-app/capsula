/**
 * src/components/drugs/sections/UsesSection.jsx
 * drug_library_ui_ux — Drug Detail Screen rebuild, Phase 1 step 1.2
 * (plan decision 4.10 — see STEPS_DRUG_DETAIL.md §1.2, plan §10 Section 9)
 *
 * Renders the Uses and Indications section for a drug: a bulleted list of
 * uses inside a boxed panel, each entry a bold name with an italic sub-line
 * underneath only when that entry's `context` is present. Past 3 entries
 * the list truncates — a centered "See more"/"See less" text button reveals
 * or re-hides the rest in place, its chevron rotating between the two
 * states. The button is omitted entirely (not just inert) when the count
 * is at or under 3 (4.10, clarified 4.14). If `uses` is empty, the whole
 * section is omitted — no header, no "Not yet added" placeholder — a
 * deliberate exception to the EmptySection convention every other section
 * on this page still uses.
 *
 * Corrected 2026-07-25, session 20, against the real mockup image: the
 * "Uses and indications" label and the See more/See less toggle both live
 * *inside* the tinted box now, not above/below it as first built — matches
 * the mockup, which has no content outside the box at all. The trailing
 * Divider() is also dropped — see the page-wide correction note below.
 *
 * Built as its own one-off component per 4.10 — no shared primitive was
 * extracted, since no second consumer needs this shape yet.
 *
 * 2026-09-23: swapped the panel's background from the category-color
 * ambient wash (`tintedBg`, specialtyTokens.js) to the app's neutral
 * `--color-surface` token, matching the same card-surface treatment
 * IngredientChip already uses elsewhere in sectionPrimitives.jsx. That
 * token is already dark/light-mode aware via globals.css's `.dark`
 * overrides, so no per-mode branching is needed here — `isDark` is no
 * longer read by this component (kept in the prop signature since
 * DrugDetailScreen still passes it). Added a matching neutral border so
 * the panel keeps a defined edge now that it no longer reads as a colored
 * card. Also replaced the ChevronUp/ChevronDown icon-swap on the "See
 * more"/"See less" button with a single chevron that rotates 180°, the
 * same transform+transition treatment ShowMoreToggle already uses in
 * sectionPrimitives.jsx, so the toggle animates instead of snapping.
 *
 * Props:
 *   drug   — flat drug object from DrugContext
 *   colors — resolved category color token ({ bg, fg, pill }), the same
 *            object DrugHeader already receives from DrugDetailScreen
 *   isDark — current dark-mode state; no longer used by this component now
 *            that the panel background is a mode-aware neutral token, but
 *            kept in the signature for caller compatibility
 */

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

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
      backgroundColor: 'var(--color-surface)',
      border:          '1px solid var(--color-border)',
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
          aria-label={open ? 'See less' : 'See more'}
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
          <ChevronDown
            size={14}
            style={{
              transform:  open ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s ease',
            }}
          />
        </button>
      )}
    </div>
  )
}
