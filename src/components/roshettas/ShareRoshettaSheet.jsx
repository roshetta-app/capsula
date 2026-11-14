/**
 * src/components/roshettas/ShareRoshettaSheet.jsx
 * 2026-11-14 (Roshetta plan, step 6.1b): the share sheet of the roshetta page.
 * Modelled on ShareGroupSheet.jsx, without the group colour and the "Show my
 * name" switch (a roshetta link never shows its owner, assumption L).
 *
 * States: loading; not shared yet (Create link); shared (the link, Copy, Share link,
 * Stop sharing); offline ("You're offline. Reconnect to share."); could not check
 * (Try again); not saved online yet (a roshetta made offline that has not been sent).
 *
 * The link is made only when the owner taps Create link, never just by opening the
 * sheet, because the link makes the roshetta's name, description, drugs, doses and
 * text readable by anyone who has it. Stop sharing asks first; the old link stops
 * working at once and sharing again makes a new one.
 *
 * Changes still waiting to be saved are not on the link yet: when there are some,
 * one quiet line says so.
 *
 * Props:
 *   isOpen         boolean
 *   onClose        () => void
 *   roshetta       { id, name }
 *   waiting        true while this roshetta has changes waiting to be sent
 *   onShareChange  (code | null) => void   tells the page whether the roshetta is shared
 */

import { useEffect, useRef, useState } from 'react'
import { X, Eye, PencilOff, UserX, Check, Copy, Share2 } from 'lucide-react'
import SheetShell from '../ui/SheetShell'
import ConfirmSheet from '../ui/ConfirmSheet'
import GroupStateMessage from '../drugs/groups/GroupStateMessage'
import { shimmer } from '../drugs/home/shimmer'
import { useFavouritesContext } from '../../context/FavouritesContext'
import { useToast } from '../../context/ToastContext'
import { buildRoshettaLink, shareRoshetta, copyText } from '../../utils/shareRoshettaLink'

// Read out by a screen reader only; takes no room on screen.
const VISUALLY_HIDDEN = {
  position: 'absolute', width: 1, height: 1, margin: -1, padding: 0, overflow: 'hidden',
  clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap', border: 0,
}

const OFFLINE_SHARE_MESSAGE = "You're offline. Reconnect to share."

const PRIMARY_BUTTON = {
  width: '100%', minHeight: 48, borderRadius: 'var(--radius-md)', border: 'none', cursor: 'pointer',
  backgroundColor: 'var(--color-accent-solid)', color: '#fff', fontSize: 15, fontWeight: 600,
  fontFamily: 'var(--font-body)', WebkitTapHighlightColor: 'transparent', outline: 'none',
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
}

// The same privacy lines before and after the link exists.
const PRIVACY_LINES = [
  { Icon: Eye,       text: 'Anyone with the link can view this roshetta: its name, description, drugs, doses and text.' },
  { Icon: PencilOff, text: "They can't change it." },
  { Icon: UserX,     text: 'Your name is never shown.' },
]

// One line, shortened in the middle: the start of the code and its last 4 characters.
function shortLink(link) {
  const bare = link.replace(/^https?:\/\//, '')
  const i = bare.indexOf('/r/')
  if (i === -1) return bare
  const code = bare.slice(i + 3)
  if (code.length <= 12) return bare
  return `${bare.slice(0, i)}/r/${code.slice(0, 6)}…${code.slice(-4)}`
}

function PrivacyLines() {
  return (
    <ul style={{ listStyle: 'none', margin: '0 0 var(--space-4)', padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
      {PRIVACY_LINES.map(({ Icon, text }) => (
        <li key={text} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <Icon size={18} color="var(--color-text-secondary)" strokeWidth={1.8} aria-hidden="true" style={{ flexShrink: 0, marginTop: 2 }} />
          <span style={{ fontSize: 15, lineHeight: 1.45, color: 'var(--color-text-primary)', fontFamily: 'var(--font-body)' }}>{text}</span>
        </li>
      ))}
    </ul>
  )
}

export default function ShareRoshettaSheet({ isOpen, onClose, roshetta, waiting = false, onShareChange }) {
  const { roshettasApi } = useFavouritesContext()
  const { getRoshettaShareCode, createRoshettaShare, stopRoshettaSharing, showRoshettaReadOnly } = roshettasApi
  const { toast } = useToast()

  // Copy feedback: the Copy button shows a tick and "Copied" for two seconds.
  const [copied, setCopied] = useState(false)
  const copiedTimer = useRef(null)
  function flashCopied() {
    setCopied(true)
    clearTimeout(copiedTimer.current)
    copiedTimer.current = setTimeout(() => setCopied(false), 2000)
  }
  useEffect(() => () => clearTimeout(copiedTimer.current), [])

  // result: null while loading, else { phase: 'none' | 'shared' | 'offline' | 'error' | 'unsent', code? }.
  const [result, setResult] = useState(null)
  const [attempt, setAttempt] = useState(0)
  const [busy, setBusy] = useState(false)
  const [stopOpen, setStopOpen] = useState(false)

  // Every time the sheet opens it asks again, so another device's change shows.
  const [wasOpen, setWasOpen] = useState(false)
  if (isOpen !== wasOpen) {
    setWasOpen(isOpen)
    if (isOpen) { setResult(null); setCopied(false) }
  }

  const roshettaId = roshetta?.id
  useEffect(() => {
    if (!isOpen || !roshettaId) return
    let cancelled = false
    ;(async () => {
      const r = await getRoshettaShareCode(roshettaId)
      if (cancelled) return
      if (r.ok) {
        setResult(r.code ? { phase: 'shared', code: r.code } : { phase: 'none' })
        onShareChange?.(r.code ?? null)
      } else {
        setResult({ phase: r.reason === 'offline' ? 'offline' : 'error' })
      }
    })()
    return () => { cancelled = true }
    // onShareChange is a plain callback from the page; it is not a reason to ask again.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, roshettaId, attempt, getRoshettaShareCode])

  function retry() {
    setResult(null)
    setAttempt(a => a + 1)
  }

  async function handleCreate() {
    if (busy || !roshetta) return
    setBusy(true)
    try {
      const r = await createRoshettaShare(roshetta.id)
      if (r.ok) {
        setResult({ phase: 'shared', code: r.code })
        onShareChange?.(r.code)
      } else if (r.reason === 'offline') {
        setResult({ phase: 'offline' })
      } else if (r.reason === 'not_sent') {
        setResult({ phase: 'unsent' })
      } else if (r.reason === 'read_only') {
        showRoshettaReadOnly()
      }
      // Any other refusal: the hook already showed its own message; the sheet stays as it was.
    } finally {
      setBusy(false)
    }
  }

  async function handleCopy(code) {
    const ok = await copyText(buildRoshettaLink(code))
    if (ok) flashCopied()
    else toast.error("Couldn't copy the link.")
  }

  async function handleShare(code) {
    const res = await shareRoshetta(roshetta?.name, code)
    if (res === 'copied') flashCopied()
    else if (res === 'failed') toast.error("Couldn't share the link.")
  }

  // Throws on failure so the question stays open with its own failure line.
  async function handleStop() {
    const r = await stopRoshettaSharing(roshetta.id)
    if (!r.ok) throw new Error(r.reason ?? 'error')
    setResult({ phase: 'none' })
    onShareChange?.(null)
    toast.success('Sharing stopped. The old link no longer works.')
  }

  let body
  if (!result) {
    body = (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 'var(--space-2) 0' }}>
        <div style={shimmer({ width: '90%', height: 14 })} />
        <div style={shimmer({ width: '100%', height: 44 })} />
      </div>
    )
  } else if (result.phase === 'offline') {
    body = <GroupStateMessage title={OFFLINE_SHARE_MESSAGE} actionLabel="Try again" onAction={retry} />
  } else if (result.phase === 'error') {
    body = <GroupStateMessage title="Couldn't check this roshetta's link" actionLabel="Try again" onAction={retry} />
  } else if (result.phase === 'unsent') {
    body = (
      <GroupStateMessage
        title="This roshetta isn't saved online yet"
        body="Reconnect and wait for it to save, then share it."
        actionLabel="Try again"
        onAction={retry}
      />
    )
  } else if (result.phase === 'none') {
    body = (
      <>
        <PrivacyLines />
        <button onClick={handleCreate} disabled={busy} style={{ ...PRIMARY_BUTTON, opacity: busy ? 0.7 : 1 }}>
          {busy ? 'Creating…' : 'Create link'}
        </button>
      </>
    )
  } else {
    const link = buildRoshettaLink(result.code)
    body = (
      <>
        <PrivacyLines />

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 'var(--space-2)' }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 10px', borderRadius: 'var(--radius-full)',
            backgroundColor: 'var(--color-success-light)', color: 'var(--color-success)',
            fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-body)',
          }}>
            <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: 'var(--color-success)' }} />
            Link is on
          </span>
        </div>

        <div style={{
          display: 'flex', alignItems: 'center', gap: 'var(--space-2)', padding: '4px 4px 4px 12px',
          marginBottom: 'var(--space-3)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-surface-muted)',
        }}>
          <span dir="ltr" title={link} style={{
            flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            fontSize: 14, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-body)',
          }}>
            {shortLink(link)}
          </span>
          <button
            onClick={() => handleCopy(result.code)}
            aria-label={copied ? 'Link copied' : 'Copy link'}
            style={{
              flexShrink: 0, minHeight: 44, minWidth: 88, padding: '0 14px', borderRadius: 'var(--radius-md)', border: 'none',
              cursor: 'pointer', backgroundColor: 'var(--color-surface)', color: copied ? 'var(--color-success)' : 'var(--color-text-primary)',
              fontSize: 14, fontWeight: 600, fontFamily: 'var(--font-body)', WebkitTapHighlightColor: 'transparent', outline: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
          >
            {copied
              ? <><Check size={16} strokeWidth={2.6} aria-hidden="true" />Copied</>
              : <><Copy size={16} strokeWidth={2} aria-hidden="true" />Copy</>}
          </button>
          <span role="status" aria-live="polite" style={VISUALLY_HIDDEN}>{copied ? 'Link copied' : ''}</span>
        </div>

        {waiting && (
          <p style={{ margin: '0 0 var(--space-3)', fontSize: 13, lineHeight: 1.45, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-body)' }}>
            Changes waiting to be saved will show on the link once they are saved.
          </p>
        )}

        <button onClick={() => handleShare(result.code)} style={PRIMARY_BUTTON}>
          <Share2 size={18} strokeWidth={2} aria-hidden="true" />
          Share link
        </button>

        <div style={{ marginTop: 'var(--space-4)', paddingTop: 'var(--space-2)', borderTop: '1px solid var(--color-border)', textAlign: 'center' }}>
          <button
            onClick={() => setStopOpen(true)}
            style={{
              display: 'block', width: '100%', minHeight: 44, background: 'none', border: 'none', cursor: 'pointer',
              padding: '8px 12px', fontSize: 15, fontWeight: 600, color: 'var(--color-danger)',
              fontFamily: 'var(--font-body)', WebkitTapHighlightColor: 'transparent', outline: 'none',
            }}
          >
            Stop sharing
          </button>
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.45, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-body)' }}>
            The link stops working at once. Copies people already saved are kept.
          </p>
        </div>
      </>
    )
  }

  return (
    <>
      <SheetShell isOpen={isOpen} onClose={onClose} ariaLabel="Share roshetta">
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-3)',
          padding: '0 var(--space-4) var(--space-3)', flexShrink: 0,
        }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text-primary)', fontFamily: 'var(--font-body)' }}>
              Share roshetta
            </div>
            <div style={{ marginTop: 2 }}>
              <span dir="auto" style={{
                display: 'block', fontSize: 14, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-body)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {roshetta?.name}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              width: 44, height: 44, borderRadius: '50%', border: 'none', flexShrink: 0,
              backgroundColor: 'var(--color-surface-muted)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              WebkitTapHighlightColor: 'transparent', outline: 'none',
            }}
          >
            <X size={20} color="var(--color-text-secondary)" aria-hidden="true" />
          </button>
        </div>
        <div style={{ padding: '0 var(--space-4) var(--space-5)' }}>{body}</div>
      </SheetShell>

      <ConfirmSheet
        isOpen={stopOpen}
        onClose={() => setStopOpen(false)}
        onConfirm={handleStop}
        title="Stop sharing?"
        message="The link will stop working at once. Sharing again makes a new link."
        confirmLabel="Stop sharing"
        confirmingLabel={'Stopping…'}
        destructive
      />
    </>
  )
}
