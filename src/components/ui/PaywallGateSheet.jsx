/**
 * src/components/ui/PaywallGateSheet.jsx
 *
 * signin-sheet-copy-and-notes-emptystate — shared shell for "you hit a
 * free-tier wall" bottom sheets. FavouriteLimitSheet.jsx and
 * PersonalNotes.jsx's photo-upsell sheet both used to hand-build this same
 * shell independently (bottom sheet + backdrop + drag handle + message +
 * ProUpsellBanner + dismiss) with copy and a bordered dismiss button that
 * had already drifted apart between the two. Pulled out once so both read
 * as the same pattern and share one place to fix.
 *
 * Same shouldRender/animateIn delayed-unmount, Escape-to-close, and
 * body-scroll-lock behavior AccountSheet.jsx and FavouriteLimitSheet.jsx
 * already use — kept identical here rather than introducing a new
 * mechanic.
 *
 * Dismiss is a plain text link, not a bordered button — matches the
 * mockup's "Clean Dismiss Action" note.
 *
 * paywall-sheet-copy-tweaks (this session) — CTA simplified from
 * ProUpsellBanner (icon/subtitle/chevron card) down to one plain rounded
 * button reading only "Upgrade to Capsula Pro" — per feedback, every
 * sheet using this shell should show the same minimal button, nothing
 * else. Non-interactive (no onClick/cursor) since no real Pro upsell page
 * exists yet, same reasoning ProUpsellBanner's decorative mode already
 * used. The `ctaSubtitle` prop this replaced is removed — no caller needs
 * it now that the button has no subtitle.
 *
 * Props:
 *   isOpen       boolean
 *   onClose      () => void
 *   icon         lucide component — rendered inside the centered icon
 *                circle (e.g. Heart, ImagePlus).
 *   countLabel   string   — optional. A short pill under the icon circle
 *                (e.g. "10/10"). Omit to skip the pill entirely.
 *   headline     string   — bold centered title.
 *   message      string | node — centered body copy under the headline.
 *                Accepts a JSX fragment (not just a plain string) so a
 *                caller can bold part of the message, e.g. the word "Pro".
 *   dismissLabel string   — text of the plain-link dismiss underneath.
 */

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Lock } from 'lucide-react'

export default function PaywallGateSheet({
  isOpen,
  onClose,
  icon: IconComponent,
  countLabel,
  headline,
  message,
  dismissLabel,
}) {
  // shouldRender keeps the DOM present during the exit transition.
  // animateIn drives the CSS open/closed visual position — same
  // shouldRender/animateIn pattern AccountSheet.jsx / FavouriteLimitSheet.jsx use.
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

  // Same body-scroll lock AccountSheet.jsx / FavouriteLimitSheet.jsx use
  // while a bottom sheet is open.
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  if (!shouldRender) return null

  // Rendered via portal to document.body — same reasoning as
  // AccountSheet/FavouriteLimitSheet: position: fixed only resolves
  // against the viewport if no ancestor has a transform/filter/etc that
  // creates its own containing block, and this sheet can be opened from
  // screens that do.
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
        aria-label={headline}
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

        <div style={{ textAlign: 'center' }}>
          {/* Icon circle + corner lock badge. */}
          <div style={{
            position:     'relative',
            width:        64,
            height:       64,
            margin:       countLabel ? '0 auto var(--space-2)' : '0 auto var(--space-4)',
          }}>
            <div style={{
              width:           64,
              height:          64,
              borderRadius:    'var(--radius-full)',
              backgroundColor: 'var(--color-accent-light)',
              display:         'flex',
              alignItems:      'center',
              justifyContent:  'center',
            }}>
              {IconComponent && <IconComponent size={28} color="var(--color-accent)" strokeWidth={1.8} />}
            </div>
            <div style={{
              position:        'absolute',
              bottom:          -2,
              right:           -2,
              width:           22,
              height:          22,
              borderRadius:    'var(--radius-full)',
              backgroundColor: 'var(--color-accent)',
              border:          '2px solid var(--color-surface)',
              display:         'flex',
              alignItems:      'center',
              justifyContent:  'center',
            }}>
              <Lock size={11} color="#fff" strokeWidth={2.2} />
            </div>
          </div>

          {countLabel && (
            <div style={{
              display:         'inline-block',
              margin:          '0 auto var(--space-4)',
              padding:         '2px 10px',
              borderRadius:    'var(--radius-full)',
              backgroundColor: 'var(--color-bg)',
              fontSize:        12,
              fontWeight:      700,
              color:           'var(--color-text-secondary)',
              fontFamily:      'var(--font-body)',
            }}>
              {countLabel}
            </div>
          )}

          <div style={{
            fontSize:     16,
            fontWeight:   700,
            color:        'var(--color-text-primary)',
            marginBottom: 'var(--space-2)',
          }}>
            {headline}
          </div>

          <p style={{
            margin:     '0 0 var(--space-4)',
            fontSize:   14,
            lineHeight: 1.55,
            color:      'var(--color-text-secondary)',
          }}>
            {message}
          </p>
        </div>

        <div style={upgradeButtonStyle}>
          Upgrade to Capsula Pro
        </div>

        <button onClick={onClose} style={dismissLinkStyle}>
          {dismissLabel}
        </button>
      </div>
    </>,
    document.body
  )
}

// paywall-sheet-copy-tweaks: plain div, not a <button> — this stays
// decorative (no onClick, no cursor: pointer) since no real Pro upsell
// page exists yet, same reasoning ProUpsellBanner's non-interactive mode
// already used everywhere else in the app.
const upgradeButtonStyle = {
  width:           '100%',
  padding:         'var(--space-3) var(--space-4)',
  marginBottom:    'var(--space-4)',
  borderRadius:    'var(--radius-full)',
  backgroundColor: 'var(--color-accent)',
  color:           '#fff',
  fontSize:        14,
  fontWeight:      700,
  fontFamily:      'var(--font-body)',
  textAlign:       'center',
  boxSizing:       'border-box',
}

const dismissLinkStyle = {
  display:         'block',
  width:           '100%',
  padding:         'var(--space-1) 0',
  border:          'none',
  background:      'none',
  color:           'var(--color-text-tertiary)',
  fontSize:        13,
  fontFamily:      'var(--font-body)',
  textAlign:       'center',
  textDecoration:  'underline',
  cursor:          'pointer',
}
