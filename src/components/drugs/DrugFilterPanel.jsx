import { useState, useEffect } from 'react'

/**
 * DrugFilterPanel — bottom-sheet filter panel for the Drugs screen.
 *
 * Phase 2F spec:
 *  - Slides up from bottom
 *  - Sections: Form/Route, Pregnancy (Safe/Unsafe), Breastfeeding (Safe/Unsafe)
 *  - Clear All + Apply Filters buttons
 *  - Filters do NOT persist between sessions
 *
 * 2026-07-18 (drug_library_ui_ux, plan §7 step 1c.2, decision 4.10): added a
 * Category section, single-select like the category tiles rather than
 * multi-select like Form/Route. `activeCategory` keeps the sheet in sync
 * with whichever tile is currently active — it re-syncs every time the
 * sheet opens, so tapping a tile and then opening the sheet always shows
 * the right chip already selected. Clear All intentionally leaves category
 * untouched (user decision) — it only resets Form/Route, Pregnancy, and
 * Breastfeeding.
 *
 * Props:
 *   isOpen         boolean
 *   onClose        () => void
 *   onApply        (filters) => void   filters: { category, forms, pregnancySafe, pregnancyUnsafe, bfSafe, bfUnsafe }
 *   categories     array of { slug, name_en, ... } — already filtered to categories with drugs, same list the tiles use
 *   activeCategory string | '__all' | null — the category currently active on the screen (tile-driven)
 */

// Each chip's `matches` list is the full set of real raw form values (from
// src/config/forms.js) it should catch. `value` stays the chip's own stable
// id used for selection state - it is not necessarily a raw form value
// itself anymore now that Tab/Capsule and Drops each cover several.
export const FORM_OPTIONS = [
  { value: 'all',         label: 'All',          matches: [] },
  { value: 'tablet',      label: 'Tab / Capsule', matches: ['tablet', 'capsule', 'effervescent', 'lozenges'] },
  { value: 'drops',       label: 'Drops',         matches: ['eye drops', 'oral drops', 'ear drops', 'nasal drops', 'mouth drops'] },
  { value: 'syrup',       label: 'Syrup',         matches: ['syrup', 'suspension', 'solution'] },
  { value: 'injection',   label: 'Injection',     matches: ['injection', 'vial', 'ampoule', 'syringe', 'pen', 'vaccine'] },
  { value: 'suppository', label: 'Suppository',   matches: ['suppository', 'enema', 'vaginal douche'] },
  { value: 'sachet',      label: 'Sachet',        matches: ['sachet', 'powder'] },
  { value: 'inhaler',     label: 'Inhaled',       matches: ['inhaler', 'inhalation solution'] },
  { value: 'cream',       label: 'Topical',       matches: ['cream', 'ointment', 'gel', 'lotion', 'shampoo', 'soap', 'antiseptic solution', 'facial wash', 'conditioner', 'foam', 'paint', 'hair oil', 'oil', 'serum', 'patch', 'wipes', 'gauze dressing'] },
  { value: 'other',       label: 'Other',         matches: ['piece', 'mouth wash', 'film', 'bottle', 'other'] },
]

const EMPTY = {
  forms:          ['all'],
  pregnancySafe:  false,
  pregnancyUnsafe: false,
  bfSafe:         false,
  bfUnsafe:       false,
}

export default function DrugFilterPanel({ isOpen, onClose, onApply, categories = [], activeCategory = null }) {
  const [filters, setFilters] = useState(() => ({ ...EMPTY, category: activeCategory }))

  // Keep the sheet's category chip in sync with whichever tile is active
  // every time the sheet is opened (decision 4.10 — "one thing, two doors").
  useEffect(() => {
    if (isOpen) {
      setFilters(prev => ({ ...prev, category: activeCategory }))
    }
  }, [isOpen, activeCategory])

  if (!isOpen) return null

  function toggleForm(val) {
    setFilters(prev => {
      if (val === 'all') return { ...prev, forms: ['all'] }
      const without = prev.forms.filter(f => f !== 'all' && f !== val)
      const next = prev.forms.includes(val) ? without : [...without, val]
      return { ...prev, forms: next.length ? next : ['all'] }
    })
  }

  function toggle(key) {
    setFilters(prev => ({ ...prev, [key]: !prev[key] }))
  }

  // Category is a single-select, tile-mirroring choice, not a "filter" in
  // the same sense as Form/Route — clicking a chip sets it directly rather
  // than toggling membership in a set.
  function toggleCategory(value) {
    setFilters(prev => ({ ...prev, category: value }))
  }

  function handleClear() {
    // Clear All resets Form/Route, Pregnancy, and Breastfeeding only —
    // category stays whatever it currently is (user decision, 2026-07-18).
    setFilters(prev => ({ ...EMPTY, category: prev.category }))
  }

  function handleApply() {
    onApply(filters)
    onClose()
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 80,
          backgroundColor: 'rgba(0,0,0,0.4)',
        }}
      />

      {/* Sheet */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        zIndex: 90,
        backgroundColor: 'var(--color-surface)',
        borderRadius: '16px 16px 0 0',
        padding: 'var(--space-4) var(--space-4) calc(var(--space-4) + env(safe-area-inset-bottom))',
        maxHeight: '80vh',
        overflowY: 'auto',
        boxShadow: '0 -4px 24px rgba(0,0,0,0.12)',
      }}>
        {/* Handle */}
        <div style={{
          width: 36, height: 4, borderRadius: 2,
          backgroundColor: 'var(--color-border)',
          margin: '0 auto var(--space-4)',
        }} />

        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 'var(--space-4)' }}>
          Filter Drugs
        </div>

        {/* Category */}
        <FilterSection label="Category">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
            <ToggleChip
              label="All Drugs"
              active={filters.category === '__all'}
              onToggle={() => toggleCategory('__all')}
            />
            {categories.map(cat => (
              <ToggleChip
                key={cat.slug}
                label={cat.name_en}
                active={filters.category === cat.slug}
                onToggle={() => toggleCategory(cat.slug)}
              />
            ))}
          </div>
        </FilterSection>

        {/* Form / Route */}
        <FilterSection label="Form / Route">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
            {FORM_OPTIONS.map(opt => {
              const active = filters.forms.includes(opt.value)
              return (
                <ToggleChip key={opt.value} label={opt.label} active={active} onToggle={() => toggleForm(opt.value)} />
              )
            })}
          </div>
        </FilterSection>

        {/* Pregnancy */}
        <FilterSection label="Pregnancy">
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <ToggleChip label="Safe (Cat A/B)" active={filters.pregnancySafe} onToggle={() => toggle('pregnancySafe')} />
            <ToggleChip label="Unsafe (Cat C/D/X)" active={filters.pregnancyUnsafe} onToggle={() => toggle('pregnancyUnsafe')} />
          </div>
        </FilterSection>

        {/* Breastfeeding */}
        <FilterSection label="Breastfeeding">
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <ToggleChip label="Safe" active={filters.bfSafe} onToggle={() => toggle('bfSafe')} />
            <ToggleChip label="Unsafe / Caution" active={filters.bfUnsafe} onToggle={() => toggle('bfUnsafe')} />
          </div>
        </FilterSection>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-5)' }}>
          <button
            onClick={handleClear}
            style={{
              flex: 1, padding: '12px',
              borderRadius: 'var(--radius-md)',
              fontSize: 14, fontWeight: 600,
              cursor: 'pointer',
              border: '1.5px solid #DC2626',
              backgroundColor: 'transparent',
              color: '#DC2626',
              fontFamily: 'var(--font-body)',
            }}
          >
            Clear All
          </button>
          <button
            onClick={handleApply}
            style={{
              flex: 1, padding: '12px',
              borderRadius: 'var(--radius-md)',
              fontSize: 14, fontWeight: 600,
              cursor: 'pointer',
              border: 'none',
              backgroundColor: 'var(--color-accent)',
              color: '#fff',
              fontFamily: 'var(--font-body)',
            }}
          >
            Apply Filters
          </button>
        </div>
      </div>
    </>
  )
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function FilterSection({ label, children }) {
  return (
    <div style={{ marginBottom: 'var(--space-4)' }}>
      <div style={{
        fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
        textTransform: 'uppercase', color: 'var(--color-text-tertiary)',
        marginBottom: 'var(--space-2)',
      }}>
        {label}
      </div>
      {children}
    </div>
  )
}

function ToggleChip({ label, active, onToggle }) {
  return (
    <button
      onClick={onToggle}
      style={{
        padding: '6px 14px',
        borderRadius: 'var(--radius-full)',
        fontSize: 13, fontWeight: active ? 600 : 400,
        cursor: 'pointer',
        border: active ? '1.5px solid var(--color-accent)' : '1.5px solid var(--color-border)',
        backgroundColor: active ? 'var(--color-accent)' : 'transparent',
        color: active ? '#fff' : 'var(--color-text-secondary)',
        fontFamily: 'var(--font-body)',
        transition: 'all 0.15s ease',
        WebkitTapHighlightColor: 'transparent',
        outline: 'none',
      }}
    >
      {label}
    </button>
  )
}
