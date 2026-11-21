// src/components/ui/InlineDescription.jsx
// 2026-11-21 (polish step 8.3 / 8.6a): the description of a roshetta or a drug group, shown and edited IN
// PLACE on its page, never in a sheet. Moved out of RoshettaPadHeader.jsx so the roshetta page and the
// drug group page use the very same one (same look, same words, same Back handling).
//
//   - no description: a small "+ Add description" text link (only when `editable`);
//   - a description: plain text, a few lines then "more" / "less", and a pencil at its end when `editable`
//     (tapping the text only opens or closes it; only the pencil edits);
//   - editing: a box with an accent outline that grows as you type, a clear button, and one slim row with the
//     count (amber from 90% of the limit; typing stops at the limit), Cancel and Save (grey until the text
//     changes; saving an empty box removes the description). A refusal shows in words under the box and the
//     text stays. Back closes the editing first: straight away when nothing changed, otherwise it asks
//     "Discard changes?" (Keep editing puts the Back handling back).
//
// Props:
//   text              the saved description ('' for none)
//   editable          the person may change it (false when read only, or on a shared page)
//   onSave(text)      async => { ok, reason? }; the text is already trimmed ('' removes it)
//   failureMessage    (reason) => string, the words for a refusal
//   onEditingChange   (boolean) => void, so the page can step its floating button aside while typing
//   max               character limit (default 200)
//   placeholder       text in the empty box
//   dir               'auto' (default) or 'ltr' for the text and the box
//   lines             lines shown before "more" (default 2)
//   textColor         colour of the reading text

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { AlertCircle, CircleX, Pencil, Plus } from 'lucide-react'
import ConfirmSheet from './ConfirmSheet'
import { useBackClose } from '../../hooks/useBackClose'
import { countText, limitText } from '../../utils/roshettaDetailsText'

const font = 'var(--font-body)'

export default function InlineDescription({
  text: rawText = '', editable = false, onSave, failureMessage, onEditingChange,
  max = 200, placeholder = 'Tell us a little about this…', dir = 'auto', lines = 2,
  textColor = 'var(--color-text-secondary)', discardMessage = "Your change to the description won't be saved.",
}) {
  const text = typeof rawText === 'string' ? rawText.trim() : ''
  const nearLimit = Math.floor(max * 0.9)

  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [open, setOpen] = useState(false)          // a long description shown in full
  const [clamps, setClamps] = useState(false)      // the text is longer than the lines shown
  const [discardOpen, setDiscardOpen] = useState(false)
  const textRef = useRef(null)
  const boxRef = useRef(null)
  const areaRef = useRef(null)

  const next = draft.trim()
  const changed = next !== text

  // Does the text run past the lines shown? (measured while it is clamped)
  useLayoutEffect(() => {
    const el = textRef.current
    if (!el || open) return undefined
    const measure = () => setClamps(el.scrollHeight > el.clientHeight + 1)
    measure()
    if (typeof ResizeObserver === 'undefined') return undefined
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [text, open, editing])

  // The box grows with the text.
  useLayoutEffect(() => {
    const el = areaRef.current
    if (!el || !editing) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [draft, editing])

  // When editing starts, bring the box into view above the keyboard.
  useEffect(() => {
    if (!editing) return undefined
    const t = setTimeout(() => boxRef.current?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' }), 250)
    return () => clearTimeout(t)
  }, [editing])

  function startEdit() {
    setDraft(text)
    setError('')
    setEditing(true)
    onEditingChange?.(true)
  }
  function stopEdit() {
    setEditing(false)
    setSaving(false)
    setError('')
    setDiscardOpen(false)
    onEditingChange?.(false)
  }
  async function save() {
    if (saving || !changed) return
    setSaving(true)
    setError('')
    let res
    try {
      res = await onSave?.(next)
    } catch {
      res = { ok: false, reason: 'error' }
    }
    if (!res?.ok) {
      setSaving(false)
      setError(failureMessage ? failureMessage(res?.reason) : "Couldn't save. Try again.")
      return
    }
    stopEdit()
  }

  // Back closes the editing first: straight away when nothing changed, after a question when it did.
  // The layer is off while the question is open, so "Keep editing" puts it back.
  useBackClose(editing && !discardOpen, () => {
    if (saving) return
    if (changed) setDiscardOpen(true)
    else stopEdit()
  })

  let body = null
  if (editing) {
    body = (
      <div style={{ position: 'relative', marginTop: 8 }}>
        <div
          ref={boxRef}
          style={{
            display: 'flex', alignItems: 'flex-start', gap: 4,
            borderRadius: 12, padding: '8px 4px 8px 12px',
            border: `1.5px solid ${error ? 'var(--color-danger)' : 'var(--color-accent)'}`,
            opacity: saving ? 0.6 : 1,
          }}
        >
          <textarea
            ref={areaRef}
            value={draft}
            onChange={e => { setError(''); setDraft(limitText(e.target.value, max)) }}
            autoFocus
            rows={2}
            dir={dir}
            disabled={saving}
            aria-label="Description"
            placeholder={placeholder}
            style={{
              flex: 1, minWidth: 0, boxSizing: 'border-box', resize: 'none', outline: 'none', border: 'none',
              background: 'transparent', padding: 0, margin: 0, overflow: 'hidden',
              fontSize: 14, lineHeight: 1.5, fontFamily: font, textAlign: 'start',
              color: 'var(--color-text-primary)',
            }}
          />
          {draft && !saving && (
            <button
              type="button"
              onClick={() => { setDraft(''); areaRef.current?.focus() }}
              aria-label="Clear description"
              style={{
                flexShrink: 0, width: 32, height: 32, margin: '-6px 0 -6px 0', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--color-text-tertiary)',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              <CircleX size={16} aria-hidden="true" />
            </button>
          )}
        </div>
        {error && (
          <div role="alert" style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--color-danger)', fontFamily: font }}>
            <AlertCircle size={13} aria-hidden="true" style={{ flexShrink: 0 }} />
            {error}
          </div>
        )}
        <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span
            style={{
              flex: 1, fontSize: 12, fontFamily: font,
              color: countText(draft) >= nearLimit ? 'var(--color-warning)' : 'var(--color-text-tertiary)',
              fontWeight: countText(draft) >= nearLimit ? 500 : 400,
            }}
          >
            {countText(draft)}/{max}
          </span>
          <button
            type="button"
            onClick={stopEdit}
            disabled={saving}
            style={{ minHeight: 40, padding: '0 12px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)', fontSize: 13, fontWeight: 500, fontFamily: font, opacity: saving ? 0.5 : 1, WebkitTapHighlightColor: 'transparent' }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            aria-disabled={!changed || saving}
            style={{
              minHeight: 36, padding: '0 18px', borderRadius: 999, border: 'none',
              cursor: changed && !saving ? 'pointer' : 'default',
              backgroundColor: changed || saving ? 'var(--color-accent-solid)' : 'var(--color-surface-muted)',
              color: changed || saving ? '#fff' : 'var(--color-text-tertiary)',
              fontSize: 13, fontWeight: 600, fontFamily: font, opacity: saving ? 0.75 : 1,
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    )
  } else if (text) {
    body = (
      <div style={{ position: 'relative', marginTop: 8, display: 'flex', alignItems: 'flex-start', gap: 4, padding: 0 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            ref={textRef}
            dir={dir}
            onClick={clamps || open ? () => setOpen(v => !v) : undefined}
            style={{
              margin: 0, textAlign: 'start', whiteSpace: 'pre-line', overflowWrap: 'anywhere',
              fontSize: 14, lineHeight: 1.5, color: textColor, fontFamily: font,
              cursor: clamps || open ? 'pointer' : 'default',
              ...(open ? {} : { display: '-webkit-box', WebkitLineClamp: lines, WebkitBoxOrient: 'vertical', overflow: 'hidden' }),
            }}
          >
            {text}
          </p>
          {(clamps || open) && (
            <button
              type="button"
              onClick={() => setOpen(v => !v)}
              aria-expanded={open}
              style={{
                minHeight: 24, padding: 0, background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--color-accent-text)', fontSize: 12, fontWeight: 500, fontFamily: font,
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {open ? 'less' : 'more'}
            </button>
          )}
        </div>
        {editable && (
          <button
            type="button"
            onClick={startEdit}
            aria-label="Edit description"
            style={{
              flexShrink: 0, width: 36, height: 36, margin: '-6px 0 -6px 0',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--color-text-tertiary)',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <Pencil size={16} aria-hidden="true" />
          </button>
        )}
      </div>
    )
  } else if (editable) {
    body = (
      <button
        type="button"
        onClick={startEdit}
        style={{
          position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 4, minHeight: 32, marginTop: 2,
          padding: 0, background: 'none', cursor: 'pointer', border: 'none',
          color: 'var(--color-accent-text)', fontSize: 13, fontWeight: 500, fontFamily: font,
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        <Plus size={14} aria-hidden="true" />
        Add description
      </button>
    )
  }

  return (
    <>
      {body}
      <ConfirmSheet
        isOpen={discardOpen}
        onClose={() => setDiscardOpen(false)}
        onConfirm={stopEdit}
        title="Discard changes?"
        message={discardMessage}
        confirmLabel="Discard"
        destructive
      />
    </>
  )
}
