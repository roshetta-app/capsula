/**
 * src/components/ui/PublicSetupSheet.jsx
 * 2026-11-22 (Public profile plan, step 14.5b): the one sheet that sets up the public card. It opens at
 * the first share, the first Add to profile and the first Profile tab, and asks only what is missing:
 *
 *   name      one line with Edit when a name exists; a field when it is empty or breaks a rule
 *   username  with suggestions from a Latin name (an Arabic name gets an example, no suggestion)
 *   avatar    a ready-made design, or initials (the default)
 *   bio       optional, 160 characters
 *
 * then one button (default "Make it public") that saves the card. The sheet only saves the card; what
 * happens next (making the item public, opening the picker) is the caller's, through onDone.
 *
 * Props:
 *   isOpen, onClose
 *   onDone({ handle, name, avatarCode })  called once the card exists (also when it already existed)
 *   actionLabel                           the button words, default "Make it public"
 *
 * The rules and the wording live in utils/publicSetup.js and utils/profileRules.js; the data comes
 * through hooks/usePublicProfile.js. Nothing here is kept on the phone except a change made offline.
 */

import { useEffect, useRef, useState } from 'react'
import { X, Pencil, AlertCircle } from 'lucide-react'
import SheetShell from './SheetShell'
import PublicAvatar from './PublicAvatar'
import GroupStateMessage from '../drugs/groups/GroupStateMessage'
import { shimmer } from '../drugs/home/shimmer'
import { usePublicProfile } from '../../hooks/usePublicProfile'
import { AVATAR_CODES, messageForCode } from '../../utils/profileRules'
import {
  SETUP_TITLE, SETUP_INTRO, NAME_HELP, HANDLE_HELP, BIO_HELP, BIO_MAX, NAME_MAX, HANDLE_MAX,
  WAITING_MESSAGE, SIGN_IN_MESSAGE, startForm, buildFields, formProblems, canSubmit,
  visibleSuggestions, fieldForRefusal, refusalOpensName, takenHandle, savedCard,
} from '../../utils/publicSetup'

const TEXT = { fontFamily: 'var(--font-body)' }
const LABEL = { display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 500, color: 'var(--color-text-secondary)', ...TEXT }
const FIELD = {
  width: '100%', boxSizing: 'border-box', fontSize: 15, lineHeight: 1.4, color: 'var(--color-text-primary)',
  backgroundColor: 'var(--color-surface)', borderRadius: 12, padding: '12px 14px', outline: 'none', ...TEXT,
}
const HELP = { margin: '6px 0 0', fontSize: 12, lineHeight: 1.4, color: 'var(--color-text-secondary)', ...TEXT }

const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s)
// 'heart-rose' -> 'Heart, rose'
const avatarLabel = (code) => {
  const i = code.lastIndexOf('-')
  return `${cap(code.slice(0, i))}, ${code.slice(i + 1)}`
}

function ErrorLine({ id, children }) {
  if (!children) return null
  return (
    <div id={id} role="alert" style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--color-danger)', ...TEXT }}>
      <AlertCircle size={14} aria-hidden="true" style={{ flexShrink: 0 }} />
      {children}
    </div>
  )
}

export default function PublicSetupSheet({ isOpen, onClose, onDone, actionLabel = 'Make it public' }) {
  const { loadProfile, savePublicCard } = usePublicProfile()

  // phase: 'loading' | 'ready' | 'wait' (30-day pause) | 'offline' | 'signedout' | 'error'
  const [phase, setPhase] = useState('loading')
  const [form, setForm] = useState({ name: '', handle: '', bio: '', avatarCode: null })
  const [editName, setEditName] = useState(false)
  const [waitDays, setWaitDays] = useState(0)
  const [errors, setErrors] = useState({})
  const [taken, setTaken] = useState([])
  const [saving, setSaving] = useState(false)
  const [attempt, setAttempt] = useState(0)

  // Every time the sheet opens it starts fresh and asks the database again.
  const [wasOpen, setWasOpen] = useState(false)
  if (isOpen !== wasOpen) {
    setWasOpen(isOpen)
    if (isOpen) { setPhase('loading'); setErrors({}); setTaken([]); setSaving(false) }
  }

  // The caller's callback is a plain function from the page; it is not a reason to load again.
  const onDoneRef = useRef(onDone)
  useEffect(() => { onDoneRef.current = onDone }, [onDone])

  useEffect(() => {
    if (!isOpen) return
    let cancelled = false
    ;(async () => {
      const r = await loadProfile()
      if (cancelled) return
      if (!r.ok) {
        setPhase(r.code === 'not_signed_in' ? 'signedout' : r.kind === 'retry' ? 'offline' : 'error')
        return
      }
      const start = startForm(r.profile)
      if (start.done) {
        // The card was set up somewhere else in the meantime: nothing to ask.
        onDoneRef.current?.({ handle: start.handle, name: start.name, avatarCode: start.avatarCode })
        return
      }
      setForm({ name: start.name, handle: '', bio: start.bio, avatarCode: start.avatarCode })
      setEditName(start.editName)
      setWaitDays(start.waitDays)
      setPhase(start.waitDays > 0 ? 'wait' : 'ready')
    })()
    return () => { cancelled = true }
  }, [isOpen, attempt, loadProfile])

  function retry() { setPhase('loading'); setAttempt((a) => a + 1) }

  function change(key, value) {
    setForm((f) => ({ ...f, [key]: value }))
    setErrors((e) => (e[key === 'avatarCode' ? 'avatar' : key] || e.general ? { ...e, [key === 'avatarCode' ? 'avatar' : key]: undefined, general: undefined } : e))
  }

  async function submit() {
    if (saving || !canSubmit(form)) return
    setSaving(true)
    setErrors({})
    try {
      const res = await savePublicCard(buildFields(form), buildFields(form).name)
      if (res.ok && res.waiting) { setErrors({ general: WAITING_MESSAGE }); return }
      if (res.ok) { onDoneRef.current?.(savedCard(res.saved, form)); return }
      if (refusalOpensName(res)) setEditName(true)
      const t = takenHandle(res, form)
      if (t) setTaken((list) => (list.includes(t) ? list : [...list, t]))
      const field = fieldForRefusal(res)
      setErrors({ [field]: res.kind === 'retry' && res.code === 'not_signed_in' ? SIGN_IN_MESSAGE : res.message })
    } finally {
      setSaving(false)
    }
  }

  const problems = formProblems(form)
  const nameError = errors.name || problems.name
  const handleError = errors.handle || problems.handle
  const bioError = errors.bio || problems.bio
  const suggestions = visibleSuggestions(form, taken)
  const shownName = buildFields(form).name
  const shownHandle = buildFields(form).handle
  const ready = canSubmit(form)

  let body
  if (phase === 'loading') {
    body = (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 'var(--space-2) 0' }}>
        <div style={shimmer({ width: '60%', height: 16 })} />
        <div style={shimmer({ width: '100%', height: 44 })} />
        <div style={shimmer({ width: '100%', height: 44 })} />
      </div>
    )
  } else if (phase === 'offline') {
    body = <GroupStateMessage title="No connection" body="Connect to set up your public profile." actionLabel="Try again" onAction={retry} />
  } else if (phase === 'signedout') {
    body = <GroupStateMessage title={SIGN_IN_MESSAGE} />
  } else if (phase === 'error') {
    body = <GroupStateMessage title="Couldn't open your profile" actionLabel="Try again" onAction={retry} />
  } else if (phase === 'wait') {
    body = (
      <GroupStateMessage
        title="You can't set up a new profile yet"
        body={`${messageForCode('removed_wait')} ${waitDays === 1 ? '1 day left.' : `${waitDays} days left.`}`}
      />
    )
  } else {
    body = (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <p style={{ margin: 0, fontSize: 15, lineHeight: 1.45, color: 'var(--color-text-secondary)', ...TEXT }}>{SETUP_INTRO}</p>

        {/* What visitors will see: the name on top in its own direction, the username below, always left to right. */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-surface-muted)' }}>
          <PublicAvatar code={form.avatarCode} name={shownName} size={52} />
          <div style={{ minWidth: 0, flex: 1 }}>
            <div dir="auto" style={{ fontSize: 16, fontWeight: 700, color: shownName ? 'var(--color-text-primary)' : 'var(--color-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', ...TEXT }}>
              {shownName || 'Your name'}
            </div>
            <div dir="ltr" style={{ fontSize: 14, color: 'var(--color-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'left', ...TEXT }}>
              @{shownHandle || 'username'}
            </div>
          </div>
        </div>

        {/* Name */}
        {editName ? (
          <div>
            <label htmlFor="setup-name" style={LABEL}>Name</label>
            <input
              id="setup-name"
              type="text"
              value={form.name}
              onChange={(e) => change('name', e.target.value.slice(0, NAME_MAX))}
              maxLength={NAME_MAX}
              dir="auto"
              autoComplete="off"
              aria-invalid={Boolean(nameError)}
              aria-describedby="setup-name-help"
              style={{ ...FIELD, border: nameError ? '1.5px solid var(--color-danger)' : '1.5px solid var(--color-border)' }}
            />
            <ErrorLine id="setup-name-error">{nameError}</ErrorLine>
            <p id="setup-name-help" style={HELP}>{NAME_HELP}</p>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ minWidth: 0 }}>
              <span style={LABEL}>Name</span>
              <span dir="auto" style={{ display: 'block', fontSize: 15, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', ...TEXT }}>{form.name}</span>
            </div>
            <button
              type="button"
              onClick={() => setEditName(true)}
              style={{ flexShrink: 0, minHeight: 44, padding: '0 12px', display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, fontWeight: 600, color: 'var(--color-accent-solid)', WebkitTapHighlightColor: 'transparent', outline: 'none', ...TEXT }}
            >
              <Pencil size={16} aria-hidden="true" />
              Edit
            </button>
          </div>
        )}

        {/* Username */}
        <div>
          <label htmlFor="setup-handle" style={LABEL}>Username</label>
          <input
            id="setup-handle"
            type="text"
            value={form.handle}
            onChange={(e) => change('handle', e.target.value.slice(0, HANDLE_MAX + 4))}
            dir="ltr"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            autoComplete="off"
            placeholder={suggestions.length === 0 ? 'e.g. sara-ahmed' : undefined}
            aria-invalid={Boolean(handleError)}
            aria-describedby="setup-handle-help"
            style={{ ...FIELD, textAlign: 'left', border: handleError ? '1.5px solid var(--color-danger)' : '1.5px solid var(--color-border)' }}
          />
          <ErrorLine id="setup-handle-error">{handleError}</ErrorLine>
          {suggestions.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
              {suggestions.map((h) => (
                <button
                  key={h}
                  type="button"
                  dir="ltr"
                  onClick={() => change('handle', h)}
                  style={{ minHeight: 36, padding: '0 14px', borderRadius: 'var(--radius-full)', border: '1.5px solid var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text-primary)', cursor: 'pointer', fontSize: 14, WebkitTapHighlightColor: 'transparent', outline: 'none', ...TEXT }}
                >
                  {h}
                </button>
              ))}
            </div>
          )}
          <p id="setup-handle-help" style={HELP}>{HANDLE_HELP}</p>
        </div>

        {/* Avatar */}
        <div>
          <span id="setup-avatar-label" style={LABEL}>Avatar</span>
          <div role="radiogroup" aria-labelledby="setup-avatar-label" style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {[null, ...AVATAR_CODES].map((code) => {
              const on = form.avatarCode === code
              return (
                <button
                  key={code ?? 'initials'}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  aria-label={code ? avatarLabel(code) : 'Initials'}
                  onClick={() => change('avatarCode', code)}
                  style={{
                    width: 48, height: 48, padding: 0, borderRadius: '50%', border: 'none', cursor: 'pointer', background: 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', WebkitTapHighlightColor: 'transparent', outline: 'none',
                    boxShadow: on ? '0 0 0 2px var(--color-surface), 0 0 0 4px var(--color-accent-solid)' : 'none',
                  }}
                >
                  <PublicAvatar code={code} name={shownName} size={44} />
                </button>
              )
            })}
          </div>
          <ErrorLine id="setup-avatar-error">{errors.avatar}</ErrorLine>
          <p style={HELP}>The first one shows your initials.</p>
        </div>

        {/* Bio */}
        <div>
          <label htmlFor="setup-bio" style={LABEL}>Bio (optional)</label>
          <textarea
            id="setup-bio"
            value={form.bio}
            onChange={(e) => change('bio', e.target.value.slice(0, BIO_MAX + 20))}
            rows={2}
            dir="auto"
            aria-invalid={Boolean(bioError)}
            aria-describedby="setup-bio-help"
            style={{ ...FIELD, resize: 'none', border: bioError ? '1.5px solid var(--color-danger)' : '1.5px solid var(--color-border)' }}
          />
          <ErrorLine id="setup-bio-error">{bioError}</ErrorLine>
          <p id="setup-bio-help" style={HELP}>{BIO_HELP} {form.bio.length > 120 ? `${BIO_MAX - form.bio.length} left.` : ''}</p>
        </div>

        <ErrorLine id="setup-general-error">{errors.general}</ErrorLine>

        <div>
          <button
            type="button"
            onClick={submit}
            disabled={saving || !ready}
            style={{
              width: '100%', minHeight: 48, borderRadius: 'var(--radius-md)', border: 'none', cursor: saving || !ready ? 'default' : 'pointer',
              backgroundColor: 'var(--color-accent-solid)', color: '#fff', fontSize: 15, fontWeight: 600, opacity: saving || !ready ? 0.55 : 1,
              WebkitTapHighlightColor: 'transparent', outline: 'none', ...TEXT,
            }}
          >
            {saving ? 'Saving\u2026' : actionLabel}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            style={{ display: 'block', width: '100%', minHeight: 44, marginTop: 'var(--space-2)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, fontWeight: 600, color: 'var(--color-text-secondary)', WebkitTapHighlightColor: 'transparent', outline: 'none', ...TEXT }}
          >
            Not now
          </button>
        </div>
      </div>
    )
  }

  return (
    <SheetShell isOpen={isOpen} onClose={onClose} ariaLabel={SETUP_TITLE} zIndex={300} keyboardAware dismissOnlyByBackdrop>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-3)', padding: '0 var(--space-4) var(--space-3)', flexShrink: 0 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text-primary)', ...TEXT }}>{SETUP_TITLE}</div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          style={{ width: 44, height: 44, borderRadius: '50%', border: 'none', flexShrink: 0, backgroundColor: 'var(--color-surface-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', WebkitTapHighlightColor: 'transparent', outline: 'none' }}
        >
          <X size={20} color="var(--color-text-secondary)" aria-hidden="true" />
        </button>
      </div>
      <div style={{ padding: '0 var(--space-4) var(--space-5)', overflowY: 'auto', flex: 1, minHeight: 0 }}>{body}</div>
    </SheetShell>
  )
}
