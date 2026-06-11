/**
 * src/components/conditions/SpecialtiesBottomSheet.jsx
 *
 * Bottom sheet showing all specialties in a grid.
 * Opened by the "More" chip in SpecialtyFilterPills when specialty count > 8.
 *
 * Props:
 *   specialties      [{ id, name, iconName, colorHex }]
 *   activeSpecialty  string  — 'all' | id
 *   onSelect         (id) => void
 *   onClose          () => void
 *   isOpen           boolean
 */

import { useEffect } from 'react'

const FALLBACK_ICON = '🩺'

export default function SpecialtiesBottomSheet({
  specialties,
  activeSpecialty,
  onSelect,
  onClose,
  isOpen,
}) {
  useEffect(() => {
    if (!isOpen) return
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  if (!isOpen) return null

  function handleSelect(id) {
    onSelect(id)
    onClose()
  }

  return (
    <>
      <div
        onClick={onClose}
        aria-hidden="true"
        style={{
          position:        'fixed',
          inset:           0,
          zIndex:          200,
          backgroundColor: 'rgba(0,0,0,0.35)',
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Select specialty"
        style={{
          position:        'fixed',
          bottom:          0,
          left:            0,
          right:           0,
          zIndex:          201,
          backgroundColor: 'var(--color-surface)',
          borderRadius:    '16px 16px 0 0',
          padding:         'var(--space-5) var(--space-4) calc(var(--space-6) + env(safe-area-inset-bottom))',
          maxHeight:       '70dvh',
          overflowY:       'auto',
        }}
      >
        {/* Drag handle */}
        <div style={{
          width:           40,
          height:          4,
          borderRadius:    2,
          backgroundColor: 'var(--color-border)',
          margin:          '0 auto var(--space-5)',
        }} />

        {/* Section label */}
        <div style={{
          fontSize:      13,
          fontWeight:    500,
          color:         'var(--color-text-tertiary)',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          marginBottom:  'var(--space-3)',
        }}>
          Specialty
        </div>

        {/* All conditions row */}
        <button
          onClick={() => handleSelect('all')}
          style={{
            width:        '100%',
            textAlign:    'left',
            padding:      '10px 0',
            background:   'none',
            border:       'none',
            borderBottom: '1px solid var(--color-border-subtle)',
            fontSize:     15,
            fontFamily:   'var(--font-body)',
            fontWeight:   activeSpecialty === 'all' ? 600 : 400,
            color:        activeSpecialty === 'all' ? 'var(--color-accent)' : 'var(--color-text-primary)',
            cursor:       'pointer',
          }}
        >
          All conditions
        </button>

        {/* Specialty grid */}
        <div style={{
          display:             'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap:                 'var(--space-2)',
          marginTop:           'var(--space-3)',
        }}>
          {specialties.map(s => {
            const isActive = activeSpecialty === s.id
            return (
              <button
                key={s.id}
                onClick={() => handleSelect(s.id)}
                style={{
                  display:                 'flex',
                  alignItems:              'center',
                  gap:                     'var(--space-2)',
                  padding:                 '10px 12px',
                  borderRadius:            'var(--radius-md)',
                  border:                  isActive
                    ? `1.5px solid ${s.colorHex ?? 'var(--color-accent)'}`
                    : '1px solid var(--color-border)',
                  backgroundColor:         isActive
                    ? (s.colorHex ? `${s.colorHex}18` : 'var(--color-accent-light)')
                    : 'var(--color-surface)',
                  fontSize:                13,
                  fontFamily:              'var(--font-body)',
                  fontWeight:              isActive ? 600 : 400,
                  color:                   isActive
                    ? (s.colorHex ?? 'var(--color-accent)')
                    : 'var(--color-text-primary)',
                  cursor:                  'pointer',
                  textAlign:               'left',
                  WebkitTapHighlightColor: 'transparent',
                  outline:                 'none',
                }}
              >
                <span style={{ fontSize: 16, userSelect: 'none' }}>
                  {s.iconName ?? FALLBACK_ICON}
                </span>
                {s.name}
              </button>
            )
          })}
        </div>
      </div>
    </>
  )
}
