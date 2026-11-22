/**
 * src/components/ui/HiddenNotice.jsx
 * 2026-11-22 (Public profile plan, step 14.9b-2): the notice the owner sees on their own roshetta page,
 * drug group page and Profile tab while that thing is hidden after a report. A fixed title and line (never
 * the reporter's words), and one "Ask for review" button until the one appeal has been used.
 *
 * Props: notice ({ state, title, body, canAsk } from hiddenRules.noticeFor; renders nothing when null),
 *        busy, message (one short line under the notice after a try that did not work), onAsk
 * The words and states live in utils/hiddenRules.js; the data comes from hooks/useHiddenNotice.js.
 */

import { EyeOff, Hourglass, Ban } from 'lucide-react'
import { HIDDEN_WORDS } from '../../utils/hiddenRules'

const TEXT = { fontFamily: 'var(--font-body)' }
const ICONS = { hidden: EyeOff, requested: Hourglass, final: Ban }

export default function HiddenNotice({ notice, busy = false, message = '', onAsk }) {
  if (!notice) return null
  const Icon = ICONS[notice.state] ?? EyeOff
  return (
    <div
      role="status"
      style={{
        display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', padding: 'var(--space-3)',
        borderRadius: 14, backgroundColor: 'var(--color-warning-light)', color: 'var(--color-text-primary)', ...TEXT,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)' }}>
        <Icon size={20} strokeWidth={1.8} aria-hidden="true" style={{ flexShrink: 0, marginTop: 1 }} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.3 }}>{notice.title}</div>
          <div style={{ marginTop: 2, fontSize: 13, lineHeight: 1.4, color: 'var(--color-text-secondary)' }}>{notice.body}</div>
        </div>
      </div>
      {notice.canAsk && (
        <button
          type="button"
          onClick={onAsk}
          disabled={busy}
          style={{
            alignSelf: 'flex-start', minHeight: 44, padding: '0 var(--space-4)', borderRadius: 'var(--radius-full)',
            border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text-primary)',
            fontSize: 14, fontWeight: 600, cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.6 : 1,
            WebkitTapHighlightColor: 'transparent', outline: 'none', ...TEXT,
          }}
        >
          {busy ? HIDDEN_WORDS.asking : HIDDEN_WORDS.ask}
        </button>
      )}
      {message && <p role="alert" style={{ margin: 0, fontSize: 13, lineHeight: 1.4, color: 'var(--color-warning)' }}>{message}</p>}
    </div>
  )
}
