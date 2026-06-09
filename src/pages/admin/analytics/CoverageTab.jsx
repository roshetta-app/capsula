/**
 * src/pages/admin/analytics/CoverageTab.jsx
 * Phase 3J — Analytics Dashboard: Coverage tab
 *
 * Shows:
 *   - 4 stat cards: total specialties, conditions, drugs, brands
 *   - Coverage by Specialty table
 *   - Top Drug Groups horizontal bar chart
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
        {value ?? '—'}
      </div>
      <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-body)' }}>
        {label}
      </div>
    </div>
  )
}

// ─── Coverage table ───────────────────────────────────────────────────────────

function CoverageTable({ rows }) {
  if (!rows || rows.length === 0) {
    return (
      <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: 13 }}>
        No specialty data
      </div>
    )
  }

  return (
    <div style={{
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
    }}>
      {/* Title */}
      <div style={{
        padding: 'var(--space-3) var(--space-4)',
        borderBottom: '1px solid var(--color-border)',
        backgroundColor: 'var(--color-surface)',
        fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)',
        fontFamily: 'var(--font-body)',
      }}>
        Coverage by Specialty
      </div>

      {/* Column headers */}
      <div style={{ ...gridStyle, backgroundColor: 'var(--color-bg)', borderBottom: '1px solid var(--color-border)' }}>
        <span style={thStyle}>Specialty</span>
        <span style={{ ...thStyle, textAlign: 'right' }}>Conditions</span>
        <span style={{ ...thStyle, textAlign: 'right' }}>Published</span>
        <span style={{ ...thStyle, textAlign: 'right' }}>Prescriptions</span>
        <span style={thStyle}>Publish Rate</span>
      </div>

      {/* Rows */}
      <div style={{ backgroundColor: 'var(--color-surface)' }}>
        {rows.map(row => {
          const publishRate = row.total > 0 ? Math.round((row.published / row.total) * 100) : 0
          const barColor =
            publishRate >= 80 ? 'var(--color-success)' :
            publishRate >= 50 ? 'var(--color-warning)' :
            'var(--color-danger)'

          return (
            <div
              key={row.specialty}
              style={{
                ...gridStyle,
                borderBottom: '1px solid var(--color-border-subtle)',
                padding: 'var(--space-3) var(--space-4)',
              }}
            >
              <span style={{ fontSize: 13, color: 'var(--color-text-primary)', fontWeight: 500, fontFamily: 'var(--font-body)' }}>
                {row.specialty}
              </span>
              <span style={{ fontSize: 13, color: 'var(--color-text-secondary)', textAlign: 'right' }}>{row.total}</span>
              <span style={{ fontSize: 13, color: 'var(--color-text-secondary)', textAlign: 'right' }}>{row.published}</span>
              <span style={{ fontSize: 13, color: 'var(--color-text-secondary)', textAlign: 'right' }}>{row.prescriptions}</span>

              {/* Progress bar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <div style={{
                  flex: 1, height: 6,
                  backgroundColor: 'var(--color-border)',
                  borderRadius: 'var(--radius-full)',
                  overflow: 'hidden',
                }}>
                  <div style={{
                    width: `${publishRate}%`, height: '100%',
                    backgroundColor: barColor,
                    borderRadius: 'var(--radius-full)',
                    transition: 'width 0.4s ease',
                  }} />
                </div>
                <span style={{ fontSize: 11, fontWeight: 600, color: barColor, width: 32, textAlign: 'right' }}>
                  {publishRate}%
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Horizontal bar chart ─────────────────────────────────────────────────────

function DrugGroupsChart({ rows }) {
  if (!rows || rows.length === 0) return null

  const maxCount = rows[0]?.count ?? 1

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
        Top Drug Groups
      </div>

      <div style={{ backgroundColor: 'var(--color-surface)', padding: 'var(--space-3) var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        {rows.map(row => {
          const pct = (row.count / maxCount) * 100
          return (
            <div key={row.category} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <div style={{
                width: 140, fontSize: 12,
                color: 'var(--color-text-secondary)', fontFamily: 'var(--font-body)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                flexShrink: 0,
              }}>
                {row.category}
              </div>
              <div style={{
                flex: 1, height: 20,
                backgroundColor: 'var(--color-border)',
                borderRadius: 'var(--radius-sm)',
                overflow: 'hidden',
              }}>
                <div style={{
                  width: `${pct}%`, height: '100%',
                  backgroundColor: 'var(--color-accent)',
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

export default function CoverageTab({ data }) {
  if (!data) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-12)' }}>
        <div style={{ color: 'var(--color-text-tertiary)', fontSize: 14 }}>Loading…</div>
      </div>
    )
  }

  const { totalSpecialties, totalConditions, totalGenerics, totalBrands, specialtyCoverage, drugGroups } = data

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>

      {/* Stat cards */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <StatCard label="Specialties"   value={totalSpecialties} color="var(--color-accent)" />
        <StatCard label="Conditions"    value={totalConditions}  color="var(--color-primary)" />
        <StatCard label="Drugs"         value={totalGenerics}    color="var(--color-success)" />
        <StatCard label="Brands"        value={totalBrands}      color="var(--color-warning)" />
      </div>

      <CoverageTable rows={specialtyCoverage} />
      <DrugGroupsChart rows={drugGroups} />

    </div>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const gridStyle = {
  display: 'grid',
  gridTemplateColumns: 'minmax(120px,1fr) 80px 80px 100px minmax(100px,1fr)',
  gap: 'var(--space-3)',
  alignItems: 'center',
  padding: 'var(--space-2) var(--space-4)',
  fontFamily: 'var(--font-body)',
}

const thStyle = {
  fontSize: 11, fontWeight: 700,
  textTransform: 'uppercase', letterSpacing: '0.06em',
  color: 'var(--color-text-tertiary)',
}
