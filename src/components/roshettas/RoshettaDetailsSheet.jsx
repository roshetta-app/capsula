/**
 * src/components/roshettas/RoshettaDetailsSheet.jsx
 * 2026-11-13 (Roshetta plan, step 4.1b): the bottom sheet for making a roshetta or
 * changing its name and specialty (the description is edited on the roshetta page, never here; 2026-11-21). Modelled on the groups sheet
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
 *  - Specialty (2026-11-16, Roshetta plan 10.5): an optional row under the name. It
 *    shows the chosen specialty (icon, name) or 'None', opens the same specialty picker
 *    the Topics screen uses (with a 'No specialty' row on top), and has a small X to clear
 *    it. Its colour tints the row's icon only; the card colours come in step 10.6. A
 *    specialty changed here counts as a change (the discard question and the unchanged-close
 *    rule see it). A specialty left alone is never sent, so a rename cannot touch it.
 *    The list comes from the Topics data already on the phone, so the row works offline.
 *  - Name is required, 40 characters (the counter shows only near the limit).
 *    Both show a counter ("12/40"). Typing stops at the limit, counted as people
 *    count (an emoji is one). Names need not be unique (decision D), so there is
 *    no "name taken" case.
 *  - Save with an empty name shows "Enter a roshetta name" under the name. The
 *    Save button is never greyed out. Saving with nothing changed just closes.
 *  - Closing by the X, the dim background, a drag down or the phone back button
 *    asks first when something was changed (useDirtyState).
 *  - Saving goes through the roshetta hook, so it shows at once and is sent in the
 *    background (offline first). Changing a roshetta saves only the name and
 *    specialty: its drugs, text blocks and description keep what they have.
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
import { AlertCircle, ChevronRight, FileText, X } from 'lucide-react'
import SheetShell from '../ui/SheetShell'
import ConfirmSheet from '../ui/ConfirmSheet'
import SpecialtiesBottomSheet from '../conditions/SpecialtiesBottomSheet'
import { SpecialtyIcon, useIsDark } from '../../utils/specialtyIcon'
import { useConditionContext } from '../../context/ConditionContext'
import { useFavouritesContext } from '../../context/FavouritesContext'
import { useIsPro } from '../../hooks/useIsPro'
import { useDirtyState } from '../../hooks/useDirtyState'
import { ROSHETTA_NAME_MAX } from '../../utils/roshettaRows'
import { countText, limitText, nameProblem, saveFailureMessage, specialtyRowText, detailsFields } from '../../utils/roshettaDetailsText'
import { findSpecialty, specialtyColors } from '../../utils/roshettaSpecialty'

const LABEL_STYLE = {
  display: 'block', marginBottom: 6,
  fontSize: 13, fontWeight: 500,
  color: 'var(--color-text-secondary)', fontFamily: 'var(--font-body)',
}

const FIELD_STYLE = {
  width: '100%', boxSizing: 'border-box',
  fontSize: 15, lineHeight: 1.4,
  color: 'var(--color-text-primary)',
  backgroundColor: 'var(--color-surface)',
  borderRadius: 12, padding: '12px 14px',
  fontFamily: 'var(--font-body)', outline: 'none',
}

const COUNTER_STYLE = {
  marginTop: 4, textAlign: 'end', fontSize: 12,
  color: 'var(--color-text-secondary)', fontFamily: 'var(--font-body)',
}

export default function RoshettaDetailsSheet({ isOpen, onClose, roshetta = null, onSaved }) {
  const { roshettasApi } = useFavouritesContext()
  const { createRoshetta, saveRoshetta } = roshettasApi
  const isPro = useIsPro()
  const { specialties } = useConditionContext()
  const isDark = useIsDark()
  const isEdit = !!roshetta

  const [name, setName] = useState('')
  const [specialtyId, setSpecialtyId] = useState(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  // What the sheet started with this time it opened (to know whether anything changed).
  const [start, setStart] = useState({ name: '', specialtyId: null })
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
      const first = {
        name: roshetta?.name ?? '',
        specialtyId: roshetta?.specialtyId ?? null,
      }
      setName(first.name)
      setSpecialtyId(first.specialtyId)
      setStart(first)
      setPickerOpen(false)
      setNameError(false)
      setSaveError('')
      setSaving(false)
      setConfirmOpen(false)
    }
  }

  const isDirty = useDirtyState(start, { name, specialtyId })

  // The chosen specialty from the list on the phone (null: none, or no longer in the list).
  const specialty = findSpecialty(specialtyId, specialties)
  const specialtyLook = specialtyColors(specialty, isDark)

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
    const fields = detailsFields({ name, specialtyId, start })
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
        ariaLabel={isEdit ? 'Edit details' : 'New roshetta'}
        keyboardAware
        dismissOnlyByBackdrop
      >
        {/* Title row */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 var(--space-4) var(--space-2)', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
            <div aria-hidden="true" style={{
              width: 36, height: 36, borderRadius: 10, flexShrink: 0,
              backgroundColor: 'var(--color-accent-light)', color: 'var(--color-accent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <FileText size={18} strokeWidth={2} />
            </div>
            <div style={{
              fontSize: 18, fontWeight: 600, color: 'var(--color-text-primary)',
              fontFamily: 'var(--font-body)',
            }}>
              {isEdit ? 'Edit details' : 'New roshetta'}
            </div>
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
              placeholder="Acute chest pain, adult"
              dir="auto"
              aria-invalid={nameError}
              aria-describedby={nameError ? 'roshetta-name-error' : undefined}
              style={{
                ...FIELD_STYLE,
                textAlign: 'start',
                border: nameError ? '1.5px solid var(--color-danger)' : '1.5px solid var(--color-border)',
              }}
            />
            {nameError && (
              <div id="roshetta-name-error" role="alert" style={{
                marginTop: 6, display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--color-danger)', fontFamily: 'var(--font-body)',
              }}>
                <AlertCircle size={14} aria-hidden="true" />
                {nameProblem(name) || 'Enter a roshetta name'}
              </div>
            )}
            {countText(name) >= Math.floor(ROSHETTA_NAME_MAX * 0.8) && (
              <div style={COUNTER_STYLE}>{countText(name)}/{ROSHETTA_NAME_MAX}</div>
            )}
          </div>

          <div>
            <div id="roshetta-specialty-label" style={LABEL_STYLE}>
              Specialty <span style={{ fontWeight: 400, color: 'var(--color-text-tertiary)' }}>Optional</span>
            </div>
            <div style={{
              ...FIELD_STYLE, padding: 0,
              display: 'flex', alignItems: 'center',
            }}>
              <button
                type="button"
                onClick={() => { document.activeElement?.blur?.(); setPickerOpen(true) }}
                aria-labelledby="roshetta-specialty-label roshetta-specialty-value"
                aria-haspopup="dialog"
                style={{
                  flex: 1, minWidth: 0, minHeight: 48,
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '12px 14px', border: 'none', background: 'none',
                  textAlign: 'start', cursor: 'pointer', outline: 'none',
                  fontSize: 15, lineHeight: 1.4, fontFamily: 'var(--font-body)',
                  color: specialty ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                {specialty && (
                  <SpecialtyIcon
                    iconType={specialty.iconType ?? 'lucide'}
                    iconValue={specialty.iconValue ?? 'Stethoscope'}
                    size={18}
                    color={specialtyLook.fg}
                  />
                )}
                <span id="roshetta-specialty-value" dir="auto" style={{ flex: 1, minWidth: 0, overflowWrap: 'anywhere' }}>
                  {specialty ? specialtyRowText(specialty) : 'Select a specialty'}
                </span>
                {!specialty && (
                  <ChevronRight size={18} color="var(--color-text-tertiary)" aria-hidden="true" />
                )}
              </button>
              {specialty && (
                <button
                  type="button"
                  onClick={() => setSpecialtyId(null)}
                  aria-label="Clear specialty"
                  style={{
                    width: 44, height: 44, flexShrink: 0, border: 'none', background: 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', outline: 'none', WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  <X size={18} color="var(--color-text-secondary)" aria-hidden="true" />
                </button>
              )}
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
              width: '100%', minHeight: 48, borderRadius: 999, border: 'none',
              backgroundColor: 'var(--color-accent-solid)', color: '#fff',
              fontSize: 15, fontWeight: 600, fontFamily: 'var(--font-body)',
              cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.75 : 1,
              WebkitTapHighlightColor: 'transparent', outline: 'none',
            }}
          >
            {saving ? 'Saving\u2026' : (isEdit ? 'Save changes' : 'Create roshetta')}
          </button>
        </div>
      </SheetShell>

      <SpecialtiesBottomSheet
        isOpen={pickerOpen}
        onClose={() => setPickerOpen(false)}
        specialties={specialties}
        activeSpecialty={specialty?.id ?? null}
        onSelect={id => setSpecialtyId(id ?? null)}
        allowAll={false}
        noneLabel="No specialty"
        zIndex={300}
      />

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
