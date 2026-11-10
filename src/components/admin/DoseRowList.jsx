import { useState } from 'react'
import { Plus, X, ChevronUp, ChevronDown, Edit2, AlertTriangle } from 'lucide-react'
import ConfirmModal from './ConfirmModal'
import { findNearDuplicateBands } from './blocks/rows/doseLibraryState'

/**
 * DoseRowList (DoseTableEditor) — editable population-tab switcher for
 * textbook (reference) doses.
 *
 * 2026-08-03 (CMS Library rebuild, plan §7 Doses step 2, decision 7): full
 * rework from the old flat row-per-population+bracket table to a tab
 * switcher — one population tab visible/editable at a time, matching how
 * DoseSection.jsx already presents doses to app users. Supersedes the
 * 2026-07-25 flat-row design (drug_library_ui_ux, decision 4.6).
 *
 * Shape change: `population` and `max_dose` used to live per-row alongside
 * `bracket`/`instruction`/`source`/`note` as flat siblings — this conflated
 * the tab (population) with what varies inside it (bracket). Now:
 *   - one object per population/tab, each owning a `brackets` array
 *   - `max_dose` moves to once per tab, shown under that tab's brackets
 *   - `source` is dropped entirely — confirmed 0 of 8 real entries used it
 *   - a bracket's title is optional; only its `instruction` is mandatory
 *     for that bracket to be considered saveable — an instruction-less
 *     bracket with any other field filled in is flagged, not blocked; a
 *     fully empty bracket is harmless and gets no flag
 *   - removing a population tab now asks for confirmation first (via
 *     ConfirmModal — the CMS-scoped dialog, not the app's ConfirmSheet),
 *     since it discards every bracket under it at once
 *   - brackets keep the same up/down reorder controls the old flat rows
 *     had, scoped to the brackets within the active tab only — reordering
 *     never moves a bracket to a different population
 *
 * `generic.textbook_dose_notes` (whole-generic, shown once regardless of
 * tab) is a separate field, still edited directly in GenericEditor.jsx —
 * unaffected by this rebuild.
 *
 * ID BACKFILL FIX (2026-08-06): populations and brackets are each meant to
 * carry a permanent 'id', generated the moment they're created — this is
 * what lets a dose or max-dose picked into a prescription trace back to
 * the exact library entry it came from, safely, for a "save this edit back
 * to the library" action. That id was never actually being stamped on
 * here — addPopulation/addBracket built plain objects with no id at all.
 * Nothing about what you see or type was ever affected by this (every
 * field displays and saves the same either way), so this fixes it as a
 * quiet backfill rather than a visible change: ensureIds() below adds an
 * id only to a population or bracket that doesn't already have one,
 * leaving everything else about it untouched, and runs automatically
 * every time anything in this component saves — so any older population
 * or bracket gets tagged the next time an admin opens and saves this
 * formulation, no bulk migration required.
 *
 * 2026-11-10 (formulation editor): the brackets now look and behave like the dose bands of a
 * condition's drug block (UnifiedDrugRowEditor): a numbered closed row showing 'Applies to: dose',
 * tap to open ONE 'DOSE BAND n' panel at a time (Applies to + Dose + optional Note, Done, move
 * up/down, Remove with a confirm bar), a 'Looks the same as dose band n' warning, a max dose row
 * that opens the same way, and quiet '+ Dose band' / '+ Max dose' links. Patient groups stay as
 * chips. The saved data shape and ids are unchanged.
 *
 * Props:
 *   doses     { id: string, population: string, max_dose?: string,
 *               brackets: { id: string, bracket?: string, instruction: string,
 *                           note?: string }[] }[]
 *   onChange  (doses) => void
 *   disabled  boolean
 */

function generateId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function ensureIds(doses) {
  return doses.map(pop => ({
    ...pop,
    id: pop.id ?? generateId('pop'),
    brackets: (pop.brackets ?? []).map(b => ({
      ...b,
      id: b.id ?? generateId('bracket'),
    })),
  }))
}


// Same look as the condition drug block's dose pieces.
const fieldLabel = { fontSize: 12, fontWeight: 700, color: 'var(--color-text-primary)', fontFamily: 'var(--font-body)' }
const fieldInput = {
  width: '100%', boxSizing: 'border-box', padding: '9px 10px',
  border: '1px solid var(--color-border)', borderRadius: 8,
  fontSize: 14, fontFamily: 'var(--font-body)',
  backgroundColor: 'var(--color-surface)', color: 'var(--color-text-primary)', outline: 'none',
}
const addLink = {
  display: 'inline-flex', alignItems: 'center', gap: 4, padding: '6px 4px',
  border: 'none', background: 'none', color: 'var(--color-text-secondary)',
  fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-body)', cursor: 'pointer',
}
const primaryBtn = {
  padding: '7px 14px', border: 'none', borderRadius: 8,
  background: 'var(--color-accent-solid, var(--color-accent))', color: '#fff',
  fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-body)', cursor: 'pointer',
}
const secondaryBtn = {
  display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 12px',
  border: '1px solid var(--color-border)', borderRadius: 8, background: 'none',
  color: 'var(--color-text-secondary)', fontSize: 13, fontWeight: 600,
  fontFamily: 'var(--font-body)', cursor: 'pointer',
}
const dangerBtn = {
  marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 4, padding: '7px 6px',
  border: 'none', background: 'none', color: '#ef4444',
  fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-body)', cursor: 'pointer',
}
const openPanel = {
  display: 'flex', flexDirection: 'column', gap: 10, margin: '6px 0', padding: 12,
  boxSizing: 'border-box', border: '1.5px solid var(--color-accent)', borderRadius: 10,
  backgroundColor: 'var(--color-surface)',
}
const closedRow = {
  display: 'flex', alignItems: 'flex-start', gap: 10, width: '100%', boxSizing: 'border-box',
  padding: '10px 6px', textAlign: 'left', border: 'none', borderRadius: 8,
  backgroundColor: 'transparent', cursor: 'pointer', fontFamily: 'var(--font-body)',
}

function ConfirmBar({ text, confirmLabel = 'Remove', onConfirm, onCancel }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 8, padding: '10px 12px',
      borderRadius: 10, border: '1px solid #ef4444', backgroundColor: '#ef444410',
    }}>
      <span style={{ fontSize: 13, color: 'var(--color-text-primary)' }}>{text}</span>
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" onClick={onConfirm} style={{ ...primaryBtn, background: '#ef4444' }}>{confirmLabel}</button>
        <button type="button" onClick={onCancel} style={secondaryBtn}>Cancel</button>
      </div>
    </div>
  )
}

const isBandEmpty = b => !b.bracket?.trim() && !b.instruction?.trim() && !b.note?.trim()

function DoseBand({
  band, index, count, isOpen, disabled, duplicateOf,
  onOpen, onClose, onUpdate, onRemove, onMove,
}) {
  const [showNote, setShowNote] = useState(false)
  const [confirmRemove, setConfirmRemove] = useState(false)
  const empty = isBandEmpty(band)
  const number = index + 1

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, borderTop: index > 0 ? '1px solid var(--color-border)' : 'none' }}>
      {isOpen ? (
        <div style={openPanel}>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-accent)', letterSpacing: '0.03em' }}>
            DOSE BAND {number}
          </span>
          <div className="cms-stack" style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: '0 0 36%', minWidth: 0 }}>
              <span style={fieldLabel}>Applies to</span>
              <input
                type="text" value={band.bracket ?? ''} disabled={disabled} dir="auto"
                onChange={e => onUpdate('bracket', e.target.value)}
                placeholder="e.g. 5-7.9kg" style={fieldInput}
              />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 0 }}>
              <span style={fieldLabel}>Dose</span>
              <textarea
                value={band.instruction ?? ''} disabled={disabled} dir="auto" rows={2}
                onChange={e => onUpdate('instruction', e.target.value)}
                placeholder="e.g. 1gm/12hr I.V. for 5-7 days"
                style={{ ...fieldInput, resize: 'vertical' }}
              />
            </label>
          </div>
          {(showNote || band.note) ? (
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={fieldLabel}>Note</span>
              <textarea
                value={band.note ?? ''} disabled={disabled} dir="auto" rows={2}
                autoFocus={showNote && !band.note}
                onChange={e => onUpdate('note', e.target.value)}
                placeholder="Note" style={{ ...fieldInput, resize: 'vertical', fontStyle: 'italic' }}
              />
            </label>
          ) : (
            <div>
              <button type="button" onClick={() => setShowNote(true)} style={addLink}><Plus size={14} /> Note</button>
            </div>
          )}
          {band.instruction?.trim() === '' && (band.bracket?.trim() || band.note?.trim()) && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#B45309' }}>
              <AlertTriangle size={12} /> Add the dose, or this band will not show in the app.
            </span>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" onClick={onClose} style={primaryBtn}>Done</button>
            <button type="button" onClick={() => onMove(-1)} disabled={disabled || index === 0} aria-label="Move up" style={{ ...secondaryBtn, padding: '7px 8px', opacity: index === 0 ? 0.4 : 1 }}>
              <ChevronUp size={14} />
            </button>
            <button type="button" onClick={() => onMove(1)} disabled={disabled || index === count - 1} aria-label="Move down" style={{ ...secondaryBtn, padding: '7px 8px', opacity: index === count - 1 ? 0.4 : 1 }}>
              <ChevronDown size={14} />
            </button>
            <button type="button" disabled={disabled} onClick={() => (empty ? onRemove() : setConfirmRemove(true))} style={dangerBtn}>
              <X size={13} /> Remove
            </button>
          </div>
          {confirmRemove && (
            <ConfirmBar
              text="Remove this dose band?"
              onConfirm={() => { setConfirmRemove(false); onRemove() }}
              onCancel={() => setConfirmRemove(false)}
            />
          )}
        </div>
      ) : (
        <button type="button" onClick={onOpen} aria-label={`Edit dose band ${number}`} style={closedRow}>
          <span style={{
            flexShrink: 0, width: 22, height: 22, borderRadius: 99,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 700, color: 'var(--color-accent)', background: 'var(--color-accent-light)',
          }}>{number}</span>
          <span dir="auto" style={{ flex: 1, minWidth: 0, display: 'block', fontSize: 14, color: 'var(--color-text-primary)' }}>
            {empty ? (
              <span style={{ fontStyle: 'italic', color: 'var(--color-text-tertiary)' }}>Empty, tap to fill in</span>
            ) : (
              <>
                {band.bracket && <span style={{ fontWeight: 700 }}>{band.bracket}{': '}</span>}
                {band.instruction}
                {band.note && (
                  <span style={{ display: 'block', marginTop: 2, fontSize: 12, fontStyle: 'italic', color: 'var(--color-text-tertiary)' }}>
                    {band.note}
                  </span>
                )}
              </>
            )}
          </span>
          <Edit2 size={14} style={{ flexShrink: 0, marginTop: 3, color: 'var(--color-text-tertiary)' }} />
        </button>
      )}
      {duplicateOf && !empty && (
        <span style={{ padding: '0 6px 8px 38px', fontSize: 12, color: '#B45309', fontFamily: 'var(--font-body)' }}>
          Same as dose band {duplicateOf}.
        </span>
      )}
    </div>
  )
}

function MaxDoseRow({ value, isOpen, disabled, onOpen, onClose, onChange }) {
  const [confirmRemove, setConfirmRemove] = useState(false)
  if (isOpen) {
    return (
      <div style={openPanel}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={fieldLabel}>Max dose</span>
          <input
            type="text" value={value ?? ''} disabled={disabled} dir="auto" autoFocus
            onChange={e => onChange(e.target.value)}
            placeholder="e.g. 4gm/day" style={fieldInput}
          />
        </label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" onClick={onClose} style={primaryBtn}>Done</button>
          {value && (
            <button type="button" disabled={disabled} onClick={() => setConfirmRemove(true)} style={dangerBtn}>
              <X size={13} /> Remove
            </button>
          )}
        </div>
        {confirmRemove && (
          <ConfirmBar
            text="Remove the max dose?"
            onConfirm={() => { setConfirmRemove(false); onChange(''); onClose() }}
            onCancel={() => setConfirmRemove(false)}
          />
        )}
      </div>
    )
  }
  if (!value) return null
  return (
    <button type="button" onClick={onOpen} aria-label="Edit max dose" style={closedRow}>
      <span dir="auto" style={{ flex: 1, minWidth: 0, display: 'block', fontSize: 14, color: 'var(--color-text-primary)' }}>
        <span style={{ fontWeight: 700 }}>Max dose: </span>
        <span style={{ fontStyle: 'italic' }}>{value}</span>
      </span>
      <Edit2 size={14} style={{ flexShrink: 0, marginTop: 3, color: 'var(--color-text-tertiary)' }} />
    </button>
  )
}

export default function DoseRowList({ doses = [], onChange, disabled = false }) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [pendingRemoveIndex, setPendingRemoveIndex] = useState(null)
  const [addBlockedWarning, setAddBlockedWarning] = useState(false)
  // ONE open editor at a time, like the condition block: a band id, or 'max'.
  const [openId, setOpenId] = useState(null)

  const currentIndex = doses.length === 0 ? 0 : Math.min(activeIndex, doses.length - 1)
  const current = doses[currentIndex]

  function selectTab(i) { setActiveIndex(i); setOpenId(null); setAddBlockedWarning(false) }

  function updatePopulation(idx, field, value) {
    onChange(ensureIds(doses.map((d, i) => i === idx ? { ...d, [field]: value } : d)))
  }

  function addPopulation() {
    const blankIdx = doses.findIndex(d => !d.population?.trim())
    if (blankIdx !== -1) { setActiveIndex(blankIdx); setAddBlockedWarning(true); return }
    onChange(ensureIds([...doses, { population: '', max_dose: '', brackets: [{ bracket: '', instruction: '', note: '' }] }]))
    setActiveIndex(doses.length)
    setOpenId(null)
  }

  function confirmRemovePopulation() {
    const idx = pendingRemoveIndex
    setPendingRemoveIndex(null)
    const next = doses.filter((_, i) => i !== idx)
    onChange(ensureIds(next))
    if (activeIndex >= next.length) setActiveIndex(Math.max(0, next.length - 1))
    setOpenId(null)
  }

  function updateBracket(popIdx, bi, field, value) {
    onChange(ensureIds(doses.map((d, i) => i !== popIdx ? d : {
      ...d, brackets: d.brackets.map((b, j) => j === bi ? { ...b, [field]: value } : b),
    })))
  }

  function addBracket(popIdx) {
    // No second empty band while one is still waiting (same rule as the condition block).
    const pop = doses[popIdx]
    const waitingIdx = (pop.brackets ?? []).findIndex(isBandEmpty)
    if (waitingIdx !== -1) { setOpenId(`b-${waitingIdx}`); return }
    onChange(ensureIds(doses.map((d, i) => i === popIdx
      ? { ...d, brackets: [...d.brackets, { bracket: '', instruction: '', note: '' }] } : d)))
    setOpenId(`b-${pop.brackets.length}`)
  }

  function removeBracket(popIdx, bi) {
    onChange(ensureIds(doses.map((d, i) => i === popIdx
      ? { ...d, brackets: d.brackets.filter((_, j) => j !== bi) } : d)))
    setOpenId(null)
  }

  function moveBracket(popIdx, bi, dir) {
    const target = bi + dir
    onChange(ensureIds(doses.map((d, i) => {
      if (i !== popIdx || target < 0 || target >= d.brackets.length) return d
      const next = [...d.brackets]
      ;[next[bi], next[target]] = [next[target], next[bi]]
      return { ...d, brackets: next }
    })))
    if (openId === `b-${bi}`) setOpenId(`b-${target}`)
    else if (openId === `b-${target}`) setOpenId(`b-${bi}`)
  }

  const many = doses.length > 1
  const chipBase = {
    display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 99,
    fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-body)', cursor: 'pointer',
  }

  const bands = current?.brackets ?? []
  const duplicates = findNearDuplicateBands(bands.map((b, bi) => ({ id: bi, bracket_title: b.bracket, instruction: b.instruction })))
  const hasMax = !!current?.max_dose?.trim()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* Patient groups */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
        {doses.map((d, i) => {
          const text = d.population?.trim() || (many ? `Patient group ${i + 1}` : 'Patient group')
          const active = i === currentIndex
          return (
            <button
              key={d.id ?? i} type="button" onClick={() => selectTab(i)}
              style={{
                ...chipBase,
                background: active ? 'var(--color-accent-light)' : 'none',
                border: active ? '1px solid transparent' : '1px solid var(--color-border)',
                color: active ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                fontStyle: d.population?.trim() ? 'normal' : 'italic',
              }}
            >
              {text}
            </button>
          )
        })}
        {!disabled && (
          <button type="button" onClick={addPopulation} style={addLink}><Plus size={14} /> Group</button>
        )}
      </div>

      {doses.length === 0 && (
        <div style={{ fontSize: 13, color: 'var(--color-text-tertiary)' }}>
          No doses yet.
        </div>
      )}

      {current && (
        <>
          {/* Group name, and remove group */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="text" value={current.population ?? ''} disabled={disabled} dir="auto"
              aria-label="Patient group name"
              onChange={e => { updatePopulation(currentIndex, 'population', e.target.value); setAddBlockedWarning(false) }}
              placeholder="Group name, e.g. Adults" style={{ ...fieldInput, flex: 1, minWidth: 0 }}
            />
            {!disabled && (
              <button type="button" onClick={() => setPendingRemoveIndex(currentIndex)} style={{ ...dangerBtn, marginLeft: 0 }}>
                <X size={13} /> Remove
              </button>
            )}
          </div>
          {addBlockedWarning && !current.population?.trim() && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#B45309' }}>
              <AlertTriangle size={12} /> Name this group before adding another.
            </span>
          )}

          {/* Dose bands */}
          <div style={{
            display: bands.length === 0 && !hasMax && openId !== 'max' ? 'none' : 'flex', flexDirection: 'column', padding: '2px 8px',
            border: '1px solid var(--color-border)', borderRadius: 10, backgroundColor: 'var(--color-surface)',
          }}>
            {bands.map((b, bi) => (
              <DoseBand
                key={b.id ?? bi} band={b} index={bi} count={bands.length} disabled={disabled}
                isOpen={openId === `b-${bi}`} duplicateOf={duplicates[bi] ?? null}
                onOpen={() => setOpenId(`b-${bi}`)} onClose={() => setOpenId(null)}
                onUpdate={(field, value) => updateBracket(currentIndex, bi, field, value)}
                onRemove={() => removeBracket(currentIndex, bi)}
                onMove={dir => moveBracket(currentIndex, bi, dir)}
              />
            ))}
            <div style={{ borderTop: bands.length > 0 && (hasMax || openId === 'max') ? '1px solid var(--color-border)' : 'none' }}>
              <MaxDoseRow
                value={current.max_dose} disabled={disabled}
                isOpen={openId === 'max'} onOpen={() => setOpenId('max')} onClose={() => setOpenId(null)}
                onChange={v => updatePopulation(currentIndex, 'max_dose', v)}
              />
            </div>
          </div>

          {!disabled && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <button type="button" onClick={() => addBracket(currentIndex)} style={addLink}><Plus size={14} /> Dose band</button>
              {!hasMax && openId !== 'max' && (
                <button type="button" onClick={() => setOpenId('max')} style={addLink}><Plus size={14} /> Max dose</button>
              )}
            </div>
          )}
        </>
      )}

      <ConfirmModal
        isOpen={pendingRemoveIndex != null}
        onClose={() => setPendingRemoveIndex(null)}
        onConfirm={confirmRemovePopulation}
        title="Remove this patient group?"
        message="Every dose band under it is removed too."
        confirmLabel="Remove group"
        confirmVariant="danger"
      />
    </div>
  )
}
