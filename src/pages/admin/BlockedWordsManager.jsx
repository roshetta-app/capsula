/**
 * src/pages/admin/BlockedWordsManager.jsx
 * 2026-11-22 (Public profile plan, step 14.9c-3): the CMS Blocked words screen at /admin/blocked-words.
 * Three things on one screen: add a word, the people already flagged because their name or username contains
 * a blocked word (Clear flags, Open profile), and the list of blocked words (Remove). Adding or removing a word
 * and clearing flags ask first where it matters and are written to the Audit Log. Nobody is ever renamed here.
 *
 * The rules and words live in utils/blockedWordsAdmin.js; the calls are utils/blockedWordsAdminContent.js.
 * Every name, username and word from the database is drawn as plain text, never as markup.
 * 14.9c-4b adds, on each flagged profile, the buttons Turn off sharing / Restore sharing / Take username back
 * (components/admin/TakedownActions.jsx, rules in utils/takedownAdmin.js) and a Sharing off tag.
 */

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { RefreshCw, Ban, ExternalLink } from 'lucide-react'
import AdminPageHeader from '../../components/admin/AdminPageHeader'
import ConfirmModal from '../../components/admin/ConfirmModal'
import TakedownActions from '../../components/admin/TakedownActions'
import { fetchBlockedWords, addWord, removeWord, clearFlags } from '../../utils/blockedWordsAdminContent'
import { confirmCopy, resultText, BLOCKED_WORDS_WORDS as W, WORD_MAX } from '../../utils/blockedWordsAdmin'
import { fetchSharingOff } from '../../utils/takedownAdminContent'
import { TAKEDOWN_WORDS } from '../../utils/takedownAdmin'

const buttonBase = {
  padding: 'var(--space-2) var(--space-3)', borderRadius: 'var(--radius-sm)', fontSize: 13, fontWeight: 600,
  fontFamily: 'var(--font-body)', cursor: 'pointer',
}
const card = {
  display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', padding: 'var(--space-4)', borderRadius: 'var(--radius-lg)',
  backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)',
}
const plainText = { whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }
const heading = { fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)', margin: 'var(--space-5) 0 var(--space-2)' }

function FlagCard({ flag, busy, onClear, sharingOff, onChanged }) {
  return (
    <div style={card}>
      <div style={{ display: 'flex', alignItems: 'baseline', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
        <span dir="auto" style={{ ...plainText, fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)' }}>
          {flag.name ?? 'No name'}
        </span>
        {flag.handle && (
          <span dir="ltr" style={{ ...plainText, fontSize: 13, color: 'var(--color-text-secondary)' }}>@{flag.handle}</span>
        )}
        {sharingOff === true && (
          <span style={{ padding: '3px 10px', borderRadius: 'var(--radius-full)', fontSize: 12, fontWeight: 600, backgroundColor: '#FEE2E2', color: '#991B1B' }}>
            {TAKEDOWN_WORDS.tag}
          </span>
        )}
      </div>
      {flag.words.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {flag.words.map(w => (
            <span key={w} dir="auto" style={{
              ...plainText, padding: '3px 10px', borderRadius: 'var(--radius-full)', fontSize: 12,
              backgroundColor: '#FEF9C3', color: '#854D0E',
            }}>
              {w}
            </span>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 'var(--space-2)', marginTop: 'var(--space-1)' }}>
        <button
          type="button"
          disabled={busy}
          onClick={() => onClear(flag)}
          style={{
            ...buttonBase, border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)',
            color: 'var(--color-text-primary)', opacity: busy ? 0.55 : 1, cursor: busy ? 'default' : 'pointer',
          }}
        >
          Clear flags
        </button>
        <TakedownActions
          profileId={flag.profileId}
          name={flag.name}
          handle={flag.handle}
          sharingOff={sharingOff}
          disabled={busy}
          onChanged={onChanged}
        />
        {flag.handle && (
          <Link
            to={`/u/${encodeURIComponent(flag.handle)}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 13, color: 'var(--color-accent-text)', textDecoration: 'none', marginLeft: 'auto' }}
          >
            Open profile <ExternalLink size={13} aria-hidden="true" />
          </Link>
        )}
      </div>
    </div>
  )
}

export default function BlockedWordsManager() {
  const [status, setStatus] = useState('loading')
  const [words, setWords] = useState([])
  const [flags, setFlags] = useState([])
  const [draft, setDraft] = useState('')
  const [pending, setPending] = useState(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [off, setOff] = useState({ status: 'loading', ids: [], people: [] })

  // Reading again: Refresh and a finished change bump this counter, which runs the effect below once more.
  const [reloadKey, setReloadKey] = useState(0)
  function reload() {
    setStatus('loading')
    setReloadKey((n) => n + 1)
  }

  useEffect(() => {
    let cancelled = false
    fetchBlockedWords().then((r) => {
      if (cancelled) return
      if (r.status === 'ok') { setWords(r.words); setFlags(r.flags) }
      setStatus(r.status)
    })
    // Who has sharing off is read on its own: a failed read never hides the flagged profiles.
    fetchSharingOff().then((r) => { if (!cancelled) setOff(r) })
    return () => { cancelled = true }
  }, [reloadKey])

  async function finish(r) {
    setBusy(false)
    setNotice(resultText(r.status))
    if (r.status === 'ok' || r.status === 'gone') reload()
  }

  async function add() {
    if (busy) return
    setBusy(true)
    setNotice('')
    const r = await addWord(draft)
    if (r.status === 'ok') setDraft('')
    await finish(r)
  }

  async function run() {
    const { action, target } = pending
    setPending(null)
    setBusy(true)
    setNotice('')
    await finish(action === 'remove' ? await removeWord(target) : await clearFlags(target))
  }

  const copy = pending ? confirmCopy(pending.action, pending.target) : null
  const loading = status === 'loading'
  const okNotice = notice === resultText('ok')

  return (
    <AdminPageHeader
      title={W.title}
      actions={
        <button
          type="button"
          onClick={reload}
          disabled={loading}
          aria-label="Refresh"
          style={{
            display: 'flex', alignItems: 'center', gap: 'var(--space-1)', padding: 'var(--space-2) var(--space-3)',
            borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)',
            color: 'var(--color-text-secondary)', fontSize: 13, fontWeight: 500, fontFamily: 'var(--font-body)',
            cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.5 : 1,
          }}
        >
          <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          Refresh
        </button>
      }
    >
      {notice && (
        <div role="status" style={{
          marginBottom: 'var(--space-4)', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)', fontSize: 13,
          backgroundColor: okNotice ? '#D1FAE5' : '#FEF2F2',
          color: okNotice ? '#065F46' : '#DC2626',
          border: `1px solid ${okNotice ? '#6EE7B7' : '#FECACA'}`,
        }}>
          {notice}
        </div>
      )}

      {(status === 'forbidden' || status === 'offline' || status === 'error') && (
        <div role="alert" style={{
          padding: 'var(--space-3)', borderRadius: 'var(--radius-md)', fontSize: 13, backgroundColor: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626',
        }}>
          {status === 'forbidden' ? W.forbidden : status === 'offline' ? W.offline : W.loadError}
        </div>
      )}

      {status !== 'forbidden' && (
        <div style={card}>
          <label htmlFor="blocked-word-input" style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}>{W.addLabel}</label>
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <input
              id="blocked-word-input"
              type="text"
              dir="auto"
              value={draft}
              maxLength={WORD_MAX}
              autoComplete="off"
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') add() }}
              style={{
                flex: 1, minWidth: 0, padding: 'var(--space-2) var(--space-3)', borderRadius: 'var(--radius-sm)', fontSize: 14,
                border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text-primary)',
                fontFamily: 'var(--font-body)',
              }}
            />
            <button
              type="button"
              disabled={busy || draft.trim() === ''}
              onClick={add}
              style={{
                ...buttonBase, border: 'none', backgroundColor: 'var(--color-accent)', color: '#fff',
                opacity: busy || draft.trim() === '' ? 0.55 : 1, cursor: busy || draft.trim() === '' ? 'default' : 'pointer',
              }}
            >
              {W.addButton}
            </button>
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>{W.addHelp}</div>
        </div>
      )}

      {loading && words.length === 0 && flags.length === 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', marginTop: 'var(--space-4)' }}>
          {[0, 1].map(i => (
            <div key={i} style={{ height: 90, borderRadius: 'var(--radius-lg)', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', animation: 'shimmer 1.4s ease-in-out infinite' }} />
          ))}
        </div>
      )}

      {status === 'ok' && (
        <>
          <h2 style={heading}>{W.flagsHeading}</h2>
          {flags.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 'var(--space-8) var(--space-4)', color: 'var(--color-text-tertiary)' }}>
              <div style={{ fontSize: 15, color: 'var(--color-text-secondary)', marginBottom: 'var(--space-1)' }}>{W.flagsEmpty}</div>
              <div style={{ fontSize: 13 }}>{W.flagsEmptyLine}</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {flags.map(f => (
                <FlagCard
                  key={f.profileId}
                  flag={f}
                  busy={busy}
                  onClear={(t) => setPending({ action: 'dismiss', target: t })}
                  sharingOff={off.status === 'ok' ? off.ids.includes(f.profileId) : null}
                  onChanged={reload}
                />
              ))}
            </div>
          )}

          <h2 style={heading}>{W.wordsHeading}</h2>
          {words.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 'var(--space-8) var(--space-4)', color: 'var(--color-text-tertiary)' }}>
              <div style={{ marginBottom: 'var(--space-3)', opacity: 0.35 }}><Ban size={32} /></div>
              <div style={{ fontSize: 15, color: 'var(--color-text-secondary)' }}>{W.wordsEmpty}</div>
            </div>
          ) : (
            <div style={{ ...card, gap: 0, padding: 0 }}>
              {words.map((w, i) => (
                <div key={w.id} style={{
                  display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-3) var(--space-4)',
                  borderTop: i === 0 ? 'none' : '1px solid var(--color-border)',
                }}>
                  <span dir="auto" style={{ ...plainText, flex: 1, minWidth: 0, fontSize: 14, color: 'var(--color-text-primary)' }}>{w.word}</span>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setPending({ action: 'remove', target: w })}
                    style={{
                      ...buttonBase, border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)',
                      color: 'var(--color-text-primary)', opacity: busy ? 0.55 : 1, cursor: busy ? 'default' : 'pointer',
                    }}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <ConfirmModal
        isOpen={pending !== null}
        onClose={() => setPending(null)}
        onConfirm={run}
        title={copy?.title}
        message={copy?.message}
        confirmLabel={copy?.confirmLabel}
        confirmVariant={copy?.confirmVariant}
      />
    </AdminPageHeader>
  )
}
