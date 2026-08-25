/**
 * src/pages/admin/analytics/MessagesTab.jsx
 * App Gate System Phase 2 — Analytics tab (plan §10.5)
 *
 * Shows:
 *   - 4 stat cards: total impressions, dismisses, maybe-laters, CTA clicks
 *   - Per-message breakdown table, ranked by impressions
 *
 * Reads data.messages, built by AnalyticsDashboard.jsx's fetchAllAnalytics
 * from the four gate_* usage_events rows logged in useAppGate.js
 * (gate_impression, gate_dismiss, gate_maybe_later) and AppGate.jsx
 * (gate_cta_click). Same self-contained-file convention as UsageTab.jsx —
 * no components shared between analytics tabs.
 */

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, color = 'var(--color-accent)' }) {
  return (
    <div style={{
      flex: '1 1 120px',
      backgroundColor: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-lg)',
      padding: 'var(--space-4)',
      display: 'flex', flexDirection: 'column', gap: 'var(--space-1)',
    }}>
      <div style={{ fontSize: 28, fontWeight: 700, color, fontFamily: 'var(--font-body)', lineHeight: 1 }}>
        {value?.toLocaleString() ?? '—'}
      </div>
      <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-body)' }}>
        {label}
      </div>
    </div>
  )
}

// ─── Per-message breakdown table ───────────────────────────────────────────────
// Four numbers per row (impressions/dismisses/maybe-later/CTA clicks) don't
// fit UsageTab's single-bar RankedList shape, so this is its own simple
// table rather than a reuse — same tokens and row styling, different layout.

function GateTable({ rows }) {
  if (!rows || rows.length === 0) {
    return (
      <div style={{
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
      }}>
        <div style={{
          padding: 'var(--space-3) var(--space-4)',
          borderBottom: '1px solid var(--color-border)',
          backgroundColor: 'var(--color-surface)',
          fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)',
          fontFamily: 'var(--font-body)',
        }}>
          Per-message breakdown
        </div>
        <div style={{
          padding: 'var(--space-8)', textAlign: 'center',
          color: 'var(--color-text-tertiary)', fontSize: 13,
          backgroundColor: 'var(--color-surface)',
        }}>
          No message events recorded yet
        </div>
      </div>
    )
  }

  return (
    <div style={{
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
    }}>
      <div style={{
        padding: 'var(--space-3) var(--space-4)',
        borderBottom: '1px solid var(--color-border)',
        backgroundColor: 'var(--color-surface)',
        fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)',
        fontFamily: 'var(--font-body)',
      }}>
        Per-message breakdown
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-body)' }}>
          <thead>
            <tr style={{ backgroundColor: 'var(--color-surface)' }}>
              {['Message', 'Impressions', 'Dismisses', 'Maybe Later', 'CTA Clicks'].map((h, i) => (
                <th key={h} style={{
                  padding: 'var(--space-2) var(--space-4)',
                  textAlign: i === 0 ? 'left' : 'right',
                  fontSize: 12, fontWeight: 600, color: 'var(--color-text-tertiary)',
                  borderBottom: '1px solid var(--color-border)',
                  whiteSpace: 'nowrap',
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.name} style={{ backgroundColor: 'var(--color-surface)' }}>
                <td style={{
                  padding: 'var(--space-2) var(--space-4)',
                  fontSize: 13, color: 'var(--color-text-primary)',
                  borderBottom: '1px solid var(--color-border-subtle)',
                  maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {row.name}
                </td>
                {[row.impressions, row.dismisses, row.maybeLater, row.ctaClicks].map((v, i) => (
                  <td key={i} style={{
                    padding: 'var(--space-2) var(--space-4)',
                    fontSize: 13, fontWeight: 600, textAlign: 'right',
                    color: 'var(--color-text-secondary)',
                    borderBottom: '1px solid var(--color-border-subtle)',
                  }}>
                    {v.toLocaleString()}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function MessagesTab({ data }) {
  if (!data) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-12)' }}>
        <div style={{ color: 'var(--color-text-tertiary)', fontSize: 14 }}>Loading…</div>
      </div>
    )
  }

  const {
    totalImpressions = 0,
    totalDismisses   = 0,
    totalMaybeLater  = 0,
    totalCtaClicks   = 0,
    topGates         = [],
  } = data

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>

      {/* Stat cards */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <StatCard label="Impressions" value={totalImpressions} color="var(--color-accent)" />
        <StatCard label="Dismissed"   value={totalDismisses}   color="var(--color-text-secondary)" />
        <StatCard label="Maybe Later" value={totalMaybeLater}  color="var(--color-warning)" />
        <StatCard label="CTA Clicks"  value={totalCtaClicks}   color="var(--color-success)" />
      </div>

      <GateTable rows={topGates} />

    </div>
  )
}
