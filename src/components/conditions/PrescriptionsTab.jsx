import { useState } from 'react'
import PrescriptionCard from './PrescriptionCard'

/**
 * PrescriptionsTab — prescription label pills + active card + patient instructions.
 *
 * Props:
 *   prescriptions        PrescriptionFull[]
 *   patientInstructions  string | null
 */
export default function PrescriptionsTab({ prescriptions, patientInstructions }) {
  const [activeIndex, setActiveIndex] = useState(0)

  if (!prescriptions?.length) {
    return (
      <div style={{
        textAlign: 'center',
        padding: 'var(--space-12) var(--space-4)',
        color: 'var(--color-text-tertiary)',
      }}>
        <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 'var(--space-2)' }}>
          No prescriptions added yet
        </div>
        <div style={{ fontSize: 12 }}>
          Add prescriptions via the admin CMS
        </div>
      </div>
    )
  }

  const active = prescriptions[activeIndex] ?? prescriptions[0]

  return (
    <div>
      {/* Prescription label pills — horizontal scroll */}
      {prescriptions.length > 1 && (
        <div style={{
          display: 'flex',
          gap: 'var(--space-2)',
          overflowX: 'auto',
          paddingBottom: 'var(--space-2)',
          marginBottom: 'var(--space-4)',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}>
          {prescriptions.map((rx, i) => {
            const isActive = i === activeIndex
            return (
              <button
                key={rx.id}
                onClick={() => setActiveIndex(i)}
                style={{
                  flexShrink: 0,
                  padding: '6px 16px',
                  borderRadius: 'var(--radius-full)',
                  fontSize: 13,
                  fontWeight: isActive ? 600 : 400,
                  fontFamily: 'var(--font-body)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  border: isActive
                    ? '1.5px solid var(--color-accent)'
                    : '1.5px solid var(--color-border)',
                  backgroundColor: isActive ? 'var(--color-accent)' : 'var(--color-surface)',
                  color: isActive ? '#ffffff' : 'var(--color-text-secondary)',
                  whiteSpace: 'nowrap',
                }}
              >
                {rx.label}
              </button>
            )
          })}
        </div>
      )}

      {/* Active prescription card */}
      <PrescriptionCard items={active.items} />

      {/* Patient instructions — only if non-empty */}
      {patientInstructions && (
        <div style={{ marginTop: 'var(--space-5)' }}>
          <div style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'var(--color-text-tertiary)',
            marginBottom: 'var(--space-3)',
          }}>
            Patient Instructions
          </div>
          <div
            dir="auto"
            style={{
              fontSize: 14,
              color: 'var(--color-text-primary)',
              lineHeight: 1.7,
              whiteSpace: 'pre-line',
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-lg)',
              padding: 'var(--space-4)',
              boxShadow: 'var(--shadow-card)',
            }}
          >
            {patientInstructions}
          </div>
        </div>
      )}
    </div>
  )
}
