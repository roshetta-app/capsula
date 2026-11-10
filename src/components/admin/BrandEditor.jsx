import { useState, useEffect, useRef } from 'react'
import { Plus, Trash2, Pencil, Eye, EyeOff } from 'lucide-react'
import { updateBrand } from '../../lib/adminQueries'
import { useToast } from '../../context/ToastContext'
import { useCategories } from '../../hooks/useCategories'
import { useIsDark } from '../../utils/specialtyIcon'
import SharedDrugCard from '../SharedDrugCard'
import ConfirmModal from './ConfirmModal'
import RowMenu from './RowMenu'

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
 * 12.4/12.5 — accepts an optional `highlightBrandId`, the deep-link target
 * from a brand row on the CMS drug library screen. The matching row starts
 * expanded and scrolls into view once on mount; every row also carries a
 * `data-brand-id` anchor so a future highlight/scroll target survives
 * whichever redesign of this file lands next (decision 27 #6).
 *
 * 2026-11-10 (formulation editor): each saved or new brand is now drawn with SharedDrugCard,
 * the same row the app's Other Brands list uses (category badge, title with strength/form/pack,
 * generic line, and the image-search strip that opens Google Images for the pack, which is how
 * a doctor or pharmacist tells two similar packs apart; removed again 2026-11-10 at the user's request). Tapping the row opens the two edit
 * fields under it. Trailing: Live/Draft button (saves at once) and a delete button. Delete on a
 * saved brand RETIRES it (set to draft, saved at once, with a confirm), the same as the Drug
 * Library; nothing is erased from the database. A brand not saved yet is just removed.
 *
 * Props:
 *   category     the generic's category slug (badge colour and icon)
 *   ingredients  the generic's ingredients, for the second line of each row
 *   brands       { id?, tradename_clean, manufacturer, pack_size?, fill_volume?, is_published }[]
 *   formulation  { concentration, form, form_modifier, route, route_details }
 *                — the parent formulation's fields, needed to build each
 *                  brand's title suffix. pack_size/fill_volume live on the
 *                  brand itself; everything else is inherited from here.
 *   onChange     (brands) => void
 *   onDelete     (brandId) => void   — called for existing brands being removed
 *   disabled     boolean
 *   highlightBrandId  string|null — deep-link target brand id (12.4/12.5)
 */

export default function BrandEditor({
  brands = [],
  formulation = {},
  onChange,
  onDelete,
  disabled = false,
  highlightBrandId = null,
  category = null,
  ingredients = [],
}) {
  const { toast } = useToast()
  const { categories } = useCategories()
  const isDark = useIsDark()
  const [confirmIdx, setConfirmIdx] = useState(null)

  const [newName,     setNewName]     = useState('')
  const [newMfr,       setNewMfr]     = useState('')
  const [adding,       setAdding]     = useState(false) // the Add brand form is hidden until asked for
  const [toggling,    setToggling]    = useState(null) // brandId being toggled
  // Starts expanded on the deep-linked brand, if any, so a click from the
  // CMS drug library screen lands already open on the right row.
  const [expandedIdx, setExpandedIdx] = useState(() =>
    highlightBrandId != null ? brands.findIndex(b => b.id === highlightBrandId) : null
  )

  const highlightRef = useRef(null)

  // Scroll the deep-linked row into view once, after it renders expanded.
  useEffect(() => {
    if (!highlightBrandId || !highlightRef.current) return
    const t = setTimeout(() => {
      highlightRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 80)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function updateLocal(idx, field, value) {
    onChange(brands.map((b, i) => i === idx ? { ...b, [field]: value } : b))
  }

  // Delete: an unsaved brand is simply dropped; a saved one is retired (draft, saved now).
  async function retireBrand(idx) {
    const brand = brands[idx]
    setConfirmIdx(null)
    if (!brand.id) { onChange(brands.filter((_, i) => i !== idx)); return }
    if (!(brand.is_published ?? true)) { toast.success('Brand is already a draft'); return }
    await togglePublished(idx)
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
    setAdding(false)
  }

  const ingredientNames = (Array.isArray(ingredients) ? ingredients : [])
    .map(x => (typeof x === 'string' ? x : x?.name ?? x?.name_en ?? ''))
    .filter(Boolean)

  // The row's data in the shape SharedDrugCard expects (camelCase, like the app's flat drugs).
  function cardDrug(brand) {
    return {
      id:             brand.id ?? undefined,
      tradenameClean: brand.tradename_clean || 'New brand',
      ingredients:    ingredientNames,
      category,
      concentration:  formulation.concentration,
      form:           formulation.form,
      formModifier:   formulation.form_modifier,
      route:          formulation.route,
      routeDetails:   formulation.route_details,
      packSize:       brand.pack_size,
      fillVolume:     brand.fill_volume,
      nameAr:         null,
      nameArFull:     null,
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>

      {/* Brand rows: the app's own drug row, plus Live/Draft and delete */}
      {brands.length > 0 && (
        <div style={{
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          padding: '0 var(--space-3)',
        }}>
          {brands.map((brand, idx) => {
            const isOpen = expandedIdx === idx
            const live = brand.is_published ?? true
            const isHighlighted = brand.id != null && brand.id === highlightBrandId
            const busy = toggling === brand.id && brand.id != null
            return (
              <div
                key={brand.id ?? `new-${idx}`}
                data-brand-id={brand.id ?? undefined}
                ref={isHighlighted ? highlightRef : null}
                style={{
                  borderBottom: idx === brands.length - 1 ? 'none' : '1px solid var(--color-border-subtle)',
                  opacity: live ? 1 : 0.7,
                }}
              >
                <SharedDrugCard
                  drug={cardDrug(brand)}
                  categories={categories}
                  isDark={isDark}
                  isLast
                  showChevron={false}
                  disableTap={disabled}
                  onTap={() => setExpandedIdx(isOpen ? null : idx)}
                  trailing={
                    <div style={{ display: 'flex', gap: 'var(--space-1)', alignItems: 'center', opacity: busy ? 0.5 : 1 }}>
                      {!live && (
                        <span style={{
                          fontSize: 10, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase',
                          padding: '1px 6px', borderRadius: 'var(--radius-full)',
                          color: 'var(--color-text-tertiary)', backgroundColor: 'var(--color-bg)',
                          border: '1px solid var(--color-border)',
                        }}>Draft</span>
                      )}
                      {!disabled && (
                        <RowMenu
                          disabled={busy}
                          items={[
                            {
                              label: live ? 'Unpublish' : 'Publish',
                              icon: live ? <EyeOff size={14} /> : <Eye size={14} />,
                              onClick: () => !toggling && togglePublished(idx),
                            },
                            {
                              label: brand.id ? 'Delete (retire)' : 'Remove',
                              icon: <Trash2 size={14} />,
                              danger: true,
                              onClick: () => (brand.id ? setConfirmIdx(idx) : retireBrand(idx)),
                            },
                          ]}
                        />
                      )}
                    </div>
                  }
                />

                {isOpen && (
                  <div style={{
                    display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap',
                    margin: '0 0 var(--space-3)', padding: 'var(--space-3)',
                    border: '1.5px solid var(--color-accent)', borderRadius: 10,
                    backgroundColor: 'var(--color-surface)',
                  }}>
                    <div style={{ flex: '1 1 160px', minWidth: 0 }}>
                      <SmallLabel>Brand name (EN) *</SmallLabel>
                      <input
                        type="text"
                        value={brand.tradename_clean}
                        onChange={e => updateLocal(idx, 'tradename_clean', e.target.value)}
                        disabled={disabled}
                        placeholder="Brand name"
                        style={inputStyle}
                      />
                    </div>
                    <div style={{ flex: '1 1 160px', minWidth: 0 }}>
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
                    <div style={{ flexBasis: '100%', display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--color-text-tertiary)' }}>
                      <Pencil size={11} /> Name and manufacturer save with the formulation's Save button.
                      {busy && ' Saving…'}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <ConfirmModal
        isOpen={confirmIdx != null}
        onClose={() => setConfirmIdx(null)}
        onConfirm={() => retireBrand(confirmIdx)}
        title="Retire this brand?"
        message="It is set to draft now, so it disappears from the app. Nothing is erased; you can publish it again any time."
        confirmLabel="Retire brand"
        confirmVariant="danger"
      />

      {/* Add new brand row */}
      {!disabled && !adding && (
        <button
          type="button"
          onClick={() => setAdding(true)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 4, alignSelf: 'flex-start',
            padding: '6px 4px', border: 'none', background: 'none',
            color: 'var(--color-text-secondary)', fontSize: 13, fontWeight: 600,
            fontFamily: 'var(--font-body)', cursor: 'pointer',
          }}
        >
          <Plus size={14} /> Brand
        </button>
      )}

      {!disabled && adding && (
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
              autoFocus
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
            <button
              type="button"
              onClick={() => { setAdding(false); setNewName(''); setNewMfr('') }}
              style={{
                padding: 'var(--space-2) var(--space-3)', borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-border)', background: 'none',
                color: 'var(--color-text-secondary)', fontSize: 13, fontWeight: 600,
                fontFamily: 'var(--font-body)', cursor: 'pointer', flexShrink: 0,
              }}
            >
              Cancel
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
