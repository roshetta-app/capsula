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
 *   onTap    — (item) => void — no longer called (see 2026-09-19 note
 *              below); kept in the prop list so this file's own public API
 *              doesn't change for whatever screen still passes it in.
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
 *
 * 2026-09-18 (this session, fourth follow-up): DropdownPill rebuilt as a
 * real in-app popover (button + absolutely-positioned option list, click-
 * outside-to-close via a document listener) instead of a styled native
 * <select> — per feedback, the native option opened the browser/OS's own
 * picker UI, which reads as out-of-place against the rest of the app.
 * Each pill also gets a leading icon now: ListFilter for Form, ArrowUpDown
 * for Sort — both standard lucide-react icons already used for this exact
 * meaning elsewhere in the wild, no new icon language invented.
 *
 * 2026-09-19 (this session): per feedback — a sibling row is no longer
 * tappable (`disableTap`) and no longer shows the chevron (`showChevron={false}`),
 * both new optional props on SharedDrugCard that default to the old
 * behavior everywhere else. `onTap` is still accepted as a prop here so
 * this file's own API doesn't change, but it's no longer passed down to
 * the row. The row's `trailing` slot shows RowStarButton.jsx (the same
 * heart button ConditionCard/Favourites rows already use) when the
 * sibling is one of the user's favourite drugs; hidden entirely otherwise,
 * per RowStarButton's own existing show/hide rule.
 *
 * 2026-09-19 (this session, follow-up): three more changes per feedback —
 *  - Sort option relabeled "Lowest cost first" → "Cheapest first".
 *  - Form filter now groups forms the same way the Drugs screen's own
 *    filter sheet does (e.g. "Tab / Cap.", "Syrup/Susp.") instead of
 *    listing every raw form value as its own option. Reuses
 *    DrugFilterPanel.jsx's exported `FORM_OPTIONS` directly — same
 *    grouping data, not a second copy that could drift out of sync — via
 *    `resolveFormGroup` below, which maps a sibling's raw `form` value to
 *    the group it belongs to. The filter pill itself only appears when
 *    siblings span more than one distinct *group* (was: more than one
 *    distinct raw form) — a single drug, or several drugs that all land
 *    in the same group (e.g. all tablets/capsules), still hides the pill,
 *    same "nothing to filter" rule as before.
 *  - Heart icon is now display-only here: RowStarButton's new `readOnly`
 *    prop (see that file) is passed instead of `onPress`, so tapping the
 *    heart in this list no longer removes a drug from favourites —
 *    un-favouriting from this screen isn't offered, only the status is
 *    shown. `toggleDrug` is no longer read from FavouritesContext here.
 *
 * 2026-09-19 (this session, second follow-up): section header renamed
 * "Other Brands" → "Similar Brands", per feedback — now matches
 * GenericOverviewSection.jsx's trigger button, which was renamed to the
 * same text in a separate file/session (see that file's own changelog).
 *
 * 2026-09-19 (this session, third follow-up): rows now pass
 * `showImageSearch` to SharedDrugCard, turning on its new image-search
 * icon (see that file's own changelog) for this list only — Drugs and
 * Favourites screens, which also render SharedDrugCard, are unaffected
 * since they don't pass this prop.
 */

import { useState, useRef, useEffect } from 'react'
import { ChevronDown, ListFilter, ArrowUpDown } from 'lucide-react'
import SharedDrugCard from '../SharedDrugCard.jsx'
import RowStarButton from '../ui/RowStarButton.jsx'
import { FORM_OPTIONS } from './DrugFilterPanel.jsx'
import { useCategories } from '../../hooks/useCategories'
import { useIsDark } from '../../utils/specialtyIcon'
import { useFavouritesContext } from '../../context/FavouritesContext'

// Maps a sibling's raw `form` value (e.g. 'capsule', 'eye drops') to the
// grouped filter option it belongs to (e.g. the 'Tab / Cap.' group) —
// same grouping DrugFilterPanel.jsx's Form/Route section already uses,
// via its exported FORM_OPTIONS. Every real raw form value in
// config/forms.js is covered by exactly one group's `matches` list; a
// value with no match (unexpected/legacy data) resolves to null and is
// simply left out of the filter rather than guessed into a group.
function resolveFormGroup(rawForm) {
  if (!rawForm) return null
  return FORM_OPTIONS.find(opt => opt.value !== 'all' && opt.matches.includes(rawForm)) || null
}

export default function BrandsList({ siblings = [], onTap }) {
  const [formFilter, setFormFilter] = useState('all')
  const [sortMode,   setSortMode]   = useState('name') // 'name' | 'price'
  const { categories } = useCategories()
  const isDark = useIsDark()
  const { isDrugFavourited } = useFavouritesContext()

  // No real siblings — section disappears entirely, same as today's behavior
  // when the list is empty.
  if (siblings.length === 0) return null

  // Distinct grouped form options actually present among the siblings —
  // e.g. two capsule brands and one tablet brand both land in the same
  // 'Tab / Cap.' group, so that counts as one group, not two.
  const presentGroups = FORM_OPTIONS.filter(opt =>
    opt.value !== 'all' &&
    siblings.some(s => resolveFormGroup(s.form)?.value === opt.value)
  )
  const showFormFilter = presentGroups.length > 1

  const filtered = formFilter === 'all'
    ? siblings
    : siblings.filter(s => resolveFormGroup(s.form)?.value === formFilter)

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
        Similar Brands
      </div>

      {/* Controls: form filter + sort, as two in-app popover dropdown pills
          (DropdownPill below) — button + absolutely-positioned option
          list, click-outside-to-close. Replaces an earlier native-<select>
          version (see dated notes above) that opened the browser/OS's own
          picker UI instead of matching the app. Form options are grouped
          the same way DrugFilterPanel.jsx's Form/Route section groups them
          (see resolveFormGroup above). */}
      <div style={{
        display:      'flex',
        gap:          'var(--space-2)',
        marginBottom: 'var(--space-3)',
        flexWrap:     'wrap',
      }}>
        {showFormFilter && (
          <DropdownPill
            icon={ListFilter}
            value={formFilter}
            onChange={setFormFilter}
            options={[
              { value: 'all', label: 'All Forms' },
              ...presentGroups.map(g => ({ value: g.value, label: g.label })),
            ]}
          />
        )}

        <DropdownPill
          icon={ArrowUpDown}
          value={sortMode}
          onChange={setSortMode}
          options={[
            { value: 'name',  label: 'Name (A–Z)' },
            { value: 'price', label: 'Cheapest first' },
          ]}
        />
      </div>

      {/* Rows — SharedDrugCard.jsx, same component Drugs/Favourites screens
          use. It renders its own hairline divider between rows (isLast
          suppresses it on the final one), so no wrapping gap/box styling
          is needed here anymore. Not tappable and no chevron (2026-09-19)
          — a sibling row here is informational, not a navigation target.
          Trailing slot shows the heart icon (display-only, see
          RowStarButton's readOnly prop) only for favourited drugs.
          showImageSearch (2026-09-19, third follow-up) turns on the
          image-search icon for this list only. */}
      <div>
        {sorted.map((item, i) => (
          <SharedDrugCard
            key={item.id}
            drug={item}
            categories={categories}
            isDark={isDark}
            isLast={i === sorted.length - 1}
            disableTap
            showChevron={false}
            showImageSearch
            trailing={
              <RowStarButton
                isFavourited={isDrugFavourited(item.id)}
                readOnly
              />
            }
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

function DropdownPill({ icon: Icon, value, onChange, options }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const current = options.find(opt => opt.value === value)

  // Click/tap outside closes the menu — same idea SpecialtiesBottomSheet.jsx's
  // own backdrop-tap-to-dismiss uses, just scoped to this one small popover
  // instead of the whole sheet.
  useEffect(() => {
    if (!open) return
    function handleOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleOutside)
    document.addEventListener('touchstart', handleOutside)
    return () => {
      document.removeEventListener('mousedown', handleOutside)
      document.removeEventListener('touchstart', handleOutside)
    }
  }, [open])

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display:                 'flex',
          alignItems:              'center',
          gap:                     6,
          backgroundColor:         'var(--color-surface)',
          border:                  '1px solid var(--color-border)',
          borderRadius:            'var(--radius-full)',
          padding:                 '6px 12px',
          fontSize:                13,
          fontWeight:              500,
          color:                   'var(--color-text-primary)',
          fontFamily:              'var(--font-body)',
          cursor:                  'pointer',
          WebkitTapHighlightColor: 'transparent',
          outline:                 'none',
        }}
      >
        <Icon size={14} color="var(--color-text-secondary)" />
        {current?.label}
        <ChevronDown
          size={14}
          color="var(--color-text-secondary)"
          style={{
            transform:  open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.15s ease',
          }}
        />
      </button>

      {open && (
        <div style={{
          position:        'absolute',
          top:             'calc(100% + 4px)',
          left:            0,
          zIndex:          20,
          minWidth:        170,
          backgroundColor: 'var(--color-surface)',
          border:          '1px solid var(--color-border)',
          borderRadius:    'var(--radius-md)',
          boxShadow:       '0 4px 16px rgba(0,0,0,0.12)',
          overflow:        'hidden',
        }}>
          {options.map(opt => (
            <button
              key={opt.value}
              onClick={() => { onChange(opt.value); setOpen(false) }}
              style={{
                display:                 'block',
                width:                   '100%',
                textAlign:               'left',
                padding:                 '10px 14px',
                border:                  'none',
                background:              'none',
                fontSize:                13,
                fontFamily:              'var(--font-body)',
                fontWeight:              opt.value === value ? 600 : 400,
                color:                   opt.value === value ? 'var(--color-accent)' : 'var(--color-text-primary)',
                cursor:                  'pointer',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
