import { useEffect, useState } from 'react'
import { useToast } from '../../context/ToastContext'

/**
 * DrugFilterPanel — bottom-sheet filter panel for the Drugs screen.
 *
 * Phase 2F spec:
 *  - Slides up from bottom
 *  - Sections: Form/Route, Pregnancy (Safe/Unsafe), Breastfeeding (Safe/Unsafe)
 *  - Clear All + Apply Filters buttons
 *  - Filters do NOT persist between sessions
 *
 * 2026-07-18 (decision 4.10): added a Category section here, kept in sync
 * with the category tiles — reverted 2026-07-19 (user decision). Category
 * picking is tile-only again; this sheet no longer knows about it.
 *
 * 2026-07-19 (Drugs search-bar polish) — added a "Search By" section
 * holding the Brand/Generic switch, moved here from a segmented toggle that
 * used to sit beside the search bar. Unlike every other section in this
 * sheet, it is NOT part of 'filters' and is not gated by Apply — tapping
 * Brand or Generic changes 'mode' immediately, the same instant-switch
 * behavior the old toggle had (user decision, 2026-07-19). Always shown
 * (category browsing included) — corrected same day after the old toggle's
 * search-only scoping was carried over here by mistake; mode applies to
 * the whole Drugs screen, not just active searches. Section is omitted
 * entirely if 'onModeChange' isn't passed, so this stays backward-compatible
 * with any future caller that doesn't use Drugs' Brand/Generic concept.
 *
 * 2026-07-20 (drug_library_ui_ux, plan §7 step 1f.1, decision 4.20): shell
 * rebuilt on SpecialtiesBottomSheet.jsx's pattern. Old shell sat at
 * backdrop zIndex 80 / sheet zIndex 90 — below BottomNav's zIndex 100, so
 * the nav visually covered the sheet's bottom edge including its Apply/
 * Clear buttons. Now matches SpecialtiesBottomSheet exactly: zIndex 200/201
 * (well above the nav), shouldRender/animateIn mount-timing pair so the
 * sheet stays present through its 280ms exit transition instead of
 * vanishing instantly, Escape-key close, and body-scroll lock while open.
 * Filter content below (Search By / Form-Route sections, Clear All / Apply
 * buttons) is unchanged — only this shell.
 *
 * drugs-filter-scope-trim — removed the Pregnancy and Breastfeeding
 * sections (and their pregnancySafe/pregnancyUnsafe/bfSafe/bfUnsafe filter
 * fields) per user decision. Search By + Form/Route are the only sections
 * left. filters shape is now just { forms }.
 *
 * drugs-filter-sheet-discard-unsaved — local 'filters' selections now
 * re-sync to the currently-applied 'activeFilters' every time the sheet
 * opens, instead of only initializing once. Previously, taps made in the
 * sheet but never committed via Apply Filters would still show as
 * "selected" the next time the sheet reopened, since the sheet never
 * unmounts (it just renders null while closed) and its local state
 * persisted across that. Mode (Brand/Generic) is unaffected — it's
 * instant and was never part of 'filters' to begin with.
 *
 * drug-filter-instant-apply — Apply Filters button removed. Form/Route
 * chips now call onApply(...) directly on toggle, matching the instant-
 * apply pattern the Search By mode switch already used — 'filters' local
 * state and the applied state are always in sync, so there is nothing
 * left to "discard" by closing without Apply. Sheet stays open on a chip
 * tap (chips are multi-select, unlike mode which is a single instant
 * choice) — it still closes on mode change, backdrop tap, or Escape.
 * Clear All only renders when a real filter is active (filters.forms is
 * not just ['all']) — mode alone doesn't count, since mode was never
 * part of 'filters'. Also fixed ModeToggle's active-state fontWeight bug
 * (400 -> 600 on active visibly resized the pill) the same way
 * ToggleChip's was already fixed — weight is now constant, active state
 * reads through color/border/background only.
 *
 * drugs-filter-panel-restyle (2026-08-29) — visual-density pass, no
 * behavior change. Search Mode and Sort By's PillToggle now renders inline
 * next to its section label (via FilterSection's new 'action' slot)
 * instead of stacked full-width below it, and PillToggle itself shrinks to
 * fit its content with a quiet track + solid dark active-pill look instead
 * of stretching edge-to-edge with an accent-blue fill. "All Forms" moves
 * the same way — out of its own full-width centered row above the grid,
 * into the inline slot next to "Form / Route" — same ToggleChip, same tap
 * behavior (exclusive reset, no checkbox), just repositioned and sized to
 * its content (see ToggleChip's new 'fitContent' prop) instead of
 * width:100%. The rest of the form chip grid is untouched — it already had
 * no collapse/expand logic, so it stays exactly as it was, always visible.
 *
 * drugs-filter-panel-refine (2026-08-29, on-device follow-up) — four
 * corrections after the first look: (1) PillToggle's active capsule
 * switched from black to var(--color-accent), matching the app's existing
 * blue used everywhere else on this sheet (All Forms chip included);
 * (2) Search Mode's and Sort By's PillToggle instances now both pass the
 * same 'minOptionWidth', so the two toggles line up at a matching total
 * width instead of each shrinking to its own label length; (3) restored
 * the divider between Sort By and Form / Route, which the inline-action
 * restyle had dropped; (4) FilterSection's label demoted from 16px/700
 * (identical to the "Filter Drugs" sheet title) to 14px/600 in the
 * secondary text color, so the sheet title and the section labels read as
 * two different levels of hierarchy instead of two stacked titles.
 *
 * Props:
 *   isOpen           boolean
 *   onClose          () => void
 *   onApply          (filters) => void   filters: { forms } — called
 *                    immediately on every Form/Route chip toggle and on
 *                    Clear All, not buffered behind an Apply action
 *   activeFilters    { forms } | null    — the currently-applied filters; local
 *                    selections reset to this (or EMPTY if null) each time the
 *                    sheet opens
 *   mode             'brand' | 'generic' | undefined — current search mode, for the Search By section
 *   onModeChange     (mode) => void | undefined — instant, not gated by Apply; section hidden if omitted
 *   hasSearchResults boolean | undefined — true as soon as a search query is typed, regardless
 *                    of whether it matched anything; gates the Sort By section
 *                    (drug-search-sort-cheapest). False for category browsing (no query at all)
 *   sortMode         'relevance' | 'cheapest' | undefined — current sort mode, for the Sort By section
 *   onSortChange     (mode) => void | undefined — instant, not gated by Apply; sheet stays open
 */

// Each chip's `matches` list is the full set of real raw form values (from
// src/config/forms.js) it should catch. `value` stays the chip's own stable
// id used for selection state - it is not necessarily a raw form value
// itself anymore now that Tab/Capsule and Drops each cover several.
//
// drugs-filter-inhaled-route-fix — some real inhalers are recorded in the
// data with form='piece'/'powder'/'solution' (device packaging or a
// generic form label) rather than anything inhaler-specific, but always
// with route='inhalation'. `matches` alone can't catch these without also
// falsely pulling in every other 'piece'/'powder' product, so an optional
// `routes` list was added: a drug counts as this chip's if its form is in
// `matches` OR its route is in `routes` (see applyFilters in
// DrugsScreen.jsx). Only Inhaled uses `routes` for now — every other chip
// is unaffected and keeps matching on form alone.
export const FORM_OPTIONS = [
  { value: 'all',         label: 'All Forms',     matches: [] },
  { value: 'tablet',      label: 'Tab / Cap.',    matches: ['tablet', 'capsule', 'effervescent', 'lozenges'] },
  { value: 'syrup',       label: 'Syrup/Susp.',   matches: ['syrup', 'suspension', 'solution'] },
  { value: 'drops',       label: 'Drops',         matches: ['eye drops', 'oral drops', 'ear drops', 'nasal drops', 'mouth drops', 'drops'] },
  { value: 'sachet',      label: 'Sachet',        matches: ['sachet', 'powder', 'power'] },
  { value: 'inhaler',     label: 'Inhaled',       matches: ['inhaler', 'inhalation solution'], routes: ['inhalation'] },
  { value: 'spray',       label: 'Spray',         matches: ['spray'] },
  { value: 'injection',   label: 'Inj.',          matches: ['injection', 'vial', 'ampoule', 'syringe', 'pen', 'vaccine'] },
  { value: 'suppository', label: 'Supp.',         matches: ['suppository', 'enema', 'vaginal douche'] },
  { value: 'cream',       label: 'Topical',       matches: ['cream', 'ointment', 'eye ointment', 'gel', 'lotion', 'shampoo', 'soap', 'antiseptic solution', 'facial wash', 'conditioner', 'foam', 'paint', 'hair oil', 'oil', 'serum', 'patch', 'wipes', 'gauze dressing'] },
  { value: 'other',       label: 'Other',         matches: ['piece', 'mouth wash', 'film', 'bottle', 'other'] },
]

const EMPTY = {
  forms: ['all'],
}

export default function DrugFilterPanel({ isOpen, onClose, onApply, activeFilters, mode, onModeChange, hasSearchResults, sortMode, onSortChange }) {
  const [filters, setFilters] = useState(activeFilters || EMPTY)
  const { toast } = useToast()

  // shouldRender keeps the DOM present during the exit transition.
  // animateIn drives the CSS open/closed visual position. Same pattern as
  // SpecialtiesBottomSheet.jsx (decision 4.20, step 1f.1).
  const [shouldRender, setShouldRender] = useState(isOpen)
  const [animateIn,    setAnimateIn]    = useState(isOpen)

  // Discard any unapplied taps: re-sync local selections to the real
  // applied state every time the sheet opens, rather than only once on
  // mount (see file header note above).
  useEffect(() => {
    if (isOpen) setFilters(activeFilters || EMPTY)
  }, [isOpen, activeFilters])

  useEffect(() => {
    if (isOpen) {
      // Mount first, then flip animateIn on the next frame so the
      // browser has painted the start-position before transitioning.
      setShouldRender(true)
      requestAnimationFrame(() => setAnimateIn(true))
    } else {
      // Start exit transition immediately; unmount after it finishes.
      setAnimateIn(false)
      const t = setTimeout(() => setShouldRender(false), 280)
      return () => clearTimeout(t)
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  if (!shouldRender) return null

  // Instant-apply: compute the next forms list and immediately push it out
  // via onApply, instead of buffering in local state until a separate
  // Apply Filters action. Local 'filters' state stays in sync purely so
  // the chips render their active state correctly.
  function toggleForm(val) {
    const nextForms = val === 'all'
      ? ['all']
      : (() => {
          const without = filters.forms.filter(f => f !== 'all' && f !== val)
          const next = filters.forms.includes(val) ? without : [...without, val]
          return next.length ? next : ['all']
        })()
    const nextFilters = { ...filters, forms: nextForms }
    setFilters(nextFilters)
    onApply(nextFilters)
  }

  function handleClear() {
    setFilters(EMPTY)
    onApply(EMPTY)
    onClose()
  }

  // Mode (Brand/Generic) is instant and not part of 'filters' — see file
  // header note. Switching it has nothing left to "Apply", so it closes
  // the sheet immediately.
  function handleModeChange(m) {
    onModeChange(m)
    toast.info(`Searching in ${m === 'brand' ? 'Brand' : 'Generic'} mode`)
    onClose()
  }

  // Clear All only earns a place in the sheet when a real filter is set —
  // mode alone was never part of 'filters' and shouldn't trigger it.
  const hasActiveFilter = !(filters.forms.length === 1 && filters.forms[0] === 'all')

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        aria-hidden="true"
        style={{
          position:        'fixed',
          inset:           0,
          zIndex:          200,
          backgroundColor: 'rgba(0,0,0,0.4)',
          opacity:         animateIn ? 1 : 0,
          transition:      'opacity var(--motion-base) var(--ease-reveal)',
        }}
      />

      {/* Sheet */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Filter drugs"
        style={{
          position:      'fixed', bottom: 0, left: 0, right: 0,
          zIndex:        201,
          backgroundColor: 'var(--color-surface)',
          borderRadius:  '16px 16px 0 0',
          padding:       'var(--space-4) var(--space-4) calc(var(--space-4) + env(safe-area-inset-bottom))',
          maxHeight:     '80vh',
          overflowY:     'auto',
          boxShadow:     '0 -4px 24px rgba(0,0,0,0.12)',
          transform:     animateIn ? 'translateY(0)' : 'translateY(100%)',
          transition:    'transform var(--motion-screen) var(--ease-settle)',
        }}
      >
        {/* Handle */}
        <div style={{
          width: 36, height: 4, borderRadius: 2,
          backgroundColor: 'var(--color-border)',
          margin: '0 auto var(--space-4)',
        }} />

        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 'var(--space-4)' }}>
          Filter Drugs
        </div>

        {/* Search By — Brand/Generic, instant-switch, not gated by Apply. See
            file header note above for why this section is different from
            every other one in this sheet.
            drugs-filter-panel-restyle: PillToggle now passed as
            FilterSection's inline 'action' instead of a full-width child
            below the label — no children, so the section header row is
            the whole section. */}
        {onModeChange && (
          <>
            <FilterSection
              label="Search Mode"
              action={
                <PillToggle
                  value={mode}
                  onChange={handleModeChange}
                  options={[
                    { value: 'brand',   label: 'Brand' },
                    { value: 'generic', label: 'Generic' },
                  ]}
                  minOptionWidth={96}
                />
              }
            />
            <div style={{
              height: 1,
              backgroundColor: 'var(--color-border)',
              margin: '0 calc(-1 * var(--space-4)) var(--space-4)',
            }} />
          </>
        )}

        {/* Sort By — Relevance/Cheapest First, instant-apply like Form/Route
            below (not a single instant-choice-then-close action like Search
            Mode above, since 'relevance' vs 'cheapest' has no analogous
            "brand mode vs generic mode" full context switch to announce).
            Shown as soon as a search query is typed, whether or not it
            matched anything — sorting is a property of the search itself,
            not of currently having results on screen. Hidden only for
            category browsing (no query at all). 'sortMode' lives in
            DrugContext (see drug-search-sort-cheapest note there) so it
            survives navigation the same way Search Mode and Form/Route
            already do, and stays applied if the query is cleared and
            retyped later.
            drugs-filter-panel-restyle: same inline-action treatment as
            Search Mode above. */}
        {hasSearchResults && (
          <>
            <FilterSection
              label="Sort By"
              action={
                <PillToggle
                  value={sortMode}
                  onChange={onSortChange}
                  options={[
                    { value: 'relevance', label: 'Relevance' },
                    { value: 'cheapest',  label: 'Cheapest First' },
                  ]}
                  minOptionWidth={96}
                />
              }
            />
            <div style={{
              height: 1,
              backgroundColor: 'var(--color-border)',
              margin: '0 calc(-1 * var(--space-4)) var(--space-4)',
            }} />
          </>
        )}

        {/* Form / Route — instant-apply, see toggleForm above.
            drugs-filter-panel-restyle: "All Forms" moved from its own
            full-width centered row above the grid into FilterSection's
            inline 'action' slot next to the "Form / Route" label — same
            ToggleChip, same exclusive-reset tap behavior, no checkbox,
            just sized to its content (fitContent) instead of width:100%.
            The rest of the chips still sit in the grid below, unchanged —
            there was never any collapse/expand behavior here, so nothing
            about the grid itself changed. */}
        <FilterSection
          label="Form / Route"
          action={
            <ToggleChip
              label="All Forms"
              active={filters.forms.includes('all')}
              onToggle={() => toggleForm('all')}
              showCheckbox={false}
              fitContent
            />
          }
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-2)' }}>
            {FORM_OPTIONS.filter(opt => opt.value !== 'all').map(opt => {
              const active = filters.forms.includes(opt.value)
              return (
                <ToggleChip
                  key={opt.value}
                  label={opt.label}
                  active={active}
                  onToggle={() => toggleForm(opt.value)}
                />
              )
            })}
          </div>
        </FilterSection>

        {/* Clear All — always present now; greyed out and inert until a
            real filter is active, then turns solid red/active. Was previously
            hidden entirely when inactive; kept as a stable anchor in the
            layout instead. */}
        <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-5)' }}>
          <ClearAllButton onClick={handleClear} disabled={!hasActiveFilter} />
        </div>
      </div>
    </>
  )
}

// ─── helpers ──────────────────────────────────────────────────────────────────

// drugs-filter-panel-restyle — added the optional 'action' slot so a
// control (PillToggle, or the "All Forms" ToggleChip) can render inline to
// the right of the section label instead of stacked full-width beneath it.
// Header row's marginBottom only applies when there are children below it
// (Form / Route's chip grid) — sections with no children (Search Mode,
// Sort By) don't need the extra gap since the header row is the whole
// section.
//
// drugs-filter-panel-refine — label was originally styled identically to
// the "Filter Drugs" sheet title (16px/700), which read as two stacked
// titles with no hierarchy between them. Demoted to 14px/600 in the
// secondary text color so "Filter Drugs" reads as the one heading and
// these read as its subsections.
function FilterSection({ label, action, children }) {
  return (
    <div style={{ marginBottom: 'var(--space-4)' }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-2)',
        marginBottom: children ? 'var(--space-2)' : 0,
      }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-secondary)' }}>
          {label}
        </div>
        {action}
      </div>
      {children}
    </div>
  )
}

// drug-filter-instant-apply — fontWeight used to jump 400 -> 600 on active,
// which visibly resized the pill since bold text is wider (same bug already
// fixed on ToggleChip below). Weight is now constant; active/inactive reads
// purely through color/border/background.
// Generic two-option pill control: one continuous bordered track, active
// side filled solid, no gap/seam between the two. Originally ModeToggle
// (Brand/Generic only) — generalized (drug-search-sort-cheapest) to also
// drive the Sort By toggle (Relevance/Cheapest First), since both are
// "pick exactly one of two" controls that should look identical rather
// than duplicating this styling in a second component.
//
// drugs-filter-panel-restyle — restyled from a full-width (flex:1 per
// option) accent-blue bordered/filled track to a compact, fit-content
// "nested pill" look: a quiet var(--color-border) track holding a solid
// capsule around whichever option is active, inactive option reading as
// plain muted text with no border. This is what lets it sit inline next
// to a section label instead of needing its own full-width row.
//
// drugs-filter-panel-refine — two corrections after the first on-device
// look: (1) the active capsule used var(--color-text-primary) (black),
// which read as an unrelated new "black" affordance next to the app's
// existing blue accent used everywhere else (All Forms chip included) —
// switched to var(--color-accent) to match. (2) Search Mode's toggle
// (Brand/Generic) and Sort By's toggle (Relevance/Cheapest First) were
// each sizing to their own content, so the shorter Brand/Generic control
// ended up visibly narrower than Sort By's — added optional
// 'minOptionWidth' so a caller can give both toggle instances the same
// per-button minimum width and have them line up at a matching total
// width regardless of label length.
function PillToggle({ value, onChange, options, minOptionWidth }) {
  // Tracks which of the two buttons (if any) is currently pressed, since
  // both share this one component instance — same onPointer* + scale
  // pattern as ToggleChip's own press feedback, just keyed per-button.
  const [pressedValue, setPressedValue] = useState(null)
  return (
    <div style={{
      display: 'inline-flex',
      backgroundColor: 'var(--color-border)',
      borderRadius: 'var(--radius-full)',
      padding: 2,
      gap: 2,
    }}>
      {options.map(opt => {
        const active = value === opt.value
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            onPointerDown={() => setPressedValue(opt.value)}
            onPointerUp={() => setPressedValue(null)}
            onPointerLeave={() => setPressedValue(null)}
            onPointerCancel={() => setPressedValue(null)}
            style={{
              padding: '6px 12px',
              minWidth: minOptionWidth || undefined,
              textAlign: 'center',
              borderRadius: 'var(--radius-full)',
              fontSize: 13, fontWeight: 500,
              cursor: 'pointer',
              border: 'none',
              whiteSpace: 'nowrap',
              backgroundColor: active ? 'var(--color-accent)' : 'transparent',
              color: active ? '#fff' : 'var(--color-text-tertiary)',
              fontFamily: 'var(--font-body)',
              transform: pressedValue === opt.value ? 'scale(0.96)' : 'scale(1)',
              transition: 'background-color 0.15s ease, color 0.15s ease, transform 0.15s ease',
              WebkitTapHighlightColor: 'transparent',
              outline: 'none',
            }}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

// Clear All — filled solid red when a real filter is active (was
// border-only red before), grey/bordered/inert when disabled. Press
// feedback (scale down on press, release on up/leave/cancel) matches
// ToggleChip's own onPointer* + local 'pressed' state pattern.
function ClearAllButton({ onClick, disabled }) {
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
        flex: 1, padding: '12px',
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
      Clear All
    </button>
  )
}

// drugs-filter-chip-polish — fontWeight used to jump 400 -> 600 on active,
// which visibly resized the chip since bold text is wider. Weight is now
// constant; active/inactive reads purely through color/border/background.
// Also added press feedback (scale down on press, release on up/leave/
// cancel), matching CategoryRow's onPointer* + local 'pressed' state
// pattern rather than inventing a new one.
//
// drug-filter-checkbox-indicator — added a small checkbox square before
// the label so the chip row reads as a multi-select control (several can
// be active at once) rather than looking like a single-choice segmented
// toggle. Checked state (filled box + checkmark) mirrors the chip's own
// active state exactly, no separate logic.
//
// drugs-filter-panel-restyle — replaced the 'centered' prop (only ever
// used by the old full-width "All Forms" row, which no longer exists)
// with 'fitContent': shrinks the chip to its content width instead of
// width:100%, for use inline next to a FilterSection label rather than as
// a block-level row or grid cell.
function ToggleChip({ label, active, onToggle, showCheckbox = true, fitContent = false }) {
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
        borderRadius: 'var(--radius-full)',
        fontSize: 13, fontWeight: 500,
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
      {/* Selection indicator — circle outline when unselected, filled
          white with a checkmark when selected, signals "pick any number
          of these" rather than "pick one". Omitted for the 'All Forms'
          chip: picking it isn't a multi-select tick, it's a single
          exclusive reset, so it reads as a plain selectable pill instead
          (see showCheckbox). */}
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
      {/* Single-line label — clips with an ellipsis instead of wrapping
          and blowing up the fixed-width grid cell's row height. */}
      <span style={{
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        minWidth: 0,
      }}>
        {label}
      </span>
    </button>
  )
}
