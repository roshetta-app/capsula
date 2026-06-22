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
 * Free-text commit flow (BUG FIX, 2026-06-23):
 *   For unlinked/free-text rows the previous implementation had no
 *   "commit" moment: the admin typed a name but the field stayed open
 *   indefinitely in live-search state, giving no signal that the name
 *   had been accepted and that the dose/note/generic fields below were
 *   ready to fill.
 *
 *   Fix: a third display state — "committed free-text" — sits between
 *   the open-search state (default for a new, nameless row) and the
 *   linked read-only state (only reached when a library result is
 *   selected). In the committed state the typed name is shown inline
 *   (pill icon + name text + pencil to re-open), matching the linked
 *   display's layout but WITHOUT the link-chain glyph, so the admin
 *   can tell at a glance that this name is free-typed (unlinked) while
 *   still getting the visual cue that the name is set and the fields
 *   below are live.
 *
 *   Commit triggers (for unlinked rows only):
 *     • Enter key in the search input (when query is non-empty)
 *     • Clicking the "Use '[name]' as drug name →" trailing item that
 *       appears at the bottom of the dropdown (always present when the
 *       dropdown is open, so the admin always has an explicit path even
 *       when library results are shown alongside)
 *     • Clicking outside the field while query is non-empty (onBlur
 *       commit — auto-commits on focus-leave so the admin doesn't have
 *       to do anything extra if they tab to the next field)
 *
 *   Uncommit (re-open search): clicking the pencil icon in committed
 *   state re-opens the search field pre-filled with the current name,
 *   so the admin can refine the text or pick a library result.
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
 *
 * BUG FIX (2026-06-23):
 *   Added free-text commit state. See "Free-text commit flow" above.
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

// ─── Linked read-only summary label ────────────────────────────────────────
// BUG FIX (2026-06-23): the linked display previously showed only the drug
// name. Concentration/form/Arabic name are library data once a row is
// linked — read-only, not separately editable fields — so they're folded
// into this one summary line instead of a standalone Arabic name input
// sitting elsewhere on the row. Format: "Name — concentration, form — name_ar".
function buildLinkedSummary(name, concentration, form, nameAr) {
  const concForm = [concentration, form].filter(Boolean).join(', ')
  return [name, concForm, nameAr].filter(Boolean).join(' — ')
}

export default function DrugSearchField({
  value = '',
  isLinked = false,
  concentration = null,
  form = null,
  nameAr = null,
  onChangeText,
  onLink,
  onUnlink,
  mode = 'formulation',
  placeholder = 'Search or type a drug name…',
}) {
  // Three display states for this field:
  //   editing   = true,  committed = false → open search input (new/nameless rows, or
  //                                          after clicking pencil to change)
  //   editing   = false, committed = true  → committed free-text display (name set,
  //                                          not linked — no chain glyph)
  //   isLinked  = true,  editing   = false → library-linked read-only display (chain glyph)
  //
  // A row starts in editing state. Once the admin types a name and commits
  // (Enter / blur / "Use as name" click), it moves to committed state so the
  // fields below become obviously accessible. Clicking the pencil in committed
  // state re-opens the search input pre-filled with the current name.
  const [editing, setEditing]     = useState(!isLinked && !value)
  const [committed, setCommitted] = useState(!isLinked && !!value)
  const [query, setQuery]         = useState(isLinked ? '' : (value || ''))
  const [suggestions, setSuggestions] = useState([])
  const [loading, setLoading]     = useState(false)
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
    setCommitted(false) // linked state supersedes committed
    setQuery('')
    onLink?.(suggestion._raw)
  }

  function handleDismissDropdown() {
    setSuggestions([])
  }

  // ── Commit the current query as a free-text drug name ──────────────────
  // Called on Enter key, blur (when query is non-empty), or "Use as name"
  // click. Transitions from editing → committed state.
  //
  // BUG FIX (2026-06-23): onUnlink moved here from handleStartChange. A
  // previously-linked row's library-snapshot fields (formulation_id,
  // concentration, etc.) must only be cleared once the admin actually
  // commits a real change — not the instant they click the pencil — so
  // that backing out (clicking away with nothing typed) leaves the row
  // exactly as it was. If this row was linked, clear those fields now,
  // immediately before writing the new free-text name.
  function commitFreeText() {
    const name = query.trim()
    if (!name) return
    setSuggestions([])
    setEditing(false)
    setCommitted(true)
    if (isLinked) onUnlink?.()
    // Ensure the parent row has the final trimmed name.
    onChangeText?.(name)
  }

  // ── Cancel out of the search/editing state without changing anything ──
  // Fired on Escape, or on blur when nothing has been typed (query is
  // empty). Simply closes the editing state — since nothing has been
  // written to the row yet (see commitFreeText/handleSelect above), the
  // component falls straight back to whichever display (linked or
  // committed free-text) reflects the row's untouched, original data.
  function cancelEditing() {
    setSuggestions([])
    setEditing(false)
    setQuery('')
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') {
      e.preventDefault()
      commitFreeText()
    }
    if (e.key === 'Escape') {
      cancelEditing()
    }
  }

  function handleBlur() {
    // Auto-commit on focus-leave if a name has been typed, so tabbing
    // to the next field below works naturally without requiring an
    // explicit Enter press. If nothing was typed, this is a "changed my
    // mind" cancel — revert to the previous display instead of leaving
    // the search box open indefinitely.
    if (query.trim()) {
      commitFreeText()
    } else {
      cancelEditing()
    }
  }

  // ── Re-open search from committed free-text state ─────────────────────
  // Pre-fills the query with the current name so the admin can refine
  // or pick a library result without re-typing from scratch.
  function handleEditCommitted() {
    setCommitted(false)
    setEditing(true)
    setQuery(value || '')
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  // ── Re-open search from linked state ───────────────────────────────────
  // BUG FIX (2026-06-23): no longer calls onUnlink here. Clicking the
  // pencil only opens the search field for browsing/typing — the row's
  // existing link is left completely intact until the admin actually
  // commits a change (picks a new result, or types and commits free
  // text). This makes "click the pencil, then change my mind and click
  // elsewhere" a true no-op, instead of having already wiped the link
  // the moment the pencil was clicked.
  function handleStartChange() {
    setEditing(true)
    setCommitted(false)
    setQuery('')
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
        <span dir="auto" style={{
          flex:       1,
          fontSize:   15,
          fontWeight: 600,
          color:      'var(--color-text-primary)',
        }}>
          {buildLinkedSummary(value, concentration, form, nameAr)}
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

  // ── Committed free-text state (BUG FIX) ───────────────────────────────
  // Name has been typed and confirmed by the admin (Enter / blur / "Use
  // as name" click). Visually similar to the linked state but without the
  // Link2 chain glyph — so the admin can distinguish unlinked (no chain)
  // from library-linked (chain glyph). Clicking pencil re-opens search.
  if (!isLinked && committed && value) {
    return (
      <div style={{
        display:    'flex',
        alignItems: 'center',
        gap:        6,
      }}>
        {/* Pill icon — matches linked display layout */}
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
        {/* No Link2 glyph — absence is the "not linked" signal */}
        {/* Edit button — re-opens search pre-filled with current name */}
        <button
          type="button"
          onClick={handleEditCommitted}
          aria-label="Edit drug name"
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
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
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

      {!loading && (suggestions.length > 0 || query.trim().length >= 2) && (
        <AutocompleteDropdownInline
          suggestions={suggestions}
          freeTextName={query.trim()}
          onSelect={handleSelect}
          onCommitFreeText={commitFreeText}
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
//
// BUG FIX (2026-06-23): Added freeTextName + onCommitFreeText props.
// When freeTextName is non-empty, a trailing "Use '[name]' as drug name →"
// item is always appended below any library results (or shown alone when
// there are no results), giving the admin an explicit click target to
// commit a free-text name without pressing Enter.

function AutocompleteDropdownInline({ suggestions, freeTextName, onSelect, onCommitFreeText, onDismiss }) {
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

  // Only show the dropdown if there are library results OR a committable name.
  const showFreeTextRow = !!freeTextName
  if (suggestions.length === 0 && !showFreeTextRow) return null

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
          // Use mouseDown (not onClick) so this fires before the input's
          // onBlur → commitFreeText. Without this, blur fires first and
          // commits a free-text name right before the library pick lands,
          // causing a brief double-update.
          onMouseDown={e => { e.preventDefault(); onSelect(s) }}
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

      {/* ── "Use as drug name" free-text commit row ────────────────────
          Always shown when the admin has typed something, whether or not
          library results exist. Clicking this commits the typed name and
          transitions to the committed free-text display state, making
          the dose/note/generic fields below immediately accessible.    */}
      {showFreeTextRow && (
        <button
          role="option"
          onMouseDown={e => { e.preventDefault(); onCommitFreeText() }}
          style={{
            width:       '100%',
            display:     'flex',
            alignItems:  'center',
            gap:         6,
            padding:     '8px 12px',
            background:  'none',
            border:      'none',
            borderTop:   suggestions.length > 0 ? '1px solid var(--color-border)' : 'none',
            cursor:      'pointer',
            fontFamily:  'var(--font-body)',
            fontSize:    12,
            color:       'var(--color-text-secondary)',
            textAlign:   'left',
            fontStyle:   'italic',
            WebkitTapHighlightColor: 'transparent',
          }}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--color-bg)'}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          Use &ldquo;{freeTextName}&rdquo; as drug name →
        </button>
      )}
    </div>
  )
}


