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
 *   initialBrandIds  brand ids a NEW group starts with (the Add to group sheet
 *                    passes the drug being added); ignored when changing a group
 *   onDeleted (group) => void         called after a successful delete, with
 *                                     the group as it was (for Undo)
 *   shared   boolean  (2026-10-19, step 8.1) true when the group has a live share
 *                     link; the delete question then says the link stops too
 *
 * Rules:
 *  - Save with an empty name shows "Enter a group name" under the name. The
 *    Save button is never greyed out.
 *  - Closing by the X, the dim background, a drag down or the phone back
 *    button asks first when something was changed (useDirtyState).
 *  - If saving fails the sheet stays open with a short message and nothing
 *    typed is lost.
 *  - Arabic names and descriptions sit left-aligned, like English ones
 *    (decision 2026-10-19; the letters themselves still join as Arabic).
 *  - Opens with keyboardAware and dismissOnlyByBackdrop (see SheetShell):
 *    the sheet no longer shrinks when the keyboard opens, and tapping a
 *    toast or the discard dialog above it does not count as a tap outside.
 *
 * 2026-10-19 (step 4.2, retired in step 13.2, see the last note): the sheet also held the group's drugs as a draft
 * (brandIds). A search box under Colour (GroupDrugSearch) adds drugs to the
 * draft; nothing is written until Save, which saves the group first and then
 * its drugs in one call (setGroupDrugs). A new group is created first, so if
 * the drugs fail to save the sheet stays open knowing the group now exists
 * (createdId) and a second Save does not make a duplicate. Discarding drops
 * the draft. At the limit (free 20, Pro 50 per group) the plus shows a message
 * (the limit sheet arrives in Phase 7).
 *
 * 2026-10-19 (step 4.3, retired in step 13.2): while the search box was empty the sheet shows the
 * group's own drugs, A to Z, each with a remove button (GroupDrugList). Removing
 * only changes the draft. With no drugs the search hint shows.
 *
 * 2026-10-19 (step 4.4): when changing an existing group, a Delete group
 * button sits at the bottom of the fields. It asks first (ConfirmSheet), then
 * deletes, closes the sheet and tells the caller (onDeleted) so it can offer
 * Undo. If the delete fails the confirm stays open with a short message.
 * Deleting needs no 'discard changes' question: it replaces it.
 *
 * 2026-10-21 (Drug groups plan, step 13.2, decision 7 and findings F15, F16): slim sheet.
 * Drugs are no longer added or removed here (the group page has Add and Remove; the
 * drug search and list that lived in this sheet are retired). The sheet has the name,
 * description, colour, Delete group (editing only) and a fixed Save.
 *   - A NEW group still starts with 'initialBrandIds' (the Add to group sheet passes the
 *     drug being viewed) and receives them when it is created; with none, it is created
 *     empty and its page invites Add. Changing an existing group never touches its drugs.
 *   - Colour (F15): the five group colours as solid 32 px circles (44 px to tap) with a
 *     ring and a tick on the chosen one; the tiles and headers keep their soft tint.
 *   - Close button is 44 px. Delete group sits at the very end of the form, apart from
 *     the fields, under a thin line. Field limits (40 and 200), the unsaved-changes and
 *     delete questions are unchanged.
 */

import { useMemo, useRef, useState } from 'react'
import { Check, Trash2, X } from 'lucide-react'
import SheetShell from '../../ui/SheetShell'
import ConfirmSheet from '../../ui/ConfirmSheet'
import { useFavouritesContext } from '../../../context/FavouritesContext'
import { useIsPro } from '../../../hooks/useIsPro'
import { useDirtyState } from '../../../hooks/useDirtyState'
import { GROUP_NAME_MAX, GROUP_DESCRIPTION_MAX, GROUP_COLORS, NAME_TAKEN_MESSAGE, groupNameKey } from '../../../hooks/useDrugGroups'
import { resolveToken } from '../../../utils/specialtyTokens'
import { useIsDark } from '../../../utils/specialtyIcon'
import { groupsLimitMessage, drugsLimitMessage } from './groupMessages'

const COLOR_LABELS = { blue: 'Blue', teal: 'Teal', violet: 'Violet', amber: 'Amber', rose: 'Rose' }
const BLANK = { name: '', description: '', color: GROUP_COLORS[0], brandIds: [] }

function sameIds(a, b) {
  return a.length === b.length && a.slice().sort().join('|') === b.slice().sort().join('|')
}

function saveFailureMessage(reason, isPro) {
  switch (reason) {
    case 'guest':     return 'Sign in to save groups.'
    case 'offline':   return "You're offline. Reconnect to change your groups."
    case 'read_only': return 'Your groups are read only. Delete a group or upgrade to edit.'
    case 'limit':     return groupsLimitMessage(isPro)
    case 'drugs_limit': return drugsLimitMessage(isPro)
    case 'drugs_error': return 'Group saved, but its drugs were not. Tap Save to try again.'
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

export default function GroupEditorSheet({ isOpen, onClose, group = null, onSaved, onDeleted, initialBrandIds = [], shared = false }) {
  const { groups, createGroup, updateGroup, setGroupDrugs, deleteGroup } = useFavouritesContext()
  const isPro = useIsPro()
  const isDark = useIsDark()
  const isEdit = !!group

  // What the sheet starts with each time it opens.
  const startKey = initialBrandIds.join('|')
  const initial = useMemo(
    () => (group
      ? { name: group.name ?? '', description: group.description ?? '', color: group.color ?? BLANK.color, brandIds: group.brandIds ?? [] }
      : { ...BLANK, brandIds: initialBrandIds }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isOpen, group?.id, startKey],
  )

  const [name, setName] = useState(initial.name)
  const [description, setDescription] = useState(initial.description)
  const [color, setColor] = useState(initial.color)
  const [createdId, setCreatedId] = useState(null)
  const [nameError, setNameError] = useState(false)
  // The database refused the name (another phone took it a moment ago).
  const [nameTakenByServer, setNameTakenByServer] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [saving, setSaving] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const nameRef = useRef(null)

  // Start fresh each time the sheet opens (set while drawing, not in an effect).
  const [wasOpen, setWasOpen] = useState(false)
  if (isOpen !== wasOpen) {
    setWasOpen(isOpen)
    if (isOpen) {
      setName(initial.name)
      setDescription(initial.description)
      setColor(initial.color)
      setCreatedId(null)
      setNameError(false)
      setSaveError('')
      setSaving(false)
      setConfirmOpen(false)
      setDeleteOpen(false)
    }
  }

  const current = useMemo(() => ({ name, description, color }), [name, description, color])
  const initialCompare = useMemo(() => ({ name: initial.name, description: initial.description, color: initial.color }), [initial])
  const isDirty = useDirtyState(initialCompare, current)

  // Unique names (step 13.5): checked while typing, ignoring capitals and spaces at the ends.
  const ownId = group?.id ?? createdId
  const nameKey = groupNameKey(name)
  const nameTaken = nameKey !== '' && (groups ?? []).some(g => g.id !== ownId && groupNameKey(g.name) === nameKey)
  const showNameTaken = nameTaken || nameTakenByServer

  // Every way of closing comes through here.
  function requestClose() {
    if (saving) return
    if (isDirty) { setConfirmOpen(true); return }
    onClose()
  }

  // Delete group. Throws on failure so the confirm stays open with its message
  // (the hook has already shown its own toast or the offline message).
  async function handleDelete() {
    const res = await deleteGroup(group.id)
    if (!res?.ok) throw new Error(res?.reason ?? 'error')
    onDeleted?.(res.group ?? group)
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
    if (nameTaken) {
      nameRef.current?.focus()
      return
    }
    setSaving(true)
    setSaveError('')
    const fields = { name: cleanName, description: description.trim(), color }

    // 1. The group itself (made first when new, so it has an id).
    let id = group?.id ?? createdId
    let res
    try {
      res = id ? await updateGroup(id, fields) : await createGroup(fields)
    } catch {
      res = { ok: false, reason: 'error' }
    }
    if (!res?.ok) {
      setSaving(false)
      if (res?.reason === 'name_taken') {
        setNameTakenByServer(true)
        nameRef.current?.focus()
        return
      }
      setSaveError(saveFailureMessage(res?.reason, isPro))
      return
    }
    if (!id) {
      id = res.group?.id
      setCreatedId(id ?? null)
    }

    // 2. Its drugs, only for a NEW group that starts with some (the drug being viewed in
    // the Add to group sheet). An existing group's drugs are never touched here.
    const held = group?.brandIds ?? []
    const wanted = isEdit ? held : initial.brandIds
    if (id && !sameIds(wanted, held)) {
      let drugsRes
      try {
        drugsRes = await setGroupDrugs(id, wanted)
      } catch {
        drugsRes = { ok: false, reason: 'error' }
      }
      if (!drugsRes?.ok) {
        setSaving(false)
        setSaveError(saveFailureMessage(drugsRes?.reason === 'limit' ? 'drugs_limit' : 'drugs_error', isPro))
        return
      }
    }

    setSaving(false)
    onSaved?.(res.group ?? null)
    onClose()
  }

  return (
    <>
      <SheetShell
        isOpen={isOpen}
        onClose={requestClose}
        ariaLabel={isEdit ? 'Edit group' : 'New group'}
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
            {isEdit ? 'Edit group' : 'New group'}
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
            <label htmlFor="group-name" style={LABEL_STYLE}>Name</label>
            <input
              id="group-name"
              ref={nameRef}
              type="text"
              value={name}
              onChange={e => { setName(e.target.value.slice(0, GROUP_NAME_MAX)); if (nameError) setNameError(false); if (nameTakenByServer) setNameTakenByServer(false) }}
              maxLength={GROUP_NAME_MAX}
              placeholder="For example ICU drips"
              dir="ltr"
              aria-invalid={nameError || showNameTaken}
              aria-describedby={nameError || showNameTaken ? 'group-name-error' : undefined}
              style={{
                ...FIELD_STYLE,
                border: nameError || showNameTaken ? '1.5px solid var(--color-danger)' : '1.5px solid transparent',
              }}
            />
            {(nameError || showNameTaken) && (
              <div id="group-name-error" role="alert" style={{
                marginTop: 6, fontSize: 12, color: 'var(--color-danger)', fontFamily: 'var(--font-body)',
              }}>
                {showNameTaken ? NAME_TAKEN_MESSAGE : 'Enter a group name'}
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
              dir="ltr"
              style={{ ...FIELD_STYLE, border: '1.5px solid transparent', resize: 'none' }}
            />
            <div style={{
              marginTop: 4, textAlign: 'end', fontSize: 11,
              color: 'var(--color-text-secondary)', fontFamily: 'var(--font-body)',
            }}>
              {description.length}/{GROUP_DESCRIPTION_MAX}
            </div>
          </div>

          <div>
            <span id="group-colour-label" style={LABEL_STYLE}>Colour</span>
            <div role="radiogroup" aria-labelledby="group-colour-label" style={{ display: 'flex', gap: 'var(--space-1)', marginInlineStart: -6 }}>
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
                      width: 44, height: 44, padding: 0, border: 'none', background: 'none', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      WebkitTapHighlightColor: 'transparent', outline: 'none',
                    }}
                  >
                    <span style={{
                      width: 32, height: 32, borderRadius: '50%', backgroundColor: tone.pill,
                      boxShadow: selected ? `0 0 0 2px var(--color-surface), 0 0 0 4px ${tone.pill}` : 'none',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'box-shadow var(--motion-fast) var(--ease-settle)',
                    }}>
                      {selected && <Check size={18} strokeWidth={3} color="#fff" aria-hidden="true" />}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {isEdit && (
            <div style={{ marginTop: 'var(--space-4)', paddingTop: 'var(--space-2)', borderTop: '1px solid var(--color-border)' }}>
              <button
                onClick={() => setDeleteOpen(true)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, minHeight: 44,
                  background: 'none', border: 'none', cursor: 'pointer',
                  padding: '0 var(--space-1)', fontSize: 15, fontWeight: 600,
                  color: 'var(--color-danger)', fontFamily: 'var(--font-body)',
                  WebkitTapHighlightColor: 'transparent', outline: 'none',
                }}
              >
                <Trash2 size={18} aria-hidden="true" />
                Delete group
              </button>
            </div>
          )}
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
        message="Your changes to this group won't be saved."
        confirmLabel="Discard"
        destructive
      />

      <ConfirmSheet
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Delete group?"
        message={`"${group?.name ?? ''}" and its list of drugs will be deleted. The drugs themselves stay in the app.${shared ? ' Its share link will stop working too.' : ''}`}
        confirmLabel="Delete"
        confirmingLabel="Deleting\u2026"
        destructive
      />
    </>
  )
}
