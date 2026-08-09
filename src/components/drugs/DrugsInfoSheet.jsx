/**
 * src/components/drugs/DrugsInfoSheet.jsx
 *
 * 2026-08-09: opened from the new info icon button in DrugsHero's
 * previously-empty action slot (see DrugsScreen.jsx). Explains where the
 * drug library's data comes from and carries the medical disclaimer.
 *
 * Shell (backdrop fade, slide-up transition, mount/unmount timing, Escape
 * key, body-scroll lock) is copied directly from RecentlyViewedSheet.jsx /
 * BrandsBottomSheet.jsx / SpecialtiesBottomSheet.jsx so it reads as the
 * same bottom-sheet pattern already used everywhere else in the app,
 * rather than introducing a new one.
 *
 * Copy below (SOURCES and DISCLAIMER) is placeholder text — ask to have it
 * rewritten with the library's real reference sources and final wording
 * before shipping.
 *
 * Props:
 *   isOpen   boolean
 *   onClose  () => void
 */

import { useEffect, useState } from 'react'

const SOURCES = [
  '[Add the primary references the drug library is built from — e.g. a national or regional formulary, WHO essential medicines list, manufacturer product inserts, or a specific clinical reference text.]',
  '[Add any secondary sources used to fill gaps or cross-check entries.]',
]

const DISCLAIMER =
  'This app is provided for reference purposes only and is not a substitute ' +
  'for professional medical judgment. Always verify dosing, interactions, ' +
  'and other critical information against current, authoritative sources ' +
  'before making clinical decisions. [Replace this paragraph with the ' +
  'final legal/medical disclaimer wording.]'

export default function DrugsInfoSheet({ isOpen, onClose }) {
  const [shouldRender, setShouldRender] = useState(isOpen)
  const [animateIn,    setAnimateIn]    = useState(isOpen)

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true)
      requestAnimationFrame(() => setAnimateIn(true))
    } else {
      setAnimateIn(false)
      const t = setTimeout(() => setShouldRender(false), 280)
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
          transition:      'opacity var(--motion-base) var(--ease-reveal)',
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="About this drug library"
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
          transform:       animateIn ? 'translateY(0)' : 'translateY(100%)',
          transition:      'transform var(--motion-screen) var(--ease-settle)',
        }}
      >
        {/* Fixed header — drag handle + title + close button. */}
        <div style={{ flexShrink: 0, padding: 'var(--space-5) var(--space-4) 0' }}>
          <div style={{
            width:           40,
            height:          4,
            borderRadius:    2,
            backgroundColor: 'var(--color-border)',
            margin:          '0 auto var(--space-3)',
          }} />
          <div style={{
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'space-between',
            gap:            'var(--space-2)',
            marginBottom:   'var(--space-3)',
          }}>
            <h2 style={{
              fontSize:   16,
              fontWeight: 700,
              color:      'var(--color-text-primary)',
              margin:     0,
            }}>
              About this drug library
            </h2>
            <button
              onClick={onClose}
              aria-label="Close"
              style={{
                display:                 'flex',
                alignItems:              'center',
                justifyContent:          'center',
                width:                   28,
                height:                  28,
                borderRadius:            '50%',
                background:              'none',
                border:                  'none',
                cursor:                  'pointer',
                color:                   'var(--color-text-tertiary)',
                WebkitTapHighlightColor: 'transparent',
                flexShrink:              0,
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div style={{
          flex:      1,
          overflowY: 'auto',
          padding:   '0 var(--space-4) var(--space-6)',
        }}>
          <div style={{ marginBottom: 'var(--space-5)' }}>
            <div style={{
              fontSize:     13,
              fontWeight:   700,
              color:        'var(--color-text-primary)',
              marginBottom: 'var(--space-2)',
            }}>
              Sources
            </div>
            {SOURCES.map((s, i) => (
              <p key={i} style={{
                fontSize:   13,
                lineHeight: 1.5,
                color:      'var(--color-text-secondary)',
                margin:     '0 0 var(--space-2)',
              }}>
                {s}
              </p>
            ))}
          </div>

          <div>
            <div style={{
              fontSize:     13,
              fontWeight:   700,
              color:        'var(--color-text-primary)',
              marginBottom: 'var(--space-2)',
            }}>
              Disclaimer
            </div>
            <p style={{
              fontSize:   13,
              lineHeight: 1.5,
              color:      'var(--color-text-secondary)',
              margin:     0,
            }}>
              {DISCLAIMER}
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
