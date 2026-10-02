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
 *
 * 2026-10-02 (Related drugs, Alternatives lookup): this list now serves two
 * tabs of the brands sheet. New props:
 *  - mode: 'similar' (default, same as before) or 'alternatives'.
 *  - showTitle: false hides the 'Similar Brands' section header when the
 *    sheet's tab bar already names the list (default true, so a sheet
 *    with no tabs looks the same as before).
 *  - familyName: the subclass name shown in the Alternatives note.
 * Alternatives mode adds a short note ('options for a professional to
 * consider, not direct substitutes') and a third dropdown pill, a
 * medicine filter, that narrows a big subclass to one generic. That pill
 * only appears when the list spans more than one generic. The form filter
 * and the cheapest-first sort work the same on both tabs. Rows stay
 * display-only (not tappable) in both modes for now.
 * (Superseded 2026-10-02, tappable Alternatives: see the note below.)
 *
 * 2026-10-02 (dropdown clipping fix): the three dropdown menus used to be
 * floating popovers inside the sheet's scroll area, so with only 1-2 rows
 * in the list they were cut off and ran past the screen edge. They now
 * open as a normal block right under the pill row (full width, own
 * scroll for long lists), so they always fit inside the sheet. Only one
 * menu is open at a time; picking an option or tapping the same pill
 * again closes it.
 *
 * 2026-10-02 (tappable Alternatives): rows on the Alternatives tab now open
 * that drug's page when tapped (onTap, with a chevron) — those are different
 * medicines worth looking at. Rows on the Similar tab stay inert, as before.
 * onTap is only called from Alternatives rows.
 */

import { useState } from 'react'
import { ChevronDown, ListFilter, ArrowUpDown, Pill } from 'lucide-react'
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

export default function BrandsList({ siblings = [], onTap, mode = 'similar', showTitle = true, familyName }) {
  const isAlternatives = mode === 'alternatives'
  const [formFilter, setFormFilter] = useState('all')
  const [medicineFilter, setMedicineFilter] = useState('all')
  const [sortMode,   setSortMode]   = useState('name') // 'name' | 'price'
  const [openMenu,   setOpenMenu]   = useState(null)   // 'form' | 'medicine' | 'sort' | null
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

  // Alternatives only: the distinct generics present in the list, for the
  // medicine filter. Keyed by genericId, labelled by the generic's name,
  // alphabetical. Spanning only one generic means nothing to narrow.
  const medicineOptions = isAlternatives
    ? [...new Map(siblings.map(s => [s.genericId, s.genericName])).entries()]
        .map(([value, label]) => ({ value, label: label ?? '' }))
        .sort((a, b) => a.label.localeCompare(b.label))
    : []
  const showMedicineFilter = medicineOptions.length > 1

  const byForm = formFilter === 'all'
    ? siblings
    : siblings.filter(s => resolveFormGroup(s.form)?.value === formFilter)
  const filtered = !showMedicineFilter || medicineFilter === 'all'
    ? byForm
    : byForm.filter(s => s.genericId === medicineFilter)

  const sorted = [...filtered].sort((a, b) => {
    if (sortMode === 'price') {
      const priceA = a.price ?? Infinity
      const priceB = b.price ?? Infinity
      if (priceA !== priceB) return priceA - priceB
    }
    return (a.tradenameClean ?? '').localeCompare(b.tradenameClean ?? '')
  })

  // The dropdowns present for this list, in display order. Each one is a pill
  // plus the options its menu shows.
  const controls = [
    showFormFilter && {
      key: 'form', icon: ListFilter, value: formFilter, onChange: setFormFilter,
      options: [
        { value: 'all', label: 'All Forms' },
        ...presentGroups.map(g => ({ value: g.value, label: g.label })),
      ],
    },
    showMedicineFilter && {
      key: 'medicine', icon: Pill, value: medicineFilter, onChange: setMedicineFilter,
      options: [{ value: 'all', label: 'All Medicines' }, ...medicineOptions],
    },
    {
      key: 'sort', icon: ArrowUpDown, value: sortMode, onChange: setSortMode,
      options: [
        { value: 'name',  label: 'Name (A–Z)' },
        { value: 'price', label: 'Cheapest first' },
      ],
    },
  ].filter(Boolean)
  const activeControl = controls.find(c => c.key === openMenu) || null

  return (
    <div style={{ marginBottom: 'var(--space-5)' }}>
      {/* Section header — hidden when the sheet's tab bar already names
          the list (showTitle false). */}
      {showTitle && (
        <div style={{
          fontSize:     15,
          fontWeight:   700,
          color:        'var(--color-text-primary)',
          marginBottom: 'var(--space-3)',
        }}>
          Similar Brands
        </div>
      )}

      {/* Alternatives note (2026-10-02): a shared subclass means 'same
          family', not 'safe to swap', so the list is framed as options for
          a professional to consider. */}
      {isAlternatives && (
        <p style={{
          fontSize:   13,
          lineHeight: 1.5,
          color:      'var(--color-text-secondary)',
          margin:     '0 0 var(--space-3)',
        }}>
          Other medicines in the same family{familyName ? ` as ${familyName}` : ''}.
          {' '}Options for a professional to consider, not direct substitutes.
        </p>
      )}

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
        marginBottom: openMenu ? 'var(--space-2)' : 'var(--space-3)',
        flexWrap:     'wrap',
      }}>
        {controls.map(c => (
          <PillButton
            key={c.key}
            icon={c.icon}
            label={c.options.find(o => o.value === c.value)?.label}
            open={openMenu === c.key}
            onPress={() => setOpenMenu(m => (m === c.key ? null : c.key))}
          />
        ))}
      </div>

      {/* Open menu — rendered in normal flow under the pills (not a floating
          popover), so the sheet's scroll area never clips it. */}
      {activeControl && (
        <OptionsPanel
          options={activeControl.options}
          value={activeControl.value}
          onChange={v => { activeControl.onChange(v); setOpenMenu(null) }}
        />
      )}

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
            onTap={onTap}
            disableTap={!isAlternatives}
            showChevron={isAlternatives}
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

function PillButton({ icon: Icon, label, open, onPress }) {
  return (
    <button
      onClick={onPress}
      aria-expanded={open}
      style={{
        display:                 'flex',
        alignItems:              'center',
        gap:                     6,
        backgroundColor:         'var(--color-surface)',
        border:                  `1px solid ${open ? 'var(--color-accent)' : 'var(--color-border)'}`,
        borderRadius:            'var(--radius-full)',
        padding:                 '6px 12px',
        fontSize:                13,
        fontWeight:              500,
        color:                   'var(--color-text-primary)',
        fontFamily:              'var(--font-body)',
        cursor:                  'pointer',
        WebkitTapHighlightColor: 'transparent',
        outline:                 'none',
        maxWidth:                '100%',
      }}
    >
      <Icon size={14} color="var(--color-text-secondary)" />
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
      <ChevronDown
        size={14}
        color="var(--color-text-secondary)"
        style={{
          flexShrink: 0,
          transform:  open ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.15s ease',
        }}
      />
    </button>
  )
}

function OptionsPanel({ options, value, onChange }) {
  return (
    <div style={{
      marginBottom:    'var(--space-3)',
      backgroundColor: 'var(--color-surface)',
      border:          '1px solid var(--color-border)',
      borderRadius:    'var(--radius-md)',
      maxHeight:       240,
      overflowY:       'auto',
    }}>
      {options.map(opt => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
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
  )
}
