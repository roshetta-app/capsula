import { useState } from 'react'
import { updateBrandStock } from '../../lib/adminQueries'

/**
 * BrandStockRow — inline toggle row for a single brand inside DrugCMS.
 *
 * Props:
 *   brand     BrandSummary  { id, name, name_ar, in_stock, is_available }
 *   onUpdate  (id, field, value) => void   — parent updates its local state
 *
 * Behaviour:
 *   - Optimistic update: flip locally first, revert on Supabase error.
 *   - Two toggles: In Stock + Available.
 *   - Disabled while a save is in flight for that field.
 */
export default function BrandStockRow({ brand, onUpdate }) {
  // Track which field is currently being saved so we can disable that toggle
  const [saving, setSaving] = useState(null) // 'in_stock' | 'is_available' | null
  const [localBrand, setLocalBrand] = useState(brand)

  async function toggle(field) {
    if (saving) return
    const newVal = !localBrand[field]

    // Optimistic update
    setLocalBrand(prev => ({ ...prev, [field]: newVal }))
    onUpdate(brand.id, field, newVal)

    setSaving(field)
    const { error } = await updateBrandStock(brand.id, field, newVal)
    setSaving(null)

    if (error) {
      // Revert on failure
      setLocalBrand(prev => ({ ...prev, [field]: !newVal }))
      onUpdate(brand.id, field, !newVal)
      console.error('[BrandStockRow] toggle failed:', error.message)
    }
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-3)',
      padding: 'var(--space-2) var(--space-4) var(--space-2) var(--space-8)',
      borderTop: '1px solid var(--color-border-subtle)',
      backgroundColor: 'var(--color-bg)',
    }}>

      {/* Brand name */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{
          fontSize: 13,
          fontWeight: 500,
          color: 'var(--color-text-primary)',
          display: 'block',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {localBrand.name}
        </span>
        {localBrand.name_ar && (
          <span style={{
            fontSize: 12,
            color: 'var(--color-text-arabic)',
            direction: 'rtl',
            display: 'block',
          }}>
            {localBrand.name_ar}
          </span>
        )}
      </div>

      {/* In Stock toggle */}
      <ToggleField
        label="In stock"
        checked={localBrand.in_stock}
        onColor="var(--color-instock)"
        onChange={() => toggle('in_stock')}
        disabled={saving === 'in_stock'}
      />

      {/* Available toggle */}
      <ToggleField
        label="Available"
        checked={localBrand.is_available}
        onColor="var(--color-accent)"
        onChange={() => toggle('is_available')}
        disabled={saving === 'is_available'}
      />
    </div>
  )
}

// ─── Reusable toggle pill ─────────────────────────────────────────────────────

function ToggleField({ label, checked, onColor, onChange, disabled }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 3,
      flexShrink: 0,
    }}>
      <span style={{
        fontSize: 10,
        fontWeight: 500,
        color: 'var(--color-text-tertiary)',
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        fontFamily: 'var(--font-body)',
      }}>
        {label}
      </span>
      <button
        onClick={onChange}
        disabled={disabled}
        aria-label={`${label}: ${checked ? 'on' : 'off'}`}
        style={{
          width: 40,
          height: 24,
          borderRadius: 'var(--radius-full)',
          border: 'none',
          cursor: disabled ? 'not-allowed' : 'pointer',
          padding: 3,
          backgroundColor: checked ? onColor : 'var(--color-outstock)',
          opacity: disabled ? 0.5 : 1,
          transition: 'background-color 0.2s ease, opacity 0.15s ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: checked ? 'flex-end' : 'flex-start',
          outline: 'none',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        <div style={{
          width: 18,
          height: 18,
          borderRadius: 'var(--radius-full)',
          backgroundColor: 'white',
          boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
        }} />
      </button>
    </div>
  )
}
