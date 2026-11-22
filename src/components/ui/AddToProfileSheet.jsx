/**
 * src/components/ui/AddToProfileSheet.jsx
 * 2026-11-22 (Public profile plan, step 14.5c): the Add to profile picker. A list of the person's private
 * roshettas and drug groups (two tabs) with tick boxes and one Make public button. It is opened from the
 * Profile tab and from its empty tab (those screens come in 14.7); nothing opens it yet.
 *
 *   - First tap with no public card: the setup sheet (14.5b) opens first, then the picker carries on.
 *   - One copy notice for the whole batch.
 *   - An item with a web address or phone number in its name or description stays private and is listed with
 *     the reason; the others still go through.
 *   - Newest 50 per tab, with the true total in the tab and the line "Showing the newest 50 of N".
 *   - Making public is one item at a time; a lost connection ends the batch at once and says how many are left.
 *
 * Props:
 *   isOpen, onClose
 *   roshettas   { id, name, description, updatedAt?, createdAt? }[]     the person's roshettas
 *   groups      { id, name, description, createdAt }[]                  the person's drug groups
 *   publishRoshetta (id) => Promise<{ ok, reason? }>   makes one roshetta public (a new link already on the profile)
 *   publishGroup    (id) => Promise<{ ok, reason? }>   the same for a group
 *   initialTab  'roshettas' (default) | 'groups'
 *   onChanged   (madeCount) => void   called after a batch that made something public, so the page can refresh
 *
 * The rules and the wording live in utils/addToProfile.js; the data comes through hooks/usePublicProfile.js.
 */

import { useEffect, useRef, useState } from 'react'
import { X, Check, Lock } from 'lucide-react'
import SheetShell from './SheetShell'
import PublicSetupSheet from './PublicSetupSheet'
import GroupStateMessage from '../drugs/groups/GroupStateMessage'
import { shimmer } from '../drugs/home/shimmer'
import { usePublicProfile } from '../../hooks/usePublicProfile'
import { publicCardSetUp } from '../../utils/profileRules'
import {
  PICKER_TITLE, PICKER_INTRO, PICKER_COPY_NOTICE, STAYS_PRIVATE_REASON,
  candidateList, capLine, togglePick, pickedCount, runBatch, mergeBatches, batchSummary,
} from '../../utils/addToProfile'

const TEXT = { fontFamily: 'var(--font-body)' }
const EMPTY_BATCH = { made: [], stayed: [], unsent: [], stopped: null, left: 0 }
const NONE = { roshettas: [], groups: [] }

function Row({ item, checked, onToggle, blockedReason }) {
  const blocked = Boolean(blockedReason)
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={blocked ? false : checked}
      aria-disabled={blocked}
      onClick={blocked ? undefined : onToggle}
      style={{
        display: 'flex', alignItems: 'center', gap: 12, width: '100%', minHeight: 56, padding: '10px 12px', boxSizing: 'border-box',
        textAlign: 'left', border: 'none', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-surface-muted)',
        cursor: blocked ? 'default' : 'pointer', opacity: blocked ? 0.75 : 1, WebkitTapHighlightColor: 'transparent', outline: 'none', ...TEXT,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 24, height: 24, borderRadius: 7, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: checked && !blocked ? 'none' : '1.5px solid var(--color-border)',
          backgroundColor: checked && !blocked ? 'var(--color-accent-solid)' : 'var(--color-surface)',
        }}
      >
        {blocked
          ? <Lock size={13} color="var(--color-text-secondary)" strokeWidth={2} />
          : checked ? <Check size={16} color="#fff" strokeWidth={3} /> : null}
      </span>
      <span style={{ minWidth: 0, flex: 1 }}>
        <span dir="auto" style={{ display: 'block', fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {item.name || 'Untitled'}
        </span>
        {blocked && (
          <span style={{ display: 'block', marginTop: 2, fontSize: 12, lineHeight: 1.35, color: 'var(--color-danger)' }}>{blockedReason}</span>
        )}
      </span>
    </button>
  )
}

export default function AddToProfileSheet({
  isOpen, onClose, roshettas, groups, publishRoshetta, publishGroup, initialTab = 'roshettas', onChanged,
}) {
  const { loadProfile, loadSharedIds } = usePublicProfile()

  // phase: 'loading' | 'setup' | 'ready' | 'working' | 'result' | 'offline' | 'signedout' | 'error'
  const [phase, setPhase] = useState('loading')
  const [tab, setTab] = useState(initialTab === 'groups' ? 'groups' : 'roshettas')
  const [shared, setShared] = useState({ roshettas: new Set(), groups: new Set() })
  const [picked, setPicked] = useState(NONE)
  const [summary, setSummary] = useState(null)
  const [attempt, setAttempt] = useState(0)

  // Every time the picker opens it starts fresh and asks the database again.
  const [wasOpen, setWasOpen] = useState(false)
  if (isOpen !== wasOpen) {
    setWasOpen(isOpen)
    if (isOpen) {
      setPhase('loading'); setPicked(NONE); setSummary(null)
      setTab(initialTab === 'groups' ? 'groups' : 'roshettas')
    }
  }

  const onChangedRef = useRef(onChanged)
  useEffect(() => { onChangedRef.current = onChanged }, [onChanged])

  useEffect(() => {
    if (!isOpen) return
    let cancelled = false
    ;(async () => {
      const [p, s] = await Promise.all([loadProfile(), loadSharedIds()])
      if (cancelled) return
      const failed = !p.ok ? p : !s.ok ? s : null
      if (failed) {
        setPhase(failed.code === 'not_signed_in' ? 'signedout' : failed.kind === 'retry' ? 'offline' : 'error')
        return
      }
      setShared({ roshettas: s.roshettas, groups: s.groups })
      // No public card yet: the setup sheet comes first, then the picker carries on.
      setPhase(publicCardSetUp(p.profile) ? 'ready' : 'setup')
    })()
    return () => { cancelled = true }
  }, [isOpen, attempt, loadProfile, loadSharedIds])

  function retry() { setPhase('loading'); setAttempt((a) => a + 1) }

  const offer = {
    roshettas: candidateList(roshettas, shared.roshettas),
    groups: candidateList(groups, shared.groups),
  }
  const current = offer[tab]
  const shownCount = current.ok.length + current.blocked.length
  const count = pickedCount(picked)

  async function makePublic() {
    if (phase !== 'ready' || count === 0) return
    setPhase('working')
    const first = await runBatch(picked.roshettas, publishRoshetta)
    // A stopped batch (no connection, read only) is not carried on into the groups.
    const second = first.stopped ? EMPTY_BATCH : await runBatch(picked.groups, publishGroup)
    const left = first.stopped ? { ...first, left: first.left + picked.groups.length } : first
    const result = mergeBatches(left, second)
    setShared((s) => ({
      roshettas: new Set([...s.roshettas, ...result.made.filter((id) => picked.roshettas.includes(id))]),
      groups: new Set([...s.groups, ...result.made.filter((id) => picked.groups.includes(id))]),
    }))
    setPicked(NONE)
    setSummary(batchSummary(result))
    setPhase('result')
    if (result.made.length > 0) onChangedRef.current?.(result.made.length)
  }

  let body
  let footer = null
  if (phase === 'loading') {
    body = (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 'var(--space-2) 0' }}>
        <div style={shimmer({ width: '100%', height: 44 })} />
        <div style={shimmer({ width: '100%', height: 56 })} />
        <div style={shimmer({ width: '100%', height: 56 })} />
      </div>
    )
  } else if (phase === 'offline') {
    body = <GroupStateMessage title="No connection" body="Connect to add items to your profile." actionLabel="Try again" onAction={retry} />
  } else if (phase === 'signedout') {
    body = <GroupStateMessage title="Sign in first." />
  } else if (phase === 'error') {
    body = <GroupStateMessage title="Couldn't open your list" actionLabel="Try again" onAction={retry} />
  } else if (phase === 'result') {
    body = (
      <div role="status" style={{ fontSize: 15, lineHeight: 1.5, color: 'var(--color-text-primary)', padding: 'var(--space-2) 0', ...TEXT }}>
        {summary?.text}
      </div>
    )
    footer = (
      <div>
        <button type="button" onClick={onClose} style={primaryButton(false)}>Done</button>
        {!summary?.allDone && (
          <button type="button" onClick={() => setPhase('ready')} style={textButton}>Back to the list</button>
        )}
      </div>
    )
  } else {
    // 'ready' and 'working' show the same list; the button says Adding while working.
    const working = phase === 'working'
    const line = capLine(shownCount, current.total)
    body = (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        <p style={{ margin: 0, fontSize: 15, lineHeight: 1.45, color: 'var(--color-text-secondary)', ...TEXT }}>{PICKER_INTRO}</p>

        <div role="tablist" aria-label="What to add" style={{ display: 'flex', gap: 4, padding: 4, borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-surface-muted)' }}>
          {[['roshettas', 'Roshettas'], ['groups', 'Drug groups']].map(([key, label]) => {
            const on = tab === key
            return (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => setTab(key)}
                style={{
                  flex: 1, minHeight: 40, border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 14, fontWeight: 600,
                  backgroundColor: on ? 'var(--color-surface)' : 'transparent', color: on ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                  WebkitTapHighlightColor: 'transparent', outline: 'none', ...TEXT,
                }}
              >
                {label} ({offer[key].total})
              </button>
            )
          })}
        </div>

        {current.total === 0 ? (
          <GroupStateMessage title={tab === 'groups' ? 'No private drug groups to add' : 'No private roshettas to add'} body="Everything here is already shared, or you have none yet." />
        ) : (
          <div role="group" aria-label={tab === 'groups' ? 'Private drug groups' : 'Private roshettas'} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {current.ok.map((item) => (
              <Row key={item.id} item={item} checked={picked[tab].includes(item.id)} onToggle={() => !working && setPicked((p) => togglePick(p, tab, item.id))} />
            ))}
            {current.blocked.map((item) => (
              <Row key={item.id} item={item} checked={false} blockedReason={STAYS_PRIVATE_REASON} />
            ))}
            {line && <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--color-text-secondary)', textAlign: 'center', ...TEXT }}>{line}</p>}
          </div>
        )}
      </div>
    )
    footer = (
      <div>
        <p style={{ margin: '0 0 var(--space-3)', fontSize: 13, lineHeight: 1.4, color: 'var(--color-text-secondary)', ...TEXT }}>{PICKER_COPY_NOTICE}</p>
        <button type="button" onClick={makePublic} disabled={working || count === 0} style={primaryButton(working || count === 0)}>
          {working ? 'Adding…' : count > 0 ? `Make public (${count})` : 'Make public'}
        </button>
      </div>
    )
  }

  return (
    <>
      <PublicSetupSheet
        isOpen={isOpen && phase === 'setup'}
        onClose={onClose}
        onDone={() => setPhase('ready')}
        actionLabel="Continue"
      />
      <SheetShell isOpen={isOpen && phase !== 'setup'} onClose={onClose} ariaLabel={PICKER_TITLE} dismissOnlyByBackdrop>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-3)', padding: '0 var(--space-4) var(--space-3)', flexShrink: 0 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text-primary)', ...TEXT }}>{PICKER_TITLE}</div>
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
        {footer && <div style={{ padding: 'var(--space-3) var(--space-4) var(--space-5)', flexShrink: 0 }}>{footer}</div>}
      </SheetShell>
    </>
  )
}

const primaryButton = (off) => ({
  width: '100%', minHeight: 48, borderRadius: 'var(--radius-md)', border: 'none', cursor: off ? 'default' : 'pointer',
  backgroundColor: 'var(--color-accent-solid)', color: '#fff', fontSize: 15, fontWeight: 600, opacity: off ? 0.55 : 1,
  WebkitTapHighlightColor: 'transparent', outline: 'none', ...TEXT,
})
const textButton = {
  display: 'block', width: '100%', minHeight: 44, marginTop: 'var(--space-2)', background: 'none', border: 'none', cursor: 'pointer',
  fontSize: 15, fontWeight: 600, color: 'var(--color-text-secondary)', WebkitTapHighlightColor: 'transparent', outline: 'none', ...TEXT,
}
