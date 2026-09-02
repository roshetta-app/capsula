
/**
 * src/components/ui/FavouriteLimitSheet.jsx
 *
 * Phase 7 — shown when a free account tries to add a favourite past its
 * per-list cap (see useFavourites.js / constants/features.js for the cap
 * numbers and messages). Same bottom-sheet shell as AccountSheet.jsx —
 * dimmed backdrop, drag handle, rounded top corners, slide-up/down
 * transition, safe-area bottom padding, closes on backdrop tap or Escape —
 * reusing the sign-in sheet's mechanics rather than inventing a new
 * interaction (explicit decision).
 *
 * Content: the matching limit-reached message for whichever list hit its
 * cap, a non-interactive ProUpsellBanner underneath (no real Pro upsell
 * page exists yet), then a "Got it" dismiss button.
 *
 * Props:
 *   isOpen     boolean
 *   listType   'drugs' | 'conditions'
 *   onClose    () => void
 */

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import ProUpsellBanner from './ProUpsellBanner'
import {
  FAVOURITES_LIMIT_MESSAGE_DRUGS,
  FAVOURITES_LIMIT_MESSAGE_CONDITIONS,
} from '../../constants/features'

const MESSAGES = {
  drugs:      FAVOURITES_LIMIT_MESSAGE_DRUGS,
  conditions: FAVOURITES_LIMIT_MESSAGE_CONDITIONS,
}

export default function FavouriteLimitSheet({ isOpen, listType, onClose }) {
  // shouldRender keeps the DOM present during the exit transition.
  // animateIn drives the CSS open/closed visual position — same
  // shouldRender/animateIn pattern AccountSheet.jsx uses.
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
    function onKey(e) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  // Same body-scroll lock AccountSheet.jsx uses while a bottom sheet is open.
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  if (!shouldRender) return null

  const message = MESSAGES[listType] ?? ''

  // Rendered via portal to document.body — same reasoning as AccountSheet:
  // position: fixed only resolves against the viewport if no ancestor has
  // a transform/filter/etc that creates its own containing block, and this
  // can be opened from screens that do.
  return createPortal(
    <>
      <div
        onClick={onClose}
        aria-hidden="true"
        style={{
          position:        'fixed',
          inset:           0,
          zIndex:          1000,
          backgroundColor: 'rgba(0,0,0,0.45)',
          opacity:         animateIn ? 1 : 0,
          transition:      'opacity var(--motion-base) var(--ease-reveal)',
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Favourite limit reached"
        style={{
          position:        'fixed',
          bottom:          0,
          left:            0,
          right:           0,
          zIndex:          1001,
          backgroundColor: 'var(--color-surface)',
          borderRadius:    '16px 16px 0 0',
          padding:         'var(--space-5) var(--space-4)',
          paddingBottom:   'calc(var(--space-5) + env(safe-area-inset-bottom))',
          fontFamily:      'var(--font-body)',
          transform:       animateIn ? 'translateY(0)' : 'translateY(100%)',
          transition:      'transform var(--motion-screen) var(--ease-settle)',
        }}
      >
        {/* Drag handle — same visual affordance AccountSheet.jsx uses. */}
        <div style={{
          width:           40,
          height:          4,
          borderRadius:    2,
          backgroundColor: 'var(--color-border)',
          margin:          '0 auto var(--space-5)',
        }} />

        <p style={{
          margin:     '0 0 var(--space-4)',
          fontSize:   14,
          lineHeight: 1.55,
          color:      'var(--color-text-primary)',
          textAlign:  'center',
        }}>
          {message}
        </p>

        <div style={{ marginBottom: 'var(--space-4)' }}>
          <ProUpsellBanner subtitle="Unlock unlimited favourites" />
        </div>

        <button onClick={onClose} style={dismissButtonStyle}>
          Got it
        </button>
      </div>
    </>,
    document.body
  )
}

const dismissButtonStyle = {
  width:           '100%',
  padding:         'var(--space-2) var(--space-4)',
  borderRadius:    'var(--radius-sm)',
  border:          '1px solid var(--color-border)',
  backgroundColor: 'transparent',
  color:           'var(--color-text-secondary)',
  fontSize:        14,
  fontWeight:      500,
  fontFamily:      'var(--font-body)',
  cursor:          'pointer',
}
