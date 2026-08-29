/**
 * src/pages/admin/analytics/PromptsUpgradesTab.jsx
 * F10 Batch D (D38), step 8h+ — Prompts & Upgrades tab
 *
 * Merges two former standalone tabs that were both stat-cards-plus-chart
 * views of banner/prompt interaction, built from the same usage_events
 * source:
 *   - Messages     — in-app gate/nudge impressions, dismisses, CTA clicks
 *                    (was MessagesTab.jsx)
 *   - Monetization — "Upgrade to Capsula PRO" fake-door tap counter
 *                    (was MonetizationTab.jsx)
 *
 * Rendered as two stacked sections under one tab. Pure layout
 * consolidation — no computation or data source changed.
 */

// ─── Shared stat card ───────────────────────────────────────────────────────

const sectionHeadingStyle = {
  fontSize: 16, fontWeight: 700,
  color: 'var(--color-text-primary)',
  fontFamily: 'var(--font-body)',
}

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

// ─── Section: Messages ──────────────────────────────────────────────────────

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

function MessagesSection({ data }) {
  const {
    totalImpressions = 0,
    totalDismisses   = 0,
    totalMaybeLater  = 0,
    totalCtaClicks   = 0,
    topGates         = [],
  } = data

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <div style={sectionHeadingStyle}>In-App Messages</div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
          <StatCard label="Impressions" value={totalImpressions} color="var(--color-accent)" />
          <StatCard label="Dismissed"   value={totalDismisses}   color="var(--color-text-secondary)" />
          <StatCard label="Maybe Later" value={totalMaybeLater}  color="var(--color-warning)" />
          <StatCard label="CTA Clicks"  value={totalCtaClicks}   color="var(--color-success)" />
        </div>

        <GateTable rows={topGates} />
      </div>
    </div>
  )
}

// ─── Section: Monetization ──────────────────────────────────────────────────

function ClicksPerWeekChart({ rows }) {
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
          Taps per Week
        </div>
        <div style={{
          padding: 'var(--space-8)', textAlign: 'center',
          color: 'var(--color-text-tertiary)', fontSize: 13,
          backgroundColor: 'var(--color-surface)',
        }}>
          No taps recorded yet
        </div>
      </div>
    )
  }

  const maxCount = Math.max(...rows.map(r => r.count), 1)

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
        Taps per Week
      </div>

      <div style={{ backgroundColor: 'var(--color-surface)', padding: 'var(--space-3) var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        {rows.map(row => {
          const pct = (row.count / maxCount) * 100
          return (
            <div key={row.week} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <div style={{
                width: 90, fontSize: 12,
                color: 'var(--color-text-secondary)', fontFamily: 'var(--font-body)',
                flexShrink: 0,
              }}>
                {row.week}
              </div>
              <div style={{
                flex: 1, height: 20,
                backgroundColor: 'var(--color-border)',
                borderRadius: 'var(--radius-sm)',
                overflow: 'hidden',
              }}>
                <div style={{
                  width: `${pct}%`, height: '100%',
                  backgroundColor: 'var(--color-primary)',
                  borderRadius: 'var(--radius-sm)',
                  transition: 'width 0.5s ease',
                  display: 'flex', alignItems: 'center',
                  paddingLeft: 'var(--space-2)',
                }}>
                  {pct > 15 && (
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#fff' }}>{row.count}</span>
                  )}
                </div>
              </div>
              {pct <= 15 && (
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)', width: 28, textAlign: 'right' }}>
                  {row.count}
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function MonetizationSection({ data }) {
  const {
    totalProClicks = 0,
    clicksPerWeek  = [],
  } = data

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <div style={sectionHeadingStyle}>Upgrade to PRO</div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
        <div style={{
          fontSize: 13, color: 'var(--color-text-tertiary)',
          fontFamily: 'var(--font-body)',
        }}>
          "Upgrade to Capsula PRO" is a fake-door test — tapping it shows a
          "coming soon" message, not a real purchase flow. These numbers
          measure interest, not revenue.
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
          <StatCard label='"Upgrade to PRO" taps (last 90 days)' value={totalProClicks} color="var(--color-accent)" />
        </div>

        <ClicksPerWeekChart rows={clicksPerWeek} />
      </div>
    </div>
  )
}

// ─── Main ───────────────────────────────────────────────────────────────────

export default function PromptsUpgradesTab({ data }) {
  if (!data) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-12)' }}>
        <div style={{ color: 'var(--color-text-tertiary)', fontSize: 14 }}>Loading…</div>
      </div>
    )
  }

  const { messages, monetization } = data

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-8)' }}>
      <MessagesSection data={messages} />
      <div style={{ borderTop: '1px solid var(--color-border)' }} />
      <MonetizationSection data={monetization} />
    </div>
  )
}
