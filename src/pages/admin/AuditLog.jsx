/**
 * src/pages/admin/AuditLog.jsx
 * Phase 3L — Audit Trail viewer
 *
 * Shows the last 100 audit_log entries, newest first.
 * Columns: Time · Action · Table · Record name · Details (expand)
 * Accessible from Admin Dashboard → Audit Log card (/admin/audit-log).
 */

import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { RefreshCw, ChevronDown, ChevronUp, ClipboardList } from 'lucide-react'
import { supabase } from '../../lib/supabase'

// ─── Action badge colours ─────────────────────────────────────────────────────

const ACTION_STYLES = {
  create:    { bg: '#D1FAE5', color: '#065F46', border: '#6EE7B7', label: 'Create'    },
  update:    { bg: '#DBEAFE', color: '#1E40AF', border: '#93C5FD', label: 'Update'    },
  delete:    { bg: '#FEE2E2', color: '#991B1B', border: '#FCA5A5', label: 'Delete'    },
  publish:   { bg: '#D1FAE5', color: '#065F46', border: '#6EE7B7', label: 'Publish'   },
  unpublish: { bg: '#FEF9C3', color: '#854D0E', border: '#FDE047', label: 'Unpublish' },
}

const TABLE_LABELS = {
  conditions:   'Conditions',
  generics:     'Generics',
  formulations: 'Formulations',
  brands:       'Brands',
  specialties:  'Specialties',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleString('en-GB', {
    day:    '2-digit',
    month:  'short',
    year:   'numeric',
    hour:   '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AuditLog() {
  const navigate = useNavigate()

  const [entries,   setEntries]   = useState([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState(null)
  const [expanded,  setExpanded]  = useState(null)   // record_id of expanded row

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchEntries = useCallback(async () => {
    setLoading(true)
    setError(null)
    setExpanded(null)

    const { data, error: err } = await supabase
      .from('audit_log')
      .select('id, action, table_name, record_id, record_name, changes, created_at')
      .order('created_at', { ascending: false })
      .limit(100)

    if (err) {
      setError(err.message)
    } else {
      setEntries(data ?? [])
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchEntries() }, [fetchEntries])

  // ── Toggle row expansion ───────────────────────────────────────────────────

  function toggleExpand(id) {
    setExpanded(prev => prev === id ? null : id)
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: '100dvh', backgroundColor: 'var(--color-bg)', fontFamily: 'var(--font-body)' }}>

      {/* Header */}
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: 'var(--space-3) var(--space-4)',
        borderBottom: '1px solid var(--color-border)',
        backgroundColor: 'var(--color-surface)',
        position: 'sticky', top: 0, zIndex: 50,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <button
            onClick={() => navigate('/admin')}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--color-accent)', fontSize: 14, fontWeight: 500,
              fontFamily: 'var(--font-body)', padding: '4px 0',
              display: 'flex', alignItems: 'center',
            }}
          >
            ‹ Admin
          </button>
          <span style={{ color: 'var(--color-border)', fontSize: 16 }}>/</span>
          <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)' }}>
            Audit Log
          </span>
        </div>

        <button
          onClick={fetchEntries}
          disabled={loading}
          aria-label="Refresh"
          style={{
            display: 'flex', alignItems: 'center', gap: 'var(--space-1)',
            padding: 'var(--space-2) var(--space-3)',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--color-border)',
            backgroundColor: 'var(--color-surface)',
            color: 'var(--color-text-secondary)',
            fontSize: 13, fontWeight: 500,
            fontFamily: 'var(--font-body)',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.5 : 1,
          }}
        >
          <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          Refresh
        </button>
      </header>

      <main style={{ maxWidth: 820, margin: '0 auto', padding: 'var(--space-5) var(--space-4) var(--space-12)' }}>

        {/* Error */}
        {error && (
          <div style={{
            backgroundColor: '#FEF2F2', border: '1px solid #FECACA',
            borderRadius: 'var(--radius-md)', padding: 'var(--space-3)',
            marginBottom: 'var(--space-4)', fontSize: 13, color: '#DC2626',
          }}>
            Failed to load audit log: {error}
          </div>
        )}

        {/* Loading skeletons */}
        {loading && !error && (
          <div style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
          }}>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} style={{
                height: 52,
                borderBottom: i < 7 ? '1px solid var(--color-border-subtle)' : 'none',
                backgroundColor: 'var(--color-surface)',
                animation: 'shimmer 1.4s ease-in-out infinite',
              }} />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && entries.length === 0 && (
          <div style={{
            textAlign: 'center',
            padding: 'var(--space-16) var(--space-4)',
            color: 'var(--color-text-tertiary)',
          }}>
            <div style={{ marginBottom: 'var(--space-3)', opacity: 0.35 }}>
              <ClipboardList size={36} />
            </div>
            <div style={{ fontSize: 15, color: 'var(--color-text-secondary)', marginBottom: 'var(--space-1)' }}>
              No audit entries yet
            </div>
            <div style={{ fontSize: 13 }}>
              Admin actions will appear here as they happen.
            </div>
          </div>
        )}

        {/* Table */}
        {!loading && entries.length > 0 && (
          <div style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
          }}>

            {/* Table head */}
            <div style={theadStyle}>
              <span style={thStyle}>Time</span>
              <span style={thStyle}>Action</span>
              <span style={thStyle}>Table</span>
              <span style={thStyle}>Record</span>
              <span style={{ ...thStyle, textAlign: 'right' }}>Details</span>
            </div>

            {/* Rows */}
            {entries.map((entry, idx) => {
              const actionStyle = ACTION_STYLES[entry.action] ?? ACTION_STYLES.update
              const isExpanded  = expanded === entry.id
              const isLast      = idx === entries.length - 1
              const hasChanges  = entry.changes && Object.keys(entry.changes).length > 0

              return (
                <div key={entry.id}>
                  {/* Main row */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '160px 90px 110px minmax(0,1fr) 60px',
                    gap: 'var(--space-3)',
                    alignItems: 'center',
                    padding: 'var(--space-3) var(--space-4)',
                    borderBottom: (!isLast || isExpanded) ? '1px solid var(--color-border-subtle)' : 'none',
                    backgroundColor: isExpanded ? 'var(--color-bg)' : 'transparent',
                  }}>

                    {/* Time */}
                    <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-mono)' }}>
                      {formatTime(entry.created_at)}
                    </span>

                    {/* Action badge */}
                    <span style={{
                      display: 'inline-flex', alignItems: 'center',
                      fontSize: 10, fontWeight: 700,
                      textTransform: 'uppercase', letterSpacing: '0.05em',
                      padding: '2px 8px',
                      borderRadius: 'var(--radius-full)',
                      backgroundColor: actionStyle.bg,
                      color:           actionStyle.color,
                      border:         `1px solid ${actionStyle.border}`,
                      whiteSpace: 'nowrap',
                    }}>
                      {actionStyle.label}
                    </span>

                    {/* Table name */}
                    <span style={{ fontSize: 12, color: 'var(--color-text-secondary)', fontWeight: 500 }}>
                      {TABLE_LABELS[entry.table_name] ?? entry.table_name}
                    </span>

                    {/* Record name */}
                    <span style={{
                      fontSize: 13, color: 'var(--color-text-primary)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {entry.record_name ?? <span style={{ color: 'var(--color-text-tertiary)', fontStyle: 'italic' }}>—</span>}
                    </span>

                    {/* Expand toggle */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      {hasChanges ? (
                        <button
                          onClick={() => toggleExpand(entry.id)}
                          aria-label={isExpanded ? 'Collapse' : 'Expand'}
                          style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            width: 28, height: 28,
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--color-border)',
                            backgroundColor: 'var(--color-surface)',
                            color: 'var(--color-text-secondary)',
                            cursor: 'pointer',
                          }}
                        >
                          {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                        </button>
                      ) : (
                        <span style={{ width: 28 }} />
                      )}
                    </div>
                  </div>

                  {/* Expanded changes */}
                  {isExpanded && hasChanges && (
                    <div style={{
                      padding: 'var(--space-3) var(--space-4)',
                      borderBottom: !isLast ? '1px solid var(--color-border-subtle)' : 'none',
                      backgroundColor: 'var(--color-bg)',
                    }}>
                      <pre style={{
                        margin: 0,
                        fontSize: 12,
                        fontFamily: 'var(--font-mono)',
                        color: 'var(--color-text-secondary)',
                        backgroundColor: 'var(--color-surface)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-md)',
                        padding: 'var(--space-3)',
                        overflowX: 'auto',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        lineHeight: 1.6,
                      }}>
                        {JSON.stringify(entry.changes, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Count note */}
        {!loading && entries.length > 0 && (
          <div style={{ marginTop: 'var(--space-3)', fontSize: 12, color: 'var(--color-text-tertiary)', textAlign: 'center' }}>
            Showing last {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
          </div>
        )}

      </main>
    </div>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const theadStyle = {
  display: 'grid',
  gridTemplateColumns: '160px 90px 110px minmax(0,1fr) 60px',
  gap: 'var(--space-3)',
  padding: 'var(--space-2) var(--space-4)',
  backgroundColor: 'var(--color-bg)',
  borderBottom: '1px solid var(--color-border)',
}

const thStyle = {
  fontSize: 11,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  color: 'var(--color-text-tertiary)',
}
