// src/components/roshettas/RoshettaPadHeader.jsx
// 2026-11-21 (Roshetta plan, steps 8.3b to 8.3e): the header of the owner's roshetta page. A white block with a rounded bottom, like the topic sheet's header, and the Home roshetta card's faint
// italic Rx in the bottom corner. Kept short on purpose (about 155 px with a one-line name).
// Top to bottom:
//   - the top bar: Back on the start side, Share and the options menu on the end side;
//   - the name, 22, as many lines as it needs, with the specialty icon before it in its colour
//     (the prescription icon in the app's blue when there is none); the specialty's name is not
//     shown, it is spoken to screen readers only;
//   - the description, as plain text with no box or line (added and edited HERE, in
//     place, never in a sheet): a small "+ Add description" text link when there is none; the text, two
//     lines then "more", with a pencil at its end when there is one (tapping the text only opens
//     or closes it; only the pencil edits); while editing a box that grows as you type, a clear
//     button, and one slim row with the count, Cancel and Save (Save is grey until the text
//     changes; a refusal shows in words and the text stays; Back closes the editing first and,
//     if the text changed, asks before discarding);
//   - one foot line: "Created 12 Nov" and, when it is a different day, "Edited Today" on the
//     start side; on the end side the one status line the Home roshetta section uses (Waiting to
//     save, Saving, Offline, changes not saved with See, All saved). The line is always one line
//     high, so nothing moves when a message appears.
//
// Props:
//   name, description, specialty (the picker shape, or null), createdAt, updatedAt (ISO text)
//   topLeft / topRight  nodes: the Back button, and the Share button with the options menu
//   editable            the owner may change the description (false when read only)
//   onSaveDescription   (text) => Promise<{ ok, reason? }>
//   onEditingChange     (boolean) => void   the page hides its bottom bar while typing
//   isPro               boolean (for the limit wording of a refusal)
//   syncKind, syncText, syncActionLabel, onSyncAction   the status line (see HomeSyncLine)

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { AlertCircle, CalendarDays, CircleX, Clock, FileText, Pencil, Plus } from 'lucide-react'
import ConfirmSheet from '../ui/ConfirmSheet'
import HomeSyncLine, { LINE_H } from '../home/HomeSyncLine'
import { useBackClose } from '../../hooks/useBackClose'
import { SpecialtyIcon, useIsDark } from '../../utils/specialtyIcon'
import { specialtyColors, specialtyHeaderText } from '../../utils/roshettaSpecialty'
import { shortDateText } from '../../utils/roshettaShelfText'
import { ROSHETTA_DESCRIPTION_MAX } from '../../utils/roshettaRows'
import { countText, limitText, saveFailureMessage } from '../../utils/roshettaDetailsText'

const font = 'var(--font-body)'
const NEAR_LIMIT = Math.floor(ROSHETTA_DESCRIPTION_MAX * 0.9)
const NOTE_BG = 'var(--color-surface-muted)'

export default function RoshettaPadHeader({
  name, description = '', specialty = null, createdAt, updatedAt,
  topLeft, topRight, editable = false, onSaveDescription, onEditingChange, isPro = false,
  syncKind = '', syncText = '', syncActionLabel, onSyncAction,
}) {
  const isDark = useIsDark()
  const look = specialtyColors(specialty, isDark)
  const label = specialtyHeaderText(specialty, 'Roshetta')
  const text = typeof description === 'string' ? description.trim() : ''
  const created = shortDateText(createdAt)
  const edited = shortDateText(updatedAt)
  // A roshetta not changed since the day it was made shows only when it was created.
  const showEdited = !!edited && edited !== created

  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [open, setOpen] = useState(false)          // a long description shown in full
  const [clamps, setClamps] = useState(false)      // the text is longer than two lines
  const [discardOpen, setDiscardOpen] = useState(false)
  const textRef = useRef(null)
  const boxRef = useRef(null)
  const areaRef = useRef(null)

  const next = draft.trim()
  const changed = next !== text

  // Does the text run past two lines? (measured while it is clamped)
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
      res = await onSaveDescription?.(next)
    } catch {
      res = { ok: false, reason: 'error' }
    }
    if (!res?.ok) {
      setSaving(false)
      setError(saveFailureMessage(res?.reason, isPro))
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

  const dateText = (Icon, title, value) => (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}>
      <Icon size={12} strokeWidth={2} aria-hidden="true" style={{ flexShrink: 0 }} />
      <span>{title}{' '}<span style={{ fontWeight: 400, color: 'var(--color-text-secondary)' }}>{value}</span></span>
    </span>
  )

  return (
    <div
      style={{
        position: 'relative',
        // Calm on purpose: a plain white surface with a rounded bottom. Colour lives only in the
        // specialty label and the faint Rx.
        backgroundColor: 'var(--color-surface)',
        borderRadius: '0 0 22px 22px',
        margin: '0 calc(-1 * var(--page-gutter, 16px))',
        padding: '4px calc(var(--page-gutter, 16px) + 2px) 12px',
      }}
    >
      <div aria-hidden="true" style={{ position: 'absolute', inset: 0, overflow: 'hidden', borderRadius: 'inherit', pointerEvents: 'none' }}>
        <span
          style={{
            position: 'absolute', insetInlineEnd: -4, bottom: -12, userSelect: 'none',
            fontSize: 72, fontWeight: 700, fontStyle: 'italic', lineHeight: 1,
            color: isDark ? 'var(--color-text-primary)' : look.fg, opacity: isDark ? 0.05 : 0.09,
            fontFamily: 'Georgia, \'Times New Roman\', serif',
          }}
        >
          Rx
        </span>
      </div>

      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, height: 36, marginInlineEnd: -10 }}>
        {topLeft}
        <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>{topRight}</div>
      </div>

      <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', gap: 8, marginTop: 4 }}>
        <span
          role="img"
          aria-label={label}
          style={{ flexShrink: 0, width: 22, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', color: look.fg }}
        >
          {specialty
            ? <SpecialtyIcon iconType={specialty.iconType ?? 'lucide'} iconValue={specialty.iconValue ?? 'Stethoscope'} size={20} color={look.fg} />
            : <FileText size={20} strokeWidth={2} />}
        </span>
        <h1
          dir="auto"
          style={{
            position: 'relative', flex: 1, minWidth: 0, margin: 0, textAlign: 'start', overflowWrap: 'anywhere',
            fontSize: 22, fontWeight: 600, lineHeight: 1.2, letterSpacing: '-0.4px',
            color: 'var(--color-text-primary)', fontFamily: font,
          }}
        >
          {name}
        </h1>
      </div>

      {editing ? (
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
              onChange={e => { setError(''); setDraft(limitText(e.target.value, ROSHETTA_DESCRIPTION_MAX)) }}
              autoFocus
              rows={2}
              dir="auto"
              disabled={saving}
              aria-label="Description"
              placeholder="Who it's for, or when to use it"
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
                color: countText(draft) >= NEAR_LIMIT ? 'var(--color-warning)' : 'var(--color-text-tertiary)',
                fontWeight: countText(draft) >= NEAR_LIMIT ? 500 : 400,
              }}
            >
              {countText(draft)}/{ROSHETTA_DESCRIPTION_MAX}
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
                backgroundColor: changed || saving ? 'var(--color-accent-solid)' : NOTE_BG,
                color: changed || saving ? '#fff' : 'var(--color-text-tertiary)',
                fontSize: 13, fontWeight: 600, fontFamily: font, opacity: saving ? 0.75 : 1,
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {saving ? 'Saving\u2026' : 'Save'}
            </button>
          </div>
        </div>
      ) : text ? (
        <div style={{ position: 'relative', marginTop: 8, display: 'flex', alignItems: 'flex-start', gap: 4, padding: 0 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p
              ref={textRef}
              dir="auto"
              onClick={clamps || open ? () => setOpen(v => !v) : undefined}
              style={{
                margin: 0, textAlign: 'start', whiteSpace: 'pre-line', overflowWrap: 'anywhere',
                fontSize: 14, lineHeight: 1.5, color: 'var(--color-text-secondary)', fontFamily: font,
                cursor: clamps || open ? 'pointer' : 'default',
                ...(open ? {} : { display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }),
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
      ) : editable ? (
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
      ) : null}

      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 12, marginTop: 10, minHeight: LINE_H }}>
        {(created || showEdited) && (
          <div style={{ display: 'flex', flexShrink: 0, gap: 12, fontSize: 12, lineHeight: 1.3, color: 'var(--color-text-tertiary)', fontFamily: font }}>
            {created && dateText(CalendarDays, 'Created', created)}
            {showEdited && dateText(Clock, 'Edited', edited)}
          </div>
        )}
        <div style={{ position: 'relative', flex: 1, minWidth: 0, height: LINE_H }}>
          <HomeSyncLine inside end kind={syncKind} text={syncText} actionLabel={syncActionLabel} onAction={onSyncAction} />
        </div>
      </div>
      <ConfirmSheet
        isOpen={discardOpen}
        onClose={() => setDiscardOpen(false)}
        onConfirm={stopEdit}
        title="Discard changes?"
        message="Your change to the description won't be saved."
        confirmLabel="Discard"
        destructive
      />
    </div>
  )
}
