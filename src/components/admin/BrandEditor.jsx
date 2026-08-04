import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { updateBrand } from '../../lib/adminQueries'
import { useToast } from '../../context/ToastContext'

/**
 * BrandEditor — manage brands for a formulation.
 * Phase 3G — immediate is_published toggle per masterplan 3G spec.
 *             Added formulationLabel prop to show inherited concentration + form.
 * Phase 3 (Brands + Search & Add, step 2) — redesigned to a compact,
 *             always-editable single-line-per-brand list. Name field
 *             switched from the legacy `brands.name` to the clean
 *             `brands.tradename_clean`. `source` field dropped entirely
 *             (CMS, app, and database — decision 26).
 *
 * Props:
 *   brands          { id?, tradename_clean, manufacturer, is_published }[]
 *   onChange        (brands) => void
 *   onDelete        (brandId) => void   — called for existing brands being removed
 *   disabled        boolean
 *   formulationLabel string | null      — e.g. "500mg · Tablet" shown as read-only header
 */

export default function BrandEditor({
  brands = [],
  onChange,
  onDelete,
  disabled = false,
  formulationLabel = null,
}) {
  const { toast } = useToast()

  const [newName, setNewName] = useState('')
  const [newMfr,  setNewMfr]  = useState('')
  const [toggling, setToggling] = useState(null) // brandId being toggled

  function updateLocal(idx, field, value) {
    onChange(brands.map((b, i) => i === idx ? { ...b, [field]: value } : b))
  }

  function removeBrand(idx) {
    const brand = brands[idx]
    if (brand.id && onDelete) {
      onDelete(brand.id)
    } else {
      onChange(brands.filter((_, i) => i !== idx))
    }
  }

  /**
   * Immediately persist is_published for existing brands (those with an id).
   * New (unsaved) brands just toggle locally — they'll be saved on the save button.
   */
  async function togglePublished(idx) {
    const brand    = brands[idx]
    const newValue = !(brand.is_published ?? true)

    // Optimistic local update
    updateLocal(idx, 'is_published', newValue)

    if (!brand.id) return // new brand — no DB row yet

    setToggling(brand.id)
    const { error } = await updateBrand(brand.id, { is_published: newValue })
    setToggling(null)

    if (error) {
      // Revert
      updateLocal(idx, 'is_published', !newValue)
      toast.error(`Could not update publish status: ${error.message}`)
    } else {
      toast.success(newValue ? 'Brand published' : 'Brand set to draft')
    }
  }

  function addBrand() {
    if (!newName.trim()) return
    onChange([
      ...brands,
      {
        tradename_clean: newName.trim(),
        manufacturer:    newMfr.trim() || null,
        is_published:    true,
      },
    ])
    setNewName('')
    setNewMfr('')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>

      {/* Inherited formulation label — display only */}
      {formulationLabel && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
          padding: 'var(--space-2) var(--space-3)',
          backgroundColor: 'var(--color-bg)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-sm)',
        }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Formulation
          </span>
          <span style={{ fontSize: 13, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-body)' }}>
            {formulationLabel}
          </span>
          <span style={{
            marginLeft: 'auto', fontSize: 10, color: 'var(--color-text-tertiary)',
            fontStyle: 'italic',
          }}>
            inherited · not editable here
          </span>
        </div>
      )}

      {/* Brand rows — one compact line each, always editable */}
      {brands.map((brand, idx) => (
        <div
          key={brand.id ?? `new-${idx}`}
          style={{
            backgroundColor: (brand.is_published ?? true) ? 'var(--color-surface)' : 'var(--color-bg)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-2)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            opacity: (brand.is_published ?? true) ? 1 : 0.65,
          }}
        >
          <input
            type="text"
            value={brand.tradename_clean}
            onChange={e => updateLocal(idx, 'tradename_clean', e.target.value)}
            disabled={disabled}
            placeholder="Brand name *"
            required
            style={{ ...inputStyle, flex: 1.4 }}
          />
          <input
            type="text"
            value={brand.manufacturer ?? ''}
            onChange={e => updateLocal(idx, 'manufacturer', e.target.value || null)}
            disabled={disabled}
            placeholder="Manufacturer"
            style={{ ...inputStyle, flex: 1 }}
          />

          <button
            type="button"
            role="switch"
            aria-checked={brand.is_published ?? true}
            onClick={() => !disabled && !toggling && togglePublished(idx)}
            disabled={disabled || toggling === brand.id}
            title={(brand.is_published ?? true) ? 'Click to unpublish' : 'Click to publish'}
            style={{
              width: 32, height: 18,
              borderRadius: 9,
              border: 'none',
              backgroundColor: (brand.is_published ?? true) ? 'var(--color-accent)' : 'var(--color-border)',
              position: 'relative',
              cursor: (disabled || toggling === brand.id) ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.2s',
              flexShrink: 0,
              opacity: toggling === brand.id ? 0.6 : 1,
            }}
          >
            <span style={{
              position: 'absolute',
              top: 2, left: (brand.is_published ?? true) ? 15 : 2,
              width: 14, height: 14,
              borderRadius: '50%',
              backgroundColor: '#fff',
              transition: 'left 0.2s',
              boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
            }} />
          </button>

          {!disabled && (
            <button
              type="button"
              onClick={() => removeBrand(idx)}
              aria-label="Remove brand"
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--color-text-tertiary)',
                padding: 4, display: 'flex', alignItems: 'center',
                flexShrink: 0,
              }}
            >
              <Trash2 size={15} />
            </button>
          )}
        </div>
      ))}

      {/* Add new brand row */}
      {!disabled && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-2)',
          border: '1px dashed var(--color-border)',
          borderRadius: 'var(--radius-md)',
          padding: 'var(--space-2)',
          backgroundColor: 'var(--color-bg)',
        }}>
          <input
            type="text"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="Brand name *"
            style={{ ...inputStyle, flex: 1.4 }}
            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addBrand())}
          />
          <input
            type="text"
            value={newMfr}
            onChange={e => setNewMfr(e.target.value)}
            placeholder="Manufacturer"
            style={{ ...inputStyle, flex: 1 }}
            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addBrand())}
          />
          <button
            type="button"
            onClick={addBrand}
            disabled={!newName.trim()}
            style={{
              display: 'flex', alignItems: 'center', gap: 'var(--space-1)',
              padding: 'var(--space-2) var(--space-3)',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              backgroundColor: newName.trim() ? 'var(--color-accent)' : 'var(--color-border)',
              color: newName.trim() ? '#fff' : 'var(--color-text-tertiary)',
              fontSize: 13, fontWeight: 600,
              fontFamily: 'var(--font-body)',
              cursor: newName.trim() ? 'pointer' : 'not-allowed',
              flexShrink: 0,
            }}
          >
            <Plus size={14} />
            Add
          </button>
        </div>
      )}
    </div>
  )
}

const inputStyle = {
  width: '100%',
  boxSizing: 'border-box',
  padding: 'var(--space-2) var(--space-3)',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--color-border)',
  backgroundColor: 'var(--color-surface)',
  color: 'var(--color-text-primary)',
  fontSize: 13,
  fontFamily: 'var(--font-body)',
  outline: 'none',
  appearance: 'none',
  WebkitAppearance: 'none',
}
