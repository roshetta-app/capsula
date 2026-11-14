/**
 * src/components/roshettas/editor/DrugGroupCard.jsx
 * 2026-11-14 (Roshetta plan, steps 5.1c and 5.1d): one drug group of a roshetta in the editor.
 * A card with a "Drug" title, move up, move down and delete buttons (44 px each), the drug name
 * lines (main drug first, then each or / plus partner with its tappable chip in front), a remove
 * button on every line, the "Add or / plus drug" button, and the dose box with its counter
 * ("12/600") and the line "Written by you. Not checked by Capsula.". The dose is plain text,
 * line breaks kept, it follows its own direction, and typing stops at 600 characters. One dose
 * is shared by every drug of the group. No dose is ever filled in from the library.
 *
 * Props:
 *   row           the drug group row (a 'drug' row with its partners in `alternatives`)
 *   index         number            its place among all the entries of the roshetta
 *   count         number            how many entries the roshetta has (for the move buttons)
 *   libraryIds    Set | null        brand ids in the drug library; null while the library is not
 *                                   loaded (then no drug is called "no longer available")
 *   onChange      (row) => void     the group after a chip switch, a drug removal or typing a dose
 *   onAddPartner  () => void        "Add or / plus drug" (the editor opens the Add drug screen)
 *   onMoveUp      () => void
 *   onMoveDown    () => void
 *   onDelete      () => void        asks nothing itself; also called when the only drug is removed
 *   disabled      boolean           read only: chips, remove, add and the dose box are locked, delete stays
 *
 * Not placed on any screen yet: the editor screen (Phase D) uses it.
 */

import Icon from '../../ui/Icon'
import EditorIconButton from './EditorIconButton'
import JoinerChip from './JoinerChip'
import { doseCounter, drugDetail, drugLines, removeDrugAction, switchChip, withDose } from '../../../utils/roshettaDrugLines'
import { moveState } from '../../../utils/roshettaTextBlockText'
import { getSheetDrugSuffix, toTitleCase } from '../../../utils/drugTitleFormat'

const font = 'var(--font-body)'

function DrugLine({ line, disabled, onRemove }) {
  const detail = drugDetail(line)
  // Written like a topic drug block: the brand name, then the strength and form ("60mg - Tab.").
  const suffix = getSheetDrugSuffix({ concentration: line.concentration, form: line.form, tradenameClean: line.shownName })
  const gone = !line.available
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minHeight: 44 }}>
      <div style={{ flex: 1, minWidth: 0, padding: '6px 0' }}>
        <div
          dir="auto"
          style={{
            fontSize: 15, fontWeight: 600, lineHeight: 1.3, textAlign: 'start', overflowWrap: 'anywhere',
            color: gone ? 'var(--color-text-secondary)' : 'var(--color-text-primary)', fontFamily: font,
          }}
        >
          {toTitleCase(line.shownName)}
          {suffix && (
            <span style={{
              marginInlineStart: 5, fontSize: 12, fontWeight: 500,
              color: 'color-mix(in srgb, var(--color-text-primary) 70%, var(--color-text-secondary) 30%)',
            }}>
              {suffix}
            </span>
          )}
        </div>
        {detail && (
          <div
            dir="auto"
            style={{
              marginTop: 1, fontSize: 12.5, lineHeight: 1.3, textAlign: 'start',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              color: 'var(--color-text-secondary)', fontFamily: font,
            }}
          >
            {detail}
          </div>
        )}
        {gone && (
          <div style={{ marginTop: 2, fontSize: 12.5, lineHeight: 1.3, color: 'var(--color-text-secondary)', fontFamily: font }}>
            No longer available
          </div>
        )}
      </div>
      {!disabled && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${line.name}`}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            width: 44, height: 44, padding: 0, background: 'none', border: 'none', cursor: 'pointer',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          <span
            style={{
              width: 32, height: 32, borderRadius: '50%',
              backgroundColor: 'var(--color-danger-light)', color: 'var(--color-danger)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Icon name="Minus" size={18} />
          </span>
        </button>
      )}
    </div>
  )
}

export default function DrugGroupCard({
  row, index = 0, count = 1, libraryIds = null, onChange, onAddPartner, onMoveUp, onMoveDown, onDelete,
  disabled = false,
}) {
  const lines = drugLines(row, libraryIds)
  const { canUp, canDown } = moveState(index, count)

  function switchAt(partnerIndex) {
    const next = switchChip(row, partnerIndex)
    if (next) onChange?.(next)
  }

  function removeAt(position) {
    const result = removeDrugAction(row, position)
    if (result.kind === 'change') onChange?.(result.row)
    else if (result.kind === 'delete_group') onDelete?.()
  }

  const dose = typeof row?.dose === 'string' ? row.dose : ''
  const doseId = `roshetta-dose-${row?.id ?? index}`

  return (
    <div
      style={{
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-2) var(--space-4) var(--space-3)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)', fontFamily: font,
          }}
        >
          <Icon name="Pill" size={15} />
          {lines.length > 1 ? 'Drugs' : 'Drug'}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', marginInlineEnd: -10 }}>
          <EditorIconButton label="Move up" name="ChevronUp" onClick={() => onMoveUp?.()} disabled={disabled || !canUp} />
          <EditorIconButton label="Move down" name="ChevronDown" onClick={() => onMoveDown?.()} disabled={disabled || !canDown} />
          <EditorIconButton label="Delete drug group" name="Trash2" onClick={() => onDelete?.()} danger />
        </div>
      </div>

      <div>
        {lines.map(line => (
          <div key={`${line.position}-${line.id ?? ''}`}>
            {line.joiner && (
              <div style={{ display: 'flex', alignItems: 'center', minHeight: 44 }}>
                <JoinerChip joiner={line.joiner} onSwitch={() => switchAt(line.position - 1)} disabled={disabled} />
              </div>
            )}
            <DrugLine line={line} disabled={disabled} onRemove={() => removeAt(line.position)} />
          </div>
        ))}
      </div>

      {!disabled && (
        <button
          type="button"
          onClick={() => onAddPartner?.()}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, minHeight: 44, marginTop: 2, padding: 0,
            background: 'none', border: 'none', cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
            fontSize: 14, fontWeight: 600, color: 'var(--color-accent-text)', fontFamily: font,
          }}
        >
          <Icon name="Plus" size={16} />
          Add or / plus drug
        </button>
      )}

      <label
        htmlFor={doseId}
        style={{
          display: 'block', marginTop: 8, marginBottom: 6,
          fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)', fontFamily: font,
        }}
      >
        Dose
      </label>
      <textarea
        id={doseId}
        value={dose}
        onChange={e => onChange?.(withDose(row, e.target.value))}
        readOnly={disabled}
        rows={3}
        dir="auto"
        placeholder="Write the dose, for example 500 mg every 8 hours"
        style={{
          width: '100%', boxSizing: 'border-box', resize: 'none',
          fontSize: 15, fontWeight: 600, lineHeight: 1.4, textAlign: 'start',
          color: 'var(--color-dose)', backgroundColor: 'var(--color-surface-muted)',
          border: '1.5px solid transparent', borderRadius: 12, padding: '12px 14px',
          fontFamily: font, outline: 'none',
        }}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 4, fontSize: 12, color: 'var(--color-text-secondary)', fontFamily: font }}>
        <span>Written by you. Not checked by Capsula.</span>
        <span style={{ flexShrink: 0 }}>{doseCounter(dose)}</span>
      </div>
    </div>
  )
}
