/**
 * src/pages/NotificationsScreen.jsx
 *
 * Step 1c (2026-11-24) — the Notifications page: the signed-in person's own list of personal
 * notifications (Pro started, Pro ending, replies to reports, and so on). Opened from the bell on
 * Home and on Topics. Notifications sent to everyone are not listed here.
 *
 * Opening the page clears the red dot on the bell (every notification is marked read once the list
 * has loaded); notifications that were unread when the page opened keep a small accent dot while
 * the page stays open. Tapping a notification opens its link the same way a tapped push does.
 * "Settings" opens the on/off notifications sheet (NotificationSheet), for guests too.
 *
 * Guests see a sign-in card (they have no personal notifications). If the list cannot load the
 * page says whether the phone is offline or something else went wrong, with a Try again button.
 */

import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, Settings } from 'lucide-react'
import GroupStateMessage from '../components/drugs/groups/GroupStateMessage'
import NotificationSheet from '../components/ui/NotificationSheet'
import { shimmer } from '../components/drugs/home/shimmer'
import { usePushSubscriptionContext } from '../context/PushSubscriptionContext'
import { useAuth } from '../hooks/useAuth'
import { useBackLabel } from '../hooks/useBackLabel'
import { useDeepLinkParent } from '../hooks/useDeepLinkParent'
import { useOnlineStatus } from '../hooks/useOnlineStatus'
import { fetchNotifications, markNotificationsRead } from '../hooks/useNotifications'

const font = 'var(--font-body)'

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

function StateCard({ title, body, actionLabel, onAction }) {
  return (
    <div
      style={{
        backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 16,
        padding: '24px 16px', textAlign: 'center', fontFamily: font,
      }}
    >
      <div
        aria-hidden="true"
        style={{
          width: 40, height: 40, borderRadius: 12, margin: '0 auto 12px',
          backgroundColor: 'var(--color-accent-light)', color: 'var(--color-accent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <Bell size={22} strokeWidth={2} />
      </div>
      <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 14, lineHeight: 1.5, color: 'var(--color-text-secondary)', marginBottom: actionLabel ? 16 : 0 }}>{body}</div>
      {actionLabel && (
        <button
          type="button"
          onClick={onAction}
          style={{
            minHeight: 44, padding: '0 24px', borderRadius: 9999, border: 'none', cursor: 'pointer',
            backgroundColor: 'var(--color-accent-solid)', color: '#fff',
            fontFamily: font, fontSize: 14, fontWeight: 600, outline: 'none', WebkitTapHighlightColor: 'transparent',
          }}
        >
          {actionLabel}
        </button>
      )}
    </div>
  )
}

export default function NotificationsScreen() {
  const navigate = useNavigate()
  useDeepLinkParent()
  const backLabel = useBackLabel() || 'Home'
  const { user, loading: authLoading, signInWithGoogle } = useAuth()
  const { openUrl } = usePushSubscriptionContext()
  const { isOnline } = useOnlineStatus()
  const userId = user?.id ?? null

  const [items, setItems] = useState(null)      // null = loading
  const [failed, setFailed] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  const load = useCallback(() => {
    let cancelled = false
    fetchNotifications()
      .then(rows => {
        if (cancelled) return
        setFailed(false)
        setItems(rows)
        if (rows.some(r => !r.read_at)) markNotificationsRead().catch(() => {})
      })
      .catch(() => { if (!cancelled) { setItems([]); setFailed(true) } })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!userId) return undefined
    return load()
  }, [userId, load])

  function retry() {
    setItems(null)
    load()
  }

  const backButton = (
    <button
      type="button"
      onClick={() => navigate(-1)}
      aria-label={`Back to ${backLabel}`}
      style={{
        display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer',
        color: 'var(--color-accent-text)', fontSize: 14, fontWeight: 500, fontFamily: font, padding: '4px 0',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polyline points="15 18 9 12 15 6" />
      </svg>
      {backLabel}
    </button>
  )

  const settingsButton = (
    <button
      type="button"
      onClick={() => setSettingsOpen(true)}
      aria-label="Notification settings"
      style={{
        display: 'flex', alignItems: 'center', minHeight: 44, padding: 0, background: 'none', border: 'none',
        cursor: 'pointer', outline: 'none', WebkitTapHighlightColor: 'transparent',
      }}
    >
      <span
        style={{
          display: 'flex', alignItems: 'center', gap: 4, height: 32, padding: '0 12px', boxSizing: 'border-box',
          border: '1px solid var(--color-chip-line)', borderRadius: 9999,
          color: 'var(--color-accent-text)', fontFamily: font, fontSize: 14, fontWeight: 600,
        }}
      >
        <Settings size={15} strokeWidth={2.2} aria-hidden="true" />
        Settings
      </span>
    </button>
  )

  let body
  if (authLoading) {
    body = <div aria-hidden="true" style={shimmer({ height: 56 * 3, borderRadius: 16 })} />
  } else if (!userId) {
    body = (
      <StateCard
        title="Sign in to see your notifications"
        body="Pro updates and replies to your reports show up here once you are signed in."
        actionLabel="Sign in"
        onAction={() => signInWithGoogle?.()}
      />
    )
  } else if (items === null) {
    body = <div aria-hidden="true" style={shimmer({ height: 56 * 3, borderRadius: 16 })} />
  } else if (failed) {
    body = (
      <GroupStateMessage
        title="Couldn't load your notifications"
        body={isOnline ? 'Something went wrong. Please try again.' : "You're offline. Check your connection and try again."}
        actionLabel="Try again"
        onAction={retry}
        secondary
      />
    )
  } else if (items.length === 0) {
    body = (
      <StateCard
        title="No notifications yet"
        body="Pro updates and replies to your reports show up here."
      />
    )
  } else {
    body = (
      <>
        <div style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 16, overflow: 'hidden' }}>
          {items.map((row, i) => (
            <button
              key={row.id}
              type="button"
              onClick={() => { if (row.deep_link_path && openUrl) openUrl(row.deep_link_path) }}
              style={{
                display: 'flex', gap: 10, width: '100%', textAlign: 'left', background: 'none', border: 'none',
                borderTop: i === 0 ? 'none' : '1px solid var(--color-border-subtle)',
                padding: 'var(--space-3) var(--space-4)', fontFamily: font,
                cursor: row.deep_link_path ? 'pointer' : 'default', WebkitTapHighlightColor: 'transparent',
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  width: 8, height: 8, borderRadius: '50%', marginTop: 6, flexShrink: 0,
                  backgroundColor: row.read_at ? 'transparent' : 'var(--color-accent)',
                }}
              />
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'flex', gap: 8 }}>
                  <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)' }}>{row.title}</span>
                  <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)', flexShrink: 0 }}>{timeAgo(row.sent_at)}</span>
                </span>
                <span style={{ display: 'block', fontSize: 13, lineHeight: 1.5, color: 'var(--color-text-secondary)' }}>{row.message}</span>
              </span>
            </button>
          ))}
        </div>
        <p style={{ margin: 'var(--space-3) 0 0', textAlign: 'center', fontSize: 12, color: 'var(--color-text-tertiary)', fontFamily: font }}>
          Kept for 90 days
        </p>
      </>
    )
  }

  return (
    <div style={{ padding: 'var(--space-3) 0 var(--space-4)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
        {backButton}
        {settingsButton}
      </div>
      <h1 style={{ margin: '0 0 var(--space-3)', fontSize: 22, fontWeight: 600, lineHeight: 1.3, color: 'var(--color-text-primary)', fontFamily: font }}>
        Notifications
      </h1>
      {body}
      <NotificationSheet isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  )
}
