
/**
 * src/components/ui/ProUpsellBanner.jsx
 *
 * Phase 7 — the solid accent-colored "Upgrade to Capsula PRO" card, pulled
 * out of its previous one-off spot in AccountScreen.jsx so it looks
 * identical everywhere it's used instead of near-copies drifting apart.
 * AccountScreen.jsx itself is NOT touched — it keeps its own existing copy
 * and tap behavior, avoiding any regression risk there.
 *
 * When `onClick` isn't passed, this renders as pure decoration — no
 * pointer cursor, no keyboard focus, no click handler. That's the mode
 * FavouriteLimitSheet.jsx and FavouritesScreen.jsx's capped-tab banner use
 * (no real Pro upsell page exists yet).
 *
 * Props:
 *   onClick    () => void   — optional. Omit for a non-interactive card.
 *   subtitle   string       — optional one-line pitch under the headline.
 */

import { ChevronRight } from 'lucide-react'

export default function ProUpsellBanner({
  onClick,
  subtitle = 'Unlock the full drug & condition library',
}) {
  const interactive = !!onClick

  return (
    <div
      onClick={interactive ? onClick : undefined}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={interactive ? (e => { if (e.key === 'Enter' || e.key === ' ') onClick() }) : undefined}
      style={{
        display:                 'flex',
        alignItems:              'center',
        justifyContent:          'space-between',
        gap:                     'var(--space-3)',
        padding:                 'var(--space-3)',
        backgroundColor:         'var(--color-accent)',
        borderRadius:            'var(--radius-lg)',
        cursor:                  interactive ? 'pointer' : 'default',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <div>
        <div style={{
          fontSize:     14,
          fontWeight:   600,
          color:        '#fff',
          marginBottom: 2,
        }}>
          Upgrade to Capsula{' '}
          <span style={{
            display:         'inline-block',
            backgroundColor: '#fff',
            color:           'var(--color-accent)',
            fontSize:        10,
            fontWeight:      700,
            letterSpacing:   '0.04em',
            padding:         '2px 6px',
            borderRadius:    4,
            verticalAlign:   'middle',
          }}>
            PRO
          </span>
        </div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)' }}>
          {subtitle}
        </div>
      </div>
      <ChevronRight size={18} color="#fff" style={{ flexShrink: 0 }} />
    </div>
  )
}
