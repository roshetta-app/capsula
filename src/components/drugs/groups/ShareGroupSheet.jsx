/**
 * src/components/drugs/groups/ShareGroupSheet.jsx
 * 2026-10-19 (Drug groups plan, step 8.1): the share sheet of the group page.
 *
 * States (plan section 5, Sharing): loading; not shared yet (Create link);
 * shared (the link, Copy, Share link, Stop sharing); offline ("You're offline.
 * Reconnect to share."); could not check (Retry).
 *
 * The link is made only when the owner taps Create link, never just by opening
 * the sheet, because the link makes the group's name, description and drugs
 * readable by anyone who has it. Stop sharing asks first; the old link stops
 * working at once and sharing again makes a new one.
 *
 * Props:
 *   isOpen         boolean
 *   onClose        () => void
 *   group          { id, name }
 *   onShareChange  (code | null) => void   tells the page whether the group is shared
 */

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import SheetShell from '../../ui/SheetShell'
import ConfirmSheet from '../../ui/ConfirmSheet'
import GroupStateMessage from './GroupStateMessage'
import { shimmer } from '../home/shimmer'
import { useFavouritesContext } from '../../../context/FavouritesContext'
import { useToast } from '../../../context/ToastContext'
import { buildGroupLink, shareGroup, copyText } from '../../../utils/shareGroupLink'

const OFFLINE_SHARE_MESSAGE = "You're offline. Reconnect to share."

const BODY_TEXT = {
  margin: '0 0 var(--space-4)', fontSize: 14, lineHeight: 1.55,
  color: 'var(--color-text-secondary)', fontFamily: 'var(--font-body)',
}
const PRIMARY_BUTTON = {
  flex: 1, minHeight: 44, borderRadius: 'var(--radius-md)', border: 'none', cursor: 'pointer',
  backgroundColor: 'var(--color-accent)', color: '#fff', fontSize: 14, fontWeight: 600,
  fontFamily: 'var(--font-body)', WebkitTapHighlightColor: 'transparent', outline: 'none',
}
const SECONDARY_BUTTON = {
  ...PRIMARY_BUTTON,
  backgroundColor: 'var(--color-surface-muted)', color: 'var(--color-text-primary)',
}

export default function ShareGroupSheet({ isOpen, onClose, group, onShareChange }) {
  const { getShareCode, createShareLink, stopSharing } = useFavouritesContext()
  const { toast } = useToast()

  // result: null while loading, else { phase: 'none' | 'shared' | 'offline' | 'error', code? }.
  const [result, setResult] = useState(null)
  const [attempt, setAttempt] = useState(0)
  const [busy, setBusy] = useState(false)
  const [stopOpen, setStopOpen] = useState(false)

  // Every time the sheet opens it asks again, so another device's change shows.
  const [wasOpen, setWasOpen] = useState(false)
  if (isOpen !== wasOpen) {
    setWasOpen(isOpen)
    if (isOpen) setResult(null)
  }

  const groupId = group?.id
  useEffect(() => {
    if (!isOpen || !groupId) return
    let cancelled = false
    ;(async () => {
      const r = await getShareCode(groupId)
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
  }, [isOpen, groupId, attempt, getShareCode])

  function retry() {
    setResult(null)
    setAttempt(a => a + 1)
  }

  async function handleCreate() {
    if (busy || !group) return
    setBusy(true)
    try {
      const r = await createShareLink(group.id)
      if (r.ok) {
        setResult({ phase: 'shared', code: r.code })
        onShareChange?.(r.code)
      } else if (r.reason === 'offline') {
        setResult({ phase: 'offline' })
      } else if (r.reason === 'read_only') {
        toast.info('Your groups are read only. Delete a group or upgrade to edit.')
      }
    } finally {
      setBusy(false)
    }
  }

  async function handleCopy(code) {
    const ok = await copyText(buildGroupLink(code))
    if (ok) toast.success('Link copied. Paste it in any chat.')
    else toast.error("Couldn't copy the link.")
  }

  async function handleShare(code) {
    const res = await shareGroup(group?.name, code)
    if (res === 'copied') toast.success('Link copied. Paste it in any chat.')
    else if (res === 'failed') toast.error("Couldn't share the link.")
  }

  // Throws on failure so the question stays open with its own failure line.
  async function handleStop() {
    const r = await stopSharing(group.id)
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
    body = <GroupStateMessage title={OFFLINE_SHARE_MESSAGE} actionLabel="Retry" onAction={retry} />
  } else if (result.phase === 'error') {
    body = <GroupStateMessage title="Couldn't check this group's link" actionLabel="Retry" onAction={retry} />
  } else if (result.phase === 'none') {
    body = (
      <>
        <p style={BODY_TEXT}>
          Make a link and anyone who has it can view this group, with its name, description and
          drugs. They cannot change it, and your name is never shown.
        </p>
        <div style={{ display: 'flex' }}>
          <button onClick={handleCreate} disabled={busy} style={{ ...PRIMARY_BUTTON, opacity: busy ? 0.7 : 1 }}>
            {busy ? 'Creating\u2026' : 'Create link'}
          </button>
        </div>
      </>
    )
  } else {
    const link = buildGroupLink(result.code)
    body = (
      <>
        <p style={BODY_TEXT}>
          Anyone with this link can view the group. They cannot change it, and your name is never shown.
        </p>
        <div
          dir="ltr"
          style={{
            padding: '10px 12px', marginBottom: 'var(--space-3)', borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--color-surface-muted)', fontSize: 12, lineHeight: 1.4,
            color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono, monospace)',
            wordBreak: 'break-all', userSelect: 'all',
          }}
        >
          {link}
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <button onClick={() => handleCopy(result.code)} style={SECONDARY_BUTTON}>Copy</button>
          <button onClick={() => handleShare(result.code)} style={PRIMARY_BUTTON}>Share link</button>
        </div>
        <button
          onClick={() => setStopOpen(true)}
          style={{
            display: 'block', margin: 'var(--space-4) auto 0', background: 'none', border: 'none', cursor: 'pointer',
            padding: '8px 12px', fontSize: 14, fontWeight: 600, color: 'var(--color-danger)',
            fontFamily: 'var(--font-body)', WebkitTapHighlightColor: 'transparent', outline: 'none',
          }}
        >
          Stop sharing
        </button>
      </>
    )
  }

  return (
    <>
      <SheetShell isOpen={isOpen} onClose={onClose} ariaLabel="Share group">
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-3)',
          padding: '0 var(--space-4) var(--space-3)', flexShrink: 0,
        }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--color-text-primary)', fontFamily: 'var(--font-body)' }}>
              Share group
            </div>
            <div dir="ltr" style={{
              fontSize: 12, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-body)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {group?.name}
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              width: 36, height: 36, borderRadius: '50%', border: 'none', flexShrink: 0,
              backgroundColor: 'var(--color-surface-muted)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              WebkitTapHighlightColor: 'transparent', outline: 'none',
            }}
          >
            <X size={18} color="var(--color-text-secondary)" aria-hidden="true" />
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
        confirmingLabel={'Stopping\u2026'}
        destructive
      />
    </>
  )
}
