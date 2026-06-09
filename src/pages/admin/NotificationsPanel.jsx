/**
 * src/pages/admin/NotificationsPanel.jsx
 * Phase 3K — Broadcast Push Notifications
 *
 * Route: /admin/notifications
 *
 * Sends a Web Push notification to all subscribed devices via
 * Supabase Edge Function: supabase/functions/send-notification
 *
 * Notification types: Info (blue) | Update (green) | Important (red)
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Send } from 'lucide-react'
import { supabase } from '../../lib/supabase'

const TYPES = [
  { id: 'info',      label: 'Info',      color: '#2563EB', bg: '#EFF6FF' },
  { id: 'update',    label: 'Update',    color: '#16A34A', bg: '#F0FDF4' },
  { id: 'important', label: 'Important', color: '#DC2626', bg: '#FEF2F2' },
]

export default function NotificationsPanel() {
  const navigate = useNavigate()

  const [title,   setTitle]   = useState('')
  const [message, setMessage] = useState('')
  const [type,    setType]    = useState('info')
  const [sending, setSending] = useState(false)
  const [result,  setResult]  = useState(null) // { ok: bool, text: string }

  async function handleSend() {
    if (!title.trim() || !message.trim()) return
    setSending(true)
    setResult(null)
    try {
      const { data, error } = await supabase.functions.invoke('send-notification', {
        body: { title: title.trim(), message: message.trim(), type },
      })
      if (error) throw error
      setResult({ ok: true, text: `Sent to ${data?.sent ?? 0} device(s).` })
      setTitle('')
      setMessage('')
    } catch (e) {
      setResult({ ok: false, text: e.message ?? 'Failed to send notification.' })
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

      <main style={{ maxWidth: 560, margin: '0 auto', padding: 'var(--space-6) var(--space-4) var(--space-12)' }}>

        <div style={{
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          padding: 'var(--space-5)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-4)',
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

          {/* Result feedback */}
          {result && (
            <div style={{
              padding: '10px 14px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: result.ok ? '#F0FDF4' : '#FEF2F2',
              border: `1px solid ${result.ok ? '#BBF7D0' : '#FECACA'}`,
              color: result.ok ? '#15803D' : '#991B1B',
              fontSize: 13,
            }}>
              {result.text}
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
      </main>
    </div>
  )
}
