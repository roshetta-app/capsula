// src/components/roshettas/RoshettaPadHeader.jsx
// 2026-11-21 (Roshetta plan, steps 8.3b to 8.3e): the header of the owner's roshetta page. A white
// block with a rounded bottom, like the topic sheet's header, and the Home roshetta card's faint
// italic Rx in the bottom corner. Kept short on purpose (about 155 px with a one-line name).
// Top to bottom:
//   - the top bar: Back on the start side, Share and the options menu on the end side;
//   - the specialty, small, in the header content (a tiny tinted tile with its icon and the name
//     in its colour; "Roshetta" in the app's blue when there is none). The block stays white;
//   - the name, 22, the full width, as many lines as it needs;
//   - the description (added and edited HERE, in place, never in a sheet): "Add description" when
//     there is none, the text with a small pencil icon at its end side when there is one, and a
//     text box with Cancel and Save while editing;
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

import { useState } from 'react'
import { FileText, Pencil, Plus } from 'lucide-react'
import HomeSyncLine, { LINE_H } from '../home/HomeSyncLine'
import { SpecialtyIcon, useIsDark } from '../../utils/specialtyIcon'
import { specialtyColors, specialtyHeaderText } from '../../utils/roshettaSpecialty'
import { shortDateText } from '../../utils/roshettaShelfText'
import { ROSHETTA_DESCRIPTION_MAX } from '../../utils/roshettaRows'
import { countText, limitText, saveFailureMessage } from '../../utils/roshettaDetailsText'

const font = 'var(--font-body)'

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
    onEditingChange?.(false)
  }
  async function save() {
    if (saving) return
    const next = draft.trim()
    if (next === text) { stopEdit(); return }
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

  const dateText = (title, value) => (
    <span style={{ whiteSpace: 'nowrap' }}>
      {title}{' '}<span style={{ fontWeight: 500, color: 'var(--color-text-secondary)' }}>{value}</span>
    </span>
  )

  return (
    <div
      style={{
        position: 'relative', backgroundColor: 'var(--color-surface)',
        borderRadius: '0 0 22px 22px',
        margin: '0 calc(-1 * var(--page-gutter, 16px))',
        padding: '4px calc(var(--page-gutter, 16px) + 2px) 12px',
      }}
    >
      <div aria-hidden="true" style={{ position: 'absolute', inset: 0, overflow: 'hidden', borderRadius: 'inherit', pointerEvents: 'none' }}>
        <span
          style={{
            position: 'absolute', insetInlineEnd: -6, bottom: -14, userSelect: 'none',
            fontSize: 76, fontWeight: 700, fontStyle: 'italic', lineHeight: 1,
            color: isDark ? 'var(--color-text-primary)' : look.bg, opacity: isDark ? 0.035 : 0.85,
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

      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 6, marginTop: 2, minWidth: 0 }}>
        <div
          aria-hidden="true"
          style={{
            width: 18, height: 18, borderRadius: 5, flexShrink: 0,
            backgroundColor: look.bg, color: look.fg,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          {specialty
            ? <SpecialtyIcon iconType={specialty.iconType ?? 'lucide'} iconValue={specialty.iconValue ?? 'Stethoscope'} size={11} color={look.fg} />
            : <FileText size={11} strokeWidth={2} />}
        </div>
        <span dir="auto" style={{ minWidth: 0, fontSize: 12, fontWeight: 500, lineHeight: 1.3, color: look.fg, fontFamily: font, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {label}
        </span>
      </div>

      <h1
        dir="auto"
        style={{
          position: 'relative', margin: '6px 0 0', textAlign: 'start', overflowWrap: 'anywhere',
          fontSize: 22, fontWeight: 600, lineHeight: 1.2, letterSpacing: '-0.4px',
          color: 'var(--color-text-primary)', fontFamily: font,
        }}
      >
        {name}
      </h1>

      {editing ? (
        <div style={{ position: 'relative', marginTop: 8 }}>
          <textarea
            value={draft}
            onChange={e => setDraft(limitText(e.target.value, ROSHETTA_DESCRIPTION_MAX))}
            autoFocus
            rows={3}
            dir="auto"
            aria-label="Description"
            placeholder="Who it's for, or when to use it"
            style={{
              width: '100%', boxSizing: 'border-box', resize: 'none', outline: 'none',
              fontSize: 14, lineHeight: 1.5, fontFamily: font, textAlign: 'start',
              color: 'var(--color-text-primary)', backgroundColor: 'var(--color-surface)',
              border: '1.5px solid var(--color-accent)', borderRadius: 12, padding: '10px 12px',
            }}
          />
          {countText(draft) >= Math.floor(ROSHETTA_DESCRIPTION_MAX * 0.8) && (
            <div style={{ marginTop: 4, textAlign: 'end', fontSize: 12, color: 'var(--color-text-secondary)', fontFamily: font }}>
              {countText(draft)}/{ROSHETTA_DESCRIPTION_MAX}
            </div>
          )}
          {error && (
            <div role="alert" style={{ marginTop: 6, fontSize: 12, color: 'var(--color-danger)', fontFamily: font }}>{error}</div>
          )}
          <div style={{ marginTop: 8, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 6 }}>
            <button
              type="button"
              onClick={stopEdit}
              style={{ minHeight: 44, padding: '0 14px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)', fontSize: 14, fontWeight: 500, fontFamily: font, WebkitTapHighlightColor: 'transparent' }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={save}
              style={{
                minHeight: 44, padding: '0 22px', borderRadius: 999, border: 'none', cursor: saving ? 'default' : 'pointer',
                backgroundColor: 'var(--color-accent-solid)', color: '#fff', fontSize: 14, fontWeight: 600,
                fontFamily: font, opacity: saving ? 0.75 : 1, WebkitTapHighlightColor: 'transparent',
              }}
            >
              {saving ? 'Saving\u2026' : 'Save'}
            </button>
          </div>
        </div>
      ) : text ? (
        <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', gap: 6, marginTop: 4 }}>
          <p
            dir="auto"
            onClick={editable ? startEdit : undefined}
            style={{
              flex: 1, minWidth: 0, margin: 0, textAlign: 'start', whiteSpace: 'pre-line', overflowWrap: 'anywhere',
              fontSize: 14, lineHeight: 1.5, color: 'var(--color-text-secondary)', fontFamily: font,
              cursor: editable ? 'pointer' : 'default',
            }}
          >
            {text}
          </p>
          {editable && (
            <button
              type="button"
              onClick={startEdit}
              aria-label="Edit description"
              style={{
                flexShrink: 0, width: 36, height: 36, margin: '-6px -10px -6px 0',
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
            position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 5, minHeight: 36, marginTop: 0, padding: 0,
            background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-accent-text)',
            fontSize: 14, fontWeight: 500, fontFamily: font, WebkitTapHighlightColor: 'transparent',
          }}
        >
          <Plus size={14} aria-hidden="true" />
          Add description
        </button>
      ) : null}

      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 12, marginTop: 10, minHeight: LINE_H }}>
        {(created || showEdited) && (
          <div style={{ display: 'flex', flexShrink: 0, gap: 12, fontSize: 12, lineHeight: 1.3, color: 'var(--color-text-tertiary)', fontFamily: font }}>
            {created && dateText('Created', created)}
            {showEdited && dateText('Edited', edited)}
          </div>
        )}
        <div style={{ position: 'relative', flex: 1, minWidth: 0, height: LINE_H }}>
          <HomeSyncLine inside end kind={syncKind} text={syncText} actionLabel={syncActionLabel} onAction={onSyncAction} />
        </div>
      </div>
    </div>
  )
}
