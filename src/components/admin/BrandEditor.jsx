import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'

/**
 * BrandEditor — manage brands for a formulation.
 *
 * Props:
 *   brands    { id?, name, name_ar, manufacturer, in_stock, is_available }[]
 *             id is present for existing brands, absent for new ones
 *   onChange  (brands) => void
 *   disabled  boolean
 *
 * Behaviour:
 *   - List of existing brands with editable fields
 *   - In Stock toggle per brand
 *   - Delete — disabled if only 1 brand remains
 *   - Add brand row at bottom
 *   - Minimum 1 brand enforced (delete button disabled at 1)
 */
export default function BrandEditor({ brands = [], onChange, disabled = false }) {

  const [newName,    setNewName]    = useState('')
  const [newNameAr,  setNewNameAr]  = useState('')
  const [newMfr,     setNewMfr]     = useState('')

  function updateBrand(idx, field, value) {
    onChange(brands.map((b, i) => i === idx ? { ...b, [field]: value } : b))
  }

  function removeBrand(idx) {
    if (brands.length <= 1) return
    onChange(brands.filter((_, i) => i !== idx))
  }

  function addBrand() {
    if (!newName.trim()) return
    onChange([
      ...brands,
      {
        name:         newName.trim(),
        name_ar:      newNameAr.trim() || null,
        manufacturer: newMfr.trim()    || null,
        in_stock:     true,
        is_available: true,
      },
    ])
    setNewName('')
    setNewNameAr('')
    setNewMfr('')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>

      {/* Existing brand rows */}
      {brands.map((brand, idx) => (
        <div
          key={brand.id ?? `new-${idx}`}
          style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-3)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-2)',
          }}
        >
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

          {/* Manufacturer + In Stock row */}
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

            {/* In Stock toggle */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flexShrink: 0 }}>
              <SmallLabel>In stock</SmallLabel>
              <Toggle
                checked={brand.in_stock}
                onChange={v => updateBrand(idx, 'in_stock', v)}
                disabled={disabled}
                onColor="var(--color-instock)"
              />
            </div>

            {/* Delete */}
            {!disabled && (
              <button
                type="button"
                onClick={() => removeBrand(idx)}
                disabled={brands.length <= 1}
                aria-label="Remove brand"
                title={brands.length <= 1 ? 'At least one brand required' : 'Remove brand'}
                style={{
                  background: 'none', border: 'none', cursor: brands.length <= 1 ? 'not-allowed' : 'pointer',
                  color: brands.length <= 1 ? 'var(--color-border)' : 'var(--color-text-tertiary)',
                  padding: 4, display: 'flex', alignItems: 'center', flexShrink: 0,
                  marginBottom: 2,
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

      {brands.length === 0 && (
        <div style={{ fontSize: 12, color: '#DC2626', fontStyle: 'italic' }}>
          At least one brand is required before saving.
        </div>
      )}
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function SmallLabel({ children }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 600, color: 'var(--color-text-tertiary)',
      textTransform: 'uppercase', letterSpacing: '0.04em',
      marginBottom: 3, fontFamily: 'var(--font-body)',
    }}>
      {children}
    </div>
  )
}

function Toggle({ checked, onChange, disabled, onColor }) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      style={{
        width: 40, height: 24,
        borderRadius: 'var(--radius-full)',
        border: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        padding: 3,
        backgroundColor: checked ? onColor : 'var(--color-outstock)',
        opacity: disabled ? 0.5 : 1,
        transition: 'background-color 0.2s ease',
        display: 'flex',
        alignItems: 'center',
        justifyContent: checked ? 'flex-end' : 'flex-start',
        outline: 'none',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <div style={{
        width: 18, height: 18,
        borderRadius: 'var(--radius-full)',
        backgroundColor: 'white',
        boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
      }} />
    </button>
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
