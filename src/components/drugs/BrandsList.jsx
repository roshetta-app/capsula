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
 *
 * 2026-09-18 (this session, follow-up): price dropped from the row
 * entirely (was in SharedDrugCard's `trailing` slot) — not shown anymore,
 * per feedback.
 *
 * 2026-09-18 (this session, second follow-up): form-filter chips + the
 * name/price SortToggle segmented control replaced with two native-select
 * dropdown pills (DropdownPill below) — see its own comment for why a
 * plain styled <select> was chosen over a custom popover. Sort's price
 * option relabeled "Lowest cost first" since price itself is hidden now
 * (an unlabeled "Price" sort option would have been sorting by something
 * the person can no longer see).
 *
 * 2026-09-18 (this session, third follow-up): section header restyled —
 * 10px/700/uppercase/tertiary-color "eyebrow" label → 15px/700/normal-
 * case/primary-color, reading as a real title instead of a small caps
 * label. Per feedback.
 */

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
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
        fontSize:     15,
        fontWeight:   700,
        color:        'var(--color-text-primary)',
        marginBottom: 'var(--space-3)',
      }}>
        Other Brands
      </div>

      {/* Controls: form filter + sort, as two native-select dropdown pills
          — no existing custom-dropdown pattern elsewhere in the app to
          match (checked DrugFilterPanel.jsx: it uses a segmented PillToggle
          for sort and a chip grid in its own full bottom sheet for form
          filtering — too heavy for two choices already inside an open
          sheet here). A styled native <select> gets full accessibility and
          the platform's own picker UI for free, so that's what
          DropdownPill below wraps, rather than a custom popover/menu. Sort
          option 'price' relabeled "Lowest cost first" now that price
          itself isn't shown on the rows anymore. */}
      <div style={{
        display:      'flex',
        gap:          'var(--space-2)',
        marginBottom: 'var(--space-3)',
        flexWrap:     'wrap',
      }}>
        {showFormFilter && (
          <DropdownPill
            value={formFilter}
            onChange={setFormFilter}
            options={[
              { value: 'all', label: 'All forms' },
              ...forms.map(f => ({ value: f, label: capitalize(f) })),
            ]}
          />
        )}

        <DropdownPill
          value={sortMode}
          onChange={setSortMode}
          options={[
            { value: 'name',  label: 'Name (A–Z)' },
            { value: 'price', label: 'Lowest cost first' },
          ]}
        />
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

function DropdownPill({ value, onChange, options }) {
  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          appearance:       'none',
          WebkitAppearance: 'none',
          backgroundColor:  'var(--color-surface)',
          border:           '1px solid var(--color-border)',
          borderRadius:     'var(--radius-full)',
          padding:          '6px 28px 6px 14px',
          fontSize:         13,
          fontWeight:       500,
          color:            'var(--color-text-primary)',
          fontFamily:       'var(--font-body)',
          cursor:           'pointer',
          outline:          'none',
        }}
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      <ChevronDown
        size={14}
        color="var(--color-text-secondary)"
        style={{ position: 'absolute', right: 10, pointerEvents: 'none' }}
      />
    </div>
  )
}
