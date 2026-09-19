/**
 * src/components/drugs/BrandsList.jsx
 * Phase 2G — Drug Detail Screen
 * Step 3.11 (2026-07-16) — rebuilt per ADR-034: siblings now span the whole
 * generic across every form, not just the exact item's own formulation.
 * Alphabetical by default, filterable by form, sortable by relative cost.
 *
 * Props:
 *   siblings — array of other flat drug (item) objects sharing the same
 *              generic as the item currently being viewed. The current item
 *              itself should NOT be included — it's already shown above in
 *              the header. Confirmed full FlatDrug shape (not a trimmed
 *              projection) via DrugDetailScreen.jsx: `drugs.filter(d =>
 *              d.genericId === drug.genericId && d.id !== drug.id)`, same
 *              array `drugs` (the full drug list) comes from.
 *   onTap    — (item) => void — called when a sibling row is tapped
 *
 * 2026-09-18 (this session): per feedback —
 *  - Section header: "Available Brands (Egypt)" → "Other Brands".
 *  - Rows now render via SharedDrugCard.jsx (the same row component
 *    Drugs/Favourites screens use) instead of this file's own bordered-box
 *    markup, so a sibling brand looks identical to how it'd look on those
 *    screens. SharedDrugCard needs `categories` and `isDark`, which this
 *    file didn't have — both are self-contained hooks (confirmed:
 *    useCategories.js does its own Supabase fetch + cache, not seeded by a
 *    parent; useIsDark follows SourcesSection.jsx's own established
 *    direct-call precedent), so both are called directly here rather than
 *    threading two new props down through BrandsBottomSheet.jsx and
 *    GenericOverviewSection.jsx. Price (SharedDrugCard has no dedicated
 *    price slot) now rides in its `trailing` slot instead. Sort-by-name
 *    switched from the old row's `item.name` (SharedDrugCard's own header
 *    comment explains this was the old, no-longer-used pre-composed name
 *    field DrugCard.jsx used to double-render) to `item.tradenameClean`,
 *    matching what SharedDrugCard itself actually displays.
 */

import { useState } from 'react'
import SharedDrugCard from '../SharedDrugCard.jsx'
import { useCategories } from '../../hooks/useCategories'
import { useIsDark } from '../../utils/specialtyIcon'

function capitalize(str) {
  if (!str) return str
  return str.charAt(0).toUpperCase() + str.slice(1)
}

export default function BrandsList({ siblings = [], onTap }) {
  const [formFilter, setFormFilter] = useState('all')
  const [sortMode,   setSortMode]   = useState('name') // 'name' | 'price'
  const { categories } = useCategories()
  const isDark = useIsDark()

  // No real siblings — section disappears entirely, same as today's behavior
  // when the list is empty.
  if (siblings.length === 0) return null

  const forms = [...new Set(siblings.map(s => s.form).filter(Boolean))]
  const showFormFilter = forms.length > 1

  const filtered = formFilter === 'all'
    ? siblings
    : siblings.filter(s => s.form === formFilter)

  const sorted = [...filtered].sort((a, b) => {
    if (sortMode === 'price') {
      const priceA = a.price ?? Infinity
      const priceB = b.price ?? Infinity
      if (priceA !== priceB) return priceA - priceB
    }
    return (a.tradenameClean ?? '').localeCompare(b.tradenameClean ?? '')
  })

  return (
    <div style={{ marginBottom: 'var(--space-5)' }}>
      {/* Section header */}
      <div style={{
        fontSize:      10,
        fontWeight:    700,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        color:         'var(--color-text-tertiary)',
        marginBottom:  'var(--space-3)',
      }}>
        Other Brands
      </div>

      {/* Controls: form filter chips + name/price sort toggle */}
      <div style={{
        display:      'flex',
        alignItems:   'center',
        justifyContent: 'space-between',
        gap:          'var(--space-2)',
        marginBottom: 'var(--space-3)',
        flexWrap:     'wrap',
      }}>
        {showFormFilter ? (
          <div style={{ display: 'flex', gap: 'var(--space-2)', overflowX: 'auto' }}>
            <FormChip label="All" active={formFilter === 'all'} onClick={() => setFormFilter('all')} />
            {forms.map(f => (
              <FormChip key={f} label={capitalize(f)} active={formFilter === f} onClick={() => setFormFilter(f)} />
            ))}
          </div>
        ) : <div />}

        <SortToggle mode={sortMode} onChange={setSortMode} />
      </div>

      {/* Rows — SharedDrugCard.jsx, same component Drugs/Favourites screens
          use. It renders its own hairline divider between rows (isLast
          suppresses it on the final one), so no wrapping gap/box styling
          is needed here anymore. */}
      <div>
        {sorted.map((item, i) => (
          <SharedDrugCard
            key={item.id}
            drug={item}
            categories={categories}
            isDark={isDark}
            onTap={onTap}
            isLast={i === sorted.length - 1}
            trailing={item.price != null ? (
              <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-secondary)' }}>
                {item.price}
              </span>
            ) : null}
          />
        ))}
      </div>

      <div style={{
        height:          1,
        backgroundColor: 'var(--color-border-subtle)',
        marginTop:       'var(--space-5)',
      }} />
    </div>
  )
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function FormChip({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        flexShrink:   0,
        padding:      '4px 10px',
        borderRadius: 'var(--radius-full)',
        fontSize:     12,
        fontWeight:   active ? 600 : 400,
        cursor:       'pointer',
        border:       active ? '1.5px solid var(--color-accent)' : '1.5px solid var(--color-border)',
        backgroundColor: active ? 'var(--color-accent)' : 'transparent',
        color:        active ? '#fff' : 'var(--color-text-secondary)',
        fontFamily:   'var(--font-body)',
        whiteSpace:   'nowrap',
        WebkitTapHighlightColor: 'transparent',
        outline:      'none',
      }}
    >
      {label}
    </button>
  )
}

function SortToggle({ mode, onChange }) {
  return (
    <div style={{
      display:      'flex',
      flexShrink:   0,
      border:       '1.5px solid var(--color-border)',
      borderRadius: 'var(--radius-full)',
      padding:      2,
      backgroundColor: 'var(--color-surface)',
    }}>
      {['name', 'price'].map(m => (
        <button
          key={m}
          type="button"
          onClick={() => onChange(m)}
          style={{
            padding:      '4px 10px',
            borderRadius: 'var(--radius-full)',
            border:       'none',
            cursor:       'pointer',
            fontSize:     12,
            fontWeight:   600,
            fontFamily:   'var(--font-body)',
            backgroundColor: mode === m ? 'var(--color-accent)' : 'transparent',
            color:        mode === m ? '#fff' : 'var(--color-text-secondary)',
            WebkitTapHighlightColor: 'transparent',
            outline:      'none',
          }}
        >
          {m === 'name' ? 'Name' : 'Price'}
        </button>
      ))}
    </div>
  )
}
