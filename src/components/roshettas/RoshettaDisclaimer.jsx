/**
 * src/components/roshettas/RoshettaDisclaimer.jsx
 * 2026-11-13 (Roshetta plan, step 3.2): the safety label shown on every roshetta
 * view, the owner's page and the shared page alike (decision A). A quiet grey bar
 * between the title/description and the sheet. It says who wrote the doses and
 * that Capsula did not check them. It has no button and cannot be closed.
 *
 * Colours come from the app's own variables, so light and dark both work.
 *
 * Props:
 *   marginTop   optional number of pixels above the bar (the screen decides spacing)
 */

import { Info } from 'lucide-react'

export default function RoshettaDisclaimer({ marginTop = 0 }) {
  return (
    <div
      role="note"
      style={{
        marginTop,
        display: 'flex',
        alignItems: 'flex-start',
        gap: 8,
        padding: '10px 12px',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--color-border)',
        backgroundColor: 'var(--color-surface-muted)',
      }}
    >
      <Info
        size={16}
        aria-hidden="true"
        style={{ flexShrink: 0, marginTop: 1, color: 'var(--color-text-secondary)' }}
      />
      <span
        style={{
          fontSize: 13,
          lineHeight: 1.5,
          color: 'var(--color-text-secondary)',
        }}
      >
        Doses written by the author. Not checked by Capsula.
      </span>
    </div>
  )
}
