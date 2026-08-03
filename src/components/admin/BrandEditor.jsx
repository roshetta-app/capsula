import { useState } from 'react'
import { Plus, Trash2, ChevronRight, ChevronDown } from 'lucide-react'
import { updateBrand } from '../../lib/adminQueries'
import { useToast } from '../../context/ToastContext'
import { toTitleCase, getDrugTitleSuffix } from '../../utils/drugTitleFormat'

/**
 * BrandEditor — manage brands for a formulation.
 * Phase 3G — immediate is_published toggle per masterplan 3G spec.
 *
 * CMS Library rebuild (plan §7, Brands + Search & Add, step 10.2, decision
 * 26): redesigned from a full open card per brand to a compact
 * one-line-per-brand list. Each row collapses to a single scannable line —
 * formatted the same way SharedDrugCard.jsx formats a drug title
 * (tradename + concentration/form/pack-or-fill-volume suffix, via
 * utils/drugTitleFormat.js), not the old raw `name` field — alongside
 * manufacturer, the publish toggle, and delete. Clicking anywhere on the
 * row (not a separate edit button) expands it in place to the two editable
 * fields; only one row is expanded at a time. Publish toggle and delete
 * stop propagation so they don't also trigger expand/collapse — same
 * pattern already used for DrugEditor.jsx's own SectionCard deleteSlot.
 *
 * Arabic name and source dropped entirely (decision 26) — no CMS field, no
 * app read, no DB column. Name field is `brands.tradename_clean`, not the
 * legacy `brands.name` (decision 21's fix for this file specifically).
 *
 * Props:
 *   brands       { id?, tradename_clean, manufacturer, pack_size?, fill_volume?, is_published }[]
 *   formulation  { concentration, form, form_modifier, route, route_details }
 *                — the parent formulation's fields, needed to build each
 *                  brand's title suffix. pack_size/fill_volume live on the
 *                  brand itself; everything else is inherited from here.
 *   onChange     (brands) => void
 *   onDelete     (brandId) => void   — called for existing brands being removed
 *   disabled     boolean
 */

export default function BrandEditor({
  brands = [],
  formulation = {},
  onChange,
  onDelete,
  disabled = false,
}) {
  const { toast } = useToast()

  const [newName,     setNewName]     = useState('')
  const [newMfr,       setNewMfr]     = useState('')
  const [toggling,    setToggling]    = useState(null) // brandId being toggled
  const [expandedIdx, setExpandedIdx] = useState(null) // which row is expanded

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

  // Collapsed-row title — this brand's own pack_size/fill_volume combined
  // with the parent formulation's concentration/form/route fields, matching
  // SharedDrugCard.jsx's composition exactly (decision 26). drugTitleFormat.js
  // expects camelCase fields; the DB-shaped objects here stay snake_case
  // until this one translation point, same boundary adminQueries.js's
  // searchDrugsForPicker already draws.
  function titleFor(brand) {
    const suffix = getDrugTitleSuffix({
      concentration: formulation.concentration,
      form:          formulation.form,
      formModifier:  formulation.form_modifier,
      route:         formulation.route,
      routeDetails:  formulation.route_details,
      packSize:      brand.pack_size,
      fillVolume:    brand.fill_volume,
    })
    const name = toTitleCase(brand.tradename_clean)
    return suffix ? `${name} ${suffix}` : name
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>

      {/* Existing brand rows */}
      {brands.map((brand, idx) => {
        const isOpen = expandedIdx === idx
        return (
          <div
            key={brand.id ?? `new-${idx}`}
            onClick={() => !disabled && setExpandedIdx(isOpen ? null : idx)}
            style={{
              backgroundColor: (brand.is_published ?? true) ? 'var(--color-surface)' : 'var(--color-bg)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-3)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-2)',
              opacity: (brand.is_published ?? true) ? 1 : 0.65,
              cursor: disabled ? 'default' : 'pointer',
            }}
          >
            {/* Collapsed summary line — always shown */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <span style={{ color: 'var(--color-text-tertiary)', flexShrink: 0, display: 'flex' }}>
                {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </span>

              {!(brand.is_published ?? true) && (
                <span style={{
                  fontSize: 10, fontWeight: 700, letterSpacing: '0.06em',
                  padding: '1px 6px', borderRadius: 4,
                  backgroundColor: 'var(--color-border)',
                  color: 'var(--color-text-tertiary)',
                  textTransform: 'uppercase',
                  flexShrink: 0,
                }}>Draft</span>
              )}

              <span style={{
                flex: 1, fontSize: 14, fontWeight: 500,
                color: 'var(--color-text-primary)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {titleFor(brand)}
              </span>

              <span style={{ fontSize: 12, color: 'var(--color-text-secondary)', flexShrink: 0 }}>
                {brand.manufacturer || '—'}
              </span>

              <button
                type="button"
                role="switch"
                aria-checked={brand.is_published ?? true}
                onClick={e => { e.stopPropagation(); !disabled && !toggling && togglePublished(idx) }}
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
                  onClick={e => { e.stopPropagation(); removeBrand(idx) }}
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

            {/* Expanded fields — only for the open row */}
            {isOpen && (
              <div
                onClick={e => e.stopPropagation()}
                style={{ display: 'flex', gap: 'var(--space-2)', paddingLeft: 22 }}
              >
                <div style={{ flex: 1 }}>
                  <SmallLabel>Brand name (EN) *</SmallLabel>
                  <input
                    type="text"
                    value={brand.tradename_clean}
                    onChange={e => updateLocal(idx, 'tradename_clean', e.target.value)}
                    disabled={disabled}
                    placeholder="Brand name"
                    required
                    style={inputStyle}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <SmallLabel>Manufacturer</SmallLabel>
                  <input
                    type="text"
                    value={brand.manufacturer ?? ''}
                    onChange={e => updateLocal(idx, 'manufacturer', e.target.value || null)}
                    disabled={disabled}
                    placeholder="Optional"
                    style={inputStyle}
                  />
                </div>
              </div>
            )}

            {toggling === brand.id && (
              <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', paddingLeft: 22 }}>
                Saving…
              </div>
            )}
          </div>
        )
      })}

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
