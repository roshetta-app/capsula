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

import { useState } from 'react'
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
  A: { bg: '#D1FAE5', color: '#065F46', label: 'Category A — Adequate studies show no risk' },
  B: { bg: '#DBEAFE', color: '#1E40AF', label: 'Category B — Animal studies show no risk; no adequate human studies' },
  C: { bg: '#FEF3C7', color: '#92400E', label: 'Category C — Animal studies show adverse effects; benefits may outweigh risks' },
  D: { bg: '#FEE2E2', color: '#991B1B', label: 'Category D — Evidence of human fetal risk; benefits may outweigh risks' },
  X: { bg: '#FCA5A5', color: '#7F1D1D', label: 'Category X — Fetal abnormalities demonstrated; risks outweigh benefits' },
  N: { bg: '#F3F4F6', color: '#6B7280', label: 'Not classified' },
}

export function PregnancyBadge({ category }) {
  const meta = PREGNANCY_META[category] ?? PREGNANCY_META.N
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
      <span style={{
        display:         'inline-flex',
        alignItems:      'center',
        justifyContent:  'center',
        width:           32,
        height:          32,
        borderRadius:    'var(--radius-sm)',
        backgroundColor: meta.bg,
        color:           meta.color,
        fontSize:        16,
        fontWeight:      700,
        flexShrink:      0,
      }}>
        {category}
      </span>
      <span style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>
        {meta.label}
      </span>
    </div>
  )
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
