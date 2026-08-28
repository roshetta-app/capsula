/**
 * src/components/ui/ProComingSoonSheet.jsx
 * F10 Stage 2, Batch D — item 8g (Pro teaser)
 *
 * Feedback shown when the "Upgrade to Capsula PRO" banner on AccountScreen
 * is tapped. There is no real paid tier yet — everything is currently free
 * — so this is a deliberately generic, non-committal "coming soon" message
 * rather than anything naming specific locked features.
 *
 * Visually modeled on AppGate.jsx's AppGateSheet (bottom-anchored card,
 * dimmed backdrop, tinted icon band, fade + translateY entrance, portal to
 * document.body) so this reads as the same "soft interruption" pattern the
 * app already uses, rather than inventing a new visual style. Deliberately
 * simplified from that pattern for this lighter, user-initiated use:
 *   - No X button / "Maybe Later" split — there's nothing to remember
 *     dismissing, so a single "Got it" action is enough.
 *   - Backdrop tap DOES close this (unlike AppGateSheet, which removed
 *     that to avoid accidental permanent dismissal of an admin message) —
 *     this is not a persistent, re-appearing gate, just a one-off tap
 *     response, so ConfirmSheet/InfoSheet's click-outside-to-close
 *     behavior fits better here.
 *   - Sparkles icon in the accent color, matching the Upgrade banner's own
 *     branding rather than reusing one of AppGate's type-specific icons.
 *
 * Props:
 *   isOpen   boolean
 *   onClose  () => void
 */

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Sparkles } from 'lucide-react'

export default function ProComingSoonSheet({ isOpen, onClose }) {
  const overlayRef = useRef(null)

  // shouldRender keeps the DOM present during the exit transition.
  // animateIn drives the CSS open/closed visual state.
  const [shouldRender, setShouldRender] = useState(isOpen)
  const [animateIn,    setAnimateIn]    = useState(isOpen)

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true)
      requestAnimationFrame(() => setAnimateIn(true))
    } else {
      setAnimateIn(false)
      const t = setTimeout(() => setShouldRender(false), 220)
      return () => clearTimeout(t)
    }
  }, [isOpen])

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return
    function onKey(e) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  if (!shouldRender) return null

  // Portal to document.body — same reasoning as AppGate/ConfirmSheet/
  // InfoSheet: position: fixed only resolves against the viewport if no
  // ancestor creates its own containing block (transform/filter/etc).
  return createPortal(
    <div
      ref={overlayRef}
      onClick={e => { if (e.target === overlayRef.current) onClose() }}
      style={{
        position:        'fixed',
        inset:           0,
        zIndex:          1000,
        backgroundColor: 'rgba(0,0,0,0.45)',
        display:         'flex',
        alignItems:      'flex-end',
        justifyContent:  'center',
        opacity:         animateIn ? 1 : 0,
        transition:      'opacity var(--motion-base) var(--ease-reveal)',
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Capsula PRO"
        style={{
          width:                 '100%',
          maxWidth:              420,
          backgroundColor:       'var(--color-surface)',
          borderTopLeftRadius:   'var(--radius-xl)',
          borderTopRightRadius:  'var(--radius-xl)',
          overflow:              'hidden',
          boxShadow:             '0 -8px 32px rgba(0,0,0,0.12)',
          fontFamily:            'var(--font-body)',
          opacity:               animateIn ? 1 : 0,
          transform:             animateIn ? 'translateY(0)' : 'translateY(24px)',
          transition:            'opacity var(--motion-screen) var(--ease-reveal), transform var(--motion-screen) var(--ease-settle)',
        }}
      >
        {/* Tinted icon band — same shape as AppGate's GateBand, accent
            colored to match the Upgrade banner rather than a per-type
            color, since this only ever represents one thing. */}
        <div style={{
          backgroundColor: 'var(--color-accent-light)',
          height:          140,
          display:         'flex',
          alignItems:      'center',
          justifyContent:  'center',
          flexShrink:      0,
        }}>
          <div style={{
            width:           64,
            height:          64,
            borderRadius:    'var(--radius-lg)',
            backgroundColor: 'var(--color-surface)',
            display:         'flex',
            alignItems:      'center',
            justifyContent:  'center',
          }}>
            <Sparkles size={30} color="var(--color-accent)" strokeWidth={1.75} aria-hidden="true" />
          </div>
        </div>

        <div style={{ padding: 'var(--space-5)' }}>
          <div style={{
            fontSize:     16,
            fontWeight:   700,
            color:        'var(--color-text-primary)',
            marginBottom: 'var(--space-2)',
          }}>
            Capsula PRO
          </div>

          <div style={{
            fontSize:     14,
            lineHeight:   1.55,
            color:        'var(--color-text-secondary)',
            marginBottom: 'var(--space-5)',
          }}>
            Capsula PRO is coming soon. We're still deciding exactly what
            it will include — thanks for your interest!
          </div>

          <button
            onClick={onClose}
            style={{
              width:           '100%',
              padding:         'var(--space-3) var(--space-4)',
              borderRadius:    'var(--radius-full)',
              border:          'none',
              backgroundColor: 'var(--color-accent)',
              color:           '#fff',
              fontSize:        15,
              fontWeight:      600,
              fontFamily:      'var(--font-body)',
              cursor:          'pointer',
            }}
          >
            Got it
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
