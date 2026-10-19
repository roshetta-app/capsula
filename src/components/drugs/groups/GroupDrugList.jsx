/**
 * src/components/drugs/groups/GroupDrugList.jsx
 * 2026-10-19 (Drug groups plan, step 4.3): the group's own drugs inside the
 * editor, shown while the search box is empty. A to Z by brand name (decision
 * 16: no manual order, nothing can be dragged), each with a remove button.
 * Removing only changes the editor's draft; Save writes it.
 *
 * Props:
 *   ids       brand ids in the draft
 *   onRemove  (brandId) => void
 *
 * A brand id the drug list does not hold any more (a drug taken off the app)
 * shows "This drug is no longer available" with its Remove button, after the
 * normal rows. While the drug list is still loading nothing is guessed: a
 * short "Loading drugs..." line shows instead.
 */

import { useMemo } from 'react'
import { X } from 'lucide-react'
import { useDrugContext } from '../../../context/DrugContext'
import GroupDrugRowInfo from './GroupDrugRowInfo'
import { drugRowTitle } from './groupDrugText'

const ROW_STYLE = {
  display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
  padding: '10px var(--space-1)', borderBottom: '1px solid var(--color-border)',
}

function RemoveButton({ label, onRemove }) {
  return (
    <button
      onMouseDown={e => e.preventDefault()}
      onClick={onRemove}
      aria-label={label}
      style={{
        width: 36, height: 36, borderRadius: '50%', border: 'none', flexShrink: 0,
        backgroundColor: 'var(--color-surface-muted)', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        WebkitTapHighlightColor: 'transparent', outline: 'none',
      }}
    >
      <X size={16} strokeWidth={2} color="var(--color-text-secondary)" aria-hidden="true" />
    </button>
  )
}

export default function GroupDrugList({ ids = [], onRemove }) {
  const { drugs, loading } = useDrugContext()

  const { known, missing } = useMemo(() => {
    const byId = new Map((drugs ?? []).map(d => [d.id, d]))
    const known = []
    const missing = []
    for (const id of ids) {
      const d = byId.get(id)
      if (d) known.push(d)
      else missing.push(id)
    }
    known.sort((a, b) => drugRowTitle(a).localeCompare(drugRowTitle(b), undefined, { sensitivity: 'base' }))
    return { known, missing }
  }, [drugs, ids])

  if (ids.length === 0) return null

  if ((loading || !drugs?.length) && known.length === 0) {
    return (
      <div style={{
        padding: 'var(--space-3) var(--space-1)', fontSize: 13, textAlign: 'center',
        color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-body)',
      }}>
        Loading drugs&hellip;
      </div>
    )
  }

  return (
    <div>
      {known.map(d => (
        <div key={d.id} style={ROW_STYLE}>
          <GroupDrugRowInfo drug={d} />
          <RemoveButton label={`Remove ${drugRowTitle(d)} from this group`} onRemove={() => onRemove?.(d.id)} />
        </div>
      ))}
      {missing.map(id => (
        <div key={id} style={ROW_STYLE}>
          <div style={{
            flex: 1, minWidth: 0, fontSize: 13, color: 'var(--color-text-tertiary)',
            fontFamily: 'var(--font-body)',
          }}>
            This drug is no longer available
          </div>
          <RemoveButton label="Remove unavailable drug from this group" onRemove={() => onRemove?.(id)} />
        </div>
      ))}
    </div>
  )
}
