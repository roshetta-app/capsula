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
 * 2026-10-21 (step 13.4, F2 to F6): redrawn.
 *   - The same three privacy lines in both states (anyone with the link can view the
 *     name, description and drugs; they can't change it; your name is never shown),
 *     in the main text colour, with a small icon each (F3, F6).
 *   - Title at the left, the group's colour dot next to its name, a 44 px close (F6).
 *   - Shared: a green "Link is on" status (F4), the link on ONE line shortened in the
 *     middle with Copy inside the line (F2, F4), and Share link as the one main button.
 *     Copy turns into a "Copied" tick for two seconds instead of a floating message.
 *   - Stop sharing is a 44 px red text button at the very end under a thin line, with
 *     one line under it: the link stops working and saved copies are kept (F5). Its
 *     question ("Stop sharing?") is unchanged.
 *
 * 2026-11-03 (optional owner name): a "Show my name" switch under the privacy lines, in both states.
 * Off means anonymous (the default). On shows "Shared by <profile name>" on the shared page. The
 * choice is saved with the link: before the link exists it is kept in the sheet and saved when
 * Create link is tapped; after, each tap on the switch saves at once (and puts it back with a
 * message if it could not be saved). With no name in the profile the switch is off and disabled,
 * with "Add your name in Account first.". The first value comes from the Account setting.
 *
 * 2026-11-21 (Phase L, step 13.3): the row is now the shared ShareNameRow component with the
 * refined words ("Created by <name>" when on, "Anonymous" when off, "Add your name in Account").
 * The shared page reads "Created by" now, not "Shared by".
 *
 * 2026-11-22 (Public profile plan, step 14.5a): the Private / Public choice, the same as the roshetta
 * sheet. No link yet = Private; Public asks "Make it public to share it?" (what it shows, the copy
 * notice) and makes the link already on the owner's profile (name always shown, so no name switch for
 * it; with no username yet: "Set up your public profile first.", the setup sheet is step 14.5b).
 * Public = the link plus Private, which asks first and says honestly what stops. An old link (made
 * before the profile) is tagged "Old link", keeps the name switch and Stop sharing, and has Make
 * public (same link). A web address or phone number in the name or description refuses Make public.
 *
 * Props:
 *   isOpen         boolean
 *   onClose        () => void
 *   group          { id, name, color }
 *   onShareChange  (code | null) => void   tells the page whether the group is shared
 */

import { useEffect, useRef, useState } from 'react'
import { X, Eye, PencilOff, Check, Copy, Share2 } from 'lucide-react'
import SheetShell from '../../ui/SheetShell'
import ConfirmSheet from '../../ui/ConfirmSheet'
import GroupStateMessage from './GroupStateMessage'
import ShareNameRow from './ShareNameRow'
import { VisibilityRow, OldLinkTag, MakePublicPanel } from '../../ui/PublicShareParts'
import { shareMode, canMakePublic, isItemRefusal, MAKE_PRIVATE_MESSAGE } from '../../../utils/publicShare'
import { shimmer } from '../home/shimmer'
import { useFavouritesContext } from '../../../context/FavouritesContext'
import { useToast } from '../../../context/ToastContext'
import { buildGroupLink, shareGroup, copyText } from '../../../utils/shareGroupLink'
import { resolveToken } from '../../../utils/specialtyTokens'
import { useIsDark } from '../../../utils/specialtyIcon'

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

// The same three privacy lines before and after the link exists (F3).
const PRIVACY_LINES = [
  { Icon: Eye,       text: 'Anyone with the link can view this group: its name, description and drugs.' },
  { Icon: PencilOff, text: "They can't change it." },
]

// One line, shortened in the middle: the start of the code and its last 4 characters.
function shortLink(link) {
  const bare = link.replace(/^https?:\/\//, '')
  const i = bare.indexOf('/g/')
  if (i === -1) return bare
  const code = bare.slice(i + 3)
  if (code.length <= 12) return bare
  return `${bare.slice(0, i)}/g/${code.slice(0, 6)}\u2026${code.slice(-4)}`
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

export default function ShareGroupSheet({ isOpen, onClose, group, onShareChange }) {
  const { getShareCode, getShareNameInfo, setShareName, createShareLink, stopSharing, makeGroupPublic, showGroupReadOnly } = useFavouritesContext()
  const { toast } = useToast()
  const isDark = useIsDark()
  const dot = resolveToken(group?.color, isDark).pill

  // Copy feedback: the Copy button shows a tick and "Copied" for two seconds.
  const [copied, setCopied] = useState(false)
  const copiedTimer = useRef(null)
  function flashCopied() {
    setCopied(true)
    clearTimeout(copiedTimer.current)
    copiedTimer.current = setTimeout(() => setCopied(false), 2000)
  }
  useEffect(() => () => clearTimeout(copiedTimer.current), [])

  // result: null while loading, else { phase: 'none' | 'shared' | 'offline' | 'error', code? }.
  const [result, setResult] = useState(null)
  // The "Make it public to share it?" panel, and the reason the database gave if it refused.
  const [askOpen, setAskOpen] = useState(false)
  const [refusal, setRefusal] = useState(null)
  const [attempt, setAttempt] = useState(0)
  const [busy, setBusy] = useState(false)
  const [stopOpen, setStopOpen] = useState(false)
  // nameInfo: null until known (or when it could not be read: then the switch is left out),
  // else { fullName, accountDefault }. showName: the switch for this group.
  const [nameInfo, setNameInfo] = useState(null)
  const [showName, setShowName] = useState(false)

  // Every time the sheet opens it asks again, so another device's change shows.
  const [wasOpen, setWasOpen] = useState(false)
  if (isOpen !== wasOpen) {
    setWasOpen(isOpen)
    if (isOpen) { setResult(null); setCopied(false); setAskOpen(false); setRefusal(null) }
  }

  const groupId = group?.id
  useEffect(() => {
    if (!isOpen || !groupId) return
    let cancelled = false
    ;(async () => {
      const [r, info] = await Promise.all([getShareCode(groupId), getShareNameInfo()])
      if (cancelled) return
      if (r.ok && info.ok) {
        setNameInfo({ fullName: info.fullName, accountDefault: info.accountDefault, hasHandle: info.hasHandle === true })
        setShowName(r.showName ?? info.accountDefault)
        setResult(r.code ? { phase: 'shared', code: r.code, onProfile: r.onProfile === true } : { phase: 'none' })
        onShareChange?.(r.code ?? null)
      } else {
        // Whether the owner has a username decides what Public may do, so it must be known.
        const reason = !r.ok ? r.reason : info.reason
        setResult({ phase: reason === 'offline' ? 'offline' : 'error' })
      }
    })()
    return () => { cancelled = true }
    // onShareChange is a plain callback from the page; it is not a reason to ask again.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, groupId, attempt, getShareCode, getShareNameInfo])

  function retry() {
    setResult(null)
    setAttempt(a => a + 1)
  }

  // Make public: a new link already on the profile, or an old link moved onto it (same code).
  async function handleMakePublic() {
    if (busy || !group) return
    setBusy(true)
    setRefusal(null)
    try {
      const old = result?.phase === 'shared'
      const r = old ? await makeGroupPublic(group.id) : await createShareLink(group.id, undefined, true)
      if (r.ok) {
        const code = old ? result.code : r.code
        setResult({ phase: 'shared', code, onProfile: true })
        setAskOpen(false)
        onShareChange?.(code)
      } else if (isItemRefusal(r.reason)) {
        setRefusal(r.reason)
      } else if (r.reason === 'offline') {
        setResult({ phase: 'offline' })
      } else if (r.reason === 'read_only') {
        showGroupReadOnly()
      } else if (old) {
        toast.error("Couldn't make it public. Try again.")
      }
    } finally {
      setBusy(false)
    }
  }

  // Before the link exists the choice is only kept here (Create link saves it). After, it is saved
  // at once; if that fails the switch goes back and says why.
  async function handleNameToggle(next) {
    if (!nameInfo) return
    const before = showName
    setShowName(next)
    if (result?.phase !== 'shared') return
    const r = await setShareName(group.id, next)
    if (r.ok) return
    setShowName(before)
    if (r.reason === 'read_only') showGroupReadOnly()
    else if (r.reason === 'offline') toast.error(OFFLINE_SHARE_MESSAGE)
    else toast.error("Couldn't save that. Try again.")
  }

  async function handleCopy(code) {
    const ok = await copyText(buildGroupLink(code))
    if (ok) flashCopied()
    else toast.error("Couldn't copy the link.")
  }

  async function handleShare(code) {
    const res = await shareGroup(group?.name, code)
    if (res === 'copied') flashCopied()
    else if (res === 'failed') toast.error("Couldn't share the link.")
  }

  // Throws on failure so the question stays open with its own failure line.
  async function handleStop() {
    const r = await stopSharing(group.id)
    if (!r.ok) throw new Error(r.reason ?? 'error')
    const wasPublic = result?.onProfile === true
    setResult({ phase: 'none' })
    setAskOpen(false)
    onShareChange?.(null)
    toast.success(wasPublic ? 'Now private. The link no longer works for new visits.' : 'Sharing stopped. The old link no longer works.')
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
    body = <GroupStateMessage title="Couldn't check this group's link" actionLabel="Try again" onAction={retry} />
  } else if (result.phase === 'none') {
    body = (
      <>
        <VisibilityRow mode="private" disabled={busy} onChoosePublic={() => { setRefusal(null); setAskOpen(true) }} />
        {askOpen ? (
          <MakePublicPanel
            kind="group"
            canSetUp={canMakePublic(nameInfo?.hasHandle)}
            busy={busy}
            refusal={refusal}
            onConfirm={handleMakePublic}
            onCancel={() => { setAskOpen(false); setRefusal(null) }}
          />
        ) : (
          <p style={{ margin: 0, fontSize: 15, lineHeight: 1.45, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-body)' }}>
            Only you can see this group. It has no link. Choose Public to share it.
          </p>
        )}
      </>
    )
  } else if (shareMode(result.code, result.onProfile) === 'old' && askOpen) {
    body = (
      <MakePublicPanel
        kind="group"
        old
        canSetUp={canMakePublic(nameInfo?.hasHandle)}
        busy={busy}
        refusal={refusal}
        onConfirm={handleMakePublic}
        onCancel={() => { setAskOpen(false); setRefusal(null) }}
      />
    )
  } else {
    const mode = shareMode(result.code, result.onProfile)
    const link = buildGroupLink(result.code)
    body = (
      <>
        {mode === 'public' && <VisibilityRow mode="public" onChoosePrivate={() => setStopOpen(true)} />}
        <PrivacyLines />
        {mode === 'old' && nameInfo && <ShareNameRow fullName={nameInfo.fullName} checked={showName} onChange={handleNameToggle} label="Show my name on this shared group" />}

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 'var(--space-2)' }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 10px', borderRadius: 'var(--radius-full)',
            backgroundColor: 'var(--color-success-light)', color: 'var(--color-success)',
            fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-body)',
          }}>
            <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: 'var(--color-success)' }} />
            Link is on
          </span>
          {mode === 'old' && <OldLinkTag />}
        </div>
        {mode === 'public' && (
          <p style={{ margin: '0 0 var(--space-3)', fontSize: 13, lineHeight: 1.45, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-body)' }}>
            Shown on your public profile with your name.
          </p>
        )}

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

        <button onClick={() => handleShare(result.code)} style={PRIMARY_BUTTON}>
          <Share2 size={18} strokeWidth={2} aria-hidden="true" />
          Share link
        </button>

        {mode === 'old' && (
          <>
            <button
              type="button"
              onClick={() => { setRefusal(null); setAskOpen(true) }}
              style={{ ...PRIMARY_BUTTON, marginTop: 'var(--space-2)', backgroundColor: 'var(--color-surface-muted)', color: 'var(--color-text-primary)' }}
            >
              Make public
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
        )}
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
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text-primary)', fontFamily: 'var(--font-body)' }}>
              Share group
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
              <span aria-hidden="true" style={{ width: 10, height: 10, borderRadius: '50%', flexShrink: 0, backgroundColor: dot }} />
              <span dir="auto" style={{
                fontSize: 14, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-body)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {group?.name}
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
        title={result?.onProfile === true ? 'Make private?' : 'Stop sharing?'}
        message={result?.onProfile === true ? MAKE_PRIVATE_MESSAGE : 'The link will stop working at once. Sharing again makes a new link.'}
        confirmLabel={result?.onProfile === true ? 'Make private' : 'Stop sharing'}
        confirmingLabel={result?.onProfile === true ? 'Making private\u2026' : 'Stopping\u2026'}
        destructive
      />
    </>
  )
}
