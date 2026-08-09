/**
 * src/components/conditions/FavouritesManagerSheet.jsx
 *
 * Bottom sheet grouping the three Favourites-Conditions controls (sort,
 * specialty filter, manage mode) behind a single entry point, instead of
 * three separate header buttons. Visual shell (backdrop fade, slide-up
 * transition, mount/unmount timing, Escape key, body-scroll lock) is copied
 * from SpecialtiesBottomSheet so it reads as the same "extra controls"
 * pattern already established there and in ConfirmSheet — no new UI
 * language introduced.
 *
 * Layout:
 *   1. Sort       — two-way segmented control (A-Z / Recently added labels
 *                   are caller-supplied via sortLabels, not hardcoded here,
 *                   since Favourites' 'recent' means "recently added" while
 *                   ConditionsScreen's own sort toggle means "recently
 *                   viewed" — this component has no opinion on that).
 *   2. Specialty  — a drill-in row. Tapping it closes this sheet and opens
 *                   SpecialtiesBottomSheet (unchanged, reused as-is) — the
 *                   two sheets are never shown stacked/simultaneously.
 *   3. Manage     — tapping it calls onManage() and closes this sheet.
 *
 * Props:
 *   isOpen              boolean
 *   onClose             () => void
 *   sortMode            string  — 'az' | 'recent'
 *   sortLabels          { az: string, recent: string }
 *   onSetSortMode       (mode: string) => void
 *   activeSpecialtyObj  { name, iconType, iconValue, colorToken } | null
 *   onOpenSpecialties   () => void  — called after this sheet closes
 *   onClearSpecialty    () => void  — resets specialty to 'all'; sheet stays open
 *   onManage            () => void  — called after this sheet closes
 */

import { useEffect, useState }          from 'react'
import { ListFilter, ListChecks, ArrowUpDown, X } from 'lucide-react'
import { SpecialtyIcon, useIsDark }     from '../../utils/specialtyIcon'
import { resolveToken, FALLBACK_TOKEN } from '../../utils/specialtyTokens'

export default function FavouritesManagerSheet({
  isOpen,
  onClose,
  sortMode,
  sortLabels,
  onSetSortMode,
  activeSpecialtyObj,
  onOpenSpecialties,
  onClearSpecialty,
  onManage,
}) {
  const isDark = useIsDark()

  const [shouldRender, setShouldRender] = useState(isOpen)
  const [animateIn,    setAnimateIn]    = useState(isOpen)

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true)
      requestAnimationFrame(() => setAnimateIn(true))
    } else {
      setAnimateIn(false)
      const t = setTimeout(() => setShouldRender(false), 320)
      return () => clearTimeout(t)
    }
  }, [isOpen])

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

  if (!shouldRender) return null

  const hasSpecialty = !!activeSpecialtyObj
  const tokenKey      = activeSpecialtyObj?.colorToken ?? FALLBACK_TOKEN
  const specialtyIconColor = hasSpecialty
    ? resolveToken(tokenKey, isDark).fg
    : 'var(--color-text-secondary)'

  function handleOpenSpecialties() {
    onClose()
    onOpenSpecialties()
  }

  function handleManage() {
    onClose()
    onManage()
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
          opacity:         animateIn ? 1 : 0,
          transition:      animateIn
            ? 'opacity 0.3s cubic-bezier(0.32, 0.72, 0, 1)'
            : 'opacity 0.25s cubic-bezier(0.32, 0.72, 0, 1)',
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Manage favourites"
        style={{
          position:        'fixed',
          bottom:          0,
          left:            0,
          right:           0,
          zIndex:          201,
          backgroundColor: 'var(--color-surface)',
          borderRadius:    '16px 16px 0 0',
          paddingBottom:   'env(safe-area-inset-bottom)',
          transform:       animateIn ? 'translateY(0)' : 'translateY(100%)',
          transition:      animateIn
            ? 'transform 0.42s cubic-bezier(0.32, 0.72, 0, 1)'
            : 'transform 0.32s cubic-bezier(0.32, 0.72, 0, 1)',
        }}
      >
        <div style={{ padding: 'var(--space-5) var(--space-4)' }}>
          {/* Drag handle */}
          <div style={{
            width:           40,
            height:          4,
            borderRadius:    2,
            backgroundColor: 'var(--color-border)',
            margin:          '0 auto var(--space-5)',
          }} />

          {/* Header — title + explicit close control. Bottom sheets
              elsewhere in the app (SpecialtiesBottomSheet) rely on
              backdrop-tap/Escape alone, but this sheet groups three
              distinct controls rather than a single pick-one list, so it
              gets its own dismiss affordance instead of relying on an
              implicit gesture. */}
          <div style={{
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'space-between',
            marginBottom:   'var(--space-4)',
          }}>
            <span style={{
              fontSize:   15,
              fontWeight: 700,
              fontFamily: 'var(--font-body)',
              color:      'var(--color-text-primary)',
            }}>
              Manage Favourites
            </span>
            <button
              onClick={onClose}
              aria-label="Close"
              style={{
                display:                 'flex',
                alignItems:              'center',
                justifyContent:          'center',
                flexShrink:              0,
                width:                   28,
                height:                  28,
                borderRadius:            '50%',
                border:                  'none',
                backgroundColor:         'var(--color-border-subtle)',
                cursor:                  'pointer',
                outline:                 'none',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              <X size={15} strokeWidth={2} color="var(--color-text-secondary)" aria-hidden="true" />
            </button>
          </div>

          {/* Sort — icon + label now match the visual language of the
              Filter/Select rows below it (was previously a small uppercase
              section label, inconsistent with the rest of the sheet).
              Label and control still share one row, buttons stay
              hug-content so the row doesn't stretch a two-word toggle
              across the sheet's full width. */}
          <div style={{
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'space-between',
            gap:            10,
            padding:        '12px 10px',
            marginBottom:   6,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
              <ArrowUpDown size={17} strokeWidth={1.8} color="var(--color-text-secondary)" aria-hidden="true" />
              <span style={{
                fontSize:   14,
                fontFamily: 'var(--font-body)',
                color:      'var(--color-text-primary)',
              }}>
                Sort by
              </span>
            </div>
            <div style={{
              display:         'flex',
              backgroundColor: 'var(--color-border-subtle)',
              borderRadius:    'var(--radius-md)',
              padding:         2,
              gap:             2,
              flexShrink:      0,
            }}>
              {['az', 'recent'].map(mode => {
                const isActive = sortMode === mode
                return (
                  <button
                    key={mode}
                    onClick={() => onSetSortMode(mode)}
                    style={{
                      padding:                 '6px 10px',
                      borderRadius:            'var(--radius-sm)',
                      border:                  'none',
                      backgroundColor:         isActive ? 'var(--color-surface)' : 'transparent',
                      boxShadow:               isActive ? '0 1px 2px rgba(0, 0, 0, 0.06)' : 'none',
                      fontSize:                12,
                      fontFamily:              'var(--font-body)',
                      fontWeight:              isActive ? 600 : 400,
                      color:                   isActive ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                      cursor:                  'pointer',
                      outline:                 'none',
                      whiteSpace:              'nowrap',
                      WebkitTapHighlightColor: 'transparent',
                      transition:              'background-color 0.15s ease, box-shadow 0.15s ease',
                    }}
                  >
                    {sortLabels[mode]}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Specialty — split into two adjacent controls rather than one
              button: the label area still opens SpecialtiesBottomSheet,
              while an inline X (only rendered once a specialty is active)
              resets straight to 'all' without leaving this sheet. A
              clickable clear control can't be nested inside the label's
              own <button>, hence the wrapping row here. */}
          <div style={{
            display:      'flex',
            alignItems:   'center',
            marginBottom: 6,
          }}>
            <button
              onClick={handleOpenSpecialties}
              style={{
                flex:                    1,
                minWidth:                0,
                display:                 'flex',
                alignItems:              'center',
                gap:                     10,
                padding:                 '12px 10px',
                background:              'none',
                border:                  'none',
                borderRadius:            'var(--radius-md)',
                textAlign:               'left',
                cursor:                  'pointer',
                outline:                 'none',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {hasSpecialty ? (
                <SpecialtyIcon
                  iconType={activeSpecialtyObj.iconType   ?? 'lucide'}
                  iconValue={activeSpecialtyObj.iconValue ?? 'Stethoscope'}
                  size={17}
                  color={specialtyIconColor}
                />
              ) : (
                <ListFilter size={17} strokeWidth={1.8} color={specialtyIconColor} aria-hidden="true" />
              )}
              <span style={{
                flex:         1,
                minWidth:     0,
                overflow:     'hidden',
                whiteSpace:   'nowrap',
                textOverflow: 'ellipsis',
                fontSize:     14,
                fontFamily:   'var(--font-body)',
                color:        'var(--color-text-primary)',
              }}>
                {hasSpecialty ? activeSpecialtyObj.name : 'Filter by specialty'}
              </span>
              {!hasSpecialty && (
                <svg width="13" height="13" viewBox="0 0 12 12" fill="none" aria-hidden="true"
                  style={{ flexShrink: 0, color: 'var(--color-text-tertiary)', transform: 'rotate(-90deg)' }}>
                  <path d="M2 4.5L6 8.5L10 4.5" stroke="currentColor" strokeWidth="1.6"
                    strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>

            {hasSpecialty && (
              <button
                onClick={onClearSpecialty}
                aria-label="Clear specialty filter"
                style={{
                  display:                 'flex',
                  alignItems:              'center',
                  justifyContent:          'center',
                  flexShrink:              0,
                  width:                   28,
                  height:                  28,
                  marginRight:             6,
                  borderRadius:            '50%',
                  border:                  'none',
                  background:              'none',
                  cursor:                  'pointer',
                  outline:                 'none',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                <X size={15} strokeWidth={2} color="var(--color-text-tertiary)" aria-hidden="true" />
              </button>
            )}
          </div>

          <div style={{ borderTop: '0.5px solid var(--color-border-subtle)', margin: '2px 0 8px' }} />

          {/* Manage */}
          <button
            onClick={handleManage}
            style={{
              width:                   '100%',
              display:                 'flex',
              alignItems:              'center',
              gap:                     10,
              padding:                 '12px 10px',
              background:              'none',
              border:                  'none',
              borderRadius:            'var(--radius-md)',
              textAlign:               'left',
              cursor:                  'pointer',
              outline:                 'none',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <ListChecks size={17} strokeWidth={1.8} color="var(--color-text-secondary)" aria-hidden="true" />
            <span style={{
              fontSize:   14,
              fontFamily: 'var(--font-body)',
              color:      'var(--color-text-primary)',
            }}>
              Select favourites
            </span>
          </button>
        </div>
      </div>
    </>
  )
}
