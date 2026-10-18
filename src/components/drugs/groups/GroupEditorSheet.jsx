/**
 * src/components/drugs/groups/GroupEditorSheet.jsx
 * 2026-10-19 (Drug groups plan, step 4.1): the bottom sheet for making a group
 * or changing one. Name (required, 40 characters), description (optional,
 * 200 characters with a counter), colour (one of five), and Save.
 *
 * Props:
 *   isOpen   boolean
 *   onClose  () => void   closes the sheet for good (the unsaved-changes
 *                         question is asked here first when needed)
 *   group    the group being changed, or null for a new group
 *   onSaved  (group | null) => void   called after a successful save
 *
 * Rules:
 *  - Save with an empty name shows "Enter a group name" under the name. The
 *    Save button is never greyed out.
 *  - Closing by the X, the dim background, a drag down or the phone back
 *    button asks first when something was changed (useDirtyState).
 *  - If saving fails the sheet stays open with a short message and nothing
 *    typed is lost.
 *  - Names and descriptions typed in Arabic read right-to-left.
 *
 * Later steps add the drug search (4.2), the group's own drug list (4.3) and
 * Delete group (4.4) inside this sheet.
 */

import { useMemo, useRef, useState } from 'react'
import { Check, X } from 'lucide-react'
import SheetShell from '../../ui/SheetShell'
import ConfirmSheet from '../../ui/ConfirmSheet'
import { useFavouritesContext } from '../../../context/FavouritesContext'
import { useIsPro } from '../../../hooks/useIsPro'
import { useDirtyState } from '../../../hooks/useDirtyState'
import { GROUP_NAME_MAX, GROUP_DESCRIPTION_MAX, GROUP_COLORS } from '../../../hooks/useDrugGroups'
import { resolveToken } from '../../../utils/specialtyTokens'
import { useIsDark } from '../../../utils/specialtyIcon'
import { getTextDirection } from '../../../utils/textDirection'

const COLOR_LABELS = { blue: 'Blue', teal: 'Teal', violet: 'Violet', amber: 'Amber', rose: 'Rose' }
const BLANK = { name: '', description: '', color: GROUP_COLORS[0] }

function saveFailureMessage(reason, isPro) {
  switch (reason) {
    case 'guest':     return 'Sign in to save groups.'
    case 'offline':   return "You're offline. Reconnect to change your groups."
    case 'read_only': return 'Your groups are read only. Delete a group or upgrade to edit.'
    case 'limit':     return isPro
      ? "You've reached 100 groups. Delete one to add another."
      : 'Free accounts can keep 1 group. Upgrade to Pro for more.'
    default:          return "Couldn't save your group. Try again."
  }
}

const LABEL_STYLE = {
  display: 'block', marginBottom: 6,
  fontSize: 12, fontWeight: 600, letterSpacing: '0.02em',
  color: 'var(--color-text-secondary)', fontFamily: 'var(--font-body)',
}

const FIELD_STYLE = {
  width: '100%', boxSizing: 'border-box',
  fontSize: 15, lineHeight: 1.4,
  color: 'var(--color-text-primary)',
  backgroundColor: 'var(--color-surface-muted)',
  borderRadius: 12, padding: '12px 14px',
  fontFamily: 'var(--font-body)', outline: 'none',
}

export default function GroupEditorSheet({ isOpen, onClose, group = null, onSaved }) {
  const { createGroup, updateGroup } = useFavouritesContext()
  const isPro = useIsPro()
  const isDark = useIsDark()
  const isEdit = !!group

  // What the sheet starts with each time it opens.
  const initial = useMemo(
    () => (group
      ? { name: group.name ?? '', description: group.description ?? '', color: group.color ?? BLANK.color }
      : BLANK),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isOpen, group?.id],
  )

  const [name, setName] = useState(initial.name)
  const [description, setDescription] = useState(initial.description)
  const [color, setColor] = useState(initial.color)
  const [nameError, setNameError] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [saving, setSaving] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const nameRef = useRef(null)

  // Start fresh each time the sheet opens (set while drawing, not in an effect).
  const [wasOpen, setWasOpen] = useState(false)
  if (isOpen !== wasOpen) {
    setWasOpen(isOpen)
    if (isOpen) {
      setName(initial.name)
      setDescription(initial.description)
      setColor(initial.color)
      setNameError(false)
      setSaveError('')
      setSaving(false)
      setConfirmOpen(false)
    }
  }

  const current = useMemo(() => ({ name, description, color }), [name, description, color])
  const isDirty = useDirtyState(initial, current)

  // Every way of closing comes through here.
  function requestClose() {
    if (saving) return
    if (isDirty) { setConfirmOpen(true); return }
    onClose()
  }

  async function handleSave() {
    if (saving) return
    const cleanName = name.trim()
    if (!cleanName) {
      setNameError(true)
      nameRef.current?.focus()
      return
    }
    if (isEdit && !isDirty) { onClose(); return }
    setSaving(true)
    setSaveError('')
    const fields = { name: cleanName, description: description.trim(), color }
    let res
    try {
      res = isEdit ? await updateGroup(group.id, fields) : await createGroup(fields)
    } catch {
      res = { ok: false, reason: 'error' }
    }
    setSaving(false)
    if (res?.ok) {
      onSaved?.(res.group ?? null)
      onClose()
      return
    }
    setSaveError(saveFailureMessage(res?.reason, isPro))
  }

  return (
    <>
      <SheetShell isOpen={isOpen} onClose={requestClose} ariaLabel={isEdit ? 'Edit group' : 'New group'}>
        {/* Title row */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 var(--space-4) var(--space-3)', flexShrink: 0,
        }}>
          <div style={{
            fontSize: 17, fontWeight: 700, color: 'var(--color-text-primary)',
            fontFamily: 'var(--font-body)',
          }}>
            {isEdit ? 'Edit group' : 'New group'}
          </div>
          <button
            onClick={requestClose}
            aria-label="Close"
            style={{
              width: 36, height: 36, borderRadius: '50%', border: 'none',
              backgroundColor: 'var(--color-surface-muted)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              WebkitTapHighlightColor: 'transparent', outline: 'none',
            }}
          >
            <X size={18} color="var(--color-text-secondary)" aria-hidden="true" />
          </button>
        </div>

        {/* Fields (this part scrolls when the keyboard is up) */}
        <div style={{
          flex: 1, minHeight: 0, overflowY: 'auto', overscrollBehavior: 'contain',
          padding: '0 var(--space-4) var(--space-3)',
          display: 'flex', flexDirection: 'column', gap: 'var(--space-4)',
        }}>
          <div>
            <label htmlFor="group-name" style={LABEL_STYLE}>Name</label>
            <input
              id="group-name"
              ref={nameRef}
              type="text"
              value={name}
              onChange={e => { setName(e.target.value.slice(0, GROUP_NAME_MAX)); if (nameError) setNameError(false) }}
              maxLength={GROUP_NAME_MAX}
              placeholder="For example ICU drips"
              dir={getTextDirection(name)}
              aria-invalid={nameError}
              aria-describedby={nameError ? 'group-name-error' : undefined}
              style={{
                ...FIELD_STYLE,
                border: nameError ? '1.5px solid var(--color-danger)' : '1.5px solid transparent',
              }}
            />
            {nameError && (
              <div id="group-name-error" role="alert" style={{
                marginTop: 6, fontSize: 12, color: 'var(--color-danger)', fontFamily: 'var(--font-body)',
              }}>
                Enter a group name
              </div>
            )}
          </div>

          <div>
            <label htmlFor="group-description" style={LABEL_STYLE}>Description (optional)</label>
            <textarea
              id="group-description"
              value={description}
              onChange={e => setDescription(e.target.value.slice(0, GROUP_DESCRIPTION_MAX))}
              maxLength={GROUP_DESCRIPTION_MAX}
              rows={3}
              placeholder="What is this group for?"
              dir={getTextDirection(description)}
              style={{ ...FIELD_STYLE, border: '1.5px solid transparent', resize: 'none' }}
            />
            <div style={{
              marginTop: 4, textAlign: 'end', fontSize: 11,
              color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-body)',
            }}>
              {description.length}/{GROUP_DESCRIPTION_MAX}
            </div>
          </div>

          <div>
            <span id="group-colour-label" style={LABEL_STYLE}>Colour</span>
            <div role="radiogroup" aria-labelledby="group-colour-label" style={{ display: 'flex', gap: 'var(--space-3)' }}>
              {GROUP_COLORS.map(c => {
                const tone = resolveToken(c, isDark)
                const selected = c === color
                return (
                  <button
                    key={c}
                    role="radio"
                    aria-checked={selected}
                    aria-label={COLOR_LABELS[c]}
                    onClick={() => setColor(c)}
                    style={{
                      width: 40, height: 40, borderRadius: '50%', padding: 0, cursor: 'pointer',
                      backgroundColor: tone.bg,
                      border: selected ? `2px solid ${tone.fg}` : '2px solid transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      WebkitTapHighlightColor: 'transparent', outline: 'none',
                    }}
                  >
                    {selected && <Check size={18} strokeWidth={2.4} color={tone.fg} aria-hidden="true" />}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Save */}
        <div style={{ padding: 'var(--space-2) var(--space-4) var(--space-4)', flexShrink: 0 }}>
          {saveError && (
            <div role="alert" style={{
              marginBottom: 'var(--space-2)', fontSize: 13, textAlign: 'center',
              color: 'var(--color-danger)', fontFamily: 'var(--font-body)',
            }}>
              {saveError}
            </div>
          )}
          <button
            onClick={handleSave}
            style={{
              width: '100%', height: 48, borderRadius: 12, border: 'none',
              backgroundColor: 'var(--color-accent)', color: '#fff',
              fontSize: 15, fontWeight: 600, fontFamily: 'var(--font-body)',
              cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.75 : 1,
              WebkitTapHighlightColor: 'transparent', outline: 'none',
            }}
          >
            {saving ? 'Saving\u2026' : 'Save'}
          </button>
        </div>
      </SheetShell>

      <ConfirmSheet
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => onClose()}
        title="Discard changes?"
        message="Your changes to this group won't be saved."
        confirmLabel="Discard"
        destructive
      />
    </>
  )
}
