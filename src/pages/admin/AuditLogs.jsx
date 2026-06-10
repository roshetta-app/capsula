import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, RefreshCw, Layers, CheckCircle, HelpCircle, ChevronDown, ChevronRight } from 'lucide-react'
import { useToast } from '../../context/ToastContext'
import { fetchAuditLogs } from '../../lib/adminQueries'

const ACTION_STYLES = {
  create:    { bg: '#D1FAE5', color: '#065F46', label: 'Create' },
  update:    { bg: '#DBEAFE', color: '#1E40AF', label: 'Update' },
  delete:    { bg: '#FEE2E2', color: '#991B1B', label: 'Delete' },
  publish:   { bg: '#ECFDF5', color: '#047857', label: 'Publish' },
  unpublish: { bg: '#FFF7ED', color: '#C2410C', label: 'Unpublish' },
}

function ActionBadge({ action }) {
  const style = ACTION_STYLES[action] ?? { bg: '#F3F4F6', color: '#374151', label: action }
  return (
    <span style={{
      fontSize: 11, fontWeight: 700,
      backgroundColor: style.bg, color: style.color,
      padding: '3px 10px', borderRadius: 'var(--radius-full)',
      textTransform: 'uppercase', letterSpacing: '0.04em',
      display: 'inline-block', textAlign: 'center', minWidth: 70
    }}>
      {style.label}
    </span>
  )
}

function JSONDiffViewer({ changes }) {
  if (!changes || typeof changes !== 'object') return <span style={{ color: 'var(--color-text-tertiary)' }}>No details available</span>

  // Check if it represents getRecordChanges schema: { field: [oldVal, newVal] }
  const isDiff = Object.values(changes).every(val => Array.isArray(val) && val.length === 2)

  if (isDiff) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', marginTop: '8px' }}>
        {Object.entries(changes).map(([field, [oldVal, newVal]]) => (
          <div key={field} style={{
            fontSize: 13, fontFamily: 'var(--font-mono)',
            backgroundColor: 'var(--color-bg)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-sm)',
            padding: 'var(--space-2)',
          }}>
            <div style={{ fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 4 }}>
              {field}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <div style={{ color: '#991B1B', backgroundColor: '#FEF2F2', padding: '2px 6px', borderRadius: 2 }}>
                - {oldVal === null ? 'null' : (typeof oldVal === 'object' ? JSON.stringify(oldVal) : String(oldVal))}
              </div>
              <div style={{ color: '#047857', backgroundColor: '#ECFDF5', padding: '2px 6px', borderRadius: 2 }}>
                + {newVal === null ? 'null' : (typeof newVal === 'object' ? JSON.stringify(newVal) : String(newVal))}
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  // Fallback beautiful JSON syntax log
  return (
    <pre style={{
      margin: '8px 0 0 0',
      padding: 'var(--space-3)',
      backgroundColor: 'var(--color-bg)',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-md)',
      fontSize: 12,
      fontFamily: 'var(--font-mono)',
      color: 'var(--color-text-secondary)',
      overflowX: 'auto',
      whiteSpace: 'pre-wrap',
      wordBreak: 'break-all',
    }}>
      {JSON.stringify(changes, null, 2)}
    </pre>
  )
}

export default function AuditLogs() {
  const navigate = useNavigate()
  const { toast } = useToast()
  
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedRows, setExpandedRows] = useState({})

  async function loadLogs() {
    setLoading(true)
    const { data, error } = await fetchAuditLogs()
    setLoading(false)
    if (error) {
      toast.error(error.message ?? 'Failed to load audit logs')
      return
    }
    setLogs(data ?? [])
  }

  useEffect(() => {
    loadLogs()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function toggleRow(id) {
    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <div style={{
      minHeight: '100dvh',
      backgroundColor: 'var(--color-bg)',
      fontFamily: 'var(--font-body)',
      color: 'var(--color-text-primary)'
    }}>
      {/* Header */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        backgroundColor: 'var(--color-surface)',
        borderBottom: '1px solid var(--color-border)'
      }}>
        <div style={{
          maxWidth: 720, margin: '0 auto',
          padding: 'var(--space-3) var(--space-4)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <button
              onClick={() => navigate('/admin')}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--color-accent)', fontSize: 14, fontWeight: 500,
                fontFamily: 'var(--font-body)', padding: '4px 0',
                display: 'flex', alignItems: 'center', gap: 2
              }}
            >
              <ChevronLeft size={16} />
              Dashboard
            </button>
            <span style={{ color: 'var(--color-border)', fontSize: 16 }}>/</span>
            <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)' }}>
              Audit Logs
            </span>
          </div>

          <button
            onClick={loadLogs}
            disabled={loading}
            style={{
              display: 'flex', alignItems: 'center', gap: 'var(--space-1)',
              padding: '6px 12px', borderRadius: 'var(--radius-md)',
              fontSize: 13, fontWeight: 600, cursor: loading ? 'default' : 'pointer',
              border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)',
              color: 'var(--color-text-secondary)', fontFamily: 'var(--font-body)',
              opacity: loading ? 0.6 : 1
            }}
          >
            <RefreshCw size={13} style={{ animation: loading ? 'spin 1.5s linear infinite' : 'none' }} />
            Refresh
          </button>
        </div>
      </header>

      <main style={{ maxWidth: 720, margin: '0 auto', padding: 'var(--space-4) var(--space-4) var(--space-12)' }}>
        
        <p style={{ fontSize: 13, color: 'var(--color-text-tertiary)', marginBottom: 'var(--space-4)' }}>
          Review the last 100 updates, creations, deletions, and publish state changes across the system tables.
        </p>

        {loading && logs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 'var(--space-12) var(--space-4)', color: 'var(--color-text-tertiary)' }}>
            Loading audit logs…
          </div>
        ) : logs.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: 'var(--space-12) var(--space-4)',
            backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)'
          }}>
            <HelpCircle size={32} style={{ color: 'var(--color-text-tertiary)', opacity: 0.5, marginBottom: 'var(--space-2)' }} />
            <p style={{ color: 'var(--color-text-secondary)', fontSize: 14 }}>No audit logs recorded yet.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {logs.map(log => {
              const isOpen = expandedRows[log.id]
              const displayTime = new Date(log.created_at).toLocaleString('en-GB', {
                day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit'
              })

              return (
                <div key={log.id} style={{
                  backgroundColor: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-lg)',
                  padding: 'var(--space-3) var(--space-4)',
                  boxShadow: 'var(--shadow-card)',
                }}>
                  {/* Summary row — clickable to toggle */}
                  <div
                    onClick={() => toggleRow(log.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 'var(--space-3)', cursor: 'pointer'
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                        <ActionBadge action={log.action} />
                        <span style={{
                          fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em',
                          color: 'var(--color-text-tertiary)'
                        }}>
                          {log.table_name}
                        </span>
                      </div>
                      
                      <div style={{
                        fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                      }}>
                        {log.record_name ?? `ID: ${log.record_id}`}
                      </div>
                      
                      <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-mono)' }}>
                        {displayTime}
                      </div>
                    </div>

                    {log.changes && (
                      <span style={{ color: 'var(--color-text-tertiary)', display: 'flex', alignItems: 'center' }}>
                        {isOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                      </span>
                    )}
                  </div>

                  {/* Collapsible Details */}
                  {isOpen && log.changes && (
                    <div style={{
                      marginTop: 'var(--space-3)',
                      borderTop: '1px solid var(--color-border-subtle)',
                      paddingTop: 'var(--space-3)',
                    }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>
                        Changes Detailing:
                      </div>
                      <JSONDiffViewer changes={log.changes} />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
