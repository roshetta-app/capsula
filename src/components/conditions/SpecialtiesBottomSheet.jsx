/**
 * src/components/conditions/SpecialtiesBottomSheet.jsx
 * Phase 6 — specialty icon system: Lucide / custom SVG + color tokens
 *
 * Bottom sheet showing all specialties in a grid.
 * Opened by the "More" chip in SpecialtyFilterPills when specialty count > 8.
 *
 * Props:
 *   specialties      [{ id, name, iconType, iconValue, colorToken }]
 *   activeSpecialty  string  — 'all' | id
 *   onSelect         (id) => void
 *   onClose          () => void
 *   isOpen           boolean
 */

import { useEffect }                    from 'react'
import { SpecialtyIcon }                from '../../utils/specialtyIcon'
import { resolveToken, FALLBACK_TOKEN } from '../../utils/specialtyTokens'


export default function SpecialtiesBottomSheet({
  specialties,
  activeSpecialty,
  onSelect,
  onClose,
  isOpen,
}) {
  const isDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false

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
            color:        activeSpecialty === 'all'
              ? 'var(--color-accent)'
              : 'var(--color-text-primary)',
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
            const tokenKey = s.colorToken ?? FALLBACK_TOKEN
            const colors   = resolveToken(tokenKey, isDark)

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
                    ? `1.5px solid ${colors.pill}`
                    : '1px solid var(--color-border)',
                  backgroundColor:         isActive
                    ? colors.bg
                    : 'var(--color-surface)',
                  fontSize:                13,
                  fontFamily:              'var(--font-body)',
                  fontWeight:              isActive ? 600 : 400,
                  color:                   isActive
                    ? colors.fg
                    : 'var(--color-text-primary)',
                  cursor:                  'pointer',
                  textAlign:               'left',
                  WebkitTapHighlightColor: 'transparent',
                  outline:                 'none',
                }}
              >
                <div style={{
                  width:           32,
                  height:          32,
                  flexShrink:      0,
                  borderRadius:    'var(--radius-sm)',
                  backgroundColor: colors.bg,
                  display:         'flex',
                  alignItems:      'center',
                  justifyContent:  'center',
                }}>
                  <SpecialtyIcon
                    iconType={s.iconType   ?? 'lucide'}
                    iconValue={s.iconValue ?? 'Stethoscope'}
                    size={16}
                    color={colors.fg}
                  />
                </div>
                {s.name}
              </button>
            )
          })}
        </div>
      </div>
    </>
  )
}
