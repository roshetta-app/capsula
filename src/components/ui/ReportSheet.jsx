/**
 * src/components/ui/ReportSheet.jsx
 * 2026-11-22 (Public profile plan, step 14.9b): the Report sheet for a shared roshetta, a shared drug group
 * or a public profile. A short list of reasons (medical first) and one Send report button. A guest is asked
 * to sign in first (the page stays where it is). The person is never told who else reported, and the owner
 * is never told who reported.
 *
 * Props: isOpen, onClose, kind ('roshetta' | 'group' | 'profile'), reference (share code or username)
 *
 * Also exports ReportLink: the quiet "Report" button the three pages show under their content.
 * The rules and wording live in utils/reportRules.js; the call is utils/reportContent.js.
 */

import { useState } from 'react'
import { X, Flag, Check } from 'lucide-react'
import SheetShell from './SheetShell'
import { useAuth } from '../../hooks/useAuth'
import { reportContent } from '../../utils/reportContent'
import { REPORT_REASONS, REPORT_WORDS, sheetTitle, resultText, endsSheet } from '../../utils/reportRules'

const TEXT = { fontFamily: 'var(--font-body)' }

export function ReportLink({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%', minHeight: 44,
        margin: 'var(--space-2) 0', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13,
        color: 'var(--color-text-tertiary)', WebkitTapHighlightColor: 'transparent', outline: 'none', ...TEXT,
      }}
    >
      <Flag size={14} aria-hidden="true" />
      {REPORT_WORDS.link}
    </button>
  )
}

export default function ReportSheet({ isOpen, onClose, kind, reference }) {
  const { user, signInWithGoogle } = useAuth()
  const [reason, setReason] = useState('')
  // phase: 'choose' | 'sending' | 'finished'; message shows under the list after a try
  const [phase, setPhase] = useState('choose')
  const [message, setMessage] = useState('')
  const [ended, setEnded] = useState(false)

  // Every time the sheet opens it starts fresh.
  const [wasOpen, setWasOpen] = useState(false)
  if (isOpen !== wasOpen) {
    setWasOpen(isOpen)
    if (isOpen) { setReason(''); setPhase('choose'); setMessage(''); setEnded(false) }
  }

  async function send() {
    if (!reason || phase === 'sending') return
    setPhase('sending')
    const r = await reportContent(kind, reference, reason)
    setMessage(resultText(r.status))
    setEnded(endsSheet(r.status))
    setPhase(endsSheet(r.status) ? 'finished' : 'choose')
  }

  let body
  let footer
  if (phase === 'finished') {
    body = (
      <div role="status" style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 15, lineHeight: 1.5, color: 'var(--color-text-primary)', padding: 'var(--space-2) 0', ...TEXT }}>
        <Check size={20} aria-hidden="true" style={{ flexShrink: 0, color: 'var(--color-accent-text)' }} />
        <span>{message}</span>
      </div>
    )
    footer = <button type="button" onClick={onClose} style={primaryButton(false)}>{REPORT_WORDS.done}</button>
  } else if (!user) {
    body = <p style={{ margin: 0, fontSize: 15, lineHeight: 1.5, color: 'var(--color-text-secondary)', ...TEXT }}>{REPORT_WORDS.signIn}</p>
    footer = <button type="button" onClick={() => signInWithGoogle()} style={primaryButton(false)}>{REPORT_WORDS.signInButton}</button>
  } else {
    const sending = phase === 'sending'
    body = (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        <p style={{ margin: 0, fontSize: 15, lineHeight: 1.45, color: 'var(--color-text-secondary)', ...TEXT }}>{REPORT_WORDS.intro}</p>
        <div role="radiogroup" aria-label="Reason" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {REPORT_REASONS.map((r) => {
            const on = reason === r.key
            return (
              <button
                key={r.key}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => !sending && setReason(r.key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, width: '100%', minHeight: 52, padding: '10px 12px', boxSizing: 'border-box',
                  textAlign: 'left', border: on ? '1.5px solid var(--color-accent-solid)' : '1.5px solid transparent',
                  borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-surface-muted)', cursor: 'pointer',
                  fontSize: 15, color: 'var(--color-text-primary)', WebkitTapHighlightColor: 'transparent', outline: 'none', ...TEXT,
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    width: 20, height: 20, borderRadius: '50%', flexShrink: 0, boxSizing: 'border-box',
                    border: on ? '6px solid var(--color-accent-solid)' : '2px solid var(--color-border)', backgroundColor: 'var(--color-surface)',
                  }}
                />
                <span style={{ flex: 1, minWidth: 0 }}>{r.label}</span>
              </button>
            )
          })}
        </div>
        {message && !ended && <p role="alert" style={{ margin: 0, fontSize: 13, lineHeight: 1.4, color: 'var(--color-warning)', ...TEXT }}>{message}</p>}
      </div>
    )
    footer = (
      <button type="button" onClick={send} disabled={!reason || sending} style={primaryButton(!reason || sending)}>
        {sending ? REPORT_WORDS.sending : REPORT_WORDS.send}
      </button>
    )
  }

  return (
    <SheetShell isOpen={isOpen} onClose={onClose} ariaLabel={sheetTitle(kind)} dismissOnlyByBackdrop>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-3)', padding: '0 var(--space-4) var(--space-3)', flexShrink: 0 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text-primary)', ...TEXT }}>{sheetTitle(kind)}</div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          style={{ width: 44, height: 44, borderRadius: '50%', border: 'none', flexShrink: 0, backgroundColor: 'var(--color-surface-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', WebkitTapHighlightColor: 'transparent', outline: 'none' }}
        >
          <X size={20} color="var(--color-text-secondary)" aria-hidden="true" />
        </button>
      </div>
      <div style={{ padding: '0 var(--space-4) var(--space-4)', overflowY: 'auto', flex: 1, minHeight: 0 }}>{body}</div>
      <div style={{ padding: 'var(--space-3) var(--space-4) var(--space-5)', flexShrink: 0 }}>{footer}</div>
    </SheetShell>
  )
}

const primaryButton = (off) => ({
  width: '100%', minHeight: 48, borderRadius: 'var(--radius-md)', border: 'none', cursor: off ? 'default' : 'pointer',
  backgroundColor: 'var(--color-accent-solid)', color: '#fff', fontSize: 15, fontWeight: 600, opacity: off ? 0.55 : 1,
  WebkitTapHighlightColor: 'transparent', outline: 'none', ...TEXT,
})
