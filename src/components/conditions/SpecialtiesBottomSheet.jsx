/**
 * src/components/conditions/SpecialtiesBottomSheet.jsx
 * Phase 6 — specialty icon system: Lucide / custom SVG + color tokens
 * Phase 7 — Row-list redesign: replaced the 2-column icon-bubble grid with
 *           a single-column row list (bare icon + name, no item border, no
 *           icon background). Selected row picks up a light wash of its
 *           own specialty color instead of a border + bg-token combo.
 *           Dialog split into a fixed header (drag handle, label, 'All
 *           conditions' row) and a separately scrollable specialty list,
 *           so 'All conditions' stays pinned while the list beneath it
 *           scrolls. Section label reworded 'Specialty' → 'Select
 *           Specialty'. List order is unchanged — still renders
 *           specialties in whatever order the prop array arrives in
 *           (CMS-defined upstream).
 * Phase 8 — Feedback pass on Phase 7: 'All conditions' given its own
 *           distinct treatment (bold weight, slightly larger size, margin
 *           below) instead of matching the specialty rows exactly, so it
 *           reads as a standout reset action. Idle-state icons now render
 *           in their own specialty accent color instead of flat tertiary
 *           grey, so the list reads colorfully at rest. Row dividers
 *           removed sheet-wide. Selected row's background tint now has
 *           rounded corners instead of spanning edge-to-edge as a flat
 *           rectangle.
 *
 * Bottom sheet showing all specialties as a scrollable row list.
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
import { SpecialtyIcon, useIsDark }     from '../../utils/specialtyIcon'
import { resolveToken, FALLBACK_TOKEN } from '../../utils/specialtyTokens'


export default function SpecialtiesBottomSheet({
  specialties,
  activeSpecialty,
  onSelect,
  onClose,
  isOpen,
}) {
  const isDark = useIsDark()

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
          display:         'flex',
          flexDirection:   'column',
          maxHeight:       '70dvh',
          paddingBottom:   'env(safe-area-inset-bottom)',
        }}
      >
        {/* Fixed header — drag handle, label, and the 'All conditions' row.
            Does not scroll; only the specialty list below it does. */}
        <div style={{
          flexShrink: 0,
          padding:    'var(--space-5) var(--space-4) 0',
        }}>
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
            Select Specialty
          </div>

          {/* All conditions — first row, distinct from the specialty rows
              below it: bolder weight always (not just when active) so it
              reads as a standout reset action rather than just another
              idle list item. Same tinted-background treatment when
              selected, using the neutral fallback token since 'all' has
              no specialty color of its own. No divider — divider style
              removed sheet-wide; the weight/size difference plus the
              margin below it is what separates it from the list. */}
          <button
            onClick={() => handleSelect('all')}
            style={{
              width:                   '100%',
              display:                 'flex',
              alignItems:              'center',
              textAlign:               'left',
              padding:                 '12px 14px',
              marginBottom:            'var(--space-2)',
              borderRadius:            'var(--radius-md)',
              background:              activeSpecialty === 'all'
                ? resolveToken(FALLBACK_TOKEN, isDark).bg
                : 'none',
              border:                  'none',
              fontSize:                16,
              fontFamily:              'var(--font-body)',
              fontWeight:              700,
              color:                   activeSpecialty === 'all'
                ? resolveToken(FALLBACK_TOKEN, isDark).fg
                : 'var(--color-text-primary)',
              cursor:                  'pointer',
              WebkitTapHighlightColor: 'transparent',
              outline:                 'none',
            }}
          >
            All conditions
          </button>
        </div>

        {/* Scrollable specialty list — one row per specialty, in the order
            received (CMS-defined order, unmodified by this component).
            Bare icon + name, no icon background, no item border, no
            divider between rows — rows are separated by the selected
            row's rounded color tint alone. Idle-state icons render in
            their own specialty accent color (not flat grey) so the list
            reads colorfully even before a selection is made. */}
        <div style={{
          flex:      1,
          overflowY: 'auto',
          padding:   '0 var(--space-4) var(--space-6)',
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
                  width:                   '100%',
                  display:                 'flex',
                  alignItems:              'center',
                  gap:                     'var(--space-3)',
                  padding:                 '12px 14px',
                  border:                  'none',
                  borderRadius:            'var(--radius-md)',
                  backgroundColor:         isActive ? colors.bg : 'transparent',
                  fontSize:                15,
                  fontFamily:              'var(--font-body)',
                  fontWeight:              isActive ? 600 : 400,
                  color:                   isActive ? colors.fg : 'var(--color-text-primary)',
                  cursor:                  'pointer',
                  textAlign:               'left',
                  WebkitTapHighlightColor: 'transparent',
                  outline:                 'none',
                }}
              >
                <SpecialtyIcon
                  iconType={s.iconType   ?? 'lucide'}
                  iconValue={s.iconValue ?? 'Stethoscope'}
                  size={18}
                  color={colors.fg}
                />
                {s.name}
              </button>
            )
          })}
        </div>
      </div>
    </>
  )
}
