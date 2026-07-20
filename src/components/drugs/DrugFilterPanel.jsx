import { useEffect, useState } from 'react'

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
 * Filter content below (Search By / Form-Route / Pregnancy / Breastfeeding
 * sections, Clear All / Apply buttons) is unchanged — only this shell.
 *
 * Props:
 *   isOpen           boolean
 *   onClose          () => void
 *   onApply          (filters) => void   filters: { forms, pregnancySafe, pregnancyUnsafe, bfSafe, bfUnsafe }
 *   mode             'brand' | 'generic' | undefined — current search mode, for the Search By section
 *   onModeChange     (mode) => void | undefined — instant, not gated by Apply; section hidden if omitted
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

export default function DrugFilterPanel({ isOpen, onClose, onApply, mode, onModeChange }) {
  const [filters, setFilters] = useState(EMPTY)

  // shouldRender keeps the DOM present during the exit transition.
  // animateIn drives the CSS open/closed visual position. Same pattern as
  // SpecialtiesBottomSheet.jsx (decision 4.20, step 1f.1).
  const [shouldRender, setShouldRender] = useState(isOpen)
  const [animateIn,    setAnimateIn]    = useState(isOpen)

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

  function handleClear() {
    setFilters(EMPTY)
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
            <ModeToggle mode={mode} onChange={onModeChange} />
          </FilterSection>
        )}

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

// Segmented Brand/Generic control. Moved here from DrugsScreen.jsx
// (2026-07-19) — same markup/logic as the old inline toggle, just full-width
// to match this sheet's other rows instead of a compact pill-sized control.
function ModeToggle({ mode, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
      {['brand', 'generic'].map(m => (
        <button
          key={m}
          type="button"
          onClick={() => onChange(m)}
          style={{
            flex: 1,
            padding: '8px 14px',
            borderRadius: 'var(--radius-full)',
            fontSize: 13, fontWeight: mode === m ? 600 : 400,
            cursor: 'pointer',
            border: mode === m ? '1.5px solid var(--color-accent)' : '1.5px solid var(--color-border)',
            backgroundColor: mode === m ? 'var(--color-accent)' : 'transparent',
            color: mode === m ? '#fff' : 'var(--color-text-secondary)',
            fontFamily: 'var(--font-body)',
            transition: 'all 0.15s ease',
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
