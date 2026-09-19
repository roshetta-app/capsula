/**
 * src/components/drugs/sections/sectionPrimitives.jsx
 * Phase 2c — Drug Detail Screen, grouped sections
 *
 * Shared building blocks used across ClinicalOverview.jsx, DosingSection.jsx,
 * SafetySection.jsx, and PrescribingSection.jsx — extracted from the retiring
 * DrugInfoSections.jsx so the four new section files share one source instead
 * of duplicating these pieces.
 *
 * Note: ClassificationFallback is intentionally NOT included here. The old
 * "zero clinical content anywhere" single fallback message has been dropped —
 * each grouped section now shows its own independent "Not yet added" state
 * via EmptySection below.
 */

import { useState, useRef, useEffect } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

// --- Section header -----------------------------------------------------

export function SectionHeader({ title }) {
  return (
    <div style={{
      fontSize:      10,
      fontWeight:    700,
      letterSpacing: '0.1em',
      textTransform: 'uppercase',
      color:         'var(--color-text-tertiary)',
      marginBottom:  'var(--space-3)',
    }}>
      {title}
    </div>
  )
}

// --- Divider --------------------------------------------------------------

export function Divider() {
  return (
    <div style={{
      height:          1,
      backgroundColor: 'var(--color-border-subtle)',
      margin:          'var(--space-5) 0',
    }} />
  )
}

// --- Collapsible ------------------------------------------------------------

export function Collapsible({ title, children }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ marginBottom: 'var(--space-5)' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'space-between',
          width:          '100%',
          background:     'none',
          border:         'none',
          cursor:         'pointer',
          padding:        0,
          fontFamily:     'var(--font-body)',
        }}
      >
        <SectionHeader title={title} />
        {open
          ? <ChevronUp size={14} color="var(--color-text-tertiary)" />
          : <ChevronDown size={14} color="var(--color-text-tertiary)" />
        }
      </button>
      {open && <div style={{ marginTop: 'var(--space-2)' }}>{children}</div>}
      <Divider />
    </div>
  )
}

// --- Ingredient chip ---------------------------------------------------------
//
// Extracted this session so GenericOverviewSection.jsx's single-ingredient
// path can use the exact same chip treatment InlineTruncatedList's items now
// use, instead of only the combo (multi-ingredient) path looking this way.
export function IngredientChip({ children }) {
  return (
    <span style={{
      fontSize:        13,
      fontWeight:      500,
      color:           'var(--color-text-primary)',
      backgroundColor: 'var(--color-surface)',
      border:          '0.5px solid var(--color-border)',
      borderRadius:    'var(--radius-sm)',
      padding:         '4px 10px',
    }}>
      {children}
    </span>
  )
}

// --- Inline truncated list ---------------------------------------------------
//
// A chip-based list of items that truncates after `max` entries once there
// are more, revealing a "Show N more" toggle that expands/collapses the rest
// with an animated reveal.
//
// Deliberately separate from Collapsible above: Collapsible toggles a whole
// content block under its own section header (title + chevron, content
// appears below). This instead stays inline within a single content area —
// e.g. a combo drug's ingredient names — with no title and no block
// appearing underneath. (drug_detail_rebuild, step 1.1, decision 4.7 /
// §11.6 — confirmed Collapsible doesn't fit this shape, built as its own
// small shared primitive instead of forcing Collapsible to do both jobs.)
//
// Items are expected pre-formatted (already capitalized etc.) by the caller —
// this primitive only handles truncation/expand display, no text
// transformation of its own.
//
// 2026-09-18 (this session): redesigned per feedback on its only known
// current consumer (GenericOverviewSection.jsx's ingredient list — the four
// files this whole module's header comment lists as sharing these
// primitives, ClinicalOverview/DosingSection/SafetySection/
// PrescribingSection, are retired per DrugDetailScreen.jsx's own dated
// notes, so that comment is stale; noted here rather than rewritten there,
// same as this file's other dated corrections). Three real complaints:
//  1. Plain comma-joined text read poorly once items had commas of their
//     own to compete with visually — each item is its own bordered chip now.
//  2. No animation — hidden items now grow in via a max-height/opacity
//     transition (measured against the hidden wrapper's own scrollHeight),
//     instead of popping in/out instantly.
//  3. The old bare chevron sat right after the comma-joined text, so its
//     position shifted horizontally every time the text's own length
//     changed on toggle. The toggle is now its own row below the chip
//     list — a fixed location regardless of state — with a "Show N more" /
//     "Show less" label and a single chevron that rotates 180° rather than
//     swapping between Up/Down icons.
export function InlineTruncatedList({ items = [], max = 3 }) {
  const [open, setOpen] = useState(false)
  const extraRef = useRef(null)

  const hasMore = items.length > max
  const shown = items.slice(0, max)
  const extra = items.slice(max)

  // Animate to the hidden wrapper's own measured height rather than a
  // guessed fixed value, so this works regardless of how many extra items
  // there are or how they wrap.
  useEffect(() => {
    const el = extraRef.current
    if (!el) return
    el.style.maxHeight = open ? `${el.scrollHeight}px` : '0px'
  }, [open, extra.length])

  if (!items || items.length === 0) return null

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {shown.map((item, i) => (
          <IngredientChip key={i}>{item}</IngredientChip>
        ))}
        {hasMore && (
          <div
            ref={extraRef}
            style={{
              display:    'flex',
              flexWrap:   'wrap',
              gap:        6,
              maxHeight:  0,
              opacity:    open ? 1 : 0,
              overflow:   'hidden',
              transition: 'max-height 0.25s ease, opacity 0.2s ease',
            }}
          >
            {extra.map((item, i) => (
              <IngredientChip key={i}>{item}</IngredientChip>
            ))}
          </div>
        )}
      </div>
      {hasMore && (
        <button
          onClick={() => setOpen(o => !o)}
          aria-label={open ? 'Show fewer' : 'Show more'}
          style={{
            display:        'flex',
            alignItems:     'center',
            gap:            4,
            background:     'none',
            border:         'none',
            padding:        0,
            marginTop:      'var(--space-2)',
            cursor:         'pointer',
            fontSize:       13,
            color:          'var(--color-text-secondary)',
            fontFamily:     'var(--font-body)',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          {open ? 'Show less' : `Show ${extra.length} more`}
          <ChevronDown
            size={14}
            color="var(--color-text-tertiary)"
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

// --- Empty-section state ("Not yet added") ---------------------------------

export function NotYetAdded() {
  return (
    <p style={{
      fontSize:  13,
      color:     'var(--color-text-tertiary)',
      fontStyle: 'italic',
      margin:    0,
    }}>
      Not yet added
    </p>
  )
}

export function EmptySection({ title }) {
  return (
    <div style={{ marginBottom: 'var(--space-5)' }}>
      <SectionHeader title={title} />
      <NotYetAdded />
      <Divider />
    </div>
  )
}

// --- Pregnancy badge --------------------------------------------------------

export const PREGNANCY_META = {
  no_known_risk:     { bg: '#D1FAE5', color: '#065F46', label: 'No known risk — Studies have not shown risk to the fetus' },
  some_risk_monitor: { bg: '#FEF3C7', color: '#92400E', label: 'Some risk / monitor — Risk cannot be ruled out; use only if benefits outweigh potential risk, with monitoring' },
  contraindicated:   { bg: '#FEE2E2', color: '#991B1B', label: 'Contraindicated — Should not be used during pregnancy' },
  insufficient_data: { bg: '#F3F4F6', color: '#6B7280', label: 'Insufficient data — Not enough evidence to determine risk' },
}

// 2026-08-03 fix: the badge box below used to be a fixed 32x32 square sized
// for a single old letter category (B/X/etc). Decision 9's values are long
// plain-language strings, which overflowed that box. Now an auto-width pill
// (same shape as the Category pill on PregnancySection.jsx) showing a short
// label (the text before " — " in PREGNANCY_META's label) instead of the
// raw stored value.
export function PregnancyBadge({ category }) {
  const meta = PREGNANCY_META[category] ?? PREGNANCY_META.insufficient_data
  const shortLabel = meta.label.split(' — ')[0]
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
      <span style={{
        display:         'inline-flex',
        alignItems:      'center',
        justifyContent:  'center',
        padding:         '4px 10px',
        borderRadius:    'var(--radius-full)',
        backgroundColor: meta.bg,
        color:           meta.color,
        fontSize:        13,
        fontWeight:      700,
        whiteSpace:      'nowrap',
        flexShrink:      0,
      }}>
        {shortLabel}
      </span>
      <span style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>
        {meta.label}
      </span>
    </div>
  )
}

// --- Breastfeeding badge (Hale's Lactation Risk Categories, L1-L5) ------------

export const BREASTFEEDING_META = {
  L1: { bg: '#D1FAE5', color: '#065F46', label: 'L1 — Safest: compatible with breastfeeding; no evidence of risk to the infant' },
  L2: { bg: '#D1FAE5', color: '#065F46', label: 'L2 — Safer: limited data in nursing mothers; no evidence of increased risk' },
  L3: { bg: '#FEF3C7', color: '#92400E', label: 'L3 — Moderately safe: no controlled data in nursing mothers, but risk appears low' },
  L4: { bg: '#FEE2E2', color: '#991B1B', label: 'L4 — Possibly hazardous: positive evidence of risk, but benefit may outweigh risk in some situations' },
  L5: { bg: '#FEE2E2', color: '#991B1B', label: 'L5 — Contraindicated: significant documented risk to the infant based on human experience' },
}

// --- Crosses placenta / crosses BBB explanatory copy --------------------------
// Label-only — these two fields render as plain text on the card (real
// answer in standard color, "Unknown" in muted gray), not colored badges,
// so no bg/color is needed here, only the info-sheet copy.

export const CROSSES_META = {
  yes:     { label: 'Yes — Crosses readily' },
  no:      { label: 'No — Does not cross' },
  minimal: { label: 'Minimal — Crosses only in small/limited amounts' },
  unknown: { label: 'Unknown — Not established' },
}

// --- Icon row -----------------------------------------------------------------

export function IconRow({ icon, label, value }) {
  if (!value && value !== false) return null
  return (
    <div style={{
      display:    'flex',
      alignItems: 'center',
      gap:        'var(--space-2)',
      fontSize:   13,
      color:      'var(--color-text-secondary)',
      marginTop:  'var(--space-2)',
    }}>
      <span style={{ fontSize: 14 }}>{icon}</span>
      <span style={{ fontWeight: 500 }}>{label}:</span>
      <span style={{ color: 'var(--color-text-primary)' }}>{value}</span>
    </div>
  )
}

// --- Severity badge for interactions -------------------------------------------

export const SEVERITY_STYLE = {
  major:    { bg: '#FEE2E2', color: '#991B1B' },
  moderate: { bg: '#FEF3C7', color: '#92400E' },
  minor:    { bg: '#FEF9C3', color: '#713F12' },
}

export function SeverityBadge({ severity }) {
  if (!severity) return null
  const s = severity.toLowerCase()
  const style = SEVERITY_STYLE[s] ?? { bg: '#F3F4F6', color: '#6B7280' }
  return (
    <span style={{
      fontSize:        11,
      fontWeight:      600,
      textTransform:   'capitalize',
      backgroundColor: style.bg,
      color:           style.color,
      padding:         '2px 7px',
      borderRadius:    'var(--radius-full)',
      marginLeft:      'var(--space-2)',
      flexShrink:      0,
    }}>
      {s}
    </span>
  )
}

