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
import { Send, RefreshCw, Bell, Clock, Pencil, X, Check, ChevronDown, ChevronUp } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import ConfirmModal from '../../components/admin/ConfirmModal'
import {
  fetchPendingNotifications,
  fetchSentNotifications,
  cancelNotification,
  updateNotification,
} from '../../lib/adminQueries'

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

// Phase F9 Stage 1 — live "sending in Xm Ys" countdown for pending rows.
function formatCountdown(iso, nowMs) {
  const diff = new Date(iso).getTime() - nowMs
  if (diff <= 0) return 'Sending…'
  const totalSec = Math.floor(diff / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

function toDatetimeLocal(iso) {
  const d = new Date(iso)
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function fromDatetimeLocal(value) {
  return new Date(value).toISOString()
}

function deliveryRateLabel(sentCount, failedCount) {
  const total = (sentCount ?? 0) + (failedCount ?? 0)
  if (total === 0) return '—'
  return `${Math.round((sentCount / total) * 100)}%`
}

export default function NotificationsPanel() {
  const navigate = useNavigate()

  const [title,   setTitle]   = useState('')
  const [message, setMessage] = useState('')
  const [type,    setType]    = useState('info')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState(null)
  const [confirmSendOpen, setConfirmSendOpen] = useState(false)

  // Phase F9 Stage 1 — notifications now sit as 'pending' for 30 min before
  // deliver-notification's cron job actually sends them, giving admins a
  // real window to review, edit, or cancel before anything goes out.
  const [pending,        setPending]        = useState([])
  const [loadingPending, setLoadingPending] = useState(true)
  const [pendingError,   setPendingError]   = useState(null)
  const [now,            setNow]            = useState(Date.now())

  const [editingId,  setEditingId]  = useState(null)
  const [editDraft,  setEditDraft]  = useState({ title: '', message: '', scheduled_send_at: '' })
  const [savingEdit, setSavingEdit] = useState(false)
  const [cancelTarget, setCancelTarget] = useState(null) // { id, title } | null
  const [cancelling,   setCancelling]   = useState(false)

  const [history,     setHistory]     = useState([])
  const [loadingHist, setLoadingHist] = useState(true)
  const [histError,   setHistError]   = useState(null)
  const [expandedId,  setExpandedId]  = useState(null)

  // ── Fetch pending ───────────────────────────────────────────────────────────

  const fetchPending = useCallback(async () => {
    setLoadingPending(true)
    setPendingError(null)
    try {
      const rows = await fetchPendingNotifications()
      setPending(rows)
    } catch (e) {
      setPendingError(e.message ?? 'Failed to load pending notifications')
    } finally {
      setLoadingPending(false)
    }
  }, [])

  // ── Fetch history (sent only — pending/cancelled live in their own section) ─

  const fetchHistory = useCallback(async () => {
    setLoadingHist(true)
    setHistError(null)
    try {
      const rows = await fetchSentNotifications()
      setHistory(rows)
    } catch (e) {
      setHistError(e.message ?? 'Failed to load notification history')
    } finally {
      setLoadingHist(false)
    }
  }, [])

  useEffect(() => { fetchPending(); fetchHistory() }, [fetchPending, fetchHistory])

  // Live countdown ticker — only runs while there's something pending to count down.
  useEffect(() => {
    if (pending.length === 0) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [pending.length])

  // ── Send (now: create pending row, actual FCM send happens via cron) ────────

  function openSendConfirm() {
    if (!title.trim() || !message.trim() || sending) return
    setConfirmSendOpen(true)
  }

  async function handleSend() {
    setSending(true)
    setSendError(null)
    try {
      const { data, error } = await supabase.functions.invoke('send-notification', {
        body: { title: title.trim(), message: message.trim(), type },
      })
      if (error) throw error
      setTitle('')
      setMessage('')
      await fetchPending()
    } catch (e) {
      setSendError(e.message ?? 'Failed to schedule notification.')
    } finally {
      setSending(false)
    }
  }

  // ── Edit a pending notification ──────────────────────────────────────────────

  function startEdit(row) {
    setEditingId(row.id)
    setEditDraft({
      title: row.title,
      message: row.message,
      scheduled_send_at: toDatetimeLocal(row.scheduled_send_at),
    })
  }

  function cancelEdit() {
    setEditingId(null)
  }

  async function saveEdit(id) {
    setSavingEdit(true)
    try {
      await updateNotification(id, {
        title: editDraft.title.trim(),
        message: editDraft.message.trim(),
        scheduled_send_at: fromDatetimeLocal(editDraft.scheduled_send_at),
      })
      setEditingId(null)
      await fetchPending()
    } catch (e) {
      setPendingError(e.message ?? 'Failed to save changes')
    } finally {
      setSavingEdit(false)
    }
  }

  // ── Cancel a pending notification ────────────────────────────────────────────

  async function confirmCancel() {
    if (!cancelTarget) return
    setCancelling(true)
    try {
      await cancelNotification(cancelTarget.id, cancelTarget.title)
      await fetchPending()
    } catch (e) {
      setPendingError(e.message ?? 'Failed to cancel notification')
    } finally {
      setCancelling(false)
      setCancelTarget(null)
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
            onClick={openSendConfirm}
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
            {sending ? 'Scheduling…' : 'Schedule send'}
          </button>

          <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', lineHeight: 1.5 }}>
            Goes out in 30 minutes to every device that's granted notification permission —
            you can still edit or cancel it below before then. Users can opt out at any time.
          </div>

        </div>

        <ConfirmModal
          isOpen={confirmSendOpen}
          onClose={() => setConfirmSendOpen(false)}
          onConfirm={handleSend}
          title="Schedule this notification?"
          message={`"${title}" will be sent to every subscribed device in 30 minutes. You'll be able to edit or cancel it from the Pending list before it goes out.`}
          confirmLabel="Schedule send"
          confirmVariant="primary"
        />

        <ConfirmModal
          isOpen={!!cancelTarget}
          onClose={() => setCancelTarget(null)}
          onConfirm={confirmCancel}
          title="Cancel this notification?"
          message={cancelTarget ? `"${cancelTarget.title}" will not be sent. This can't be undone.` : ''}
          confirmLabel={cancelling ? 'Cancelling…' : 'Cancel send'}
          confirmVariant="danger"
        />

        {/* ── Pending ──────────────────────────────────────────────────────── */}

        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 'var(--space-3)',
        }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
            Pending
            {pending.length > 0 && (
              <span style={{
                fontSize: 11, fontWeight: 700, padding: '1px 8px', borderRadius: 'var(--radius-full)',
                backgroundColor: 'var(--color-bg)', color: 'var(--color-text-tertiary)',
                border: '1px solid var(--color-border)',
              }}>
                {pending.length}
              </span>
            )}
          </div>
          <button
            onClick={fetchPending}
            disabled={loadingPending}
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
              cursor: loadingPending ? 'not-allowed' : 'pointer',
              opacity: loadingPending ? 0.5 : 1,
            }}
          >
            <RefreshCw size={14} style={{ animation: loadingPending ? 'spin 1s linear infinite' : 'none' }} />
            Refresh
          </button>
        </div>

        {pendingError && (
          <div style={{
            backgroundColor: '#FEF2F2', border: '1px solid #FECACA',
            borderRadius: 'var(--radius-md)', padding: 'var(--space-3)',
            marginBottom: 'var(--space-4)', fontSize: 13, color: '#DC2626',
          }}>
            {pendingError}
          </div>
        )}

        {!loadingPending && !pendingError && pending.length === 0 && (
          <div style={{
            textAlign: 'center',
            padding: 'var(--space-8) var(--space-4)',
            color: 'var(--color-text-tertiary)',
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            marginBottom: 'var(--space-6)',
            fontSize: 13,
          }}>
            Nothing pending — scheduled sends will show up here.
          </div>
        )}

        {pending.length > 0 && (
          <div style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
            marginBottom: 'var(--space-6)',
          }}>
            {pending.map((row, idx) => {
              const typeStyle = TYPE_BY_ID[row.type] ?? TYPE_BY_ID.info
              const isLast    = idx === pending.length - 1
              const isEditing = editingId === row.id

              if (isEditing) {
                return (
                  <div key={row.id} style={{
                    padding: 'var(--space-4)',
                    borderBottom: !isLast ? '1px solid var(--color-border-subtle)' : 'none',
                    backgroundColor: 'var(--color-bg)',
                    display: 'flex', flexDirection: 'column', gap: 'var(--space-3)',
                  }}>
                    <input
                      type="text"
                      value={editDraft.title}
                      onChange={e => setEditDraft(d => ({ ...d, title: e.target.value }))}
                      maxLength={80}
                      style={{
                        width: '100%', boxSizing: 'border-box', padding: '8px 10px',
                        borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)',
                        backgroundColor: 'var(--color-surface)', fontSize: 13, fontWeight: 600,
                        fontFamily: 'var(--font-body)', color: 'var(--color-text-primary)', outline: 'none',
                      }}
                    />
                    <textarea
                      value={editDraft.message}
                      onChange={e => setEditDraft(d => ({ ...d, message: e.target.value }))}
                      maxLength={200}
                      rows={2}
                      style={{
                        width: '100%', boxSizing: 'border-box', padding: '8px 10px',
                        borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)',
                        backgroundColor: 'var(--color-surface)', fontSize: 13,
                        fontFamily: 'var(--font-body)', color: 'var(--color-text-primary)',
                        outline: 'none', resize: 'vertical', lineHeight: 1.5,
                      }}
                    />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                      <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        Send at
                      </label>
                      <input
                        type="datetime-local"
                        value={editDraft.scheduled_send_at}
                        onChange={e => setEditDraft(d => ({ ...d, scheduled_send_at: e.target.value }))}
                        style={{
                          padding: '6px 10px', borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)',
                          fontSize: 13, fontFamily: 'var(--font-body)', color: 'var(--color-text-primary)',
                          outline: 'none',
                        }}
                      />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
                      <button
                        onClick={cancelEdit}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 4,
                          padding: '6px 14px', borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--color-border)', backgroundColor: 'transparent',
                          color: 'var(--color-text-secondary)', fontSize: 13, fontWeight: 500,
                          fontFamily: 'var(--font-body)', cursor: 'pointer',
                        }}
                      >
                        <X size={13} /> Cancel
                      </button>
                      <button
                        onClick={() => saveEdit(row.id)}
                        disabled={savingEdit || !editDraft.title.trim() || !editDraft.message.trim()}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 4,
                          padding: '6px 14px', borderRadius: 'var(--radius-sm)', border: 'none',
                          backgroundColor: 'var(--color-accent)', color: '#fff',
                          fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-body)',
                          cursor: savingEdit ? 'not-allowed' : 'pointer', opacity: savingEdit ? 0.7 : 1,
                        }}
                      >
                        <Check size={13} /> {savingEdit ? 'Saving…' : 'Save'}
                      </button>
                    </div>
                  </div>
                )
              }

              return (
                <div key={row.id} style={{
                  display: 'grid',
                  gridTemplateColumns: '90px 80px minmax(0,1fr) auto auto',
                  gap: 'var(--space-3)',
                  alignItems: 'center',
                  padding: 'var(--space-3) var(--space-4)',
                  borderBottom: !isLast ? '1px solid var(--color-border-subtle)' : 'none',
                }}>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    fontSize: 12, fontWeight: 600, color: 'var(--color-accent)',
                    whiteSpace: 'nowrap',
                  }}>
                    <Clock size={12} />
                    {formatCountdown(row.scheduled_send_at, now)}
                  </span>

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

                  <div style={{ minWidth: 0 }}>
                    <div style={{
                      fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {row.title}
                    </div>
                    <div style={{
                      fontSize: 12, color: 'var(--color-text-secondary)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {row.message}
                    </div>
                  </div>

                  <button
                    onClick={() => startEdit(row)}
                    aria-label="Edit"
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      width: 28, height: 28,
                      borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)',
                      backgroundColor: 'var(--color-surface)', color: 'var(--color-text-secondary)',
                      cursor: 'pointer',
                    }}
                  >
                    <Pencil size={13} />
                  </button>

                  <button
                    onClick={() => setCancelTarget({ id: row.id, title: row.title })}
                    aria-label="Cancel send"
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      width: 28, height: 28,
                      borderRadius: 'var(--radius-sm)', border: '1px solid #FECACA',
                      backgroundColor: 'var(--color-surface)', color: '#DC2626',
                      cursor: 'pointer',
                    }}
                  >
                    <X size={14} />
                  </button>
                </div>
              )
            })}
          </div>
        )}

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
              <span style={{ ...thStyle, textAlign: 'right' }}>Rate</span>
              <span style={{ ...thStyle, textAlign: 'right' }}>Sent</span>
              <span style={{ ...thStyle, textAlign: 'right' }}>Failed</span>
              <span style={{ ...thStyle, textAlign: 'right' }}>Clicks</span>
              <span style={{ ...thStyle, textAlign: 'right' }}></span>
            </div>

            {/* Rows */}
            {history.map((entry, idx) => {
              const typeStyle  = TYPE_BY_ID[entry.type] ?? TYPE_BY_ID.info
              const isLast     = idx === history.length - 1
              const isExpanded = expandedId === entry.id

              return (
                <div key={entry.id}>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '140px 80px minmax(0,1fr) 55px 55px 55px 55px 32px',
                    gap: 'var(--space-3)',
                    alignItems: 'center',
                    padding: 'var(--space-3) var(--space-4)',
                    borderBottom: (!isLast || isExpanded) ? '1px solid var(--color-border-subtle)' : 'none',
                    backgroundColor: isExpanded ? 'var(--color-bg)' : 'transparent',
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

                    {/* Delivery rate */}
                    <span style={{ fontSize: 13, color: 'var(--color-text-primary)', textAlign: 'right', fontWeight: 500 }}>
                      {deliveryRateLabel(entry.sent_count, entry.failed_count)}
                    </span>

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

                    {/* Expand toggle */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => setExpandedId(p => p === entry.id ? null : entry.id)}
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
                    </div>
                  </div>

                  {/* Expanded: full title/message */}
                  {isExpanded && (
                    <div style={{
                      padding: 'var(--space-3) var(--space-4)',
                      borderBottom: !isLast ? '1px solid var(--color-border-subtle)' : 'none',
                      backgroundColor: 'var(--color-bg)',
                    }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 4 }}>
                        {entry.title}
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                        {entry.message}
                      </div>
                    </div>
                  )}
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
  gridTemplateColumns: '140px 80px minmax(0,1fr) 55px 55px 55px 55px 32px',
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