import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'

/**
 * BrandEditor — manage brands for a formulation.
 * Phase 3F — removed in_stock, added source dropdown + is_published toggle per masterplan 3G spec.
 *
 * Props:
 *   brands    { id?, name, name_ar, manufacturer, source, is_published }[]
 *   onChange  (brands) => void
 *   onDelete  (brandId) => void   — called for existing brands being removed
 *   disabled  boolean
 */

const SOURCE_OPTIONS = [
  { value: 'EDA',             label: 'EDA' },
  { value: 'manual',          label: 'Manual' },
  { value: 'pharmacy-review', label: 'Pharmacy review' },
]

export default function BrandEditor({ brands = [], onChange, onDelete, disabled = false }) {

  const [newName,   setNewName]   = useState('')
  const [newNameAr, setNewNameAr] = useState('')
  const [newMfr,    setNewMfr]    = useState('')
  const [newSource, setNewSource] = useState('manual')

  function updateBrand(idx, field, value) {
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

  function addBrand() {
    if (!newName.trim()) return
    onChange([
      ...brands,
      {
        name:         newName.trim(),
        name_ar:      newNameAr.trim() || null,
        manufacturer: newMfr.trim()    || null,
        source:       newSource,
        is_published: true,
      },
    ])
    setNewName('')
    setNewNameAr('')
    setNewMfr('')
    setNewSource('manual')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>

      {/* Existing brand rows */}
      {brands.map((brand, idx) => (
        <div
          key={brand.id ?? `new-${idx}`}
          style={{
            backgroundColor: (brand.is_published ?? true) ? 'var(--color-surface)' : 'var(--color-bg)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-3)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-2)',
            opacity: (brand.is_published ?? true) ? 1 : 0.65,
          }}
        >
          {/* Draft badge */}
          {!(brand.is_published ?? true) && (
            <span style={{
              alignSelf: 'flex-start',
              fontSize: 10, fontWeight: 700, letterSpacing: '0.06em',
              padding: '1px 6px', borderRadius: 4,
              backgroundColor: 'var(--color-border)',
              color: 'var(--color-text-tertiary)',
              textTransform: 'uppercase',
            }}>Draft</span>
          )}

          {/* Name row */}
          <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              <SmallLabel>Brand name (EN) *</SmallLabel>
              <input
                type="text"
                value={brand.name}
                onChange={e => updateBrand(idx, 'name', e.target.value)}
                disabled={disabled}
                placeholder="Brand name"
                required
                style={inputStyle}
              />
            </div>
            <div style={{ flex: 1 }}>
              <SmallLabel>Brand name (AR)</SmallLabel>
              <input
                type="text"
                value={brand.name_ar ?? ''}
                onChange={e => updateBrand(idx, 'name_ar', e.target.value || null)}
                disabled={disabled}
                placeholder="اسم العلامة التجارية"
                dir="rtl"
                style={{ ...inputStyle, textAlign: 'right' }}
              />
            </div>
          </div>

          {/* Manufacturer + Source row */}
          <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <SmallLabel>Manufacturer</SmallLabel>
              <input
                type="text"
                value={brand.manufacturer ?? ''}
                onChange={e => updateBrand(idx, 'manufacturer', e.target.value || null)}
                disabled={disabled}
                placeholder="Optional"
                style={inputStyle}
              />
            </div>

            <div style={{ flex: 1 }}>
              <SmallLabel>Source</SmallLabel>
              <select
                value={brand.source ?? 'manual'}
                onChange={e => updateBrand(idx, 'source', e.target.value)}
                disabled={disabled}
                style={inputStyle}
              >
                {SOURCE_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Published toggle + Delete row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginTop: 2 }}>
            <button
              type="button"
              role="switch"
              aria-checked={brand.is_published ?? true}
              onClick={() => !disabled && updateBrand(idx, 'is_published', !(brand.is_published ?? true))}
              disabled={disabled}
              style={{
                width: 36, height: 20,
                borderRadius: 10,
                border: 'none',
                backgroundColor: (brand.is_published ?? true) ? 'var(--color-accent)' : 'var(--color-border)',
                position: 'relative', cursor: disabled ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.2s',
                flexShrink: 0,
              }}
            >
              <span style={{
                position: 'absolute',
                top: 2, left: (brand.is_published ?? true) ? 17 : 2,
                width: 16, height: 16,
                borderRadius: '50%',
                backgroundColor: '#fff',
                transition: 'left 0.2s',
                boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
              }} />
            </button>
            <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)', flex: 1 }}>
              {(brand.is_published ?? true) ? 'Published' : 'Draft'}
            </span>

            {!disabled && (
              <button
                type="button"
                onClick={() => removeBrand(idx)}
                aria-label="Remove brand"
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--color-text-tertiary)',
                  padding: 4, display: 'flex', alignItems: 'center',
                }}
              >
                <Trash2 size={15} />
              </button>
            )}
          </div>
        </div>
      ))}

      {/* Add new brand row */}
      {!disabled && (
        <div style={{
          border: '1px dashed var(--color-border)',
          borderRadius: 'var(--radius-md)',
          padding: 'var(--space-3)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-2)',
          backgroundColor: 'var(--color-bg)',
        }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Add brand
          </div>

          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <input
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="Brand name (EN) *"
              style={inputStyle}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addBrand())}
            />
            <input
              type="text"
              value={newNameAr}
              onChange={e => setNewNameAr(e.target.value)}
              placeholder="اسم (AR)"
              dir="rtl"
              style={{ ...inputStyle, textAlign: 'right' }}
            />
          </div>

          <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
            <input
              type="text"
              value={newMfr}
              onChange={e => setNewMfr(e.target.value)}
              placeholder="Manufacturer (optional)"
              style={{ ...inputStyle, flex: 1 }}
            />
            <select
              value={newSource}
              onChange={e => setNewSource(e.target.value)}
              style={{ ...inputStyle, width: 'auto', flexShrink: 0 }}
            >
              {SOURCE_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
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
        </div>
      )}
    </div>
  )
}

function SmallLabel({ children }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 600,
      color: 'var(--color-text-tertiary)',
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
      marginBottom: 3,
      fontFamily: 'var(--font-body)',
    }}>
      {children}
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
