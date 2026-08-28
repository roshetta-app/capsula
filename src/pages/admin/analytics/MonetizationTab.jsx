/**
 * src/pages/admin/analytics/MonetizationTab.jsx
 * F10 Batch D (D38), step 8f — Monetization tab
 *
 * Shows how many times the "Upgrade to Capsula PRO" banner on
 * AccountScreen.jsx has been tapped (8g), and the weekly trend. This is
 * explicitly a fake-door instrument — no real paid tier exists yet, no
 * revenue or subscriber data — just a count/trend of expressed interest,
 * to gauge whether a paid tier is worth building before committing to one.
 *
 * Built entirely from the 90-day usage_events pull already added in step
 * 8a (`usageDetailRes` in AnalyticsDashboard.jsx) — no new query needed,
 * same as Engagement (8d) and Retention (8e).
 *
 * Self-contained by convention (same as every other tab in this folder —
 * no components shared across tabs), so StatCard/WeeklyTrendChart are
 * duplicated here rather than imported from EngagementTab.jsx.
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

// ─── Weekly taps bar chart ──────────────────────────────────────────────────
// Same horizontal-bar convention as EngagementTab's SessionsPerWeekChart,
// applied to Pro-teaser tap counts instead of session counts.

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

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function MonetizationTab({ data }) {
  if (!data) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-12)' }}>
        <div style={{ color: 'var(--color-text-tertiary)', fontSize: 14 }}>Loading…</div>
      </div>
    )
  }

  const {
    totalProClicks = 0,
    clicksPerWeek  = [],
  } = data

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>

      {/* Note: fake door, no real paid tier yet — keeps the number honest
          for anyone reading this tab without the full context. */}
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
  )
}
