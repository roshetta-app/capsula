/**
 * src/pages/admin/analytics/IdentitySegmentTab.jsx
 * F10 Batch D (D38), step 8c — Identity/Segment tab
 *
 * Shows who's actually using the app: accounts broken down by specialty,
 * country, and occupation — all collected at sign-up already, just never
 * surfaced in analytics before. Missing values are bucketed as "Not set"
 * rather than dropped, so incomplete profiles stay visible.
 *
 * Self-contained by convention (same as every other tab in this folder —
 * no components shared across tabs), so StatCard/RankedList are
 * duplicated here rather than imported from UsageTab.jsx.
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

function RankedList({ title, rows, color = 'var(--color-accent)' }) {
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
          No accounts recorded yet
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

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function IdentitySegmentTab({ data }) {
  if (!data) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-12)' }}>
        <div style={{ color: 'var(--color-text-tertiary)', fontSize: 14 }}>Loading…</div>
      </div>
    )
  }

  const {
    totalAccounts = 0,
    bySpecialty   = [],
    byCountry     = [],
    byOccupation  = [],
  } = data

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>

      {/* Stat card */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <StatCard label="Total Accounts" value={totalAccounts} color="var(--color-accent)" />
      </div>

      <RankedList title="By Specialty"   rows={bySpecialty}   color="var(--color-accent)" />
      <RankedList title="By Country"     rows={byCountry}     color="var(--color-primary)" />
      <RankedList title="By Occupation"  rows={byOccupation}  color="var(--color-success)" />

    </div>
  )
}
