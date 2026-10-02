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
 *
 * 2026-10-02 (filter redesign): the three dropdowns are now laid out as two
 * rows — Sort and Form split 50/50 on the first row, and (Alternatives
 * only) the Medicine filter full width under them. Each menu opens right
 * under its own row in the same look as the Drugs filter panel: pill chips
 * with the round tick indicator, an 'All ...' chip beside the section label,
 * and a red 'Clear filter' button. Form and Medicine are multi-select (pick
 * any number; none picked = everything); Sort is pick-one and closes on
 * choice. Form and Sort menus use 2 columns; the Medicine menu is one
 * column because the combo names are long. The app hides every native
 * scrollbar (globals.css), so long menus draw their own thin scroll
 * indicator (ScrollMenu below). Medicine names show in sentence case.
 * The Alternatives note is now just 'Other [subclass] drugs'.
 */

import { useState, useRef, useEffect } from 'react'
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
// via its exported FORM_OPTIONS. A value with no match resolves to null
// and is simply left out of the filter rather than guessed into a group.
function resolveFormGroup(rawForm) {
  if (!rawForm) return null
  return FORM_OPTIONS.find(opt => opt.value !== 'all' && opt.matches.includes(rawForm)) || null
}

// 'brompheniramine + paracetamol' -> 'Brompheniramine + paracetamol'
function sentenceCase(text) {
  const t = (text ?? '').trim().toLowerCase()
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : ''
}

// Pill text for a multi-select filter: nothing picked, one picked, or a count.
function multiLabel(selected, options, allLabel, plural) {
  if (selected.length === 0) return allLabel
  if (selected.length === 1) return options.find(o => o.value === selected[0])?.label ?? allLabel
  return `${selected.length} ${plural}`
}

export default function BrandsList({ siblings = [], onTap, mode = 'similar', showTitle = true, familyName }) {
  const isAlternatives = mode === 'alternatives'
  const [formSel,     setFormSel]     = useState([])   // picked form groups; [] = all
  const [medicineSel, setMedicineSel] = useState([])   // picked genericIds; [] = all
  const [sortMode,    setSortMode]    = useState('name') // 'name' | 'price'
  const [openMenu,    setOpenMenu]    = useState(null)   // 'form' | 'medicine' | 'sort' | null
  const { categories } = useCategories()
  const isDark = useIsDark()
  const { isDrugFavourited } = useFavouritesContext()

  // No real siblings — section disappears entirely.
  if (siblings.length === 0) return null

  // Distinct grouped form options actually present among the siblings.
  const presentGroups = FORM_OPTIONS.filter(opt =>
    opt.value !== 'all' &&
    siblings.some(s => resolveFormGroup(s.form)?.value === opt.value)
  )
  const showFormFilter = presentGroups.length > 1
  const formOptions = presentGroups.map(g => ({ value: g.value, label: g.label }))

  // Alternatives only: the distinct generics present in the list.
  const medicineOptions = isAlternatives
    ? [...new Map(siblings.map(s => [s.genericId, s.genericName])).entries()]
        .map(([value, label]) => ({ value, label: sentenceCase(label) }))
        .sort((a, b) => a.label.localeCompare(b.label))
    : []
  const showMedicineFilter = medicineOptions.length > 1

  const sortOptions = [
    { value: 'name',  label: 'Name (A–Z)' },
    { value: 'price', label: 'Cheapest first' },
  ]

  const byForm = formSel.length === 0
    ? siblings
    : siblings.filter(s => formSel.includes(resolveFormGroup(s.form)?.value))
  const filtered = !showMedicineFilter || medicineSel.length === 0
    ? byForm
    : byForm.filter(s => medicineSel.includes(s.genericId))

  const sorted = [...filtered].sort((a, b) => {
    if (sortMode === 'price') {
      const priceA = a.price ?? Infinity
      const priceB = b.price ?? Infinity
      if (priceA !== priceB) return priceA - priceB
    }
    return (a.tradenameClean ?? '').localeCompare(b.tradenameClean ?? '')
  })

  function toggleIn(list, setList, value) {
    setList(list.includes(value) ? list.filter(v => v !== value) : [...list, value])
  }

  // Every dropdown: its pill, and the menu it opens. Row 1 = sort + form
  // (split evenly), row 2 = medicine (full width).
  const sortControl = {
    key: 'sort', icon: ArrowUpDown,
    pillLabel: sortOptions.find(o => o.value === sortMode)?.label,
    active: false,
    menu: { title: 'Sort By', columns: 2, options: sortOptions, selected: [sortMode],
            onPick: v => { setSortMode(v); setOpenMenu(null) } },
  }
  const formControl = showFormFilter && {
    key: 'form', icon: ListFilter,
    pillLabel: multiLabel(formSel, formOptions, 'All Forms', 'Forms'),
    active: formSel.length > 0,
    menu: { title: 'Form / Route', columns: 2, options: formOptions, selected: formSel,
            allLabel: 'All Forms', onAll: () => setFormSel([]),
            onPick: v => toggleIn(formSel, setFormSel, v),
            onClear: () => setFormSel([]) },
  }
  const medicineControl = showMedicineFilter && {
    key: 'medicine', icon: Pill,
    pillLabel: multiLabel(medicineSel, medicineOptions, 'All Medicines', 'Medicines'),
    active: medicineSel.length > 0,
    menu: { title: 'Medicine', columns: 1, wrap: true, options: medicineOptions, selected: medicineSel,
            allLabel: 'All Medicines', onAll: () => setMedicineSel([]),
            onPick: v => toggleIn(medicineSel, setMedicineSel, v),
            onClear: () => setMedicineSel([]) },
  }
  const rows = [
    [sortControl, formControl].filter(Boolean),
    [medicineControl].filter(Boolean),
  ].filter(r => r.length > 0)

  return (
    <div style={{ marginBottom: 'var(--space-5)' }}>
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

      {/* Alternatives note: a shared subclass means 'same family', not 'safe
          to swap' — kept short, subclass name in bold. */}
      {isAlternatives && (
        <p style={{
          fontSize:   13,
          lineHeight: 1.5,
          color:      'var(--color-text-secondary)',
          margin:     '0 0 var(--space-3)',
        }}>
          Other{familyName ? <> <strong style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>{familyName}</strong></> : ''} drugs
        </p>
      )}

      {/* Controls: each row of pills, with the open menu right under the row
          it belongs to (in normal flow, so the sheet never clips it). */}
      {rows.map((row, ri) => {
        const open = row.find(c => c.key === openMenu)
        return (
          <div key={ri}>
            <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
              {row.map(c => (
                <PillButton
                  key={c.key}
                  icon={c.icon}
                  label={c.pillLabel}
                  open={openMenu === c.key}
                  active={c.active}
                  onPress={() => setOpenMenu(m => (m === c.key ? null : c.key))}
                />
              ))}
            </div>
            {open && <MenuPanel {...open.menu} />}
          </div>
        )
      })}

      <div style={{ height: 'var(--space-2)' }} />

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

function PillButton({ icon: Icon, label, open, active, onPress }) {
  return (
    <button
      onClick={onPress}
      aria-expanded={open}
      style={{
        flex:                    1,
        minWidth:                0,
        display:                 'flex',
        alignItems:              'center',
        gap:                     6,
        backgroundColor:         'var(--color-surface)',
        border:                  `1px solid ${open || active ? 'var(--color-accent)' : 'var(--color-border)'}`,
        borderRadius:            'var(--radius-full)',
        padding:                 '8px 12px',
        fontSize:                13,
        fontWeight:              500,
        color:                   'var(--color-text-primary)',
        fontFamily:              'var(--font-body)',
        cursor:                  'pointer',
        WebkitTapHighlightColor: 'transparent',
        outline:                 'none',
      }}
    >
      <Icon size={14} color="var(--color-text-secondary)" style={{ flexShrink: 0 }} />
      <span style={{
        flex: 1, minWidth: 0, textAlign: 'left',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {label}
      </span>
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

// Same look as DrugFilterPanel.jsx's Form / Route section: small grey title
// with an 'All' chip beside it, a grid of tick chips, and a red 'Clear
// filter' button. `columns` 1 or 2; `wrap` lets long labels wrap to several
// lines instead of being clipped.
function MenuPanel({ title, columns, wrap = false, options, selected, allLabel, onAll, onPick, onClear }) {
  const hasSelection = selected.length > 0
  return (
    <div style={{
      marginBottom:    'var(--space-3)',
      backgroundColor: 'var(--color-surface)',
      border:          '1px solid var(--color-border)',
      borderRadius:    'var(--radius-md)',
      padding:         'var(--space-3)',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 'var(--space-2)', marginBottom: 'var(--space-2)',
      }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-secondary)' }}>
          {title}
        </div>
        {onAll && (
          <ToggleChip label={allLabel} active={!hasSelection} onToggle={onAll} showCheckbox={false} fitContent />
        )}
      </div>

      <ScrollMenu maxHeight={220}>
        <div style={{
          display:             'grid',
          gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
          gap:                 'var(--space-2)',
        }}>
          {options.map(opt => (
            <ToggleChip
              key={opt.value}
              label={opt.label}
              active={selected.includes(opt.value)}
              onToggle={() => onPick(opt.value)}
              wrap={wrap}
            />
          ))}
        </div>
      </ScrollMenu>

      {onClear && (
        <div style={{ marginTop: 'var(--space-3)' }}>
          <ClearFilterButton onClick={onClear} disabled={!hasSelection} />
        </div>
      )}
    </div>
  )
}

// Scroll box with a visible thin scroll indicator. The app hides every native
// scrollbar (globals.css), so without this a long menu gives no hint that it
// scrolls. The indicator only appears when the content is taller than the box.
function ScrollMenu({ maxHeight, children }) {
  const boxRef = useRef(null)
  const [bar, setBar] = useState(null) // { top, height } in px, or null when nothing to scroll

  function measure() {
    const el = boxRef.current
    if (!el || el.scrollHeight <= el.clientHeight + 1) { setBar(null); return }
    const ratio  = el.clientHeight / el.scrollHeight
    const height = Math.max(24, el.clientHeight * ratio)
    const top    = (el.scrollTop / (el.scrollHeight - el.clientHeight)) * (el.clientHeight - height)
    setBar({ top, height })
  }

  useEffect(() => {
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{ position: 'relative' }}>
      <div
        ref={boxRef}
        onScroll={measure}
        style={{
          maxHeight,
          overflowY:    'auto',
          paddingRight: bar ? 10 : 0,
        }}
      >
        {children}
      </div>
      {bar && (
        <span
          aria-hidden="true"
          style={{
            position:        'absolute',
            right:           1,
            top:             bar.top,
            width:           4,
            height:          bar.height,
            borderRadius:    'var(--radius-full)',
            backgroundColor: 'var(--color-text-tertiary)',
            opacity:         0.6,
            pointerEvents:   'none',
          }}
        />
      )}
    </div>
  )
}

// Copy of DrugFilterPanel.jsx's red Clear All button (not exported there),
// relabelled for a single filter.
function ClearFilterButton({ onClick, disabled }) {
  const [pressed, setPressed] = useState(false)
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onPointerDown={() => !disabled && setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      onPointerCancel={() => setPressed(false)}
      style={{
        width: '100%', padding: '10px',
        borderRadius: 'var(--radius-md)',
        fontSize: 14, fontWeight: 600,
        cursor: disabled ? 'not-allowed' : 'pointer',
        border: disabled ? '1.5px solid var(--color-border)' : '1.5px solid #DC2626',
        backgroundColor: disabled ? 'transparent' : '#DC2626',
        color: disabled ? 'var(--color-text-tertiary)' : '#fff',
        fontFamily: 'var(--font-body)',
        transform: pressed ? 'scale(0.96)' : 'scale(1)',
        transition: 'color 0.15s ease, border-color 0.15s ease, background-color 0.15s ease, transform 0.15s ease',
        WebkitTapHighlightColor: 'transparent',
        outline: 'none',
      }}
    >
      Clear filter
    </button>
  )
}

// Copy of DrugFilterPanel.jsx's ToggleChip (not exported there), plus `wrap`
// for long labels (several lines, softer corners) instead of one clipped line.
function ToggleChip({ label, active, onToggle, showCheckbox = true, fitContent = false, wrap = false }) {
  const [pressed, setPressed] = useState(false)
  return (
    <button
      onClick={onToggle}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      onPointerCancel={() => setPressed(false)}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 8,
        width: fitContent ? 'auto' : '100%', minWidth: 0, boxSizing: 'border-box',
        padding: '8px 14px',
        borderRadius: wrap ? 'var(--radius-md)' : 'var(--radius-full)',
        fontSize: 13, fontWeight: 500, textAlign: 'left',
        cursor: 'pointer',
        border: active ? '1.5px solid var(--color-accent)' : '1.5px solid var(--color-border)',
        backgroundColor: active ? 'var(--color-accent)' : 'transparent',
        color: active ? '#fff' : 'var(--color-text-secondary)',
        fontFamily: 'var(--font-body)',
        transform: pressed ? 'scale(0.96)' : 'scale(1)',
        transition: 'background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease, transform 0.15s ease',
        WebkitTapHighlightColor: 'transparent',
        outline: 'none',
      }}
    >
      {showCheckbox && (
        <span style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 15, height: 15, flexShrink: 0,
          borderRadius: '50%',
          border: active ? '1.5px solid #fff' : '1.5px solid var(--color-text-tertiary)',
          backgroundColor: active ? '#fff' : 'transparent',
          transition: 'background-color 0.15s ease, border-color 0.15s ease',
        }}>
          {active && (
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          )}
        </span>
      )}
      <span style={wrap
        ? { minWidth: 0, lineHeight: 1.35, overflowWrap: 'anywhere' }
        : { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>
        {label}
      </span>
    </button>
  )
}
