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
 * Dismiss is a plain text link, not a bordered button — matches the
 * mockup's "Clean Dismiss Action" note.
 *
 * paywall-sheet-copy-tweaks (this session) — CTA simplified from
 * ProUpsellBanner (icon/subtitle/chevron card) down to one plain rounded
 * button reading only "Upgrade to Capsula Pro" — per feedback, every
 * sheet using this shell should show the same minimal button, nothing
 * else. Non-interactive (no onClick/cursor) since no real Pro upsell page
 * exists yet, same reasoning ProUpsellBanner's decorative mode already
 * used. The 'ctaSubtitle' prop this replaced is removed — no caller needs
 * it now that the button has no subtitle.
 *
 * Phase 3 (Back-Button & State-Audit merged plan) — wired into
 * useBackClose so back closes this sheet instead of changing the route;
 * drag handle now has a real close gesture via useSheetDrag instead of
 * being purely decorative. Fixing it here covers both callers built on
 * this shared shell (FavouriteLimitSheet.jsx and PersonalNotes.jsx's
 * photo-upsell sheet) at once — this shell is where their actual sheet
 * chrome lives, not in either caller's own file.
 *
 * Phase 5 (Back-Button & State-Audit merged plan) — rebuilt on
 *            SheetShell.jsx (vaul-based). Backdrop/dialog markup, the
 *            shouldRender/animateIn timing, manual Escape-key and
 *            body-scroll-lock effects, useSheetDrag, and the manual
 *            createPortal-to-document.body call are all replaced by the
 *            shared shell — vaul's own Drawer.Portal already portals to
 *            document.body, covering the same "position: fixed needs to
 *            resolve against the viewport, not a transformed ancestor"
 *            reasoning the old manual portal existed for. z-index stays
 *            1000/1001 (passed via SheetShell's zIndex prop) rather than
 *            the 200/201 most other sheets use, unchanged from before —
 *            same reasoning as AccountSheet.jsx. Fixing it here again
 *            covers both callers built on this shared shell at once.
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

import { Lock } from 'lucide-react'
import SheetShell from './SheetShell'

export default function PaywallGateSheet({
  isOpen,
  onClose,
  icon: IconComponent,
  countLabel,
  headline,
  message,
  dismissLabel,
}) {
  return (
    <SheetShell isOpen={isOpen} onClose={onClose} ariaLabel={headline} zIndex={1000}>
      <div style={{ padding: '0 var(--space-4) var(--space-5)', fontFamily: 'var(--font-body)' }}>
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
    </SheetShell>
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
