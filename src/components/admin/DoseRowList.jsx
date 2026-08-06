import { useState } from 'react'
import { Plus, Trash2, ChevronUp, ChevronDown, AlertTriangle } from 'lucide-react'
import ConfirmModal from './ConfirmModal'

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

export default function DoseRowList({ doses = [], onChange, disabled = false }) {

  const [activeIndex, setActiveIndex] = useState(0)
  const [pendingRemoveIndex, setPendingRemoveIndex] = useState(null)

  const currentIndex = doses.length === 0 ? 0 : Math.min(activeIndex, doses.length - 1)
  const current = doses[currentIndex]

  // ── Population (tab) helpers ──

  function updatePopulation(idx, field, value) {
    onChange(ensureIds(doses.map((d, i) => i === idx ? { ...d, [field]: value } : d)))
  }

  function addPopulation() {
    onChange(ensureIds([
      ...doses,
      { population: '', max_dose: '', brackets: [{ bracket: '', instruction: '', note: '' }] },
    ]))
    setActiveIndex(doses.length)
  }

  function confirmRemovePopulation() {
    const idx = pendingRemoveIndex
    setPendingRemoveIndex(null)
    const next = doses.filter((_, i) => i !== idx)
    onChange(ensureIds(next))
    if (activeIndex >= next.length) {
      setActiveIndex(Math.max(0, next.length - 1))
    }
  }

  // ── Bracket helpers (scoped to one population) ──

  function updateBracket(popIdx, bracketIdx, field, value) {
    onChange(ensureIds(doses.map((d, i) => {
      if (i !== popIdx) return d
      return {
        ...d,
        brackets: d.brackets.map((b, bi) => bi === bracketIdx ? { ...b, [field]: value } : b),
      }
    })))
  }

  function addBracket(popIdx) {
    onChange(ensureIds(doses.map((d, i) => i === popIdx
      ? { ...d, brackets: [...d.brackets, { bracket: '', instruction: '', note: '' }] }
      : d
    )))
  }

  function removeBracket(popIdx, bracketIdx) {
    onChange(ensureIds(doses.map((d, i) => i === popIdx
      ? { ...d, brackets: d.brackets.filter((_, bi) => bi !== bracketIdx) }
      : d
    )))
  }

  function moveBracket(popIdx, bracketIdx, direction) {
    const pop = doses[popIdx]
    const target = bracketIdx + direction
    if (target < 0 || target >= pop.brackets.length) return
    const nextBrackets = [...pop.brackets]
    ;[nextBrackets[bracketIdx], nextBrackets[target]] = [nextBrackets[target], nextBrackets[bracketIdx]]
    onChange(ensureIds(doses.map((d, i) => i === popIdx ? { ...d, brackets: nextBrackets } : d)))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>

      {/* Population tabs */}
      {doses.length > 0 && (
        <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
          {doses.map((pop, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setActiveIndex(idx)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 10px 6px 14px',
                borderRadius: 'var(--radius-full)',
                cursor: 'pointer',
                fontFamily: 'var(--font-body)',
                fontSize: 13,
                fontWeight: 600,
                border: idx === currentIndex ? 'none' : '1px solid var(--color-border)',
                backgroundColor: idx === currentIndex ? 'var(--color-text-primary)' : 'transparent',
                color: idx === currentIndex ? 'var(--color-surface)' : 'var(--color-text-secondary)',
              }}
            >
              {pop.population?.trim() || 'Untitled'}
              {!disabled && (
                <span
                  role="button"
                  aria-label="Remove population"
                  onClick={e => { e.stopPropagation(); setPendingRemoveIndex(idx) }}
                  style={{ display: 'flex', alignItems: 'center', opacity: 0.7 }}
                >
                  <Trash2 size={12} />
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {!disabled && (
        <button
          type="button"
          onClick={addPopulation}
          style={{
            display: 'flex', alignItems: 'center', gap: 'var(--space-1)',
            padding: 'var(--space-2) var(--space-3)',
            borderRadius: 'var(--radius-sm)',
            border: '1px dashed var(--color-border)',
            backgroundColor: 'transparent',
            color: 'var(--color-text-secondary)',
            fontSize: 13, fontWeight: 500,
            fontFamily: 'var(--font-body)',
            cursor: 'pointer',
            alignSelf: 'flex-start',
          }}
        >
          <Plus size={14} />
          Add population
        </button>
      )}

      {/* Active tab panel */}
      {current && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>

          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <input
              type="text"
              value={current.population ?? ''}
              onChange={e => updatePopulation(currentIndex, 'population', e.target.value)}
              placeholder="Population, e.g. Adult"
              disabled={disabled}
              style={{ ...inputBase, flex: 1 }}
            />
            <input
              type="text"
              value={current.max_dose ?? ''}
              onChange={e => updatePopulation(currentIndex, 'max_dose', e.target.value)}
              placeholder="Max dose for this tab, e.g. 3g/day (optional)"
              disabled={disabled}
              style={{ ...inputBase, flex: 1 }}
            />
          </div>

          {(current.brackets ?? []).map((bracket, bIdx) => {
            const isFlagged = !bracket.instruction?.trim()
              && (bracket.bracket?.trim() || bracket.note?.trim())

            return (
              <div
                key={bIdx}
                style={{
                  display: 'flex', flexDirection: 'column', gap: 'var(--space-2)',
                  padding: 'var(--space-3)',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: '#F9FAFB',
                }}
              >
                <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr 56px', gap: 'var(--space-2)', alignItems: 'flex-start' }}>
                  <input
                    type="text"
                    value={bracket.bracket ?? ''}
                    onChange={e => updateBracket(currentIndex, bIdx, 'bracket', e.target.value)}
                    placeholder="Bracket title (optional)"
                    disabled={disabled}
                    style={inputBase}
                  />
                  <textarea
                    value={bracket.instruction ?? ''}
                    onChange={e => updateBracket(currentIndex, bIdx, 'instruction', e.target.value)}
                    placeholder="Dose instruction…"
                    disabled={disabled}
                    dir="auto"
                    rows={2}
                    style={{ ...inputBase, resize: 'vertical', fontFamily: 'var(--font-body)' }}
                  />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {!disabled && (
                      <>
                        <div style={{ display: 'flex', gap: 2 }}>
                          <button
                            type="button"
                            onClick={() => moveBracket(currentIndex, bIdx, -1)}
                            disabled={bIdx === 0}
                            aria-label="Move bracket up"
                            style={reorderBtnStyle(bIdx === 0)}
                          >
                            <ChevronUp size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveBracket(currentIndex, bIdx, 1)}
                            disabled={bIdx === (current.brackets?.length ?? 1) - 1}
                            aria-label="Move bracket down"
                            style={reorderBtnStyle(bIdx === (current.brackets?.length ?? 1) - 1)}
                          >
                            <ChevronDown size={13} />
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeBracket(currentIndex, bIdx)}
                          aria-label="Remove bracket"
                          style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            color: 'var(--color-text-tertiary)', padding: 4,
                            display: 'flex', alignItems: 'center',
                          }}
                        >
                          <Trash2 size={15} />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {isFlagged && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#B45309' }}>
                    <AlertTriangle size={12} />
                    Instruction needed for this bracket to be saved
                  </div>
                )}

                <textarea
                  value={bracket.note ?? ''}
                  onChange={e => updateBracket(currentIndex, bIdx, 'note', e.target.value)}
                  placeholder="Note for this bracket only (optional) — shown under this card on the app"
                  disabled={disabled}
                  dir="auto"
                  rows={1}
                  style={{ ...inputBase, resize: 'vertical', fontFamily: 'var(--font-body)', fontStyle: 'italic' }}
                />
              </div>
            )
          })}

          {!disabled && (
            <button
              type="button"
              onClick={() => addBracket(currentIndex)}
              style={{
                display: 'flex', alignItems: 'center', gap: 'var(--space-1)',
                padding: 'var(--space-2) var(--space-3)',
                borderRadius: 'var(--radius-sm)',
                border: '1px dashed var(--color-border)',
                backgroundColor: 'transparent',
                color: 'var(--color-text-secondary)',
                fontSize: 13, fontWeight: 500,
                fontFamily: 'var(--font-body)',
                cursor: 'pointer',
                alignSelf: 'flex-start',
              }}
            >
              <Plus size={14} />
              Add bracket
            </button>
          )}
        </div>
      )}

      <ConfirmModal
        isOpen={pendingRemoveIndex !== null}
        onClose={() => setPendingRemoveIndex(null)}
        onConfirm={confirmRemovePopulation}
        title="Remove this population?"
        message="This removes every bracket under this population tab. This can't be undone once saved."
        confirmLabel="Remove"
        confirmVariant="danger"
      />

    </div>
  )
}

function reorderBtnStyle(isDisabled) {
  return {
    background: 'none',
    border: 'none',
    cursor: isDisabled ? 'default' : 'pointer',
    color: isDisabled ? 'var(--color-border)' : 'var(--color-text-tertiary)',
    padding: 2,
    display: 'flex',
    alignItems: 'center',
  }
}

const inputBase = {
  padding: 'var(--space-2) var(--space-3)',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--color-border)',
  backgroundColor: 'var(--color-surface)',
  color: 'var(--color-text-primary)',
  fontSize: 13,
  fontFamily: 'var(--font-body)',
  outline: 'none',
  boxSizing: 'border-box',
  width: '100%',
  appearance: 'none',
  WebkitAppearance: 'none',
}

