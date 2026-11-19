/**
 * src/components/home/HomeSyncLine.jsx
 * Phase J, step 11.4: the one quiet status line under a Home row (My roshettas, My drug groups).
 * It replaces the grey banners that used to sit above the cards and pushed them down.
 *
 * The slot under the row keeps its height at all times, so the cards never move when a message
 * comes or goes; only the small rounded line inside it fades in and out. Kinds: failed (amber,
 * with an action), offline, syncing (turning arrows), waiting, and a short green "All changes
 * saved" that shows for a moment after a message clears, then fades away.
 *
 * Props: notice ({ tone, title } from homeNotice, or null), kind (from noticeKind, or ''),
 *        actionLabel, onAction (the amber line only)
 */

import { useEffect, useState } from 'react'
import { CheckCircle2, CloudOff, CloudUpload, RefreshCw, TriangleAlert } from 'lucide-react'

const font = 'var(--font-body)'
export const SLOT_H = 32
const SAVED = { kind: 'saved', tone: 'success', title: 'All changes saved' }
const SAVED_SHOWN_MS = 2500

const CSS = `
@keyframes home-sync-spin { to { transform: rotate(360deg); } }
.home-sync-spin { animation: home-sync-spin 1s linear infinite; }
@media (prefers-reduced-motion: reduce) { .home-sync-spin { animation: none; } }
`

const LOOK = {
  failed: { Icon: TriangleAlert, icon: 'var(--color-warning)', bg: 'color-mix(in srgb, var(--color-warning) 14%, transparent)', text: 'var(--color-text-primary)' },
  offline: { Icon: CloudOff, icon: 'var(--color-text-tertiary)', bg: 'color-mix(in srgb, var(--color-text-primary) 6%, transparent)', text: 'var(--color-text-secondary)' },
  syncing: { Icon: RefreshCw, icon: 'var(--color-accent-text)', bg: 'color-mix(in srgb, var(--color-text-primary) 6%, transparent)', text: 'var(--color-text-secondary)', spin: true },
  waiting: { Icon: CloudUpload, icon: 'var(--color-text-tertiary)', bg: 'color-mix(in srgb, var(--color-text-primary) 6%, transparent)', text: 'var(--color-text-secondary)' },
  saved: { Icon: CheckCircle2, icon: 'var(--color-success)', bg: 'color-mix(in srgb, var(--color-success) 13%, transparent)', text: 'var(--color-text-secondary)' },
}

export default function HomeSyncLine({ notice = null, kind = '', actionLabel, onAction }) {
  const [shown, setShown] = useState(null)
  const [visible, setVisible] = useState(false)
  const [prevKey, setPrevKey] = useState('')

  // Adjusted while drawing (not in an effect): a new message shows; a message that just cleared
  // turns into the short "All changes saved"; otherwise the line stays hidden.
  const key = notice ? `${kind}|${notice.title}` : ''
  if (key !== prevKey) {
    setPrevKey(key)
    if (notice) { setShown({ ...notice, kind: kind || 'waiting' }); setVisible(true) }
    else if (prevKey) { setShown(SAVED); setVisible(true) }
    else setVisible(false)
  }

  useEffect(() => {
    if (!visible || shown?.kind !== 'saved') return undefined
    const t = setTimeout(() => setVisible(false), SAVED_SHOWN_MS)
    return () => clearTimeout(t)
  }, [visible, shown])

  const look = LOOK[shown?.kind] ?? LOOK.waiting
  const Icon = look.Icon
  const hasAction = visible && shown?.kind === 'failed' && actionLabel && onAction

  return (
    <div role="status" aria-live="polite" style={{ minHeight: SLOT_H, display: 'flex', alignItems: 'center' }}>
      <style>{CSS}</style>
      {shown && (
        <div
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, maxWidth: '100%', boxSizing: 'border-box',
            minHeight: 26, padding: hasAction ? '0 4px 0 10px' : '0 12px 0 10px', borderRadius: 9999,
            backgroundColor: look.bg, color: look.text, fontFamily: font, fontSize: 12, fontWeight: 500, lineHeight: 1.3,
            opacity: visible ? 1 : 0, visibility: visible ? 'visible' : 'hidden',
            transform: visible ? 'translateY(0)' : 'translateY(-3px)',
            transition: 'opacity var(--motion-base) var(--ease-reveal), transform var(--motion-base) var(--ease-settle), visibility var(--motion-base)',
          }}
        >
          <Icon size={13} strokeWidth={2.2} aria-hidden="true" className={look.spin ? 'home-sync-spin' : undefined} style={{ flexShrink: 0, color: look.icon }} />
          <span>{shown.title}</span>
          {hasAction && (
            <button
              type="button"
              onClick={onAction}
              style={{
                background: 'none', border: 'none', cursor: 'pointer', outline: 'none', fontFamily: font,
                fontSize: 12, fontWeight: 700, color: 'var(--color-text-primary)', textDecoration: 'underline',
                padding: '12px 8px', margin: '-12px 0', minHeight: 44, WebkitTapHighlightColor: 'transparent',
              }}
            >
              {actionLabel}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
