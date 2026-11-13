/**
 * src/components/roshettas/RoshettaDetailsSheet.jsx
 * 2026-11-13 (Roshetta plan, step 4.1b): the bottom sheet for making a roshetta or
 * changing its name and description. Modelled on the groups sheet
 * (drugs/groups/GroupEditorSheet.jsx), without colour, drugs or delete: the
 * drugs and doses are edited in the editor (Phase D) and Delete is in the
 * roshetta page's menu (step 4.2b).
 *
 * Props:
 *   isOpen    boolean
 *   onClose   () => void   closes the sheet for good (the unsaved-changes question
 *                          is asked here first when needed)
 *   roshetta  the roshetta being changed ({ id, name, description }), or null for a new one
 *   onSaved   (roshetta | null) => void   called after a successful save. A new
 *                          roshetta is passed in, so the screen can open it.
 *
 * Rules:
 *  - Name is required, 40 characters; description is optional, 200 characters.
 *    Both show a counter ("12/40"). Typing stops at the limit, counted as people
 *    count (an emoji is one). Names need not be unique (decision D), so there is
 *    no "name taken" case.
 *  - Save with an empty name shows "Enter a roshetta name" under the name. The
 *    Save button is never greyed out. Saving with nothing changed just closes.
 *  - Closing by the X, the dim background, a drag down or the phone back button
 *    asks first when something was changed (useDirtyState).
 *  - Saving goes through the roshetta hook, so it shows at once and is sent in the
 *    background (offline first). Changing a roshetta saves only the name and
 *    description: its drugs and text blocks keep what they have.
 *  - If the hook refuses (signed out, still loading, limit, read only, deleted on
 *    another device) the sheet stays open with a short message and nothing typed
 *    is lost. The limit sheets are not opened from here: the screen checks the
 *    limit before it opens this sheet, so a refusal here is rare (another phone
 *    changed things a moment ago).
 *  - Text follows its own direction (Arabic from the right), like the list row
 *    and the sheet viewer.
 *  - Opens with keyboardAware and dismissOnlyByBackdrop (see SheetShell).
 */

import { useRef, useState } from 'react'
import { X } from 'lucide-react'
import SheetShell from '../ui/SheetShell'
import ConfirmSheet from '../ui/ConfirmSheet'
import { useFavouritesContext } from '../../context/FavouritesContext'
import { useIsPro } from '../../hooks/useIsPro'
import { useDirtyState } from '../../hooks/useDirtyState'
import { ROSHETTA_NAME_MAX, ROSHETTA_DESCRIPTION_MAX } from '../../utils/roshettaRows'
import { countText, limitText, nameProblem, saveFailureMessage } from '../../utils/roshettaDetailsText'

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

const COUNTER_STYLE = {
  marginTop: 4, textAlign: 'end', fontSize: 11,
  color: 'var(--color-text-secondary)', fontFamily: 'var(--font-body)',
}

export default function RoshettaDetailsSheet({ isOpen, onClose, roshetta = null, onSaved }) {
  const { roshettasApi } = useFavouritesContext()
  const { createRoshetta, saveRoshetta } = roshettasApi
  const isPro = useIsPro()
  const isEdit = !!roshetta

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  // What the sheet started with this time it opened (to know whether anything changed).
  const [start, setStart] = useState({ name: '', description: '' })
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
      const first = { name: roshetta?.name ?? '', description: roshetta?.description ?? '' }
      setName(first.name)
      setDescription(first.description)
      setStart(first)
      setNameError(false)
      setSaveError('')
      setSaving(false)
      setConfirmOpen(false)
    }
  }

  const isDirty = useDirtyState(start, { name, description })

  // Every way of closing comes through here.
  function requestClose() {
    if (saving) return
    if (isDirty) { setConfirmOpen(true); return }
    onClose()
  }

  async function handleSave() {
    if (saving) return
    if (nameProblem(name)) {
      setNameError(true)
      nameRef.current?.focus()
      return
    }
    if (isEdit && !isDirty) { onClose(); return }
    setSaving(true)
    setSaveError('')
    const fields = { name: name.trim(), description: description.trim() }
    let res
    try {
      res = isEdit ? await saveRoshetta(roshetta.id, fields) : await createRoshetta(fields)
    } catch {
      res = { ok: false, reason: 'error' }
    }
    setSaving(false)
    if (!res?.ok) {
      setSaveError(saveFailureMessage(res?.reason, isPro))
      return
    }
    onSaved?.(res.roshetta ?? null)
    onClose()
  }

  return (
    <>
      <SheetShell
        isOpen={isOpen}
        onClose={requestClose}
        ariaLabel={isEdit ? 'Edit roshetta' : 'New roshetta'}
        keyboardAware
        dismissOnlyByBackdrop
      >
        {/* Title row */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 var(--space-4) var(--space-2)', flexShrink: 0,
        }}>
          <div style={{
            fontSize: 18, fontWeight: 700, color: 'var(--color-text-primary)',
            fontFamily: 'var(--font-body)',
          }}>
            {isEdit ? 'Edit roshetta' : 'New roshetta'}
          </div>
          <button
            onClick={requestClose}
            aria-label="Close"
            style={{
              width: 44, height: 44, borderRadius: '50%', border: 'none',
              backgroundColor: 'var(--color-surface-muted)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              WebkitTapHighlightColor: 'transparent', outline: 'none',
            }}
          >
            <X size={20} color="var(--color-text-secondary)" aria-hidden="true" />
          </button>
        </div>

        {/* Fields (this part scrolls when the keyboard is up) */}
        <div style={{
          flex: 1, minHeight: 0, overflowY: 'auto', overscrollBehavior: 'contain',
          padding: '0 var(--space-4) var(--space-3)',
          display: 'flex', flexDirection: 'column', gap: 'var(--space-4)',
        }}>
          <div>
            <label htmlFor="roshetta-name" style={LABEL_STYLE}>Name</label>
            <input
              id="roshetta-name"
              ref={nameRef}
              type="text"
              value={name}
              onChange={e => { setName(limitText(e.target.value, ROSHETTA_NAME_MAX)); if (nameError) setNameError(false) }}
              placeholder="e.g. Chest pain, adult"
              dir="auto"
              aria-invalid={nameError}
              aria-describedby={nameError ? 'roshetta-name-error' : undefined}
              style={{
                ...FIELD_STYLE,
                textAlign: 'start',
                border: nameError ? '1.5px solid var(--color-danger)' : '1.5px solid transparent',
              }}
            />
            {nameError && (
              <div id="roshetta-name-error" role="alert" style={{
                marginTop: 6, fontSize: 12, color: 'var(--color-danger)', fontFamily: 'var(--font-body)',
              }}>
                {nameProblem(name) || 'Enter a roshetta name'}
              </div>
            )}
            <div style={COUNTER_STYLE}>{countText(name)}/{ROSHETTA_NAME_MAX}</div>
          </div>

          <div>
            <label htmlFor="roshetta-description" style={LABEL_STYLE}>Description (optional)</label>
            <textarea
              id="roshetta-description"
              value={description}
              onChange={e => setDescription(limitText(e.target.value, ROSHETTA_DESCRIPTION_MAX))}
              rows={3}
              placeholder="e.g. My version for the ward"
              dir="auto"
              style={{ ...FIELD_STYLE, textAlign: 'start', border: '1.5px solid transparent', resize: 'none' }}
            />
            <div style={COUNTER_STYLE}>{countText(description)}/{ROSHETTA_DESCRIPTION_MAX}</div>
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
              width: '100%', minHeight: 48, borderRadius: 'var(--radius-md)', border: 'none',
              backgroundColor: 'var(--color-accent-solid)', color: '#fff',
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
        message="Your changes to this roshetta won't be saved."
        confirmLabel="Discard"
        destructive
      />
    </>
  )
}
