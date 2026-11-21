// src/components/roshettas/RoshettaPadHeader.jsx
// 2026-11-21 (Roshetta plan, step 8.3b): the header of the owner's roshetta page, built like the
// topic sheet's header (a white block with a rounded bottom, Back and the specialty on the top
// row, the actions on the end side) and drawn like the Home roshetta card: a hairline in the
// specialty colour, a faint italic Rx behind the name, the name, the description, and the day
// with a small clock.
// 2026-11-21 (after the phone look): no hairline; the Rx sits in the bottom corner like the Home
// card; the name and description use the full width; the description's edit is a small pencil
// icon at its end side; the foot shows Created (calendar mark) and, when it is a different day,
// Edited (clock). The description is added and edited HERE, in place (never in a sheet):
// 'Add description' when there is none, a small 'Edit description' link when there is one, and
// a text box with Cancel and Save while editing.
//
// Props:
//   name, description, specialty (the picker shape, or null), createdAt and updatedAt (ISO text), waiting
//   topLeft      node: the Back button
//   topRight     node: the Share button and the options menu
//   editable     boolean: the owner may change the description (false when read only)
//   onSaveDescription  (text) => Promise<{ ok, reason? }>
//   onEditingChange    (boolean) => void   tells the page to hide its bottom bar while typing
//   isPro        boolean (for the limit wording of a refusal)

import { useState } from 'react'
import { CalendarPlus, Clock, CloudUpload, FileText, Pencil, Plus } from 'lucide-react'
import { SpecialtyIcon, useIsDark } from '../../utils/specialtyIcon'
import { specialtyColors, specialtyHeaderText } from '../../utils/roshettaSpecialty'
import { shortDateText } from '../../utils/roshettaShelfText'
import { ROSHETTA_DESCRIPTION_MAX } from '../../utils/roshettaRows'
import { countText, limitText, saveFailureMessage } from '../../utils/roshettaDetailsText'

const font = 'var(--font-body)'
const linkButton = {
  display: 'inline-flex', alignItems: 'center', gap: 5, minHeight: 32, padding: 0,
  background: 'none', border: 'none', cursor: 'pointer', fontFamily: font, fontSize: 13,
  WebkitTapHighlightColor: 'transparent',
}

export default function RoshettaPadHeader({
  name, description = '', specialty = null, createdAt, updatedAt, waiting = false,
  topLeft, topRight, editable = false, onSaveDescription, onEditingChange, isPro = false,
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

  return (
    <div
      style={{
        position: 'relative', backgroundColor: 'var(--color-surface)',
        borderRadius: '0 0 18px 18px',
        margin: '0 calc(-1 * var(--page-gutter, 16px))',
        padding: '12px var(--page-gutter, 16px) 16px',
      }}
    >
      <div aria-hidden="true" style={{ position: 'absolute', inset: 0, overflow: 'hidden', borderRadius: 'inherit', pointerEvents: 'none' }}>
        <span
          style={{
            position: 'absolute', insetInlineEnd: -6, bottom: -14, userSelect: 'none',
            fontSize: 84, fontWeight: 700, fontStyle: 'italic', lineHeight: 1,
            color: isDark ? 'var(--color-text-primary)' : look.bg, opacity: isDark ? 0.035 : 0.7,
            fontFamily: 'Georgia, \'Times New Roman\', serif',
          }}
        >
          Rx
        </span>
      </div>

      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          {topLeft}
          <span aria-hidden="true" style={{ width: 3, height: 3, borderRadius: '50%', backgroundColor: 'var(--color-text-tertiary)', opacity: 0.6, flexShrink: 0 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 0, color: look.fg }}>
            {specialty
              ? <SpecialtyIcon iconType={specialty.iconType ?? 'lucide'} iconValue={specialty.iconValue ?? 'Stethoscope'} size={12} color={look.fg} />
              : <FileText size={12} strokeWidth={2} style={{ flexShrink: 0 }} aria-hidden="true" />}
            <span dir="auto" style={{ fontSize: 12, fontWeight: 400, letterSpacing: '0.03em', lineHeight: 1.2, color: 'var(--color-text-secondary)', fontFamily: font, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {label}
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>{topRight}</div>
      </div>

      <h1
        dir="auto"
        style={{
          position: 'relative', margin: 0, textAlign: 'start', overflowWrap: 'anywhere',
          fontSize: 22, fontWeight: 600, lineHeight: 1.2, letterSpacing: '-0.4px',
          color: 'var(--color-text-primary)', fontFamily: font,
        }}
      >
        {name}
      </h1>

      {editing ? (
        <div style={{ position: 'relative', marginTop: 10 }}>
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
          <div style={{ marginTop: 8, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 8 }}>
            <button type="button" onClick={stopEdit} style={{ ...linkButton, minHeight: 44, padding: '0 12px', color: 'var(--color-text-secondary)', fontWeight: 500 }}>
              Cancel
            </button>
            <button
              type="button"
              onClick={save}
              style={{
                minHeight: 44, padding: '0 20px', borderRadius: 999, border: 'none', cursor: saving ? 'default' : 'pointer',
                backgroundColor: 'var(--color-accent-solid)', color: '#fff', fontSize: 14, fontWeight: 600,
                fontFamily: font, opacity: saving ? 0.75 : 1, WebkitTapHighlightColor: 'transparent',
              }}
            >
              {saving ? 'Saving\u2026' : 'Save'}
            </button>
          </div>
        </div>
      ) : text ? (
        <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', gap: 4, marginTop: 6 }}>
          <p
            dir="auto"
            onClick={editable ? startEdit : undefined}
            style={{
              flex: 1, minWidth: 0, margin: 0, padding: '4px 0', textAlign: 'start', whiteSpace: 'pre-line', overflowWrap: 'anywhere',
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
                flexShrink: 0, width: 36, height: 36, marginInlineEnd: -8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--color-text-tertiary)',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              <Pencil size={16} aria-hidden="true" />
            </button>
          )}
        </div>
      ) : editable ? (
        <button type="button" onClick={startEdit} style={{ ...linkButton, position: 'relative', marginTop: 6, color: 'var(--color-accent-text)', fontWeight: 500 }}>
          <Plus size={14} aria-hidden="true" />
          Add description
        </button>
      ) : null}

      {(created || showEdited || waiting) && (
        <div style={{ position: 'relative', marginTop: 14, display: 'flex', alignItems: 'center', flexWrap: 'wrap', columnGap: 14, rowGap: 4, color: 'var(--color-text-tertiary)' }}>
          {created && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 500, fontFamily: font }}>
              <CalendarPlus size={12} strokeWidth={2} aria-hidden="true" />
              {`Created ${created}`}
            </span>
          )}
          {showEdited && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 500, fontFamily: font }}>
              <Clock size={12} strokeWidth={2} aria-hidden="true" />
              {`Edited ${edited}`}
            </span>
          )}
          {waiting && (
            <span role="img" aria-label="Waiting to save" style={{ display: 'inline-flex', color: 'var(--color-warning)' }}>
              <CloudUpload size={14} strokeWidth={2} aria-hidden="true" />
            </span>
          )}
        </div>
      )}
    </div>
  )
}
