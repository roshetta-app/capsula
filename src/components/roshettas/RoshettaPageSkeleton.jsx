// src/components/roshettas/RoshettaPageSkeleton.jsx
// 2026-11-21 (Roshetta plan, step 8.5): the loading placeholder of the roshetta page, shaped like the
// real page (a header block, then two drug boxes) so nothing jumps when it loads. Moved out of
// RoshettaScreen.jsx so the shared page (SharedRoshettaScreen.jsx) draws exactly the same one.

import { shimmer } from '../drugs/home/shimmer'

export default function RoshettaPageSkeleton({ top = null }) {
  const box = {
    background: 'var(--color-drug-card-bg)', borderRadius: 'var(--radius-lg)',
    padding: 'var(--space-4)',
  }
  return (
    <div>
      <div style={top
        // With a top bar (the shared page): full width like the real header, the bar first.
        ? { background: 'var(--color-surface)', borderRadius: '0 0 22px 22px', margin: '0 calc(-1 * var(--page-gutter, 16px))', padding: '4px calc(var(--page-gutter, 16px) + 2px) 14px' }
        : { background: 'var(--color-surface)', borderRadius: '0 0 22px 22px', padding: 'var(--space-4) var(--space-4) var(--space-5)' }}
      >
        {top && <div style={{ marginBottom: 8 }}>{top}</div>}
        <div aria-hidden="true">
          <div style={shimmer({ width: '62%', height: 24, marginBottom: 12 })} />
          <div style={shimmer({ width: '88%', height: 13, marginBottom: 6 })} />
          <div style={shimmer({ width: '45%', height: 13, marginBottom: 16 })} />
          <div style={shimmer({ width: '34%', height: 11 })} />
        </div>
      </div>
      <div aria-hidden="true" style={{ padding: 'var(--space-5) calc(var(--space-6) - var(--page-gutter, 16px)) 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {[0, 1].map(i => (
          <div key={i} style={box}>
            <div style={shimmer({ width: '58%', height: 16, marginBottom: 10 })} />
            <div style={shimmer({ width: '40%', height: 12, marginBottom: 14 })} />
            <div style={shimmer({ width: '78%', height: 13 })} />
          </div>
        ))}
      </div>
    </div>
  )
}
