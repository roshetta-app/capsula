/**
 * src/components/ui/OwnerViews.jsx
 * 2026-11-23 (Track H, step H4): the owner's own view numbers, as drawn in H1.
 *   OwnerViewsBox    under the name on the person's roshetta page and drug group page: "N unique views" and
 *                    "N in the last 7 days · approximate", or "No views yet" on a new link.
 *   OwnerViewsTiles  on the Profile tab: two tiles (Unique views, Last 7 days) and "Approximate. Only you see
 *                    these numbers."
 * Both render nothing when the numbers are not known (offline, failed, no link): not knowing is not zero.
 * The words and the rules live in utils/ownerViews.js; the data comes from hooks/useOwnerViews.js.
 */

import { Eye } from 'lucide-react'
import { itemViewsLines, profileTiles, VIEW_WORDS } from '../../utils/ownerViews'

const TEXT = { fontFamily: 'var(--font-body)' }

export function OwnerViewsBox({ views }) {
  const lines = itemViewsLines(views)
  if (!lines) return null
  return (
    <div
      role="status"
      style={{
        display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-3)',
        borderRadius: 14, backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', ...TEXT,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 36, height: 36, borderRadius: 10, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          backgroundColor: 'var(--color-accent-light)', color: 'var(--color-accent-solid)',
        }}
      >
        <Eye size={18} strokeWidth={1.8} />
      </span>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.3, color: 'var(--color-text-primary)' }}>{lines.title}</div>
        <div style={{ marginTop: 2, fontSize: 13, lineHeight: 1.4, color: 'var(--color-text-secondary)' }}>{lines.sub}</div>
      </div>
    </div>
  )
}

export function OwnerViewsTiles({ views }) {
  const tiles = profileTiles(views)
  if (!tiles) return null
  return (
    <div style={{ marginBottom: 'var(--space-3)', ...TEXT }}>
      <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
        {tiles.map(t => (
          <div
            key={t.label}
            style={{
              flex: 1, minWidth: 0, padding: 'var(--space-3)', borderRadius: 'var(--radius-lg)',
              backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)',
            }}
          >
            <div style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.2, color: 'var(--color-text-primary)' }}>{t.value}</div>
            <div style={{ marginTop: 2, fontSize: 13, lineHeight: 1.3, color: 'var(--color-text-secondary)' }}>{t.label}</div>
          </div>
        ))}
      </div>
      <p style={{ margin: 'var(--space-2) 0 0', fontSize: 12, lineHeight: 1.4, color: 'var(--color-text-secondary)', textAlign: 'center' }}>
        {VIEW_WORDS.profileNote}
      </p>
    </div>
  )
}
