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
 */

// Each chip's `matches` list is the full set of real raw form values (from
// src/config/forms.js) it should catch. `value` stays the chip's own stable
// id used for selection state - it is not necessarily a raw form value
// itself anymore now that Tab/Capsule and Drops each cover several.
export const FORM_OPTIONS = [
  { value: 'all',         label: 'All Forms',     matches: [] },
  { value: 'tablet',      label: 'Tab / Cap.',    matches: ['tablet', 'capsule', 'effervescent', 'lozenges'] },
  { value: 'syrup',       label: 'Syrup/Susp.',   matches: ['syrup', 'suspension', 'solution'] },
  { value: 'drops',       label: 'Drops',         matches: ['eye drops', 'oral drops', 'ear drops', 'nasal drops', 'mouth drops', 'drops'] },
  { value: 'sachet',      label: 'Sachet',        matches: ['sachet', 'powder', 'power'] },
  { value: 'inhaler',     label: 'Inhaled',       matches: ['inhaler', 'inhalation solution'] },
  { value: 'spray',       label: 'Spray',         matches: ['spray'] },
  { value: 'injection',   label: 'Inj.',          matches: ['injection', 'vial', 'ampoule', 'syringe', 'pen', 'vaccine'] },
  { value: 'suppository', label: 'Supp.',         matches: ['suppository', 'enema', 'vaginal douche'] },
  { value: 'cream',       label: 'Topical',       matches: ['cream', 'ointment', 'eye ointment', 'gel', 'lotion', 'shampoo', 'soap', 'antiseptic solution', 'facial wash', 'conditioner', 'foam', 'paint', 'hair oil', 'oil', 'serum', 'patch', 'wipes', 'gauze dressing'] },
  { value: 'other',       label: 'Other',         matches: ['piece', 'mouth wash', 'film', 'bottle', 'other'] },
]

const EMPTY = {
  forms: ['all'],
}

export default function DrugFilterPanel({ isOpen, onClose, onApply, activeFilters, mode, onModeChange }) {
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
            every other one in this sheet. */}
        {onModeChange && (
          <FilterSection label="Search By">
            <ModeToggle mode={mode} onChange={handleModeChange} />
          </FilterSection>
        )}

        {/* Form / Route — instant-apply, see toggleForm above. 'All Forms'
            gets its own full-width row (it's a single exclusive reset, not
            a grid item alongside the multi-select chips) with centered
            text; the rest sit in the 3-column grid below. */}
        <FilterSection label="Form / Route">
          <div style={{ marginBottom: 'var(--space-2)' }}>
            <ToggleChip
              label="All Forms"
              active={filters.forms.includes('all')}
              onToggle={() => toggleForm('all')}
              showCheckbox={false}
              centered
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-2)' }}>
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

// Segmented Brand/Generic control. Moved here from DrugsScreen.jsx
// (2026-07-19) — same markup/logic as the old inline toggle, just full-width
// to match this sheet's other rows instead of a compact pill-sized control.
//
// drug-filter-instant-apply — fontWeight used to jump 400 -> 600 on active,
// which visibly resized the pill since bold text is wider (same bug already
// fixed on ToggleChip below). Weight is now constant; active/inactive reads
// purely through color/border/background.
function ModeToggle({ mode, onChange }) {
  // Tracks which of the two buttons (if any) is currently pressed, since
  // both share this one component instance — same onPointer* + scale
  // pattern as ToggleChip's own press feedback, just keyed per-button.
  const [pressedMode, setPressedMode] = useState(null)
  return (
    <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
      {['brand', 'generic'].map(m => (
        <button
          key={m}
          type="button"
          onClick={() => onChange(m)}
          onPointerDown={() => setPressedMode(m)}
          onPointerUp={() => setPressedMode(null)}
          onPointerLeave={() => setPressedMode(null)}
          onPointerCancel={() => setPressedMode(null)}
          style={{
            flex: 1,
            padding: '8px 14px',
            borderRadius: 'var(--radius-full)',
            fontSize: 13, fontWeight: 500,
            cursor: 'pointer',
            border: mode === m ? '1.5px solid var(--color-accent)' : '1.5px solid var(--color-border)',
            backgroundColor: mode === m ? 'var(--color-accent)' : 'transparent',
            color: mode === m ? '#fff' : 'var(--color-text-secondary)',
            fontFamily: 'var(--font-body)',
            transform: pressedMode === m ? 'scale(0.96)' : 'scale(1)',
            transition: 'background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease, transform 0.15s ease',
            WebkitTapHighlightColor: 'transparent',
            outline: 'none',
          }}
        >
          {m === 'brand' ? 'Brand' : 'Generic'}
        </button>
      ))}
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
function ToggleChip({ label, active, onToggle, showCheckbox = true, centered = false }) {
  const [pressed, setPressed] = useState(false)
  return (
    <button
      onClick={onToggle}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      onPointerCancel={() => setPressed(false)}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: centered ? 'center' : 'flex-start', gap: 5,
        width: '100%', minWidth: 0, boxSizing: 'border-box',
        padding: '6px 8px',
        borderRadius: 'var(--radius-full)',
        fontSize: 12, fontWeight: 500,
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
          width: 14, height: 14, flexShrink: 0,
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
