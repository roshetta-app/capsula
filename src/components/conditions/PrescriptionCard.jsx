import DrugRow from './DrugRow'
import TextRow from './TextRow'
import NoteRow from './NoteRow'

/**
 * PrescriptionCard — renders all items for one prescription.
 * Items are pre-sorted by sort_order from the data layer.
 *
 * Phase 2D: drug items get a number badge (sequential across drug-type items only).
 *
 * Props:
 *   items  PrescriptionItem[]
 */
export default function PrescriptionCard({ items }) {
  if (!items?.length) {
    return (
      <div style={{
        textAlign: 'center',
        padding: 'var(--space-8) var(--space-4)',
        color: 'var(--color-text-tertiary)',
        fontSize: 13,
      }}>
        No items in this prescription.
      </div>
    )
  }

  let drugIndex = 0

  return (
    <div style={{
      backgroundColor: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-lg)',
      padding: 'var(--space-3) var(--space-4)',
      boxShadow: 'var(--shadow-card)',
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-2)',
    }}>
      {items.map(item => {
        if (item.type === 'drug') {
          drugIndex += 1
          return (
            <DrugRow
              key={item.id}
              index={drugIndex}
              alternatives={item.alternatives}
              doseOverride={item.doseOverride}
              drugNote={item.drugNote}
              drugNoteAr={item.drugNoteAr}
              showGenericLink={item.showGenericLink ?? true}
            />
          )
        }
        if (item.type === 'text') {
          return <TextRow key={item.id} content={item.content} />
        }
        if (item.type === 'note') {
          return <NoteRow key={item.id} content={item.content} />
        }
        return null
      })}
    </div>
  )
}
