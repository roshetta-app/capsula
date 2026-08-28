/**
 * src/pages/admin/analytics/RetentionTab.jsx
 * F10 Batch D (D38), step 8e — Retention tab
 *
 * Shows D1/D7/D30 return rate, grouped by the week someone signed up.
 * "D7 retained" means: at least one usage_events row for that person
 * shows up in the 7 days after they signed up (not counting the signup
 * day itself). A cohort's D7/D30 cell only fills in once enough time has
 * actually passed for that horizon to be measurable — otherwise it shows
 * '—' rather than a misleading 0%.
 *
 * Built from the same 90-day usageDetailRes pulled in step 8a, joined
 * against profiles.id (added in step 8e) and profiles.created_at.
 *
 * Self-contained by convention (same as every other tab in this folder —
 * no components shared across tabs), so StatCard is duplicated here
 * rather than imported from another tab.
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
        {value == null ? '—' : `${value}%`}
      </div>
      <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-body)' }}>
        {label}
      </div>
    </div>
  )
}

// ─── Retention-by-cohort table ─────────────────────────────────────────────────

const gridStyle = {
  display: 'grid',
  gridTemplateColumns: 'minmax(90px,1fr) 90px 70px 70px 70px',
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

function pctLabel(v) {
  return v == null ? '—' : `${v}%`
}

function pctColor(v) {
  if (v == null) return 'var(--color-text-tertiary)'
  if (v >= 40) return 'var(--color-success)'
  if (v >= 15) return 'var(--color-warning)'
  return 'var(--color-danger)'
}

function RetentionTable({ rows }) {
  if (!rows || rows.length === 0) {
    return (
      <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: 13 }}>
        No signup cohorts recorded yet
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
        Return Rate by Signup Week
      </div>

      {/* Column headers */}
      <div style={{ ...gridStyle, backgroundColor: 'var(--color-bg)', borderBottom: '1px solid var(--color-border)' }}>
        <span style={thStyle}>Signup Week</span>
        <span style={{ ...thStyle, textAlign: 'right' }}>Signups</span>
        <span style={{ ...thStyle, textAlign: 'right' }}>D1</span>
        <span style={{ ...thStyle, textAlign: 'right' }}>D7</span>
        <span style={{ ...thStyle, textAlign: 'right' }}>D30</span>
      </div>

      {/* Rows */}
      <div style={{ backgroundColor: 'var(--color-surface)' }}>
        {rows.map(row => (
          <div
            key={row.week}
            style={{
              ...gridStyle,
              borderBottom: '1px solid var(--color-border-subtle)',
              padding: 'var(--space-3) var(--space-4)',
            }}
          >
            <span style={{ fontSize: 13, color: 'var(--color-text-primary)', fontWeight: 500, fontFamily: 'var(--font-body)' }}>
              {row.week}
            </span>
            <span style={{ fontSize: 13, color: 'var(--color-text-secondary)', textAlign: 'right' }}>
              {row.totalUsers}
            </span>
            <span style={{ fontSize: 13, fontWeight: 600, color: pctColor(row.d1), textAlign: 'right' }}>
              {pctLabel(row.d1)}
            </span>
            <span style={{ fontSize: 13, fontWeight: 600, color: pctColor(row.d7), textAlign: 'right' }}>
              {pctLabel(row.d7)}
            </span>
            <span style={{ fontSize: 13, fontWeight: 600, color: pctColor(row.d30), textAlign: 'right' }}>
              {pctLabel(row.d30)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function RetentionTab({ data }) {
  if (!data) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-12)' }}>
        <div style={{ color: 'var(--color-text-tertiary)', fontSize: 14 }}>Loading…</div>
      </div>
    )
  }

  const {
    overallD1        = null,
    overallD7        = null,
    overallD30       = null,
    retentionByWeek  = [],
  } = data

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>

      {/* Stat cards */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <StatCard label="D1 Return Rate"  value={overallD1}  color="var(--color-accent)" />
        <StatCard label="D7 Return Rate"  value={overallD7}  color="var(--color-primary)" />
        <StatCard label="D30 Return Rate" value={overallD30} color="var(--color-success)" />
      </div>

      <RetentionTable rows={retentionByWeek} />

      {/* Footnote — explains the '—' cells without cluttering the table itself */}
      <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-body)' }}>
        A '—' means that cohort hasn't reached that many days since signup yet, not that the rate is zero.
      </div>

    </div>
  )
}
