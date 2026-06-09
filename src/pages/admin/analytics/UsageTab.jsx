/**
 * src/pages/admin/analytics/UsageTab.jsx
 * Phase 3J — Analytics Dashboard: Usage tab
 *
 * Shows:
 *   - 4 stat cards: total condition views, condition searches, drug views, drug searches
 *   - Top Viewed Conditions (ranked list with bar chart)
 *   - Top Searched Conditions (ranked list)
 *   - Top Viewed Drugs (ranked list with bar chart)
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

function RankedList({ title, rows, color = 'var(--color-accent)', showBars = true }) {
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
          No events recorded yet
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
                gridTemplateColumns: showBars
                  ? '24px minmax(0,1fr) minmax(80px,180px) 52px'
                  : '24px minmax(0,1fr) 52px',
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

              {showBars && (
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
              )}

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

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function UsageTab({ data }) {
  if (!data) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-12)' }}>
        <div style={{ color: 'var(--color-text-tertiary)', fontSize: 14 }}>Loading…</div>
      </div>
    )
  }

  const {
    totalConditionViews   = 0,
    totalConditionSearches= 0,
    totalDrugViews        = 0,
    totalDrugSearches     = 0,
    topViewedConditions   = [],
    topSearchedConditions = [],
    topViewedDrugs        = [],
  } = data

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>

      {/* Stat cards */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <StatCard label="Condition Views"    value={totalConditionViews}    color="var(--color-accent)" />
        <StatCard label="Condition Searches" value={totalConditionSearches} color="var(--color-primary)" />
        <StatCard label="Drug Views"         value={totalDrugViews}         color="var(--color-success)" />
        <StatCard label="Drug Searches"      value={totalDrugSearches}      color="var(--color-warning)" />
      </div>

      <RankedList
        title="Top Viewed Conditions"
        rows={topViewedConditions}
        color="var(--color-accent)"
        showBars
      />
      <RankedList
        title="Top Searched Conditions"
        rows={topSearchedConditions}
        color="var(--color-primary)"
        showBars={false}
      />
      <RankedList
        title="Top Viewed Drugs"
        rows={topViewedDrugs}
        color="var(--color-success)"
        showBars
      />

    </div>
  )
}
