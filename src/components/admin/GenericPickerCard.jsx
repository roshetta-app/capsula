/**
 * src/components/admin/GenericPickerCard.jsx
 *
 * 2026-11-13 (generic page, round 2): the row the drug picker shows in Generic mode when a
 * generic link is being made. It is a generic card, not a brand card: the generic name, its class
 * and family, and how many brands it has. No brand name, strength or form is shown.
 *
 * Props:
 *   drug        flat drug object (any brand of the generic; only its generic fields are read)
 *   brandCount  number of brands the generic has
 *   onTap       () => void
 *   isLast      hides the divider under the last row
 */

import { ChevronRight } from 'lucide-react'
import { toTitleCase } from '../../utils/drugTitleFormat'

export default function GenericPickerCard({ drug, brandCount = 0, onTap, isLast = false }) {
  const name = toTitleCase(drug?.genericName || drug?.generic || '')
  const groupLine = [drug?.class, drug?.subclass].filter(Boolean).map(toTitleCase).join(' · ')
  return (
    <button
      type="button"
      onClick={onTap}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 10,
        padding: '12px 4px', background: 'none', border: 'none',
        borderBottom: isLast ? 'none' : '0.5px solid var(--color-border)',
        cursor: 'pointer', textAlign: 'start', fontFamily: 'var(--font-body)',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text-primary)' }}>{name}</span>
          <span style={{
            padding: '1px 5px', borderRadius: 4, background: 'var(--color-accent)', color: '#fff',
            fontSize: 10, fontWeight: 700, letterSpacing: '0.03em', textTransform: 'uppercase', lineHeight: 1.4,
          }}>Generic</span>
        </div>
        {groupLine && (
          <div style={{ marginTop: 2, fontSize: 12, color: 'var(--color-text-secondary)' }}>{groupLine}</div>
        )}
      </div>
      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-tertiary)', whiteSpace: 'nowrap' }}>
        {brandCount} brand{brandCount === 1 ? '' : 's'}
      </span>
      <ChevronRight size={16} color="var(--color-text-tertiary)" />
    </button>
  )
}
