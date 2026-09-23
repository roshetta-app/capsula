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
 * 2026-09-23 (follow-up): the `context` sub-line under each use was
 * reading as muted/de-emphasized (italic, `--color-text-tertiary`) and
 * source data is stored all-lowercase, so it displayed lowercase too. Now
 * upright, a darker `--color-text-secondary`, and sentence-cased on
 * display only (first letter capitalized) via `toSentenceCase` below —
 * the stored `context` string itself is untouched.
 *
 * 2026-09-23 (follow-up 2): reverted the panel border added above — flat
 * neutral fill only, no outline. Bumped the corner radius from
 * `--radius-sm` to `--radius-md` for a rounder box, and the use-name font
 * from 600 to 500 so entries read less bold. The reveal of the "See more"
 * items also had no animation of its own (only the button's chevron
 * animated) — the extra entries past the first 3 now fade in/out the same
 * two-frame opacity-transition way InlineTruncatedList's extra chips
 * already do in sectionPrimitives.jsx, instead of appearing/disappearing
 * instantly.
 *
 * 2026-09-23 (follow-up 3): the toggle was only reachable via the "See
 * more"/"See less" button — the entries themselves did nothing when
 * tapped. Each point now also triggers the same expand/collapse
 * (`handleToggle`) on click/tap, only while `hasMore` is true, so users
 * don't have to aim for the small button specifically.
 *
 * Props:
 *   drug   — flat drug object from DrugContext
 *   colors — resolved category color token ({ bg, fg, pill }), the same
 *            object DrugHeader already receives from DrugDetailScreen
 *   isDark — current dark-mode state; no longer used by this component now
 *            that the panel background is a mode-aware neutral token, but
 *            kept in the signature for caller compatibility
 */

import { useState, useRef, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'

const TRUNCATE_AT = 3

// Display-only: stored `context` strings are all-lowercase, so this
// capitalizes just the first letter for sentence case on screen without
// touching the underlying data.
function toSentenceCase(text) {
  if (!text) return text
  return text.charAt(0).toUpperCase() + text.slice(1)
}

// One use entry (dot + name + optional context sub-line). Pulled out of the
// main render so the fading "extra" entries past TRUNCATE_AT and the always-
// visible first 3 can share exactly the same markup/styling.
function UseEntry({ use, colors, isLast, style, onToggle }) {
  const { use_name: name, context } = use
  return (
    <li
      onClick={onToggle}
      style={{
        marginBottom: isLast ? 0 : 'var(--space-2)',
        cursor:       onToggle ? 'pointer' : 'default',
        WebkitTapHighlightColor: 'transparent',
        ...style,
      }}
    >
      {/* Dot sits in its own flex row with just the name, so it centers
          against that one line regardless of whether a context sub-line
          follows below (2026-07-25 alignment fix — previously top-aligned
          against the whole li block, which put the dot visibly above
          center once a sub-line existed). */}
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
          fontWeight: 500,
          color:      'var(--color-text-primary)',
        }}>
          {name}
        </span>
      </div>
      {context && (
        <div style={{
          fontSize:   13,
          color:      'var(--color-text-secondary)',
          marginTop:  1,
          paddingLeft: 'calc(5px + var(--space-2))',
        }}>
          {toSentenceCase(context)}
        </div>
      )}
    </li>
  )
}

export default function UsesSection({ drug, colors, isDark }) {
  const [open, setOpen] = useState(false)
  // showExtra: the past-3 entries are in the layout at all. extraVisible:
  // they're opaque. Kept separate (same pattern as InlineTruncatedList in
  // sectionPrimitives.jsx) so a fade-out can finish before they're removed.
  const [showExtra, setShowExtra]       = useState(false)
  const [extraVisible, setExtraVisible] = useState(false)
  const timerRef = useRef(null)
  const rafRef   = useRef(null)

  useEffect(() => () => {
    clearTimeout(timerRef.current)
    cancelAnimationFrame(rafRef.current)
  }, [])

  const { uses = [] } = drug

  if (uses.length === 0) return null

  const hasMore = uses.length > TRUNCATE_AT
  const visible = uses.slice(0, TRUNCATE_AT)
  const extra   = uses.slice(TRUNCATE_AT)

  function handleToggle() {
    clearTimeout(timerRef.current)
    cancelAnimationFrame(rafRef.current)
    if (!open) {
      setOpen(true)
      setShowExtra(true)
      // Two frames so the extra entries paint once at opacity 0 before
      // fading in, instead of popping straight to opacity 1.
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = requestAnimationFrame(() => setExtraVisible(true))
      })
    } else {
      setOpen(false)
      setExtraVisible(false)
      timerRef.current = setTimeout(() => setShowExtra(false), 200)
    }
  }

  return (
    <div style={{
      marginBottom:    'var(--space-5)',
      padding:         'var(--space-4)',
      borderRadius:    'var(--radius-md)',
      backgroundColor: 'var(--color-surface)',
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
        {visible.map((use, i) => (
          <UseEntry
            key={i}
            use={use}
            colors={colors}
            isLast={!hasMore && !showExtra && i === visible.length - 1}
          />
        ))}
        {hasMore && showExtra && extra.map((use, i) => (
          <UseEntry
            key={i}
            use={use}
            colors={colors}
            isLast={i === extra.length - 1}
            style={{
              opacity:    extraVisible ? 1 : 0,
              transition: 'opacity 0.2s ease',
            }}
          />
        ))}
      </ul>

      {hasMore && (
        <button
          onClick={handleToggle}
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
