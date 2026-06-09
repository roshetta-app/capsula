/**
 * src/pages/admin/CrashLogs.jsx
 * Phase 3K — Crash Logs Admin View
 *
 * Route: /admin/crash-logs
 * Shows last 50 crash log entries from Supabase.
 * Expandable rows with full stack trace.
 */

import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { RefreshCw, ChevronDown, ChevronUp, CheckCircle } from 'lucide-react'
import { supabase } from '../../lib/supabase'

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-GB', {
    day:    '2-digit',
    month:  'short',
    year:   'numeric',
    hour:   '2-digit',
    minute: '2-digit',
  })
}

function StackBlock({ label, content }) {
  if (!content) return null
  return (
    <div style={{ marginTop: 10 }}>
      <div style={{
        fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
        letterSpacing: '0.06em', color: 'var(--color-text-tertiary)',
        marginBottom: 4,
      }}>
        {label}
      </div>
      <pre style={{
        margin: 0,
        padding: '10px 12px',
        backgroundColor: 'var(--color-bg)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-sm)',
        fontSize: 11,
        lineHeight: 1.6,
        color: 'var(--color-text-secondary)',
        overflowX: 'auto',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-all',
        fontFamily: 'var(--font-mono)',
      }}>
        {content}
      </pre>
    </div>
  )
}

function CrashRow({ log }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div style={{
      borderBottom: '1px solid var(--color-border-subtle)',
      fontFamily: 'var(--font-body)',
    }}>
      {/* Summary row */}
      <button
        onClick={() => setExpanded(e => !e)}
        style={{
          display: 'grid',
          gridTemplateColumns: '160px 1fr 80px',
          alignItems: 'center',
          gap: 'var(--space-3)',
          width: '100%',
          padding: 'var(--space-3) var(--space-4)',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
          fontFamily: 'var(--font-body)',
        }}
      >
        <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)', whiteSpace: 'nowrap' }}>
          {formatDate(log.created_at)}
        </span>
        <span style={{
          fontSize: 13, color: 'var(--color-text-primary)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {log.error_message}
        </span>
        <span style={{
          fontSize: 11, color: 'var(--color-text-tertiary)',
          display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4,
        }}>
          {log.app_version && <span style={{
            fontSize: 10, padding: '1px 6px',
            backgroundColor: 'var(--color-border)',
            borderRadius: 'var(--radius-full)',
            color: 'var(--color-text-tertiary)',
          }}>v{log.app_version}</span>}
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </span>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div style={{ padding: '0 var(--space-4) var(--space-4)' }}>
          <StackBlock label="Error stack"      content={log.error_stack} />
          <StackBlock label="Component stack"  content={log.component_stack} />
        </div>
      )}
    </div>
  )
}

export default function CrashLogs() {
  const navigate = useNavigate()
  const [logs,       setLogs]       = useState([])
  const [loading,    setLoading]    = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error,      setError]      = useState(null)

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else           setLoading(true)
    setError(null)
    try {
      const { data, error: err } = await supabase
        .from('crash_logs')
        .select('id, error_message, error_stack, component_stack, app_version, created_at')
        .order('created_at', { ascending: false })
        .limit(50)
      if (err) throw err
      setLogs(data ?? [])
    } catch (e) {
      setError(e.message ?? 'Failed to load crash logs')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

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
            }}
          >
            ‹ Admin
          </button>
          <span style={{ color: 'var(--color-border)', fontSize: 16 }}>/</span>
          <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)' }}>
            Crash Logs
          </span>
        </div>

        <button
          onClick={() => load(true)}
          disabled={refreshing}
          style={{
            display: 'flex', alignItems: 'center', gap: 'var(--space-1)',
            padding: 'var(--space-2) var(--space-3)',
            borderRadius: 'var(--radius-sm)', border: 'none',
            backgroundColor: 'var(--color-accent)', color: '#fff',
            fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-body)',
            cursor: refreshing ? 'not-allowed' : 'pointer',
            opacity: refreshing ? 0.7 : 1,
          }}
        >
          <RefreshCw size={14} style={{ animation: refreshing ? 'spin 0.8s linear infinite' : 'none' }} />
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </header>

      <main style={{ maxWidth: 900, margin: '0 auto', padding: 'var(--space-5) var(--space-4) var(--space-12)' }}>

        {loading && (
          <div style={{ textAlign: 'center', padding: 'var(--space-12)', color: 'var(--color-text-tertiary)', fontSize: 14 }}>
            Loading…
          </div>
        )}

        {error && (
          <div style={{
            padding: 'var(--space-4)', borderRadius: 'var(--radius-md)',
            backgroundColor: '#FEF2F2', border: '1px solid #FECACA',
            color: '#991B1B', fontSize: 13,
          }}>
            {error}
          </div>
        )}

        {!loading && !error && logs.length === 0 && (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            gap: 'var(--space-3)', padding: 'var(--space-16)',
            color: 'var(--color-text-tertiary)',
          }}>
            <CheckCircle size={40} strokeWidth={1.5} color="var(--color-success, #16a34a)" />
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text-secondary)' }}>
              No crashes logged
            </div>
            <div style={{ fontSize: 13 }}>The app is running without errors.</div>
          </div>
        )}

        {!loading && logs.length > 0 && (
          <div style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
          }}>
            {/* Column headers */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '160px 1fr 80px',
              gap: 'var(--space-3)',
              padding: 'var(--space-2) var(--space-4)',
              borderBottom: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-bg)',
            }}>
              {['Timestamp', 'Error message', ''].map(h => (
                <span key={h} style={{
                  fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
                  letterSpacing: '0.06em', color: 'var(--color-text-tertiary)',
                }}>
                  {h}
                </span>
              ))}
            </div>

            {logs.map(log => <CrashRow key={log.id} log={log} />)}

            <div style={{
              padding: 'var(--space-2) var(--space-4)',
              fontSize: 12, color: 'var(--color-text-tertiary)',
              borderTop: '1px solid var(--color-border-subtle)',
            }}>
              Showing last {logs.length} entries
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
