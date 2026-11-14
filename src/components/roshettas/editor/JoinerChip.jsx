/**
 * src/components/roshettas/editor/JoinerChip.jsx
 * 2026-11-14 (Roshetta plan, step 5.1a): the small chip between two drugs of a drug group in
 * the roshetta editor. Amber "or" (alternatives) or green "plus" (given together), drawn like
 * the viewer's chip but bigger, with a 44 px tap area. One tap switches it between or and plus.
 *
 * Props:
 *   joiner    'or' | 'and'   the saved value ('and' is shown as "plus"; anything else counts as 'or')
 *   onSwitch  () => void     called on a tap; the card does the switching (switchJoiner)
 *   disabled  boolean        no tap (for example a read only account); drawn as a plain chip
 *
 * Not placed on any screen yet: DrugGroupCard (step 5.1c) uses it.
 */

import { Plus } from 'lucide-react'
import { joinerChipInfo } from '../../../utils/roshettaJoinerText'

export default function JoinerChip({ joiner, onSwitch, disabled = false }) {
  const { word, isPlus, label } = joinerChipInfo(joiner)
  const tone = isPlus ? 'var(--color-success)' : 'var(--color-warning)'

  const pill = (
    <span
      style={{
        minHeight: 26, minWidth: 34, boxSizing: 'border-box', padding: isPlus ? '0 8px' : '0 12px',
        borderRadius: 999, whiteSpace: 'nowrap',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        backgroundColor: `color-mix(in srgb, ${tone} 15%, transparent)`,
        border: `1px solid color-mix(in srgb, ${tone} 35%, transparent)`,
        color: `color-mix(in srgb, ${tone} 85%, black 15%)`,
        fontSize: 13, fontWeight: 600, lineHeight: 1, letterSpacing: '0.01em',
        fontFamily: 'var(--font-body)',
      }}
    >
      {isPlus ? <Plus size={14} strokeWidth={3} aria-hidden="true" /> : word}
    </span>
  )

  if (disabled) {
    return (
      <span role="img" aria-label={isPlus ? 'plus' : 'or'} style={{ display: 'inline-flex' }}>
        {pill}
      </span>
    )
  }

  return (
    <button
      type="button"
      onClick={() => onSwitch?.()}
      aria-label={label}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        minHeight: 44, minWidth: 44, padding: 0, background: 'none', border: 'none',
        cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
      }}
    >
      {pill}
    </button>
  )
}
