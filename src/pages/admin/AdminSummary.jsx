import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faUsers, faCapsules, faNotesMedical, faFlag } from '@fortawesome/free-solid-svg-icons'
import { supabase } from '../../lib/supabase'
import { fetchAllUsers } from '../../lib/adminQueries'
import { fetchReportCount } from '../../utils/reportsAdminContent'
import AdminPageHeader from '../../components/admin/AdminPageHeader'
import DawaaGateCard from '../../components/admin/DawaaGateCard'

/**
 * AdminSummary — /admin's index route content (D3).
 *
 * Separate file from AdminLayout.jsx on purpose (per the plan) so the shell
 * stays purely structural. First pass: three real, live-queried stat cards —
 * total users, total drugs (generics), total conditions.
 *
 * Counts use the same head-count pattern already established in
 * queries.js's fetchAllBrandRows (`.select('id', { count: 'exact', head: true })`)
 * rather than a new convention. Users total reuses the existing
 * fetchAllUsers() wrapper (adminQueries.js, F11 Stage 2) instead of querying
 * `profiles` directly — that wrapper already goes through the admin-users
 * Edge Function, the only path that's allowed to read this data.
 */

const STAT_CARDS = [
  { key: 'users',      label: 'Total Users',      faIcon: faUsers },
  { key: 'drugs',      label: 'Total Drugs',      faIcon: faCapsules },
  { key: 'conditions', label: 'Total Topics', faIcon: faNotesMedical },
]

export default function AdminSummary() {
  const [stats, setStats]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  // 14.9c-1: open reports and appeals waiting; asked separately so a failure here never hides the other counts.
  const [reports, setReports]   = useState({ status: 'loading', count: 0 })

  useEffect(() => {
    let cancelled = false
    fetchReportCount().then((r) => { if (!cancelled) setReports({ status: r.status, count: r.count ?? 0 }) })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    let cancelled = false

    async function loadStats() {
      setLoading(true)
      setError(null)

      const [usersResult, drugsCount, conditionsCount] = await Promise.all([
        fetchAllUsers(),
        supabase.from('generics').select('id', { count: 'exact', head: true }),
        supabase.from('conditions').select('id', { count: 'exact', head: true }),
      ])

      if (cancelled) return

      const firstError = usersResult.error || drugsCount.error || conditionsCount.error
      if (firstError) {
        setError(firstError)
        setLoading(false)
        return
      }

      setStats({
        users:      usersResult.data?.length ?? 0,
        drugs:      drugsCount.count ?? 0,
        conditions: conditionsCount.count ?? 0,
      })
      setLoading(false)
    }

    loadStats()
    return () => { cancelled = true }
  }, [])

  return (
    <AdminPageHeader title="Overview">
      {error && (
        <div style={{
          color: 'var(--color-danger, #d33)',
          fontSize: 14,
          marginBottom: 'var(--space-4)',
        }}>
          Couldn't load stats — {error.message ?? 'please try refreshing.'}
        </div>
      )}

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 'var(--space-4)',
      }}>
        {STAT_CARDS.map(card => (
          <div
            key={card.key}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-4)',
              padding: 'var(--space-4)',
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-card)',
            }}
          >
            <div style={{
              width: 48,
              height: 48,
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--color-accent-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              color: 'var(--color-accent)',
            }}>
              <FontAwesomeIcon icon={card.faIcon} style={{ width: 20, height: 20 }} />
            </div>
            <div>
              <div style={{
                fontSize: 24,
                fontWeight: 700,
                fontFamily: 'var(--font-body)',
                color: 'var(--color-text-primary)',
                lineHeight: 1.2,
              }}>
                {loading ? '—' : stats[card.key]}
              </div>
              <div style={{
                fontSize: 13,
                color: 'var(--color-text-tertiary)',
                marginTop: 2,
              }}>
                {card.label}
              </div>
            </div>
          </div>
        ))}
        <Link
          to="/admin/reports"
          style={{
            display: 'flex', alignItems: 'center', gap: 'var(--space-4)', padding: 'var(--space-4)',
            backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-card)', textDecoration: 'none',
          }}
        >
          <div style={{
            width: 48, height: 48, borderRadius: 'var(--radius-md)', flexShrink: 0,
            backgroundColor: reports.count > 0 ? '#FEE2E2' : 'var(--color-accent-light)',
            color: reports.count > 0 ? '#991B1B' : 'var(--color-accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <FontAwesomeIcon icon={faFlag} style={{ width: 20, height: 20 }} />
          </div>
          <div>
            <div style={{ fontSize: 24, fontWeight: 700, fontFamily: 'var(--font-body)', color: 'var(--color-text-primary)', lineHeight: 1.2 }}>
              {reports.status === 'ok' ? reports.count : '—'}
            </div>
            <div style={{ fontSize: 13, color: 'var(--color-text-tertiary)', marginTop: 2 }}>
              Open reports
            </div>
          </div>
        </Link>
        <DawaaGateCard />
      </div>
    </AdminPageHeader>
  )
}
