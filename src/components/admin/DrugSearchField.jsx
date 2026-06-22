/**
 * src/components/admin/DrugSearchField.jsx
 * PHASE 0 (2026-06-22) — Admin Condition Editor Redesign, Decision 1.
 *
 * Single unified search/autocomplete field for one drug line, replacing
 * the old multi-field entry (separate Brand Name / Generic Name /
 * Concentration / Form inputs + three separate picker-trigger buttons).
 *
 * This is Phase 0.2/0.3 work only: an isolated, reusable component, NOT
 * yet wired into any row editor. Phase 1 wires this into the actual drug
 * row UI and removes the old fields/buttons it replaces.
 *
 * Behavior (Decision 1):
 *   - Typing free text keeps the entry as manual/unlinked data. The field
 *     stays a live, directly-editable text input the whole time.
 *   - Typing 2+ characters shows a dropdown of matching brands/
 *     formulations (reusing DrugPickerModal's existing search queries),
 *     using the same visual/interaction pattern as SearchBar +
 *     AutocompleteDropdown elsewhere in the app — no new search UX
 *     invented here (LOCKED — search mechanics).
 *   - Selecting a result LINKS the row: brand/generic/concentration/
 *     form/Arabic name/category populate silently in the background
 *     (passed to onLink) but are not shown as separate visible fields.
 *     Once linked, the name renders read-only with a tiny link-glyph
 *     icon (LOCKED — linked indicator: icon only, no text label) and a
 *     pill icon to the left of the name (Decision 5 / Phase 1.5 visual
 *     hierarchy: pill icon always present left of the drug name).
 *   - Once linked, the admin cannot type directly into the name to
 *     search for a replacement. An explicit icon-only "change" action
 *     (pencil/swap glyph) re-opens the search field for that row,
 *     letting the admin pick a different result (re-link) or type free
 *     text (unlink to manual entry) — LOCKED, see Decision 1.
 *
 * Props:
 *   value         string                — current display name (linked
 *                                          name, or free-typed text)
 *   isLinked      boolean                — whether this row is currently
 *                                          linked to the library
 *   onChangeText  (text: string) => void — fired as the admin types in
 *                                          the unlinked/free-text state
 *   onLink        (result) => void       — fired when a search result is
 *                                          selected. `result` is either a
 *                                          formulation object (mode=
 *                                          'formulation') or a brand
 *                                          object (mode='brand'), same
 *                                          shapes DrugPickerModal already
 *                                          produces — caller is
 *                                          responsible for extracting
 *                                          brand_id/generic_id/
 *                                          formulation_id/concentration/
 *                                          form/name_ar/category from it,
 *                                          same as today's auto-fill.
 *   onUnlink      () => void             — fired when the admin clicks
 *                                          "change" and then types free
 *                                          text instead of picking a
 *                                          result (explicit unlink).
 *   mode          'formulation' | 'brand' — which DrugPickerModal query
 *                                          to reuse. Default 'formulation'.
 *   placeholder   string                  — shown when value is empty.
 *
 * Explicitly NOT included in this component (per Decision 1, v1 scope):
 *   - No "view/edit linked details" affordance — sub-fields are stored,
 *     never displayed, once linked.
 *   - No inline "add new brand" creation flow — that is brand-scoped
 *     picker behavior (DrugPickerModal mode="brand-scoped") tied to the
 *     existing alternatives flow, which Decision 1 supersedes; not
 *     carried over here. Promote-to-library (Decision 7 / Phase 4) is a
 *     separate, later workstream.
 *
 * PHASE 1.5 (2026-06-22) — Admin Condition Editor Redesign:
 *   Added pill icon (faPills, FontAwesome) to the left of the drug name
 *   in the linked read-only display, per Decision 5's locked visual
 *   hierarchy ("small pill icon to the left of each name"). The Link2
 *   glyph remains as the linked-indicator icon (Decision 1: "a linked
 *   drug name shows a tiny icon only"). Layout: [pill] [name] [link
 *   glyph] [change button].
 */

import { useState, useEffect, useRef } from 'react'
import { Search, X } from 'lucide-react'
import { faPills } from '@fortawesome/free-solid-svg-icons'
import Icon from '../ui/Icon'
import { supabase } from '../../lib/supabase'

// ─── Search queries (reused from DrugPickerModal) ─────────────────────────
// Same client-side-filter pattern as DrugPickerModal's
// searchFormulationsForPicker / searchBrandsForPicker — kept here rather
// than imported, since DrugPickerModal's queries are private (not
// exported) module-level functions. If DrugPickerModal is ever refactored
// to export these, this duplication should be collapsed at that point —
// flagged here, not fixed now, to keep this Phase 0 change additive only
// and avoid touching DrugPickerModal.jsx's existing call sites.

async function searchFormulations(query) {
  const { data, error } = await supabase
    .from('formulations')
    .select(`
      id, slug, concentration, form, route,
      doses_structured, default_dose_override,
      generics ( id, name_en, name_ar, slug, category ),
      brands ( id, name, name_ar )
    `)
    .eq('is_published', true)
    .order('concentration')

  if (error) return { data: null, error }
  if (!query || query.trim().length < 2) return { data: [], error: null }

  const q = query.trim().toLowerCase()
  const filtered = (data ?? []).filter(f => {
    const genericName   = (f.generics?.name_en ?? '').toLowerCase()
    const concentration = (f.concentration ?? '').toLowerCase()
    const form          = (f.form ?? '').toLowerCase()
    const brandNames    = (f.brands ?? []).map(b => b.name.toLowerCase()).join(' ')
    return (
      genericName.includes(q) ||
      concentration.includes(q) ||
      form.includes(q) ||
      brandNames.includes(q)
    )
  })

  return { data: filtered, error: null }
}

async function searchBrands(query) {
  const { data, error } = await supabase
    .from('brands')
    .select(`
      id, name, name_ar,
      formulations (
        id, concentration, form, route,
        doses_structured, default_dose_override,
        generics ( id, name_en, name_ar, slug, category )
      )
    `)
    .eq('formulations.is_published', true)
    .order('name')

  if (error) return { data: null, error }

  const published = (data ?? []).filter(b => b.formulations)
  if (!query || query.trim().length < 2) return { data: [], error: null }

  const q = query.trim().toLowerCase()
  const filtered = published.filter(b => {
    const brandName     = (b.name ?? '').toLowerCase()
    const genericName   = (b.formulations?.generics?.name_en ?? '').toLowerCase()
    const concentration = (b.formulations?.concentration ?? '').toLowerCase()
    const form          = (b.formulations?.form ?? '').toLowerCase()
    return (
      brandName.includes(q) ||
      genericName.includes(q) ||
      concentration.includes(q) ||
      form.includes(q)
    )
  })

  return { data: filtered, error: null }
}

// ─── Result -> dropdown suggestion shape ───────────────────────────────────
// AutocompleteDropdown expects [{ id, name, slug }]; we keep the original
// result object alongside so onLink can receive the full record.

function toSuggestion(result, mode) {
  if (mode === 'brand') {
    const f = result.formulations
    const g = f?.generics
    const detail = [g?.name_en, f?.concentration, f?.form].filter(Boolean).join(' · ')
    return { id: result.id, name: detail ? `${result.name} — ${detail}` : result.name, _raw: result }
  }
  const g = result.generics
  const detail = [result.concentration, result.form].filter(Boolean).join(' ')
  const brandNames = (result.brands ?? []).map(b => b.name).join(', ')
  const label = [g?.name_en ?? 'Unknown generic', detail].filter(Boolean).join(' ')
  return { id: result.id, name: brandNames ? `${label} (${brandNames})` : label, _raw: result }
}

export default function DrugSearchField({
  value = '',
  isLinked = false,
  onChangeText,
  onLink,
  onUnlink,
  mode = 'formulation',
  placeholder = 'Search or type a drug name…',
}) {
  // When linked, the field shows read-only display by default; "change"
  // re-opens it into the live search state below.
  const [editing, setEditing] = useState(!isLinked)
  const [query, setQuery] = useState(isLinked ? '' : value)
  const [suggestions, setSuggestions] = useState([])
  const [loading, setLoading] = useState(false)
  const inputRef = useRef(null)

  // Keep local query in sync if the row's value changes from outside
  // (e.g. parent resets the row) while not actively editing.
  useEffect(() => {
    if (!editing) {
      setQuery('')
    }
  }, [isLinked, value, editing])

  // Debounced search as the admin types, matching SearchBar/
  // AutocompleteDropdown's existing 2-character threshold convention.
  useEffect(() => {
    if (!editing) {
      setSuggestions([])
      return
    }
    if (!query || query.trim().length < 2) {
      setSuggestions([])
      return
    }
    setLoading(true)
    const timer = setTimeout(async () => {
      const { data, error } = mode === 'brand'
        ? await searchBrands(query)
        : await searchFormulations(query)
      if (!error) {
        setSuggestions((data ?? []).slice(0, 5).map(r => toSuggestion(r, mode)))
      }
      setLoading(false)
    }, 250)
    return () => clearTimeout(timer)
  }, [query, editing, mode])

  function handleTextChange(text) {
    setQuery(text)
    onChangeText?.(text)
  }

  function handleSelect(suggestion) {
    setSuggestions([])
    setEditing(false)
    setQuery('')
    onLink?.(suggestion._raw)
  }

  function handleDismissDropdown() {
    setSuggestions([])
  }

  function handleStartChange() {
    setEditing(true)
    setQuery('')
    onUnlink?.()
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  // ── Linked, read-only state ───────────────────────────────────────────
  // PHASE 1.5: pill icon added to the left of the name per Decision 5's
  // locked visual hierarchy (name is the loudest element: 15px/600-weight,
  // pill icon to the left). The Link2 glyph stays as the linked indicator
  // per Decision 1 (icon-only, no text label). Layout:
  //   [pill icon]  [name]  [Link2 glyph]  [change/pencil button]
  if (isLinked && !editing) {
    return (
      <div style={{
        display:    'flex',
        alignItems: 'center',
        gap:        6,
      }}>
        {/* Pill icon — always-present name prefix (Decision 5 / Phase 1.5) */}
        <Icon
          faIcon={faPills}
          size={13}
          color="var(--color-text-tertiary)"
        />
        <span style={{
          flex:       1,
          fontSize:   15,
          fontWeight: 600,
          color:      'var(--color-text-primary)',
        }}>
          {value}
        </span>
        {/* Link2 glyph — linked indicator (Decision 1: icon-only, no text) */}
        <Icon name="Link2" size={13} color="var(--color-text-tertiary)" />
        {/* Change button — re-opens search (Decision 1: icon-only, no label) */}
        <button
          type="button"
          onClick={handleStartChange}
          aria-label="Change drug"
          style={{
            display:    'flex',
            alignItems: 'center',
            background: 'none',
            border:     'none',
            padding:    4,
            cursor:     'pointer',
            color:      'var(--color-text-tertiary)',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          <Icon name="Pencil" size={13} />
        </button>
      </div>
    )
  }

  // ── Live search / free-text state ─────────────────────────────────────
  return (
    <div style={{ position: 'relative' }}>
      <div style={{ position: 'relative' }}>
        <Search
          size={14}
          style={{
            position:      'absolute',
            left:          10,
            top:           '50%',
            transform:     'translateY(-50%)',
            color:         'var(--color-text-tertiary)',
            pointerEvents: 'none',
          }}
        />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => handleTextChange(e.target.value)}
          placeholder={placeholder}
          style={{
            width:           '100%',
            boxSizing:       'border-box',
            padding:         '8px 30px',
            border:          '1.5px solid var(--color-border)',
            borderRadius:    'var(--radius-md)',
            fontSize:        15,
            fontWeight:      600,
            fontFamily:      'var(--font-body)',
            backgroundColor: 'var(--color-surface)',
            color:           'var(--color-text-primary)',
            outline:         'none',
          }}
          onFocus={e => e.target.style.borderColor = 'var(--color-accent)'}
          onBlur={e  => e.target.style.borderColor  = 'var(--color-border)'}
        />
        {query && (
          <button
            type="button"
            onClick={() => handleTextChange('')}
            aria-label="Clear"
            style={{
              position:   'absolute',
              right:      8,
              top:        '50%',
              transform:  'translateY(-50%)',
              background: 'none',
              border:     'none',
              cursor:     'pointer',
              color:      'var(--color-text-tertiary)',
              display:    'flex',
              padding:    2,
            }}
          >
            <X size={13} />
          </button>
        )}
      </div>

      {loading && query.trim().length >= 2 && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          marginTop: 4,
          fontSize: 12,
          color: 'var(--color-text-tertiary)',
        }}>
          Searching…
        </div>
      )}

      {!loading && suggestions.length > 0 && (
        <AutocompleteDropdownInline
          suggestions={suggestions}
          onSelect={handleSelect}
          onDismiss={handleDismissDropdown}
        />
      )}
    </div>
  )
}

// ─── Local re-render of AutocompleteDropdown's shape ───────────────────────
// Intentionally NOT importing AutocompleteDropdown.jsx directly: that
// component is styled for full-width screen search bars (large row
// padding/font sizing tuned for ConditionsScreen/DrugsScreen). This field
// sits inside a much narrower, denser drug-row context, so a separate
// inline copy matching its open/close/outside-tap behavior — but in this
// component's local style scale — avoids visually oversized dropdowns on
// every row while keeping the exact same interaction pattern (LOCKED —
// search mechanics: matches the existing pattern, not a new one).

function AutocompleteDropdownInline({ suggestions, onSelect, onDismiss }) {
  const ref = useRef(null)

  useEffect(() => {
    function handle(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        onDismiss()
      }
    }
    document.addEventListener('mousedown', handle)
    document.addEventListener('touchstart', handle)
    return () => {
      document.removeEventListener('mousedown', handle)
      document.removeEventListener('touchstart', handle)
    }
  }, [onDismiss])

  return (
    <div
      ref={ref}
      role="listbox"
      style={{
        position:        'absolute',
        top:             '100%',
        left:            0,
        right:           0,
        zIndex:          200,
        backgroundColor: 'var(--color-surface)',
        border:          '1px solid var(--color-border)',
        borderRadius:    'var(--radius-md)',
        boxShadow:       'var(--shadow-elevated)',
        overflow:        'hidden',
        marginTop:       4,
      }}
    >
      {suggestions.map((s, i) => (
        <button
          key={s.id}
          role="option"
          onClick={() => onSelect(s)}
          style={{
            width:       '100%',
            display:     'flex',
            alignItems:  'center',
            padding:     '8px 12px',
            background:  'none',
            border:      'none',
            borderTop:   i > 0 ? '1px solid var(--color-border)' : 'none',
            cursor:      'pointer',
            fontFamily:  'var(--font-body)',
            fontSize:    13,
            color:       'var(--color-text-primary)',
            textAlign:   'left',
            WebkitTapHighlightColor: 'transparent',
          }}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--color-bg)'}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          {s.name}
        </button>
      ))}
    </div>
  )
}
