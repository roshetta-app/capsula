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
import {
  Send, RefreshCw, Bell, Clock, Pencil, X, Check, ChevronDown, ChevronUp,
  Image as ImageIcon, Link2, Bookmark, Trash2,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import ConfirmModal from '../../components/admin/ConfirmModal'
import DrugPickerModal from '../../components/admin/DrugPickerModal'
import ConditionPickerModal from '../../components/admin/ConditionPickerModal'
import {
  fetchPendingNotifications,
  fetchSentNotifications,
  cancelNotification,
  sendNotificationNow,
  updateNotification,
  uploadNotificationImage,
  fetchNotificationTemplates,
  saveNotificationTemplate,
  deleteNotificationTemplate,
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

  // Phase F9 Stage 2 (D28) — rich content: image, deep link, templates, real schedule.
  const [imagePreview,  setImagePreview]  = useState(null) // local object URL, for preview only
  const [imageUrl,      setImageUrl]      = useState(null) // uploaded Storage URL, sent with the request
  const [uploadingImage, setUploadingImage] = useState(false)
  const [imageError,    setImageError]    = useState(null)

  const [linkType,   setLinkType]   = useState('none') // 'none' | 'drug' | 'condition'
  const [linkTarget, setLinkTarget] = useState(null)    // { label, path } | null
  const [drugPickerOpen,      setDrugPickerOpen]      = useState(false)
  const [conditionPickerOpen, setConditionPickerOpen] = useState(false)

  const [templates,        setTemplates]        = useState([])
  const [loadingTemplates, setLoadingTemplates] = useState(true)
  const [templateError,    setTemplateError]    = useState(null)
  const [savingTemplate,   setSavingTemplate]   = useState(false)
  const [selectedTemplateId, setSelectedTemplateId] = useState('')

  const [scheduleMode,     setScheduleMode]     = useState('default') // 'default' | 'custom'
  const [customScheduleAt, setCustomScheduleAt] = useState('')        // datetime-local string

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
  const [sendingNowId, setSendingNowId] = useState(null) // id currently being force-sent | null

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

  // ── Fetch templates ──────────────────────────────────────────────────────────

  const fetchTemplates = useCallback(async () => {
    setLoadingTemplates(true)
    setTemplateError(null)
    try {
      const rows = await fetchNotificationTemplates()
      setTemplates(rows)
    } catch (e) {
      setTemplateError(e.message ?? 'Failed to load templates')
    } finally {
      setLoadingTemplates(false)
    }
  }, [])

  useEffect(() => { fetchPending(); fetchHistory(); fetchTemplates() }, [fetchPending, fetchHistory, fetchTemplates])

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
      const body = { title: title.trim(), message: message.trim(), type }
      if (imageUrl) body.image_url = imageUrl
      if (linkTarget?.path) body.deep_link_path = linkTarget.path
      if (scheduleMode === 'custom' && customScheduleAt) {
        body.scheduled_send_at = fromDatetimeLocal(customScheduleAt)
      }

      const { data, error } = await supabase.functions.invoke('send-notification', { body })
      if (error) throw error
      setTitle('')
      setMessage('')
      removeImage()
      clearLink()
      setScheduleMode('default')
      setCustomScheduleAt('')
      setSelectedTemplateId('')
      await fetchPending()
    } catch (e) {
      setSendError(e.message ?? 'Failed to schedule notification.')
    } finally {
      setSending(false)
    }
  }

  // ── Image upload (Phase F9 Stage 2, D28) ─────────────────────────────────────

  async function handleImageSelect(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setImageError(null)
    setUploadingImage(true)
    setImagePreview(URL.createObjectURL(file))
    try {
      const { url, error } = await uploadNotificationImage(file)
      if (error) throw error
      setImageUrl(url)
    } catch (err) {
      setImageError(err.message ?? 'Failed to upload image')
      setImagePreview(null)
      setImageUrl(null)
    } finally {
      setUploadingImage(false)
    }
  }

  function removeImage() {
    setImagePreview(null)
    setImageUrl(null)
    setImageError(null)
  }

  // ── Deep-link picker (Phase F9 Stage 2, D28) ─────────────────────────────────
  // DrugPickerModal's mode="brand" result carries the flat drug shape under
  // _flat, whose .slug is the brand's own slug — the same field used for
  // /drugs/:slug routing throughout the rest of the app.

  function handleDrugSelected(brand) {
    const slug = brand._flat?.slug
    if (!slug) return
    setLinkType('drug')
    setLinkTarget({ label: brand.name, path: `/drugs/${slug}` })
  }

  function handleConditionSelected(condition) {
    setLinkType('condition')
    setLinkTarget({ label: condition.name, path: `/conditions/${condition.slug}` })
  }

  function clearLink() {
    setLinkType('none')
    setLinkTarget(null)
  }

  // ── Templates (Phase F9 Stage 2, D28) ────────────────────────────────────────

  function applyTemplate(id) {
    setSelectedTemplateId(id)
    if (!id) return
    const tpl = templates.find(t => t.id === id)
    if (!tpl) return
    setTitle(tpl.title)
    setMessage(tpl.message)
    setType(tpl.type ?? 'info')
  }

  async function handleSaveTemplate() {
    if (!title.trim() || !message.trim()) return
    setSavingTemplate(true)
    setTemplateError(null)
    try {
      const { error } = await saveNotificationTemplate({
        title: title.trim(), message: message.trim(), type,
      })
      if (error) throw error
      await fetchTemplates()
    } catch (e) {
      setTemplateError(e.message ?? 'Failed to save template')
    } finally {
      setSavingTemplate(false)
    }
  }

  async function handleDeleteTemplate(id, tplTitle) {
    setTemplateError(null)
    try {
      const { error } = await deleteNotificationTemplate(id, tplTitle)
      if (error) throw error
      if (selectedTemplateId === id) setSelectedTemplateId('')
      await fetchTemplates()
    } catch (e) {
      setTemplateError(e.message ?? 'Failed to delete template')
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

  // ── Send a pending notification immediately (skip the wait) ──────────────────

  async function handleSendNow(row) {
    setSendingNowId(row.id)
    setPendingError(null)
    try {
      await sendNotificationNow(row.id, row.title)
      await fetchPending()
      await fetchHistory()
    } catch (e) {
      setPendingError(e.message ?? 'Failed to send now')
    } finally {
      setSendingNowId(null)
    }
  }

  const selectedType = TYPES.find(t => t.id === type)
  const canSend = title.trim().length > 0 && message.trim().length > 0 && !sending && !uploadingImage &&
    (scheduleMode !== 'custom' || Boolean(customScheduleAt))

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

          {/* Template load/delete (Phase F9 Stage 2, D28) */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-tertiary)', display: 'block', marginBottom: 8 }}>
              Template
            </label>
            <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
              <select
                value={selectedTemplateId}
                onChange={e => applyTemplate(e.target.value)}
                disabled={loadingTemplates}
                style={{
                  flex: 1,
                  padding: '9px 10px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--color-border)',
                  backgroundColor: 'var(--color-bg)',
                  fontSize: 13, color: 'var(--color-text-primary)',
                  fontFamily: 'var(--font-body)',
                  outline: 'none',
                }}
              >
                <option value="">{loadingTemplates ? 'Loading templates…' : 'Load a saved template…'}</option>
                {templates.map(t => (
                  <option key={t.id} value={t.id}>{t.title}</option>
                ))}
              </select>
              {selectedTemplateId && (
                <button
                  type="button"
                  onClick={() => {
                    const tpl = templates.find(t => t.id === selectedTemplateId)
                    handleDeleteTemplate(selectedTemplateId, tpl?.title ?? null)
                  }}
                  aria-label="Delete template"
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: 32, height: 32,
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid #FECACA',
                    backgroundColor: 'var(--color-surface)',
                    color: '#DC2626',
                    cursor: 'pointer',
                  }}
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
            {templateError && (
              <div style={{ fontSize: 11, color: '#DC2626', marginTop: 4 }}>{templateError}</div>
            )}
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

          {/* Image (Phase F9 Stage 2, D28) */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-tertiary)', display: 'block', marginBottom: 8 }}>
              Image (optional)
            </label>
            {!imagePreview ? (
              <label style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                padding: '14px',
                borderRadius: 'var(--radius-md)',
                border: '1.5px dashed var(--color-border)',
                cursor: uploadingImage ? 'not-allowed' : 'pointer',
                color: 'var(--color-text-secondary)',
                fontSize: 13, fontFamily: 'var(--font-body)',
              }}>
                <ImageIcon size={16} />
                {uploadingImage ? 'Uploading…' : 'Add an image'}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  disabled={uploadingImage}
                  style={{ display: 'none' }}
                />
              </label>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                <img
                  src={imagePreview}
                  alt=""
                  style={{
                    width: 64, height: 64, objectFit: 'cover',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--color-border)',
                  }}
                />
                {uploadingImage ? (
                  <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>Uploading…</span>
                ) : (
                  <button
                    type="button"
                    onClick={removeImage}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 4,
                      padding: '6px 12px', borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--color-border)', backgroundColor: 'transparent',
                      color: 'var(--color-text-secondary)', fontSize: 12, fontWeight: 500,
                      fontFamily: 'var(--font-body)', cursor: 'pointer',
                    }}
                  >
                    <X size={12} /> Remove
                  </button>
                )}
              </div>
            )}
            {imageError && (
              <div style={{ fontSize: 11, color: '#DC2626', marginTop: 4 }}>{imageError}</div>
            )}
            <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 4, lineHeight: 1.4 }}>
              Only shows once someone expands the notification — never in the collapsed row.
            </div>
          </div>

          {/* Deep link (Phase F9 Stage 2, D28) */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-tertiary)', display: 'block', marginBottom: 8 }}>
              Link to (optional)
            </label>
            {linkType === 'none' ? (
              <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                <button
                  type="button"
                  onClick={() => setDrugPickerOpen(true)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '8px 14px', borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg)',
                    color: 'var(--color-text-secondary)', fontSize: 13, fontWeight: 500,
                    fontFamily: 'var(--font-body)', cursor: 'pointer',
                  }}
                >
                  <Link2 size={13} /> Pick a drug
                </button>
                <button
                  type="button"
                  onClick={() => setConditionPickerOpen(true)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '8px 14px', borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg)',
                    color: 'var(--color-text-secondary)', fontSize: 13, fontWeight: 500,
                    fontFamily: 'var(--font-body)', cursor: 'pointer',
                  }}
                >
                  <Link2 size={13} /> Pick a condition
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}>
                  {linkTarget?.label}
                </span>
                <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>
                  ({linkType})
                </span>
                <button
                  type="button"
                  onClick={clearLink}
                  aria-label="Remove link"
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: 24, height: 24, borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--color-border)', backgroundColor: 'transparent',
                    color: 'var(--color-text-secondary)', cursor: 'pointer',
                  }}
                >
                  <X size={12} />
                </button>
              </div>
            )}
            <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 4, lineHeight: 1.4 }}>
              Changes what screen opens when someone taps the notification.
            </div>
          </div>

          {/* Send time (Phase F9 Stage 2, D28) */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-tertiary)', display: 'block', marginBottom: 8 }}>
              Send time
            </label>
            <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: scheduleMode === 'custom' ? 8 : 0 }}>
              <button
                type="button"
                onClick={() => { setScheduleMode('default'); setCustomScheduleAt('') }}
                style={{
                  padding: '6px 16px',
                  borderRadius: 'var(--radius-full)',
                  border: `1.5px solid ${scheduleMode === 'default' ? 'var(--color-accent)' : 'var(--color-border)'}`,
                  backgroundColor: scheduleMode === 'default' ? '#EFF6FF' : 'transparent',
                  color: scheduleMode === 'default' ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                  fontSize: 13, fontWeight: scheduleMode === 'default' ? 600 : 400,
                  fontFamily: 'var(--font-body)', cursor: 'pointer',
                }}
              >
                In 30 minutes
              </button>
              <button
                type="button"
                onClick={() => setScheduleMode('custom')}
                style={{
                  padding: '6px 16px',
                  borderRadius: 'var(--radius-full)',
                  border: `1.5px solid ${scheduleMode === 'custom' ? 'var(--color-accent)' : 'var(--color-border)'}`,
                  backgroundColor: scheduleMode === 'custom' ? '#EFF6FF' : 'transparent',
                  color: scheduleMode === 'custom' ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                  fontSize: 13, fontWeight: scheduleMode === 'custom' ? 600 : 400,
                  fontFamily: 'var(--font-body)', cursor: 'pointer',
                }}
              >
                Pick date &amp; time
              </button>
            </div>
            {scheduleMode === 'custom' && (
              <input
                type="datetime-local"
                value={customScheduleAt}
                onChange={e => setCustomScheduleAt(e.target.value)}
                style={{
                  padding: '8px 10px', borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg)',
                  fontSize: 13, fontFamily: 'var(--font-body)', color: 'var(--color-text-primary)',
                  outline: 'none',
                }}
              />
            )}
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
              {imagePreview && (
                <img
                  src={imagePreview}
                  alt=""
                  style={{ maxWidth: '100%', maxHeight: 140, objectFit: 'cover', borderRadius: 'var(--radius-sm)', marginTop: 4 }}
                />
              )}
              {linkTarget && (
                <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 2 }}>
                  Opens: {linkTarget.label} ({linkTarget.path})
                </div>
              )}
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

          {/* Send + save-as-template buttons */}
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <button
              onClick={openSendConfirm}
              disabled={!canSend}
              style={{
                flex: 1,
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
            <button
              type="button"
              onClick={handleSaveTemplate}
              disabled={savingTemplate || !title.trim() || !message.trim()}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '12px 16px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-border)',
                backgroundColor: 'var(--color-surface)',
                color: 'var(--color-text-secondary)',
                fontSize: 14, fontWeight: 600,
                fontFamily: 'var(--font-body)',
                cursor: (savingTemplate || !title.trim() || !message.trim()) ? 'not-allowed' : 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              <Bookmark size={15} />
              {savingTemplate ? 'Saving…' : 'Save as template'}
            </button>
          </div>

          <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', lineHeight: 1.5 }}>
            {scheduleMode === 'custom' && customScheduleAt
              ? "Goes out at the time you've picked, to every device that's granted notification permission — "
              : "Goes out in 30 minutes to every device that's granted notification permission — "}
            you can still edit or cancel it below before then. Users can opt out at any time.
          </div>

        </div>

        <ConfirmModal
          isOpen={confirmSendOpen}
          onClose={() => setConfirmSendOpen(false)}
          onConfirm={handleSend}
          title="Schedule this notification?"
          message={
            scheduleMode === 'custom' && customScheduleAt
              ? `"${title}" will be sent to every subscribed device at ${formatTime(fromDatetimeLocal(customScheduleAt))}. You'll be able to edit or cancel it from the Pending list before it goes out.`
              : `"${title}" will be sent to every subscribed device in 30 minutes. You'll be able to edit or cancel it from the Pending list before it goes out.`
          }
          confirmLabel="Schedule send"
          confirmVariant="primary"
        />

        {/* Deep-link pickers (Phase F9 Stage 2, D28) */}
        <DrugPickerModal
          isOpen={drugPickerOpen}
          onClose={() => setDrugPickerOpen(false)}
          onSelect={handleDrugSelected}
          mode="brand"
        />
        <ConditionPickerModal
          isOpen={conditionPickerOpen}
          onClose={() => setConditionPickerOpen(false)}
          onSelect={handleConditionSelected}
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
                  gridTemplateColumns: '90px 80px minmax(0,1fr) auto auto auto',
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
                    onClick={() => handleSendNow(row)}
                    disabled={sendingNowId === row.id}
                    aria-label="Send now"
                    title="Send now"
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      width: 28, height: 28,
                      borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-accent)',
                      backgroundColor: 'var(--color-surface)', color: 'var(--color-accent)',
                      cursor: sendingNowId === row.id ? 'not-allowed' : 'pointer',
                      opacity: sendingNowId === row.id ? 0.5 : 1,
                    }}
                  >
                    <Send size={13} style={{ animation: sendingNowId === row.id ? 'spin 1s linear infinite' : 'none' }} />
                  </button>

                  <button
                    onClick={() => startEdit(row)}
                    disabled={sendingNowId === row.id}
                    aria-label="Edit"
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      width: 28, height: 28,
                      borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)',
                      backgroundColor: 'var(--color-surface)', color: 'var(--color-text-secondary)',
                      cursor: sendingNowId === row.id ? 'not-allowed' : 'pointer',
                      opacity: sendingNowId === row.id ? 0.5 : 1,
                    }}
                  >
                    <Pencil size={13} />
                  </button>

                  <button
                    onClick={() => setCancelTarget({ id: row.id, title: row.title })}
                    disabled={sendingNowId === row.id}
                    aria-label="Cancel send"
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      width: 28, height: 28,
                      borderRadius: 'var(--radius-sm)', border: '1px solid #FECACA',
                      backgroundColor: 'var(--color-surface)', color: '#DC2626',
                      cursor: sendingNowId === row.id ? 'not-allowed' : 'pointer',
                      opacity: sendingNowId === row.id ? 0.5 : 1,
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