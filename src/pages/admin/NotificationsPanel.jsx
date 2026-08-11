/**
 * src/pages/admin/NotificationsPanel.jsx
 * Phase 3K — Broadcast Push Notifications
 * Phase F4 Stage 4 — one-shot result toast replaced with a persistent
 * history view reading notification_log, styled to match AuditLog.jsx's
 * table/refresh/empty-state pattern.
 *
 * Route: /admin/notifications
 *
 * Sends a Web Push notification to all subscribed devices via
 * Supabase Edge Function: supabase/functions/send-notification
 *
 * Notification types: Info (blue) | Update (green) | Important (red)
 */

import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Send, RefreshCw, Bell } from 'lucide-react'
import { supabase } from '../../lib/supabase'

const TYPES = [
  { id: 'info',      label: 'Info',      color: '#2563EB', bg: '#EFF6FF' },
  { id: 'update',    label: 'Update',    color: '#16A34A', bg: '#F0FDF4' },
  { id: 'important', label: 'Important', color: '#DC2626', bg: '#FEF2F2' },
]

const TYPE_BY_ID = Object.fromEntries(TYPES.map(t => [t.id, t]))

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

export default function NotificationsPanel() {
  const navigate = useNavigate()

  const [title,   setTitle]   = useState('')
  const [message, setMessage] = useState('')
  const [type,    setType]    = useState('info')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState(null)

  const [history,     setHistory]     = useState([])
  const [loadingHist, setLoadingHist] = useState(true)
  const [histError,   setHistError]   = useState(null)

  // ── Fetch history ──────────────────────────────────────────────────────────

  const fetchHistory = useCallback(async () => {
    setLoadingHist(true)
    setHistError(null)

    const { data, error: err } = await supabase
      .from('notification_log')
      .select('id, type, title, message, sent_count, failed_count, click_count, sent_at')
      .order('sent_at', { ascending: false })
      .limit(100)

    if (err) {
      setHistError(err.message)
    } else {
      setHistory(data ?? [])
    }
    setLoadingHist(false)
  }, [])

  useEffect(() => { fetchHistory() }, [fetchHistory])

  // ── Send ────────────────────────────────────────────────────────────────────

  async function handleSend() {
    if (!title.trim() || !message.trim()) return
    setSending(true)
    setSendError(null)
    try {
      const { data, error } = await supabase.functions.invoke('send-notification', {
        body: { title: title.trim(), message: message.trim(), type },
      })
      if (error) throw error
      setTitle('')
      setMessage('')
      await fetchHistory()
    } catch (e) {
      setSendError(e.message ?? 'Failed to send notification.')
    } finally {
      setSending(false)
    }
  }

  const selectedType = TYPES.find(t => t.id === type)
  const canSend = title.trim().length > 0 && message.trim().length > 0 && !sending

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
            Notifications
          </span>
        </div>
      </header>

      <main style={{ maxWidth: 820, margin: '0 auto', padding: 'var(--space-6) var(--space-4) var(--space-12)' }}>

        <div style={{
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          padding: 'var(--space-5)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-4)',
          marginBottom: 'var(--space-6)',
        }}>

          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)' }}>
            Broadcast notification
          </div>

          {/* Type selector */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-tertiary)', display: 'block', marginBottom: 8 }}>
              Type
            </label>
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              {TYPES.map(t => (
                <button
                  key={t.id}
                  onClick={() => setType(t.id)}
                  style={{
                    padding: '6px 16px',
                    borderRadius: 'var(--radius-full)',
                    border: `1.5px solid ${type === t.id ? t.color : 'var(--color-border)'}`,
                    backgroundColor: type === t.id ? t.bg : 'transparent',
                    color: type === t.id ? t.color : 'var(--color-text-secondary)',
                    fontSize: 13, fontWeight: type === t.id ? 600 : 400,
                    fontFamily: 'var(--font-body)',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-tertiary)', display: 'block', marginBottom: 8 }}>
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. New content added"
              maxLength={80}
              style={{
                width: '100%', boxSizing: 'border-box',
                padding: '10px 12px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-border)',
                backgroundColor: 'var(--color-bg)',
                fontSize: 14, color: 'var(--color-text-primary)',
                fontFamily: 'var(--font-body)',
                outline: 'none',
              }}
            />
          </div>

          {/* Message */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-tertiary)', display: 'block', marginBottom: 8 }}>
              Message
            </label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="e.g. 15 new conditions added across Cardiology and Pulmonology."
              maxLength={200}
              rows={3}
              style={{
                width: '100%', boxSizing: 'border-box',
                padding: '10px 12px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-border)',
                backgroundColor: 'var(--color-bg)',
                fontSize: 14, color: 'var(--color-text-primary)',
                fontFamily: 'var(--font-body)',
                resize: 'vertical',
                outline: 'none',
                lineHeight: 1.5,
              }}
            />
            <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', textAlign: 'right', marginTop: 4 }}>
              {message.length}/200
            </div>
          </div>

          {/* Preview */}
          {(title || message) && (
            <div style={{
              padding: '12px 14px',
              borderRadius: 'var(--radius-md)',
              border: `1px solid ${selectedType.color}33`,
              backgroundColor: selectedType.bg,
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
            }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: selectedType.color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Preview · {selectedType.label}
              </div>
              {title && <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)' }}>{title}</div>}
              {message && <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>{message}</div>}
            </div>
          )}

          {/* Send error */}
          {sendError && (
            <div style={{
              padding: '10px 14px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: '#FEF2F2',
              border: '1px solid #FECACA',
              color: '#991B1B',
              fontSize: 13,
            }}>
              {sendError}
            </div>
          )}

          {/* Send button */}
          <button
            onClick={handleSend}
            disabled={!canSend}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '12px 24px',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              backgroundColor: canSend ? 'var(--color-accent)' : 'var(--color-border)',
              color: canSend ? '#fff' : 'var(--color-text-tertiary)',
              fontSize: 14, fontWeight: 600,
              fontFamily: 'var(--font-body)',
              cursor: canSend ? 'pointer' : 'not-allowed',
              transition: 'background-color 0.15s',
            }}
          >
            <Send size={15} />
            {sending ? 'Sending…' : 'Send to all devices'}
          </button>

          <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', lineHeight: 1.5 }}>
            Only devices that have granted notification permission will receive this. Users can opt out at any time.
          </div>

        </div>

        {/* ── History ──────────────────────────────────────────────────────── */}

        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 'var(--space-3)',
        }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)' }}>
            History
          </div>
          <button
            onClick={fetchHistory}
            disabled={loadingHist}
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
              cursor: loadingHist ? 'not-allowed' : 'pointer',
              opacity: loadingHist ? 0.5 : 1,
            }}
          >
            <RefreshCw size={14} style={{ animation: loadingHist ? 'spin 1s linear infinite' : 'none' }} />
            Refresh
          </button>
        </div>

        {/* Error */}
        {histError && (
          <div style={{
            backgroundColor: '#FEF2F2', border: '1px solid #FECACA',
            borderRadius: 'var(--radius-md)', padding: 'var(--space-3)',
            marginBottom: 'var(--space-4)', fontSize: 13, color: '#DC2626',
          }}>
            Failed to load notification history: {histError}
          </div>
        )}

        {/* Loading skeletons */}
        {loadingHist && !histError && (
          <div style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
          }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} style={{
                height: 52,
                borderBottom: i < 5 ? '1px solid var(--color-border-subtle)' : 'none',
                backgroundColor: 'var(--color-surface)',
                animation: 'shimmer 1.4s ease-in-out infinite',
              }} />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loadingHist && !histError && history.length === 0 && (
          <div style={{
            textAlign: 'center',
            padding: 'var(--space-16) var(--space-4)',
            color: 'var(--color-text-tertiary)',
          }}>
            <div style={{ marginBottom: 'var(--space-3)', opacity: 0.35 }}>
              <Bell size={36} />
            </div>
            <div style={{ fontSize: 15, color: 'var(--color-text-secondary)', marginBottom: 'var(--space-1)' }}>
              No notifications sent yet
            </div>
            <div style={{ fontSize: 13 }}>
              Broadcasts sent from above will appear here.
            </div>
          </div>
        )}

        {/* Table */}
        {!loadingHist && history.length > 0 && (
          <div style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
          }}>

            {/* Table head */}
            <div style={theadStyle}>
              <span style={thStyle}>Sent</span>
              <span style={thStyle}>Type</span>
              <span style={thStyle}>Title / Message</span>
              <span style={{ ...thStyle, textAlign: 'right' }}>Sent</span>
              <span style={{ ...thStyle, textAlign: 'right' }}>Failed</span>
              <span style={{ ...thStyle, textAlign: 'right' }}>Clicks</span>
            </div>

            {/* Rows */}
            {history.map((entry, idx) => {
              const typeStyle = TYPE_BY_ID[entry.type] ?? TYPE_BY_ID.info
              const isLast    = idx === history.length - 1

              return (
                <div key={entry.id} style={{
                  display: 'grid',
                  gridTemplateColumns: '150px 90px minmax(0,1fr) 60px 60px 60px',
                  gap: 'var(--space-3)',
                  alignItems: 'center',
                  padding: 'var(--space-3) var(--space-4)',
                  borderBottom: !isLast ? '1px solid var(--color-border-subtle)' : 'none',
                }}>

                  {/* Sent time */}
                  <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-mono)' }}>
                    {formatTime(entry.sent_at)}
                  </span>

                  {/* Type badge */}
                  <span style={{
                    display: 'inline-flex', alignItems: 'center',
                    fontSize: 10, fontWeight: 700,
                    textTransform: 'uppercase', letterSpacing: '0.05em',
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-full)',
                    backgroundColor: typeStyle.bg,
                    color:           typeStyle.color,
                    border:         `1px solid ${typeStyle.color}55`,
                    whiteSpace: 'nowrap',
                    width: 'fit-content',
                  }}>
                    {typeStyle.label}
                  </span>

                  {/* Title / message */}
                  <div style={{ minWidth: 0 }}>
                    <div style={{
                      fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {entry.title}
                    </div>
                    <div style={{
                      fontSize: 12, color: 'var(--color-text-secondary)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {entry.message}
                    </div>
                  </div>

                  {/* Sent count */}
                  <span style={{ fontSize: 13, color: 'var(--color-text-primary)', textAlign: 'right', fontWeight: 500 }}>
                    {entry.sent_count}
                  </span>

                  {/* Failed count */}
                  <span style={{
                    fontSize: 13, textAlign: 'right', fontWeight: 500,
                    color: entry.failed_count > 0 ? '#DC2626' : 'var(--color-text-tertiary)',
                  }}>
                    {entry.failed_count}
                  </span>

                  {/* Click count */}
                  <span style={{ fontSize: 13, color: 'var(--color-text-primary)', textAlign: 'right', fontWeight: 500 }}>
                    {entry.click_count}
                  </span>
                </div>
              )
            })}
          </div>
        )}

        {/* Count note */}
        {!loadingHist && history.length > 0 && (
          <div style={{ marginTop: 'var(--space-3)', fontSize: 12, color: 'var(--color-text-tertiary)', textAlign: 'center' }}>
            Showing last {history.length} {history.length === 1 ? 'notification' : 'notifications'}
          </div>
        )}

      </main>
    </div>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const theadStyle = {
  display: 'grid',
  gridTemplateColumns: '150px 90px minmax(0,1fr) 60px 60px 60px',
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
