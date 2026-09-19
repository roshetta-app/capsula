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
 *
 * 2026-09-19 (this session, Generic Overview refinement): added three new
 * primitives — ChipToggle, TextToggle, ClassificationCard — for
 * GenericOverviewSection.jsx's redesign (chip vs. text interaction patterns,
 * compact classification card). The existing ShowMoreToggle below is left in
 * place — it becomes unused by GenericOverviewSection.jsx after this change,
 * but UsesSection.jsx may still reference it, so it isn't removed.
 *
 * 2026-09-19 (this session, follow-up): GenericOverviewSection.jsx reverted
 * its Classification block back to the original floating pills, so
 * ClassificationCard below is now unused by any known consumer. Left in
 * place — removing it wasn't asked for.
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
//
// 2026-09-19 (this session): accepts an optional style prop, merged after the
// base chip style — used by InlineTruncatedList to fade the extra chips in
// and out. Callers that pass nothing render exactly as before.
// 2026-09-19 (this session): font size bumped 13 -> 14px, per feedback —
// chips read a little cramped at 13.
export function IngredientChip({ children, style }) {
  return (
    <span style={{
      fontSize:        14,
      fontWeight:      500,
      color:           'var(--color-text-primary)',
      backgroundColor: 'var(--color-surface)',
      border:          '0.5px solid var(--color-border)',
      borderRadius:    'var(--radius-sm)',
      padding:         '4px 10px',
      ...style,
    }}>
      {children}
    </span>
  )
}

// --- Show more / show less toggle ------------------------------------------
//
// One shared toggle look for every truncated block in the Generic Overview
// section (ingredient chips and Mechanism of Action text): left-aligned right
// under its content, small muted label, one chevron that rotates 180 degrees
// when open. The caller owns the open state and the label wording.
//
// 2026-09-19 (this session): GenericOverviewSection.jsx no longer uses this
// for either the ingredient list or the MOA text (see ChipToggle and
// TextToggle below) — the two patterns needed to look fundamentally
// different from each other, so a single shared toggle no longer fit either
// one well. Left in place in case UsesSection.jsx or another consumer still
// relies on it.
export function ShowMoreToggle({ open, label, onClick, ariaLabel }) {
  return (
    <button
      onClick={onClick}
      aria-label={ariaLabel}
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
      {label}
      <ChevronDown
        size={14}
        color="var(--color-text-tertiary)"
        style={{
          transform:  open ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s ease',
        }}
      />
    </button>
  )
}

// --- Chip-style "+N more" / "Show less" toggle -------------------------------
//
// 2026-09-19 (this session, Generic Overview refinement): built as its own
// primitive rather than reusing ShowMoreToggle — this one is a chip, sized
// and colored to sit inline as the last item in a wrapped row of
// IngredientChip elements (not a separate row underneath, unlike
// ShowMoreToggle above). Blue text on a tinted blue background, using the
// app's existing accent tokens (--color-accent / --color-accent-light),
// which are already dark-mode aware via globals.css's .dark overrides — no
// hardcoded color needed. When open, renders "Show less" instead of a count,
// so it doubles as the trailing "Show less" chip the expanded state needs.
export function ChipToggle({ open, moreCount, onClick }) {
  return (
    <button
      onClick={onClick}
      aria-label={open ? 'Show fewer ingredients' : `Show ${moreCount} more ingredients`}
      style={{
        fontSize:        13,
        fontWeight:      600,
        color:           'var(--color-accent)',
        backgroundColor: 'var(--color-accent-light)',
        border:          'none',
        borderRadius:    'var(--radius-sm)',
        padding:         '4px 10px',
        cursor:          'pointer',
        fontFamily:      'var(--font-body)',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      {open ? 'Show less' : `+${moreCount} more`}
    </button>
  )
}

// --- Plain text "More" / "Less" toggle ---------------------------------------
//
// 2026-09-19 (this session, Generic Overview refinement): the Mechanism of
// Action control needed to read as subordinate to its paragraph, not as a
// separate section/navigation row — so this is bold blue text only, no
// border, background, or chevron, sitting directly under the clamped text.
// Deliberately not ChipToggle or ShowMoreToggle: those both read as their
// own little control surface, which is exactly what MOA's control should
// avoid looking like.
export function TextToggle({ open, onClick, moreLabel = 'More', lessLabel = 'Less' }) {
  return (
    <button
      onClick={onClick}
      aria-label={open ? 'Show less' : 'Show more'}
      style={{
        display:    'inline-block',
        background: 'none',
        border:     'none',
        padding:    0,
        marginTop:  'var(--space-2)',
        cursor:     'pointer',
        fontSize:   13,
        fontWeight: 700,
        color:      'var(--color-accent)',
        fontFamily: 'var(--font-body)',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      {open ? lessLabel : moreLabel}
    </button>
  )
}

// --- Compact classification card ---------------------------------------------
//
// 2026-09-19 (this session, Generic Overview refinement): replaces the old
// pair of floating Class/Subclass pill tags with a single bordered card, so
// the two read as one grouped fact instead of two independent tags floating
// in a row. Still just static placeholder labels, not real data — the real
// `subclass` column is a separate, deferred migration (plan §11.5); this
// change is purely visual, same as before.
export function ClassificationCard({ labels }) {
  return (
    <div style={{
      display:      'flex',
      border:       '1px solid var(--color-border)',
      borderRadius: 'var(--radius-md)',
      overflow:     'hidden',
    }}>
      {labels.map((label, i) => (
        <div
          key={label}
          style={{
            flex:       1,
            padding:    '8px 12px',
            borderLeft: i > 0 ? '1px solid var(--color-border)' : 'none',
            fontSize:   13,
            fontWeight: 500,
            color:      'var(--color-text-primary)',
            textAlign:  'center',
          }}
        >
          {label}
        </div>
      ))}
    </div>
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
//
// 2026-09-19 (this session): two changes per feedback.
//  1. The extra chips used to live in one hidden wrapper group, so once
//     expanded they could drop onto a new line instead of continuing right
//     after the last visible chip. They are now ordinary chips in the same
//     wrapping row as the first ones — they only exist in the layout while
//     expanded, and fade in/out (opacity) rather than growing in by height.
//  2. The toggle row moved into the shared ShowMoreToggle above, so this
//     list and the Mechanism of Action text share one toggle look.
//
// 2026-09-19 (this session, follow-up — Generic Overview refinement): per
// feedback, the toggle is no longer its own row underneath the chips — it's
// now a ChipToggle (see above) rendered as the last item inside the same
// wrapped flex row as the chips themselves, so "+N more" reads as one of the
// chips rather than a separate control below the list. Expanding appends
// the extra chips before the toggle, which then re-labels itself
// "Show less" and stays in place as the trailing chip.
export function InlineTruncatedList({ items = [], max = 3 }) {
  const [open, setOpen] = useState(false)
  // showExtra: extra chips are in the layout at all. extraVisible: they are
  // opaque. Kept separate so a fade-out can finish before they leave the row.
  const [showExtra, setShowExtra]       = useState(false)
  const [extraVisible, setExtraVisible] = useState(false)
  const timerRef = useRef(null)
  const rafRef   = useRef(null)

  useEffect(() => () => {
    clearTimeout(timerRef.current)
    cancelAnimationFrame(rafRef.current)
  }, [])

  const hasMore = items.length > max
  const shown = items.slice(0, max)
  const extra = items.slice(max)

  function handleToggle() {
    clearTimeout(timerRef.current)
    cancelAnimationFrame(rafRef.current)
    if (!open) {
      setOpen(true)
      setShowExtra(true)
      // Two frames so the chips paint once at opacity 0 before fading in.
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = requestAnimationFrame(() => setExtraVisible(true))
      })
    } else {
      setOpen(false)
      setExtraVisible(false)
      timerRef.current = setTimeout(() => setShowExtra(false), 200)
    }
  }

  if (!items || items.length === 0) return null

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
      {shown.map((item, i) => (
        <IngredientChip key={i}>{item}</IngredientChip>
      ))}
      {hasMore && showExtra && extra.map((item, i) => (
        <IngredientChip
          key={i}
          style={{
            opacity:    extraVisible ? 1 : 0,
            transition: 'opacity 0.2s ease',
          }}
        >
          {item}
        </IngredientChip>
      ))}
      {hasMore && (
        <ChipToggle
          open={open}
          moreCount={extra.length}
          onClick={handleToggle}
        />
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
