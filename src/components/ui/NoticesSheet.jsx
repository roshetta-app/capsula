/**
 * src/components/ui/NoticesSheet.jsx
 *
 * Step 1c (2026-11-24) — the signed-in person's list of personal notices (Pro
 * started, Pro ending, replies to reports, and so on). Opened from the bell.
 * Same pop-up shape as NotificationSheet.jsx (portal to body, fade + scale,
 * delayed unmount, Escape and Back close it).
 *
 * Opening the list clears the red dot (marks every notice read) once the list
 * has loaded; notices that were unread when the list opened keep a small
 * accent dot while it stays open. Tapping a notice opens its link the same way
 * a tapped push notification does. "Settings" opens the on/off notifications
 * sheet (handled by the parent through onOpenSettings).
 *
 * Props:
 *   isOpen          boolean
 *   onClose         () => void
 *   onOpenSettings  () => void
 */

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Bell, Settings } from 'lucide-react'
import { usePushSubscriptionContext } from '../../context/PushSubscriptionContext'
import { useBackClose } from '../../hooks/useBackClose'
import { fetchNotices, markNoticesRead } from '../../hooks/useNotices'

function timeAgo(iso) {
  if (!iso) return ''
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000))
  if (mins < 1) return 'now'
  if (mins < 60) return `${mins}m`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.round(hours / 24)
  if (days < 30) return `${days}d`
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}

export default function NoticesSheet({ isOpen, onClose, onOpenSettings }) {
  const overlayRef = useRef(null)
  const { openUrl } = usePushSubscriptionContext()
  const [items, setItems] = useState(null)   // null = loading
  const [failed, setFailed] = useState(false)

  useBackClose(isOpen, onClose)

  // mounted keeps the DOM present during the fade-out; animateIn drives the fade.
  // (State is only set inside timer callbacks, never directly in the effect body.)
  const [mounted, setMounted] = useState(false)
  const [animateIn, setAnimateIn] = useState(false)

  useEffect(() => {
    if (isOpen) {
      const raf = requestAnimationFrame(() => {
        setMounted(true)
        requestAnimationFrame(() => setAnimateIn(true))
      })
      return () => cancelAnimationFrame(raf)
    }
    const fade = setTimeout(() => setAnimateIn(false), 0)
    const unmount = setTimeout(() => {
      setMounted(false)
      setItems(null)
      setFailed(false)
    }, 220)
    return () => { clearTimeout(fade); clearTimeout(unmount) }
  }, [isOpen])

  // Load the list each time the sheet opens, then mark everything read.
  useEffect(() => {
    if (!isOpen) return undefined
    let cancelled = false
    fetchNotices()
      .then(rows => {
        if (cancelled) return
        setItems(rows)
        if (rows.some(r => !r.read_at)) markNoticesRead().catch(() => {})
      })
      .catch(() => { if (!cancelled) { setItems([]); setFailed(true) } })
    return () => { cancelled = true }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return undefined
    function onKey(e) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  if (!mounted) return null

  function handleOpenNotice(row) {
    onClose()
    if (row.deep_link_path && openUrl) openUrl(row.deep_link_path)
  }

  const textMuted = { fontSize: 13, lineHeight: 1.5, color: 'var(--color-text-secondary)' }

  return createPortal(
    <div
      ref={overlayRef}
      onClick={e => { if (e.target === overlayRef.current) onClose() }}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        backgroundColor: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 'var(--space-4)',
        opacity: animateIn ? 1 : 0,
        transition: 'opacity var(--motion-base) var(--ease-reveal)',
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Notices"
        style={{
          width: '100%', maxWidth: 380, maxHeight: '75vh',
          display: 'flex', flexDirection: 'column',
          backgroundColor: 'var(--color-surface)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
          padding: 'var(--space-5)',
          fontFamily: 'var(--font-body)',
          opacity: animateIn ? 1 : 0,
          transform: animateIn ? 'scale(1)' : 'scale(0.96)',
          transition: 'opacity var(--motion-base) var(--ease-reveal), transform var(--motion-base) var(--ease-settle)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
          <span style={{ flex: 1, fontSize: 16, fontWeight: 600, color: 'var(--color-text-primary)' }}>
            Notices
          </span>
          <button
            onClick={onOpenSettings}
            aria-label="Notification settings"
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              background: 'none', border: 'none', padding: '4px 0 4px 8px',
              fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-body)',
              color: 'var(--color-text-secondary)', cursor: 'pointer',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <Settings size={15} />
            Settings
          </button>
        </div>

        <div style={{ overflowY: 'auto', flex: 1, minHeight: 0 }}>
          {items === null ? (
            <p style={{ ...textMuted, textAlign: 'center', margin: 'var(--space-5) 0' }}>Loading…</p>
          ) : items.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 'var(--space-4) 0' }}>
              <Bell size={26} color="var(--color-accent)" fill="var(--color-accent)" fillOpacity={0.15} />
              <p style={{ ...textMuted, margin: 'var(--space-2) 0 0' }}>
                {failed
                  ? "Couldn't load your notices. Check your connection and try again."
                  : 'No notices yet. Pro updates and replies to your reports show up here.'}
              </p>
            </div>
          ) : (
            items.map(row => (
              <button
                key={row.id}
                onClick={() => handleOpenNotice(row)}
                style={{
                  display: 'flex', gap: 10, width: '100%', textAlign: 'left',
                  background: 'none', border: 'none',
                  borderTop: '1px solid var(--color-border-subtle)',
                  padding: 'var(--space-3) 0', fontFamily: 'var(--font-body)',
                  cursor: row.deep_link_path ? 'pointer' : 'default',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                <span style={{
                  width: 8, height: 8, borderRadius: '50%', marginTop: 6, flexShrink: 0,
                  backgroundColor: row.read_at ? 'transparent' : 'var(--color-accent)',
                }} />
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'flex', gap: 8 }}>
                    <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)' }}>
                      {row.title}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)', flexShrink: 0 }}>
                      {timeAgo(row.sent_at)}
                    </span>
                  </span>
                  <span style={{ display: 'block', ...textMuted }}>{row.message}</span>
                </span>
              </button>
            ))
          )}
        </div>

        {items && items.length > 0 && (
          <p style={{ ...textMuted, fontSize: 12, textAlign: 'center', margin: 'var(--space-3) 0 0' }}>
            Kept for 90 days
          </p>
        )}
      </div>
    </div>,
    document.body,
  )
}
