/**
 * src/pages/admin/analytics/EngagementTab.jsx
 * F10 Batch D (D38), step 8d — Engagement tab
 *
 * Shows sessions per week (a proxy for how often people are opening the
 * app) and which content gets repeat visits — condition/drug pages that
 * more than one distinct session has come back to, ranked by how many
 * distinct sessions viewed them.
 *
 * Built entirely from the 90-day usage_events pull already added in step
 * 8a (`usageDetailRes` in AnalyticsDashboard.jsx) — no new query needed.
 *
 * Self-contained by convention (same as every other tab in this folder —
 * no components shared across tabs), so StatCard/RankedList are
 * duplicated here rather than imported from IdentitySegmentTab.jsx.
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

// ─── Ranked list with bar chart ───────────────────────────────────────────────

function RankedList({ title, rows, color = 'var(--color-accent)', emptyLabel = 'No data recorded yet' }) {
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
          {title}
        </div>
        <div style={{
          padding: 'var(--space-8)', textAlign: 'center',
          color: 'var(--color-text-tertiary)', fontSize: 13,
          backgroundColor: 'var(--color-surface)',
        }}>
          {emptyLabel}
        </div>
      </div>
    )
  }

  const maxCount = rows[0]?.count ?? 1

  return (
    <div style={{
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: 'var(--space-3) var(--space-4)',
        borderBottom: '1px solid var(--color-border)',
        backgroundColor: 'var(--color-surface)',
        fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)',
        fontFamily: 'var(--font-body)',
      }}>
        {title}
      </div>

      {/* Rows */}
      <div style={{ backgroundColor: 'var(--color-surface)' }}>
        {rows.map((row, i) => {
          const pct = (row.count / maxCount) * 100
          return (
            <div
              key={row.name}
              style={{
                display: 'grid',
                gridTemplateColumns: '24px minmax(0,1fr) minmax(80px,180px) 52px',
                alignItems: 'center',
                gap: 'var(--space-3)',
                padding: 'var(--space-2) var(--space-4)',
                borderBottom: '1px solid var(--color-border-subtle)',
                fontFamily: 'var(--font-body)',
              }}
            >
              <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)', textAlign: 'right' }}>
                {i + 1}
              </span>
              <span style={{
                fontSize: 13, color: 'var(--color-text-primary)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {row.name}
              </span>

              <div style={{
                height: 6,
                backgroundColor: 'var(--color-border)',
                borderRadius: 'var(--radius-full)',
                overflow: 'hidden',
              }}>
                <div style={{
                  width: `${pct}%`, height: '100%',
                  backgroundColor: color,
                  borderRadius: 'var(--radius-full)',
                  transition: 'width 0.4s ease',
                }} />
              </div>

              <span style={{
                fontSize: 12, fontWeight: 600,
                color: 'var(--color-text-secondary)',
                textAlign: 'right',
              }}>
                {row.count.toLocaleString()}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Weekly sessions bar chart ─────────────────────────────────────────────────
// Same horizontal-bar convention as CoverageTab's DrugGroupsChart, applied
// to a chronological week axis instead of a ranked category list.

function SessionsPerWeekChart({ rows }) {
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
          Sessions per Week
        </div>
        <div style={{
          padding: 'var(--space-8)', textAlign: 'center',
          color: 'var(--color-text-tertiary)', fontSize: 13,
          backgroundColor: 'var(--color-surface)',
        }}>
          No session data recorded yet
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
        Sessions per Week
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

export default function EngagementTab({ data }) {
  if (!data) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-12)' }}>
        <div style={{ color: 'var(--color-text-tertiary)', fontSize: 14 }}>Loading…</div>
      </div>
    )
  }

  const {
    totalSessions       = 0,
    sessionsPerWeek     = [],
    repeatVisitContent  = [],
  } = data

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>

      {/* Stat card */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <StatCard label="Sessions (last 90 days)" value={totalSessions} color="var(--color-accent)" />
      </div>

      <SessionsPerWeekChart rows={sessionsPerWeek} />

      <RankedList
        title="Repeat-Visit Content"
        rows={repeatVisitContent}
        color="var(--color-success)"
        emptyLabel="No content has repeat sessions yet"
      />

    </div>
  )
}
