/**
 * src/components/ui/OfflineBanner.jsx
 * Phase 2K — PWA & Offline Infrastructure
 * Phase 5 update (plan: CAPSULA_DATA_TIERS_AND_ACCESS_PLAN.md, §Phase 5)
 * Phase 5 redesign (this session) — see rationale below.
 *
 * Shown when isOnline === false AND the person is Pro (§5.1). A free user
 * going offline sees Phase 4's full-screen offline block instead
 * (AppGate.jsx) — this and that block are never both visible at once,
 * since Phase 4's block already covers the full screen (zIndex 2000)
 * whenever it's showing.
 *
 * REDESIGN — was previously a sticky in-flow banner at the top of layout.jsx,
 * which pushed the header and page content down whenever it appeared. Now a
 * floating, fixed-position pill instead — visually modeled on this app's own
 * toast system (ToastContext.jsx: floating, rounded, bottom-anchored,
 * fixed-position so it never affects layout) for a consistent feel, but
 * NOT built on that system directly. A toast fires once and auto-dismisses
 * on a timer, which fits a one-off event ("Saved", "Error") — "you're
 * offline" isn't an event, it's an ongoing state that can last indefinitely,
 * so it needs to persist for exactly as long as that state is true and
 * disappear the instant it isn't, not on a fixed clock that could expire
 * while still offline.
 *
 * Still dismissible via X (manual dismiss for this session), still re-shows
 * automatically the next time the person goes offline again — same
 * lifecycle as before, just no longer in the page's document flow.
 *
 * Usage — already mounted once in layout.jsx:
 *   import OfflineBanner from './ui/OfflineBanner'
 *   ...
 *   <OfflineBanner />
 */

import { useState, useEffect } from 'react'
import { useOnlineStatus } from '../../hooks/useOnlineStatus'
import { useIsPro } from '../../hooks/useIsPro'

export default function OfflineBanner() {
  const { isOnline }      = useOnlineStatus()
  const isPro              = useIsPro()
  const [dismissed, setDismissed] = useState(false)

  // Re-show whenever the person goes offline again
  useEffect(() => {
    if (!isOnline) setDismissed(false)
  }, [isOnline])

  // Nothing to render when online, dismissed, or not Pro (§5.1) — a free
  // user offline is handled entirely by AppGate.jsx's full-screen block.
  if (isOnline || dismissed || !isPro) return null

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        // Fixed + centered, same positioning approach as ToastContext's
        // ToastStack — floats above the page, never part of its flow, so it
        // can never push the header or content down the way the old sticky
        // in-flow version did.
        position:      'fixed',
        bottom:        'calc(env(safe-area-inset-bottom, 0px) + 80px)',
        left:          '50%',
        transform:     'translateX(-50%)',
        zIndex:        9999,
        width:         'min(calc(100vw - var(--space-8)), 380px)',
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          pointerEvents:   'auto',
          display:         'flex',
          alignItems:      'center',
          justifyContent:  'space-between',
          gap:             'var(--space-2)',
          padding:         'var(--space-3) var(--space-4)',
          borderRadius:    'var(--radius-md)',
          backgroundColor: '#FEF3C7',   // warning-light — kept from the
                                         // original design, distinct from
                                         // the toast system's success/error/
                                         // warning/info colors since this
                                         // isn't one of those four toast types
          border:          '1px solid #FDE68A',
          boxShadow:       '0 4px 20px rgba(0,0,0,0.18)',
          fontFamily:      'var(--font-body)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg
            width="15" height="15" viewBox="0 0 24 24"
            fill="none" stroke="#D97706" strokeWidth="2.2"
            strokeLinecap="round" strokeLinejoin="round"
            aria-hidden="true"
            style={{ flexShrink: 0 }}
          >
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>

          <span style={{
            fontSize:   13,
            fontWeight: 500,
            color:      '#92400E',
            lineHeight: 1.35,
          }}>
            You&apos;re offline — showing what you&apos;ve already saved.
          </span>
        </div>

        <button
          onClick={() => setDismissed(true)}
          aria-label="Dismiss offline notice"
          style={{
            background:              'none',
            border:                  'none',
            cursor:                  'pointer',
            color:                   '#92400E',
            padding:                 4,
            display:                 'flex',
            alignItems:              'center',
            WebkitTapHighlightColor: 'transparent',
            flexShrink:              0,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth="2.5"
            strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
    </div>
  )
}
