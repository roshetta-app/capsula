/**
 * src/components/home/HomeSyncLine.jsx
 * Phase J, step 11.4 (redrawn in 11.9): the one quiet status line under a Home row (My roshettas,
 * My drug groups). Plain small text with a tiny icon, no box, no bold: it should be read only
 * when someone looks for it.
 *
 * It sits in the empty gap between this section and the next (absolutely placed just under the
 * row), so it takes NO height of its own: the cards and the next heading never move, and an idle
 * row has no extra empty space. It is left aligned; the action ("See", "Try again") is a text
 * link right after the words. Kinds: failed and refresh (amber icon, with an action), offline,
 * syncing (turning arrows), waiting, and a green "All saved" that shows for a moment after a
 * message clears, then fades away.
 *
 * Must be placed inside a parent that is position: relative and ends at the row (the section's
 * content column does). Props: kind (from noticeKind, 'refresh' or '' for none), text (from
 * statusText), actionLabel, onAction (the amber lines only), inside (2026-11-21: true when the
 * line sits INSIDE a box instead of under a row, as on the roshetta page header: it then fills
 * its relative parent, which should be one line high)
 */

import { useEffect, useState } from 'react'
import { statusText } from '../../utils/homeRoshettas'
import { CheckCircle2, CloudOff, CloudUpload, RefreshCw, TriangleAlert } from 'lucide-react'

const font = 'var(--font-body)'
export const LINE_H = 16
const SAVED = { kind: 'saved', text: statusText('saved') }
const SAVED_SHOWN_MS = 2500

const CSS = `
@keyframes home-sync-spin { to { transform: rotate(360deg); } }
.home-sync-spin { animation: home-sync-spin 1s linear infinite; }
@media (prefers-reduced-motion: reduce) { .home-sync-spin { animation: none; } }
`

const FAILED_LOOK = { Icon: TriangleAlert, icon: 'var(--color-warning)' }
const LOOK = {
  failed: FAILED_LOOK,
  refresh: FAILED_LOOK,
  offline: { Icon: CloudOff, icon: 'var(--color-text-tertiary)' },
  syncing: { Icon: RefreshCw, icon: 'var(--color-text-tertiary)', spin: true },
  waiting: { Icon: CloudUpload, icon: 'var(--color-text-tertiary)' },
  saved: { Icon: CheckCircle2, icon: 'var(--color-success)' },
}

export default function HomeSyncLine({ kind = '', text = '', actionLabel, onAction, inside = false }) {
  const [shown, setShown] = useState(null)
  const [visible, setVisible] = useState(false)
  const [prevKey, setPrevKey] = useState('')

  // Adjusted while drawing (not in an effect): a new message shows; a message that just cleared
  // turns into the short "All saved"; otherwise the line stays hidden.
  const key = kind ? `${kind}|${text}` : ''
  if (key !== prevKey) {
    setPrevKey(key)
    if (kind) { setShown({ kind, text }); setVisible(true) }
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
  const warn = shown?.kind === 'failed' || shown?.kind === 'refresh'
  const hasAction = visible && warn && actionLabel && onAction

  return (
    <div
      role="status"
      aria-live="polite"
      style={{ position: 'absolute', insetInline: 0, top: inside ? 0 : '100%', marginTop: inside ? 0 : 4, height: LINE_H, display: 'flex', alignItems: 'center', pointerEvents: 'none' }}
    >
      <style>{CSS}</style>
      {shown && (
        <div
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 5, maxWidth: '100%', minWidth: 0,
            fontFamily: font, fontSize: 12, fontWeight: 400, lineHeight: 1.3,
            color: warn ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
            opacity: visible ? 1 : 0, visibility: visible ? 'visible' : 'hidden',
            transition: 'opacity var(--motion-base) var(--ease-reveal), visibility var(--motion-base)',
          }}
        >
          <Icon size={12} strokeWidth={2.2} aria-hidden="true" className={look.spin ? 'home-sync-spin' : undefined} style={{ flexShrink: 0, color: look.icon }} />
          <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{shown.text}</span>
          {hasAction && (
            <button
              type="button"
              onClick={onAction}
              style={{
                pointerEvents: 'auto', background: 'none', border: 'none', cursor: 'pointer', outline: 'none', fontFamily: font, flexShrink: 0,
                fontSize: 12, fontWeight: 600, color: 'var(--color-accent-text)',
                padding: '6px 8px', margin: '-6px -2px -6px 0', WebkitTapHighlightColor: 'transparent',
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
