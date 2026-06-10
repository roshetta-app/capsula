import { useState } from 'react'
import PrescriptionCard from './PrescriptionCard'
import PrescriptionPills from './PrescriptionPills'
import PersonalNotes from './PersonalNotes'
import ImageCarousel from './ImageCarousel'

/**
 * PrescriptionsTab — prescription label pills + active card +
 *                    patient instructions + personal notes + disclaimer.
 *
 * Phase 2D spec:
 *  - Uses PrescriptionPills (new, compact, swipe-blocked)
 *  - Uses PrescriptionCard (updated — numbered drug slots, dose logic)
 *  - PersonalNotes: tap-to-edit, localStorage-persisted
 *  - Medical disclaimer fixed at bottom
 *
 * Props:
 *   prescriptions        PrescriptionFull[]
 *   patientInstructions  string | null
 *   conditionId          string   — for PersonalNotes localStorage key
 *   images               { id, url, caption }[]  — condition images (optional)
 */
export default function PrescriptionsTab({ prescriptions, patientInstructions, conditionId, images = [] }) {
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

  const active = prescriptions[Math.min(activeIndex, prescriptions.length - 1)]

  return (
    <div>
      {/* Image carousel — shown only when condition has images */}
      {images.length > 0 && (
        <div style={{ marginBottom: 'var(--space-5)' }}>
          <ImageCarousel images={images} />
        </div>
      )}

      {/* Prescription label pills — only shown when >1 prescription */}
      {prescriptions.length > 1 && (
        <PrescriptionPills
          prescriptions={prescriptions}
          activeIndex={activeIndex}
          onSelect={setActiveIndex}
        />
      )}

      {/* Active prescription card */}
      <PrescriptionCard items={active.items} />

      {/* Patient instructions */}
      {patientInstructions && (
        <div style={{ marginTop: 'var(--space-5)' }}>
          <div style={{
            fontSize: 10, fontWeight: 700, letterSpacing: '0.1em',
            textTransform: 'uppercase', color: 'var(--color-text-tertiary)',
            marginBottom: 'var(--space-3)',
          }}>
            Patient Instructions
          </div>
          <div
            dir="auto"
            style={{
              fontSize: 14, color: 'var(--color-text-primary)',
              lineHeight: 1.7, whiteSpace: 'pre-line',
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

      {/* Personal Notes */}
      {conditionId && <PersonalNotes conditionId={conditionId} />}

      {/* Medical Disclaimer */}
      <div style={{
        marginTop: 'var(--space-6)',
        fontSize: 11,
        color: 'var(--color-text-tertiary)',
        fontStyle: 'italic',
        lineHeight: 1.6,
        textAlign: 'center',
        padding: '0 var(--space-2)',
      }}>
        Clinical reference only. Verify doses before prescribing. Individual patient factors apply. Not a substitute for clinical judgment.
      </div>
    </div>
  )
}
