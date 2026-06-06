import DrugRow from './DrugRow'
import TextRow from './TextRow'
import NoteRow from './NoteRow'

/**
 * PrescriptionCard — renders all items for one prescription.
 * Items are pre-sorted by sort_order from the data layer.
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
          return <DrugRow key={item.id} alternatives={item.alternatives} />
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
