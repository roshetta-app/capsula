/**
 * src/components/admin/DrugFilterSheet.jsx
 * 2026-11-10 (CMS drug library, same look as the app's Drugs search): the pop-up behind the
 * filter icon inside the search bar. Like the app's Form / Route sheet it applies at once
 * (no Apply button): tap a chip and the list behind changes.
 *   Generic mode: Category chips (one at a time, 'All categories' clears it).
 *   Brand mode:   Form chips (several at once, the same chips and the same form lists as the
 *                 app's Form / Route filter, taken from DrugFilterPanel's FORM_OPTIONS).
 * Class mode has no filter, so the screen greys the icon and never opens this.
 * It is built on the shared admin Modal, so on a phone it is a bottom sheet.
 *
 * Props:
 *   isOpen, onClose
 *   mode           'generic' | 'brand'
 *   categories     Category[] (from useCategories)
 *   category       the chosen category slug, or null
 *   onCategory     (slug | null) => void
 *   forms          chosen Form chip values, [] for none
 *   onForms        (values[]) => void
 */

import Modal from './Modal'
import { FORM_OPTIONS } from '../drugs/DrugFilterPanel'

function Chip({ label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      style={{
        height:          36,
        padding:         '0 14px',
        borderRadius:    'var(--radius-full)',
        border:          `1px solid ${active ? 'var(--color-accent)' : 'var(--color-border)'}`,
        backgroundColor: active ? 'var(--color-accent-light)' : 'var(--color-surface)',
        color:           active ? 'var(--color-accent-text)' : 'var(--color-text-secondary)',
        fontFamily:      'var(--font-body)',
        fontSize:        14,
        fontWeight:      active ? 600 : 500,
        cursor:          'pointer',
      }}
    >
      {label}
    </button>
  )
}

export default function DrugFilterSheet({
  isOpen, onClose, mode,
  categories = [], category = null, onCategory,
  forms = [], onForms,
}) {
  const isBrand = mode === 'brand'
  const formChips = FORM_OPTIONS.filter(o => o.value !== 'all')

  function toggleForm(value) {
    onForms(forms.includes(value) ? forms.filter(f => f !== value) : [...forms, value])
  }

  const hasFilter = isBrand ? forms.length > 0 : !!category

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isBrand ? 'Filter by form' : 'Filter by category'} size="sm">
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
        {isBrand ? (
          formChips.map(o => (
            <Chip key={o.value} label={o.label} active={forms.includes(o.value)} onClick={() => toggleForm(o.value)} />
          ))
        ) : (
          <>
            <Chip label="All categories" active={!category} onClick={() => onCategory(null)} />
            {categories.map(c => (
              <Chip key={c.id} label={c.name_en} active={category === c.slug} onClick={() => onCategory(c.slug)} />
            ))}
          </>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)', marginTop: 'var(--space-4)' }}>
        {hasFilter && (
          <button
            type="button"
            onClick={() => (isBrand ? onForms([]) : onCategory(null))}
            style={{
              height: 36, padding: '0 14px', borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)',
              color: 'var(--color-text-secondary)', fontFamily: 'var(--font-body)',
              fontSize: 14, fontWeight: 500, cursor: 'pointer',
            }}
          >
            Clear
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          style={{
            height: 36, padding: '0 18px', borderRadius: 'var(--radius-md)',
            border: 'none', backgroundColor: 'var(--color-accent)', color: '#fff',
            fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 600, cursor: 'pointer',
          }}
        >
          Done
        </button>
      </div>
    </Modal>
  )
}
