/**
 * src/components/admin/blocks/rows/UnifiedDrugRowEditor.jsx
 *
 * Phase 1 — Unified prescription drug row editor.
 *
 * Replaces the two separate DrugFreetextRowEditor and DrugLibraryRowEditor
 * components with a single editor that handles both origins via the same
 * field set (masterplan §2.1). Origin (library-linked vs. free-text) is
 * expressed by whether brand_id / generic_id / formulation_id are populated,
 * not by a different row_type.
 *
 * Steps implemented here:
 *   1.1  All fields: brand name (plain text input), generic name (autocomplete),
 *        Arabic name (auto-filled on library pick, freely editable),
 *        concentration, form (dropdown), dose, note (single bidi field).
 *   1.2  Brand picking: two explicit picker buttons — "Pick a brand…" opens
 *        DrugPickerModal in brand mode; "Pick a formulation…" opens it in
 *        formulation mode. Free-text brand_name is a plain editable field
 *        (no brand autocomplete dropdown — replaced by the explicit pickers
 *        per Phase 1 spec).
 *   1.3  Generic-name autocomplete (§2.6): independent of brand matching;
 *        links generic_id when a match is found, null otherwise.
 *   1.4  dose_override removed. Single pre-fillable, freely editable dose field.
 *   1.5  Validation: block save if both brand_name and generic_name are empty.
 *        (Validation state is surfaced via a visible error inside the component;
 *        the parent PrescriptionSheetEditor should also gate its save.)
 *   1.5a "Not in library" always-visible tag on any row without real library IDs.
 *   1.6  Data shape matches prescriptionRowSchema.js DRUG_ROW_TEMPLATE exactly.
 *   1.8  "Add alternative" button opens DrugPickerModal (brand or formulation
 *        mode) or free-text entry; appends to row.alternatives array.
 *   1.9  Alternatives rendered nested under main drug (indented), each with
 *        its own remove control.
 *   1.10 Shared-vs-own dose/note: uses alternativeSharesParentDose() from
 *        schema file. When shared, both the dose and note inputs are
 *        hidden entirely (not just visually suppressed) so an admin can't
 *        fill in a value that's silently ignored at render time.
 *   1.11 Delete-with-promote flow: if a row has alternatives, the parent is
 *        notified via onDeleteRequest (not onDelete) so PrescriptionSheetEditor
 *        can show the promote dialog. This component exports the
 *        PromoteAlternativeDialog too, for use in PrescriptionSheetEditor.
 *   3.3  PHASE 3 (2026-06-20): "Same formulation, different brand" alternatives
 *        get a dedicated scoped entry point — DrugPickerModal mode="brand-scoped",
 *        pre-filtered to the parent/main row's formulation_id (only shown once
 *        that formulation_id exists). The resulting alternative's
 *        formulation_id/concentration/form/route/category are force-set from
 *        the parent row, not from the picked brand's own nested formulation —
 *        so it can never independently drift from the parent's identity, which
 *        is what makes alternativeSharesParentDose() reliably true for this
 *        path. The existing unscoped "Pick a brand…" / "Pick a formulation…"
 *        buttons remain, unchanged, for the "different drug, same purpose" case.
 *   6.1  PHASE 6 (2026-06-21): "Save to library" parity for alternatives.
 *        AlternativeRow now has the same promote button, category/route
 *        selects, and error display that the main row's free-text mode
 *        already had — gated the same way, on !isLinked. Reuses the exact
 *        generic→formulation→brand reuse-or-create logic from the main
 *        row's handlePromote (no new query functions), just reading from
 *        and patch()-ing this alternative's own fields instead of the
 *        parent row's. Promoting one alternative never touches the parent
 *        row or any other alternative on the same drug row.
 *
 *   PHASE 1 (2026-06-22) — Admin Condition Editor Redesign, Decision 1:
 *        1.1 The Brand Name / Generic Name / Concentration / Form fields,
 *            their read-only-once-linked display block, and the
 *            "Pick a brand…" / "Pick a formulation…" / "Pick brand (same
 *            formulation)…" trigger buttons are REMOVED from both the main
 *            row and AlternativeRow's identity entry. Replaced by a single
 *            DrugSearchField per drug line (Phase 0.2 component).
 *        1.2 Silent auto-fill of concentration/form/Arabic name/category on
 *            library selection is preserved unchanged — handleBrandPick (main)
 *            and AlternativeRow's own handleBrandPick are reused as-is for
 *            DrugSearchField's onLink, since DrugSearchField's mode="brand"
 *            onLink result is shaped identically to what DrugPickerModal
 *            mode="brand" already produced. Only the entry point changed,
 *            not the fill logic.
 *        1.3 Free-text manual entry path preserved: typing without selecting
 *            a search result leaves the row unlinked (brand_id / generic_id /
 *            formulation_id stay null). DrugSearchField's live editing state
 *            is the unlinked path — no separate mechanism needed.
 *        1.4 Drug-link toggle rendered as icon-only button (Decision 1's
 *            anti-label-clutter rule). Labeled button text ("Drug link: ON /
 *            OFF") and explanatory subtext ("Name taps navigate to Drug
 *            Detail screen") removed. Only the Link/Unlink icon remains,
 *            with an aria-label for accessibility.
 *        1.5 Visual hierarchy applied to drug name per Decision 5: 15px /
 *            600-weight / primary color / pill icon to the left. Implemented
 *            in DrugSearchField.jsx's linked read-only display.
 *        DrugPickerModal mode="formulation" and mode="brand-scoped" call
 *        sites tied to *identity* entry are removed along with their now-dead
 *        trigger buttons/state (handleFormulationPick / handleScopedBrandPick
 *        and their modals). The "Add alternative" buttons at the bottom of
 *        the main row (which add a brand-new alternative line) are a
 *        separate, Phase 2-scoped concern and are left untouched here.
 *        KNOWN GAP (flagged, not solved here): mode="brand" search cannot
 *        find a formulation that has zero brands yet (pure generic, no
 *        brand row). The old "Pick a formulation…" button could. No locked
 *        decision covers this; flagging for the project owner.
 *
 * Props:
 *   row        — DrugRow shape (see prescriptionRowSchema.js DRUG_ROW_TEMPLATE)
 *   onChange   — (nextRow: DrugRow) => void
 *
 * Data notes:
 *   - _formulationMeta is a transient UI-only field (name_en, concentration,
 *     form, route) mirrored from the library pick so the editor can display it.
 *     PrescriptionSheetEditor strips underscore-prefixed keys before persisting,
 *     just as it did for DrugLibraryRowEditor.
 *   - All autocomplete queries go directly to Supabase (same pattern as
 *     DrugPickerModal) — the useDrugs cache is app-facing, not CMS-facing.
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { Link, Unlink, Plus, X, ChevronDown, Library } from 'lucide-react'
import DrugPickerModal from '../../DrugPickerModal'
import DrugSearchField from '../../DrugSearchField'
import { supabase } from '../../../../lib/supabase'
import { DRUG_FORMS, DRUG_ROUTES } from '../../../../config/forms'
import { DRUG_CATEGORIES } from '../../../../config/categories'
import {
  findGenericByName,
  findFormulationMatch,
  findBrandMatch,
  insertGeneric,
  insertFormulation,
  insertBrand,
} from '../../../../lib/adminQueries'
import {
  DRUG_ROW_TEMPLATE,
  ALTERNATIVE_DRUG_TEMPLATE,
  alternativeSharesParentDose,
  SOURCE_FLAG_VALUE,
  doseWhoLabel,
  formatDoseRowText,
} from '../../../../constants/prescriptionRowSchema'

// ─── Style helpers ─────────────────────────────────────────────────────────────

function textInput(extraStyle = {}) {
  return {
    width: '100%', boxSizing: 'border-box',
    padding: '7px 10px',
    border: '1.5px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    fontSize: 13, fontFamily: 'var(--font-body)',
    backgroundColor: 'var(--color-surface)',
    color: 'var(--color-text-primary)',
    outline: 'none',
    ...extraStyle,
  }
}

function FieldLabel({ children, hint }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 4 }}>
      <span style={{
        fontSize: 11, fontWeight: 700,
        color: 'var(--color-text-secondary)',
        textTransform: 'uppercase', letterSpacing: '0.05em',
      }}>
        {children}
      </span>
      {hint && (
        <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>{hint}</span>
      )}
    </div>
  )
}

// ─── Read-only display line (Phase 2) ──────────────────────────────────────────
// Used in place of an editable input once a row/alternative is linked to a
// formulation — brand/concentration/form, generic, and route/category render
// as static text instead of text boxes. To change a linked row's identity,
// the author re-opens a picker; there is no text box to type over.

function labelFor(list, value) {
  if (!value) return null
  return list.find(o => o.value === value)?.label ?? value
}

function ReadOnlyField({ children, hint, label }) {
  return (
    <div>
      <FieldLabel hint={hint}>{label}</FieldLabel>
      <div style={{
        ...textInput(),
        backgroundColor: 'var(--color-bg)',
        color: children ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
        cursor: 'default',
        display: 'flex', alignItems: 'center',
        minHeight: 32, boxSizing: 'border-box',
      }}>
        {children || '—'}
      </div>
    </div>
  )
}

// ─── "Not in library" tag (§2.4b) ─────────────────────────────────────────────

function NotInLibraryTag() {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '1px 7px',
      borderRadius: 99,
      fontSize: 10, fontWeight: 700, letterSpacing: '0.04em',
      textTransform: 'uppercase',
      background: '#f59e0b18',
      color: '#b45309',
      border: '1px solid #f59e0b40',
      flexShrink: 0,
      alignSelf: 'flex-start', // BUG FIX (2026-06-23): without this, a
      // column flex parent (the main row's outer container) stretches
      // this span to the parent's full width — only the text/padding
      // looked tag-sized, the element box itself spanned edge-to-edge.
    }}>
      Not in library
    </span>
  )
}

// ─── Dose age-group chooser (Phase 3, 2026-06-20) ─────────────────────────────
// Shown as a small inline step after a brand/formulation pick, only when the
// picked formulation has more than one doses_structured row. Lets the admin
// choose which age-group dose to prefill `dose`/`dose_who` from, instead of
// guessing (e.g. always "adult"). Skipped entirely (resolved immediately) by
// the caller when there are 0 or 1 rows — see resolveDosePick() below.

function DoseWhoChooser({ doseRows, onChoose, onSkip }) {
  return (
    <div style={{
      border: '1.5px solid var(--color-accent)',
      borderRadius: 'var(--radius-md)',
      padding: '10px 12px',
      backgroundColor: '#EFF6FF',
      display: 'flex', flexDirection: 'column', gap: 8,
    }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-primary)' }}>
        Which dose should pre-fill this row?
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {doseRows.map((doseRow, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onChoose(doseRow)}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
              padding: '7px 10px', textAlign: 'left',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-surface)', cursor: 'pointer',
              fontFamily: 'var(--font-body)',
            }}
          >
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-accent)' }}>
              {doseWhoLabel(doseRow.who ?? doseRow.group) || 'Dose'}
            </span>
            <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
              {formatDoseRowText(doseRow)}
            </span>
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={onSkip}
        style={{
          alignSelf: 'flex-start',
          background: 'none', border: 'none', padding: 0,
          fontSize: 11, color: 'var(--color-text-tertiary)',
          textDecoration: 'underline', cursor: 'pointer',
          fontFamily: 'var(--font-body)',
        }}
      >
        Skip — leave dose blank
      </button>
    </div>
  )
}

/**
 * Given a picked formulation/brand's doses_structured array, decides whether
 * a dose can be resolved immediately (0 or 1 rows) or needs the admin to
 * choose (2+ rows). Returns either:
 *   { needsChoice: false, dose, dose_who }   — finalize the pick immediately
 *   { needsChoice: true, doseRows }          — caller should show DoseWhoChooser
 */
function resolveDosePick(dosesStructured) {
  const rows = Array.isArray(dosesStructured) ? dosesStructured : []
  if (rows.length === 0) {
    return { needsChoice: false, dose: null, dose_who: null }
  }
  if (rows.length === 1) {
    const only = rows[0]
    return { needsChoice: false, dose: formatDoseRowText(only), dose_who: only.who ?? only.group ?? null }
  }
  return { needsChoice: true, doseRows: rows }
}

// ─── Autocomplete input ────────────────────────────────────────────────────────
// Generic reusable inline autocomplete — not a modal, drops below the field.

function AutocompleteInput({
  value,
  onChange,
  onSelect,
  placeholder,
  fetchSuggestions,
  renderSuggestion,
  dir = 'auto',
  extraStyle = {},
}) {
  const [open, setOpen]               = useState(false)
  const [suggestions, setSuggestions] = useState([])
  const [loading, setLoading]         = useState(false)
  const timerRef     = useRef(null)
  const containerRef = useRef(null)

  useEffect(() => {
    clearTimeout(timerRef.current)
    if (!value || value.trim().length < 1) {
      setSuggestions([])
      setOpen(false)
      return
    }
    setLoading(true)
    timerRef.current = setTimeout(async () => {
      const results = await fetchSuggestions(value.trim())
      setSuggestions(results)
      setOpen(results.length > 0)
      setLoading(false)
    }, 220)
    return () => clearTimeout(timerRef.current)
  }, [value]) // eslint-disable-line react-hooks/exhaustive-deps

  // Close on outside click
  useEffect(() => {
    function handleClick(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function handleSelect(item) {
    onSelect(item)
    setOpen(false)
    setSuggestions([])
  }

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <input
        type="text"
        value={value ?? ''}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        dir={dir}
        style={textInput(extraStyle)}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
      />
      {loading && (
        <span style={{
          position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
          fontSize: 10, color: 'var(--color-text-tertiary)',
        }}>
          …
        </span>
      )}
      {open && suggestions.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 999,
          background: 'var(--color-surface)',
          border: '1.5px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          maxHeight: 220,
          overflowY: 'auto',
          marginTop: 2,
        }}>
          {suggestions.map((item, i) => (
            <button
              key={i}
              type="button"
              onMouseDown={e => { e.preventDefault(); handleSelect(item) }}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                padding: '8px 12px',
                background: 'transparent',
                border: 'none', borderBottom: '1px solid var(--color-border)',
                cursor: 'pointer', fontFamily: 'var(--font-body)',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--color-bg)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              {renderSuggestion(item)}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Autocomplete query functions ──────────────────────────────────────────────

async function fetchGenericSuggestions(query) {
  const { data } = await supabase
    .from('generics')
    .select('id, name_en, name_ar')
    .ilike('name_en', `%${query}%`)
    .limit(10)
  return data ?? []
}

// ─── Alternative row (nested, indented) ───────────────────────────────────────

function AlternativeRow({ alt, parentRow, onRemove, onChange }) {
  const sharesParentDose = alternativeSharesParentDose(parentRow, alt)
  // PHASE 1 (2026-06-22): brandPickerOpen/formulationPickerOpen/
  // scopedBrandPickerOpen and their trigger buttons + modals are removed —
  // identity entry now goes through the single DrugSearchField below
  // (Decision 1). handleBrandPick is kept and reused as DrugSearchField's
  // onLink; handleFormulationPick/handleScopedBrandPick are removed as
  // dead code along with the modals that called them.

  // BUG FIX (2026-06-23): same collapsed-note treatment as the main row —
  // see UnifiedDrugRowEditor's noteOpen for the full rationale.
  const [noteOpen, setNoteOpen] = useState(!!alt.note)

  // Phase 6 (2026-06-21): "Save to library" parity with the main row.
  // Mirrors UnifiedDrugRowEditor's own promote state below, but scoped to
  // this alternative — promoting an alternative never touches the parent
  // row or any other alternative.
  const [promoteOn, setPromoteOn]             = useState(false)
  const [promoteCategory, setPromoteCategory] = useState('')
  const [promoteRoute, setPromoteRoute]       = useState('')
  const [promoting, setPromoting]             = useState(false)
  const [promoteError, setPromoteError]       = useState(null)

  // Phase 3 (2026-06-20): holds the age-group choice step when a freshly
  // picked formulation has more than one doses_structured row. Null when
  // there's nothing to choose (chooser not shown).
  const [pendingDoseChoice, setPendingDoseChoice] = useState(null)

  function patch(updates) {
    onChange({ ...alt, ...updates })
  }

  // ── Promote to library (Phase 6) ───────────────────────────────────────
  // Same reuse-or-create logic as the main row's handlePromote — generic →
  // formulation → brand — just reading/writing this alternative's own
  // fields via patch() instead of the parent row's.
  async function handlePromote() {
    setPromoteError(null)

    const genericName   = alt.generic_name?.trim()
    const concentration  = alt.concentration?.trim()

    if (!genericName) {
      setPromoteError('Generic name is required to save to the library (brand name alone isn\u2019t enough to file this under a molecule).')
      return
    }
    if (!concentration || !alt.form) {
      setPromoteError('Concentration and form are required to save to the library.')
      return
    }
    if (!promoteCategory || !promoteRoute) {
      setPromoteError('Category and route are required to save to the library.')
      return
    }

    setPromoting(true)
    let genericId     = alt.generic_id ?? null
    let formulationId = null
    let brandId       = null

    try {
      // 1. Generic — reuse if it matches, else create
      if (!genericId) {
        const { data: existingGeneric, error: findGErr } = await findGenericByName(genericName)
        if (findGErr) throw new Error(`Checking for an existing generic: ${findGErr.message}`)
        if (existingGeneric) {
          genericId = existingGeneric.id
        } else {
          const slugBase = genericName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
          const { data: newGeneric, error: gErr } = await insertGeneric({
            slug: slugBase || `generic-${Date.now()}`,
            name_en: genericName,
            name_ar: alt.brand_name?.trim() ? '' : (alt.name_ar?.trim() || ''),
            category: promoteCategory,
            class: null,
          })
          if (gErr) throw new Error(`Creating generic "${genericName}": ${gErr.message}`)
          genericId = newGeneric.id
        }
      }

      // 2. Formulation — reuse if this concentration/form combo already
      //    exists under this generic, else create
      const { data: existingFormulation, error: findFErr } = await findFormulationMatch(genericId, concentration, alt.form)
      if (findFErr) throw new Error(`Checking for an existing formulation: ${findFErr.message}`)
      if (existingFormulation) {
        formulationId = existingFormulation.id
      } else {
        const formulationSlugBase = `${genericName}-${concentration}-${alt.form}`
          .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
        // Seed doses_structured from whatever dose is already typed on this
        // row, but only here — this is the one moment the formulation is
        // being created for the first time, so there's no existing library
        // dose to protect. Once linked, editing `dose` never writes back
        // (see prescriptionRowSchema.js DRUG_ROW_TEMPLATE `dose` doc).
        const initialDose = alt.dose?.trim()
        const { data: newFormulation, error: fErr } = await insertFormulation({
          generic_id: genericId,
          slug: formulationSlugBase || `formulation-${Date.now()}`,
          concentration,
          form: alt.form,
          route: promoteRoute,
          doses_structured: initialDose
            ? [{ who: alt.dose_who ?? null, instruction: initialDose, max_dose: null }]
            : [],
        })
        if (fErr) throw new Error(`Creating formulation: ${fErr.message}`)
        formulationId = newFormulation.id
      }

      // 3. Brand — only if a brand name was typed; reuse if it already
      //    exists under this formulation, else create
      const brandName = alt.brand_name?.trim()
      if (brandName) {
        const { data: existingBrand, error: findBErr } = await findBrandMatch(formulationId, brandName)
        if (findBErr) throw new Error(`Checking for an existing brand: ${findBErr.message}`)
        if (existingBrand) {
          brandId = existingBrand.id
        } else {
          const { data: newBrand, error: bErr } = await insertBrand({
            formulation_id: formulationId,
            name: brandName,
            name_ar: alt.name_ar?.trim() || '',
            manufacturer: null,
            source: SOURCE_FLAG_VALUE,
            is_published: true,
            is_available: true,
          })
          if (bErr) throw new Error(`Creating brand "${brandName}": ${bErr.message}`)
          brandId = newBrand.id
        }
      }

      // 4. Link this alternative to the real library ids
      patch({
        generic_id:     genericId,
        formulation_id: formulationId,
        brand_id:       brandId,
        source_flag:    SOURCE_FLAG_VALUE,
      })
      setPromoteOn(false)
      setPromoteCategory('')
      setPromoteRoute('')
    } catch (err) {
      setPromoteError(err.message ?? 'Promotion failed. Please try again.')
    } finally {
      setPromoting(false)
    }
  }

  function finalizeDoseChoice(doseRow) {
    patch({ dose: formatDoseRowText(doseRow), dose_who: doseRow.who ?? doseRow.group ?? null })
    setPendingDoseChoice(null)
  }

  function skipDoseChoice() {
    patch({ dose: null, dose_who: null })
    setPendingDoseChoice(null)
  }

  // When a brand is picked for this alternative (brand mode). Reused
  // unchanged as DrugSearchField's onLink (PHASE 1, Decision 1, step 1.2) —
  // the auto-fill behavior this function implements does not change, only
  // how it gets triggered.
  function handleBrandPick(brand) {
    const f       = brand.formulations
    const generic = f?.generics
    const baseFields = {
      brand_name:      brand.name,
      brand_id:        brand.id,
      generic_name:    generic?.name_en ?? alt.generic_name,
      generic_id:      generic?.id      ?? alt.generic_id,
      name_ar:         brand.name_ar ?? generic?.name_ar ?? null,
      formulation_id:  f?.id             ?? null,
      concentration:   f?.concentration  ?? null,
      form:            f?.form           ?? null,
      route:           f?.route          ?? null,
      category:        generic?.category ?? null,
      _formulationMeta: f ? {
        name_en:       generic?.name_en ?? '',
        concentration: f.concentration ?? '',
        form:          f.form ?? '',
        route:         f.route ?? '',
      } : alt._formulationMeta,
    }
    if (sharesParentDose) {
      // Same formulation as the parent — dose is shared/hidden, not re-resolved.
      patch(baseFields)
      return
    }
    const resolved = resolveDosePick(f?.doses_structured)
    if (resolved.needsChoice) {
      patch(baseFields)
      setPendingDoseChoice({ doseRows: resolved.doseRows })
    } else {
      patch({ ...baseFields, dose: resolved.dose, dose_who: resolved.dose_who })
    }
  }

  // PHASE 1 (2026-06-22): explicit unlink — clears only the library-snapshot
  // fields (ids + concentration/form/route/category/_formulationMeta), same
  // convention as the main row's onUnlink below. brand_name/generic_name/
  // name_ar are left as-is so the admin sees their previous text as a
  // starting point if they back out of the "change" action without typing
  // anything new.
  function handleUnlink() {
    patch({
      brand_id: null,
      generic_id: null,
      formulation_id: null,
      concentration: null,
      form: null,
      route: null,
      category: null,
      _formulationMeta: undefined,
    })
  }

  // PHASE 1 (2026-06-22): free-text typing writes to brand_name, matching
  // the pre-existing convention that brand_name is the primary display
  // field for an unlinked row (generic_name is left untouched — typically
  // null for a freshly free-typed alternative). Flagged as a Phase 1
  // implementation choice, not an explicit locked decision in the plan doc.
  function handleChangeText(text) {
    patch({ brand_name: text || null, brand_id: null })
  }

  const isLinked = !!(alt.brand_id || alt.generic_id)
  // Phase 2: field read-only/editable lock is keyed specifically off formulation_id
  // (not brand_id/generic_id alone), per the locked decision in prescriptionRowSchema.js.
  const isFormulationLinked = !!alt.formulation_id
  const displayName = alt.brand_name || alt.generic_name || ''

  return (
    <div style={{
      marginLeft: 18,
      paddingLeft: 14,
      borderLeft: '2px solid var(--color-border)',
      display: 'flex', flexDirection: 'column', gap: 8,
      paddingTop: 8, paddingBottom: 4,
    }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <span style={{
          fontSize: 10, fontWeight: 700, letterSpacing: '0.05em',
          textTransform: 'uppercase', color: 'var(--color-text-tertiary)',
        }}>
          Or
        </span>
        {!isLinked && <NotInLibraryTag />}
        <button
          type="button"
          onClick={onRemove}
          title="Remove alternative"
          style={{
            marginLeft: 'auto',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 22, height: 22, flexShrink: 0,
            border: '1px solid var(--color-border)',
            borderRadius: 4, background: 'transparent',
            color: '#ef4444', cursor: 'pointer', padding: 0,
          }}
        >
          <X size={11} />
        </button>
      </div>

      {/* PHASE 1 (2026-06-22): single search field replaces the old
          Brand Name / Generic Name / Concentration / Form fields, the
          read-only triple ReadOnlyField block, and the three picker
          buttons (Decision 1). */}
      <DrugSearchField
        value={displayName}
        isLinked={isLinked}
        concentration={alt.concentration}
        form={alt.form}
        nameAr={alt.name_ar}
        genericName={alt.generic_name}
        mode="brand"
        onChangeText={handleChangeText}
        onLink={handleBrandPick}
        onUnlink={handleUnlink}
        placeholder="Search or type a drug name…"
      />

      {/* ── Manual drug fields — shown only when not linked to library ── */}
      {!isLinked && (
        <>
          <div>
            <FieldLabel>Generic name</FieldLabel>
            <input
              type="text"
              value={alt.generic_name ?? ''}
              onChange={e => patch({ generic_name: e.target.value || null })}
              placeholder="Generic name (e.g. Amoxicillin)"
              style={textInput()}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <FieldLabel>Concentration</FieldLabel>
              <input
                type="text"
                value={alt.concentration ?? ''}
                onChange={e => patch({ concentration: e.target.value || null })}
                placeholder="e.g. 500mg"
                style={textInput()}
              />
            </div>
            <div>
              <FieldLabel>Form</FieldLabel>
              <select
                value={alt.form ?? ''}
                onChange={e => patch({ form: e.target.value || null })}
                style={{ ...textInput(), appearance: 'none', cursor: 'pointer' }}
              >
                <option value="">— select form —</option>
                {DRUG_FORMS.map(f => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Arabic name — manual entry only for free-text/unlinked rows.
              Once linked, this comes from the library and is shown
              read-only inside DrugSearchField's summary line above
              instead of as a separate editable field (BUG FIX 2026-06-23). */}
          <div>
            <FieldLabel hint="optional">Arabic name</FieldLabel>
            <input
              type="text"
              value={alt.name_ar ?? ''}
              onChange={e => patch({ name_ar: e.target.value || null })}
              placeholder="الاسم بالعربي"
              dir="rtl"
              style={textInput({ textAlign: 'right' })}
            />
          </div>
        </>
      )}

      {/* ── Save to library (Phase 6) — free-text mode only, parity with the main row ── */}
      {!isLinked && (
        <div style={{
          border: '1.5px dashed var(--color-border)',
          borderRadius: 'var(--radius-md)',
          padding: 10,
          display: 'flex', flexDirection: 'column', gap: 10,
        }}>
          <button
            type="button"
            onClick={() => setPromoteOn(v => !v)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '5px 10px', borderRadius: 'var(--radius-md)',
              border: `1.5px solid ${promoteOn ? 'var(--color-accent)' : 'var(--color-border)'}`,
              backgroundColor: promoteOn ? '#EFF6FF' : 'transparent',
              color: promoteOn ? 'var(--color-accent)' : 'var(--color-text-secondary)',
              fontSize: 12, fontWeight: 600, cursor: 'pointer',
              fontFamily: 'var(--font-body)', alignSelf: 'flex-start',
            }}
          >
            <Library size={13} />
            {promoteOn ? 'Save to library: ON' : 'Save to library'}
          </button>

          {promoteOn && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <FieldLabel>Category</FieldLabel>
                  <select
                    value={promoteCategory}
                    onChange={e => setPromoteCategory(e.target.value)}
                    style={{ ...textInput(), appearance: 'none', cursor: 'pointer' }}
                  >
                    <option value="">— select —</option>
                    {DRUG_CATEGORIES.map(c => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <FieldLabel>Route</FieldLabel>
                  <select
                    value={promoteRoute}
                    onChange={e => setPromoteRoute(e.target.value)}
                    style={{ ...textInput(), appearance: 'none', cursor: 'pointer' }}
                  >
                    <option value="">— select —</option>
                    {DRUG_ROUTES.map(r => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {promoteError && (
                <div style={{
                  fontSize: 11, color: 'var(--color-error, #ef4444)',
                  padding: '4px 8px',
                  background: '#ef444410',
                  border: '1px solid #ef444430',
                  borderRadius: 'var(--radius-md)',
                }}>
                  {promoteError}
                </div>
              )}

              <button
                type="button"
                onClick={handlePromote}
                disabled={promoting}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '6px 12px', borderRadius: 'var(--radius-md)',
                  border: 'none', alignSelf: 'flex-start',
                  backgroundColor: promoting ? 'var(--color-border)' : 'var(--color-accent)',
                  color: promoting ? 'var(--color-text-tertiary)' : '#fff',
                  fontSize: 12, fontWeight: 600,
                  cursor: promoting ? 'not-allowed' : 'pointer',
                  fontFamily: 'var(--font-body)',
                }}
              >
                {promoting ? 'Saving…' : 'Promote now'}
              </button>
            </>
          )}
        </div>
      )}


      {/* Dose + Note — shared/inherited, or independent */}
      {sharesParentDose ? (
        <div style={{
          fontSize: 11, fontStyle: 'italic',
          color: 'var(--color-text-tertiary)',
          padding: '6px 2px',
        }}>
          Dose &amp; note are shared with the main drug (same formulation) — edit them on the row above.
        </div>
      ) : pendingDoseChoice ? (
        <DoseWhoChooser
          doseRows={pendingDoseChoice.doseRows}
          onChoose={finalizeDoseChoice}
          onSkip={skipDoseChoice}
        />
      ) : (
        <>
          <div>
            <FieldLabel hint={alt.dose_who ? doseWhoLabel(alt.dose_who) : undefined}>
              Dose / instructions
            </FieldLabel>
            <input
              type="text"
              value={alt.dose ?? ''}
              onChange={e => patch({ dose: e.target.value || null })}
              placeholder="e.g. 10mg/kg every 8h"
              dir="auto"
              style={textInput()}
            />
          </div>
          {/* BUG FIX (2026-06-23): same collapsed-note treatment as the
              main row's Drug note field. */}
          {noteOpen ? (
            <div>
              <FieldLabel hint="auto-detects English/Arabic">Note</FieldLabel>
              <input
                type="text"
                value={alt.note ?? ''}
                onChange={e => patch({ note: e.target.value || null })}
                placeholder="Optional note for this alternative"
                dir="auto"
                autoFocus
                style={textInput()}
              />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setNoteOpen(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '5px 10px', borderRadius: 'var(--radius-md)',
                border: '1.5px dashed var(--color-border)',
                backgroundColor: 'transparent',
                color: 'var(--color-text-secondary)',
                fontSize: 12, fontWeight: 600, cursor: 'pointer',
                fontFamily: 'var(--font-body)', alignSelf: 'flex-start',
              }}
            >
              <Plus size={13} />
              Add a drug note
            </button>
          )}
        </>
      )}
    </div>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function UnifiedDrugRowEditor({ row, onChange }) {
  // BUG FIX (2026-06-23): note field starts collapsed behind an "Add a drug
  // note" button instead of always showing an open (usually empty) input —
  // matches the locked note-field-expand decision in the redesign plan doc
  // (stays expanded once opened, no auto-collapse). Defaults open if this
  // row already has a note, so existing notes aren't hidden on load.
  const [noteOpen, setNoteOpen] = useState(!!row.note)

  // BUG FIX (2026-06-23): brand_name (via the search bar) is now the
  // default path to reveal the rest of the manual fields on a fresh,
  // unlinked row — see showManualFields below. genericOnlyMode is the
  // explicit fallback for the rarer case of entering a drug with no
  // brand at all; defaults on if the row already has a generic name
  // with no brand, so existing generic-only rows aren't hidden on load.
  const [genericOnlyMode, setGenericOnlyMode] = useState(
    !!row.generic_name?.trim() && !row.brand_name?.trim()
  )

  const [altBrandPickerOpen, setAltBrandPickerOpen]         = useState(false)
  const [altFormulationPickerOpen, setAltFormulationPickerOpen] = useState(false)
  // Phase 3 (2026-06-20): scoped "add alternative" entry point — same
  // formulation, different brand. Only ever offered when row.formulation_id
  // is already set (see render below). Unrelated to Phase 1 (this opens a
  // picker that adds a brand-new alternative line; it does not edit an
  // existing line's identity), so left untouched here.
  const [altScopedBrandPickerOpen, setAltScopedBrandPickerOpen] = useState(false)

  // Phase 3 (2026-06-20): age-group dose chooser state.
  // mainDoseChoice holds { baseFields, doseRows } while the main row's dose
  // age-group is being chosen after a brand/formulation pick.
  // pendingAlt holds the new alternative's fields (minus dose) plus
  // doseRows while its age-group is being chosen — the alternative is only
  // appended to row.alternatives once the dose is resolved or skipped.
  const [mainDoseChoice, setMainDoseChoice] = useState(null)
  const [pendingAlt, setPendingAlt]         = useState(null)

  // ── Save-to-library promote flow (Phase 2, masterplan §2.5) ───────────────
  const [promoteOn, setPromoteOn]             = useState(false)
  const [promoteCategory, setPromoteCategory] = useState('')
  const [promoteRoute, setPromoteRoute]       = useState('')
  const [promoting, setPromoting]             = useState(false)
  const [promoteError, setPromoteError]       = useState(null)

  function patch(updates) {
    onChange({ ...row, ...updates })
  }

  // ── Brand picker select (brand mode — brand-first fill) ───────────────────
  // PHASE 1 (2026-06-22): reused unchanged as DrugSearchField's onLink for
  // the main row's identity field (Decision 1, step 1.2) — auto-fill
  // behavior is identical to before, only the trigger changed (was a
  // "Pick a brand…" button opening DrugPickerModal; now the search field's
  // own dropdown result).
  function handleBrandPick(brand) {
    const f       = brand.formulations
    const generic = f?.generics
    const baseFields = {
      brand_name:      brand.name,
      brand_id:        brand.id,
      generic_name:    generic?.name_en   ?? row.generic_name,
      generic_id:      generic?.id        ?? row.generic_id,
      name_ar:         brand.name_ar ?? generic?.name_ar ?? null,
      formulation_id:  f?.id              ?? null,
      concentration:   f?.concentration   ?? null,
      form:            f?.form            ?? null,
      route:           f?.route           ?? null,
      category:        generic?.category  ?? null,
      _formulationMeta: f ? {
        name_en:       generic?.name_en ?? '',
        concentration: f.concentration ?? '',
        form:          f.form ?? '',
        route:         f.route ?? '',
      } : row._formulationMeta,
    }
    const resolved = resolveDosePick(f?.doses_structured)
    if (resolved.needsChoice) {
      patch(baseFields)
      setMainDoseChoice({ doseRows: resolved.doseRows })
    } else {
      patch({ ...baseFields, dose: resolved.dose, dose_who: resolved.dose_who })
    }
  }

  function finalizeMainDoseChoice(doseRow) {
    patch({ dose: formatDoseRowText(doseRow), dose_who: doseRow.who ?? doseRow.group ?? null })
    setMainDoseChoice(null)
  }

  function skipMainDoseChoice() {
    patch({ dose: null, dose_who: null })
    setMainDoseChoice(null)
  }

  // PHASE 1 (2026-06-22): explicit unlink for the main row — same
  // convention as AlternativeRow.handleUnlink above: clear only the
  // library-snapshot fields, leave brand_name/generic_name/name_ar as-is.
  function handleUnlink() {
    patch({
      brand_id: null,
      generic_id: null,
      formulation_id: null,
      concentration: null,
      form: null,
      route: null,
      category: null,
      _formulationMeta: undefined,
    })
  }

  // PHASE 1 (2026-06-22): free-text typing writes to brand_name — see the
  // same note on AlternativeRow.handleChangeText above re: this being a
  // Phase 1 implementation choice, not an explicitly locked decision.
  function handleChangeText(text) {
    patch({ brand_name: text || null, brand_id: null })
  }

  // ── Promote to library (§2.5) ────────────────────────────────────────
  async function handlePromote() {
    setPromoteError(null)

    const genericName  = row.generic_name?.trim()
    const concentration = row.concentration?.trim()

    if (!genericName) {
      setPromoteError('Generic name is required to save to the library (brand name alone isn\u2019t enough to file this under a molecule).')
      return
    }
    if (!concentration || !row.form) {
      setPromoteError('Concentration and form are required to save to the library.')
      return
    }
    if (!promoteCategory || !promoteRoute) {
      setPromoteError('Category and route are required to save to the library.')
      return
    }

    setPromoting(true)
    let genericId     = row.generic_id ?? null
    let formulationId = null
    let brandId       = null

    try {
      // 1. Generic — reuse if it matches, else create
      if (!genericId) {
        const { data: existingGeneric, error: findGErr } = await findGenericByName(genericName)
        if (findGErr) throw new Error(`Checking for an existing generic: ${findGErr.message}`)
        if (existingGeneric) {
          genericId = existingGeneric.id
        } else {
          const slugBase = genericName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
          const { data: newGeneric, error: gErr } = await insertGeneric({
            slug: slugBase || `generic-${Date.now()}`,
            name_en: genericName,
            name_ar: row.brand_name?.trim() ? '' : (row.name_ar?.trim() || ''),
            category: promoteCategory,
            class: null,
          })
          if (gErr) throw new Error(`Creating generic "${genericName}": ${gErr.message}`)
          genericId = newGeneric.id
        }
      }

      // 2. Formulation — reuse if this concentration/form combo already
      //    exists under this generic, else create
      const { data: existingFormulation, error: findFErr } = await findFormulationMatch(genericId, concentration, row.form)
      if (findFErr) throw new Error(`Checking for an existing formulation: ${findFErr.message}`)
      if (existingFormulation) {
        formulationId = existingFormulation.id
      } else {
        const formulationSlugBase = `${genericName}-${concentration}-${row.form}`
          .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
        // Seed doses_structured from whatever dose is already typed on this
        // row, but only here — this is the one moment the formulation is
        // being created for the first time, so there's no existing library
        // dose to protect. Once linked, editing `dose` never writes back
        // (see prescriptionRowSchema.js DRUG_ROW_TEMPLATE `dose` doc).
        const initialDose = row.dose?.trim()
        const { data: newFormulation, error: fErr } = await insertFormulation({
          generic_id: genericId,
          slug: formulationSlugBase || `formulation-${Date.now()}`,
          concentration,
          form: row.form,
          route: promoteRoute,
          doses_structured: initialDose
            ? [{ who: row.dose_who ?? null, instruction: initialDose, max_dose: null }]
            : [],
        })
        if (fErr) throw new Error(`Creating formulation: ${fErr.message}`)
        formulationId = newFormulation.id
      }

      // 3. Brand — only if a brand name was typed; reuse if it already
      //    exists under this formulation, else create
      const brandName = row.brand_name?.trim()
      if (brandName) {
        const { data: existingBrand, error: findBErr } = await findBrandMatch(formulationId, brandName)
        if (findBErr) throw new Error(`Checking for an existing brand: ${findBErr.message}`)
        if (existingBrand) {
          brandId = existingBrand.id
        } else {
          const { data: newBrand, error: bErr } = await insertBrand({
            formulation_id: formulationId,
            name: brandName,
            name_ar: row.name_ar?.trim() || '',
            manufacturer: null,
            source: SOURCE_FLAG_VALUE,
            is_published: true,
            is_available: true,
          })
          if (bErr) throw new Error(`Creating brand "${brandName}": ${bErr.message}`)
          brandId = newBrand.id
        }
      }

      // 4. Link the row to the real library ids
      patch({
        generic_id:     genericId,
        formulation_id: formulationId,
        brand_id:       brandId,
        source_flag:    SOURCE_FLAG_VALUE,
      })
      setPromoteOn(false)
      setPromoteCategory('')
      setPromoteRoute('')
    } catch (err) {
      setPromoteError(err.message ?? 'Promotion failed. Please try again.')
    } finally {
      setPromoting(false)
    }
  }

  // ── Alternatives ─────────────────────────────────────────────────────────

  function handleAltBrandPick(brand) {
    const f       = brand.formulations
    const generic = f?.generics
    const baseAlt = {
      ...ALTERNATIVE_DRUG_TEMPLATE,
      brand_name:      brand.name,
      brand_id:        brand.id,
      generic_name:    generic?.name_en  ?? null,
      generic_id:      generic?.id       ?? null,
      name_ar:         brand.name_ar ?? generic?.name_ar ?? null,
      formulation_id:  f?.id             ?? null,
      concentration:   f?.concentration  ?? null,
      form:            f?.form           ?? null,
      route:           f?.route          ?? null,
      category:        generic?.category ?? null,
      _formulationMeta: f ? {
        name_en:       generic?.name_en ?? '',
        concentration: f.concentration ?? '',
        form:          f.form ?? '',
        route:         f.route ?? '',
      } : undefined,
    }
    const resolved = resolveDosePick(f?.doses_structured)
    if (resolved.needsChoice) {
      setPendingAlt({ baseAlt, doseRows: resolved.doseRows })
    } else {
      const newAlt = { ...baseAlt, dose: resolved.dose, dose_who: resolved.dose_who }
      patch({ alternatives: [...(row.alternatives ?? []), newAlt] })
    }
  }

  function handleAltFormulationPick(formulation) {
    const generic = formulation.generics
    const baseAlt = {
      ...ALTERNATIVE_DRUG_TEMPLATE,
      generic_name:    generic?.name_en   ?? null,
      generic_id:      generic?.id        ?? null,
      name_ar:         generic?.name_ar   ?? null,
      formulation_id:  formulation.id,
      concentration:   formulation.concentration ?? null,
      form:            formulation.form ?? null,
      route:           formulation.route ?? null,
      category:        generic?.category ?? null,
      _formulationMeta: {
        name_en:       generic?.name_en ?? '',
        concentration: formulation.concentration ?? '',
        form:          formulation.form ?? '',
        route:         formulation.route ?? '',
      },
    }
    const resolved = resolveDosePick(formulation.doses_structured)
    if (resolved.needsChoice) {
      setPendingAlt({ baseAlt, doseRows: resolved.doseRows })
    } else {
      const newAlt = { ...baseAlt, dose: resolved.dose, dose_who: resolved.dose_who }
      patch({ alternatives: [...(row.alternatives ?? []), newAlt] })
    }
  }

  // Add a "same formulation, different brand" alternative (Phase 3,
  // 2026-06-20) — picker is pre-scoped to row.formulation_id, so the new
  // alternative's formulation_id is always force-set to match the main
  // row's, never independently typed. Always shares the parent's dose/note
  // by construction (alternativeSharesParentDose is keyed on formulation_id
  // equality) — no dose-choice step needed here.
  function handleAltScopedBrandPick(brand) {
    const newAlt = {
      ...ALTERNATIVE_DRUG_TEMPLATE,
      brand_name:      brand.name,
      brand_id:        brand.id,
      generic_name:    row.generic_name,
      generic_id:      row.generic_id,
      name_ar:         brand.name_ar ?? row.name_ar ?? null,
      formulation_id:  row.formulation_id,
      concentration:   row.concentration,
      form:            row.form,
      route:           row.route,
      category:        row.category,
      _formulationMeta: row._formulationMeta,
    }
    patch({ alternatives: [...(row.alternatives ?? []), newAlt] })
  }

  function finalizePendingAltDose(doseRow) {
    const newAlt = {
      ...pendingAlt.baseAlt,
      dose: formatDoseRowText(doseRow),
      dose_who: doseRow.who ?? doseRow.group ?? null,
    }
    patch({ alternatives: [...(row.alternatives ?? []), newAlt] })
    setPendingAlt(null)
  }

  function skipPendingAltDose() {
    const newAlt = { ...pendingAlt.baseAlt, dose: null, dose_who: null }
    patch({ alternatives: [...(row.alternatives ?? []), newAlt] })
    setPendingAlt(null)
  }

  function addFreeTextAlt() {
    patch({
      alternatives: [
        ...(row.alternatives ?? []),
        { ...ALTERNATIVE_DRUG_TEMPLATE },
      ],
    })
  }

  function removeAlt(idx) {
    patch({ alternatives: (row.alternatives ?? []).filter((_, i) => i !== idx) })
  }

  function updateAlt(idx, nextAlt) {
    const next = (row.alternatives ?? []).map((a, i) => i === idx ? nextAlt : a)
    patch({ alternatives: next })
  }

  // ── Derived state ────────────────────────────────────────────────────────

  const isLinked = !!(row.brand_id || row.generic_id || row.formulation_id)
  // Phase 2: field read-only/editable lock is keyed specifically off formulation_id
  // (not brand_id/generic_id alone), per the locked decision in prescriptionRowSchema.js.
  const isFormulationLinked = !!row.formulation_id
  const showLink = row.drug_link_enabled ?? true
  const hasAlt   = (row.alternatives ?? []).length > 0

  // Validation: at least one of brand_name / generic_name must be non-empty
  // BUG FIX (2026-06-23): a fresh, unlinked row now shows only the search
  // bar until the admin commits a brand name there (the default, most-used
  // path) or explicitly opts into genericOnlyMode via the fallback link
  // below the search bar. Replaces the old always-on field block.
  const showManualFields = !isLinked && (!!row.brand_name?.trim() || genericOnlyMode)

  // PHASE 1 (2026-06-22): single display name shown by DrugSearchField,
  // same brand-name-first convention used everywhere else in this file.
  const displayName = row.brand_name || row.generic_name || ''

  // BUG FIX (2026-06-23): drug-link toggle moved up next to DrugSearchField's
  // pencil button (passed in as extraAction below) instead of sitting on
  // its own beneath all the row's fields. Same button, same handler/state
  // (drug_link_enabled) — only its position changed.
  const drugLinkToggle = (
    <button
      type="button"
      onClick={() => patch({ drug_link_enabled: !showLink })}
      aria-label={showLink ? 'Drug link on — tap to disable' : 'Drug link off — tap to enable'}
      title={showLink ? 'Drug link: ON — name taps navigate to Drug Detail' : 'Drug link: OFF — name shown as plain text'}
      style={{
        display:         'flex',
        alignItems:      'center',
        justifyContent:  'center',
        width:           28,
        height:          28,
        borderRadius:    'var(--radius-md)',
        border:          `1.5px solid ${showLink ? 'var(--color-accent)' : 'var(--color-border)'}`,
        backgroundColor: showLink ? '#EFF6FF' : 'transparent',
        color:           showLink ? 'var(--color-accent)' : 'var(--color-text-tertiary)',
        cursor:          'pointer',
        padding:         0,
        flexShrink:      0,
      }}
    >
      {showLink ? <Link size={13} /> : <Unlink size={13} />}
    </button>
  )

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* PHASE 1 (2026-06-22): single search field replaces the old
          link-status badges, "Pick a brand…"/"Pick a formulation…"
          buttons, the Brand Name / Generic Name / Concentration / Form
          fields, and the read-only triple ReadOnlyField block (Decision 1).
          The "Linked to library" text pill is removed — DrugSearchField's
          own icon-only link glyph is now the only linked indicator, per
          the LOCKED "linked indicator" rule. */}
      {!isLinked && <NotInLibraryTag />}
      <DrugSearchField
        value={displayName}
        isLinked={isLinked}
        concentration={row.concentration}
        form={row.form}
        nameAr={row.name_ar}
        genericName={row.generic_name}
        mode="brand"
        onChangeText={handleChangeText}
        onLink={handleBrandPick}
        onUnlink={handleUnlink}
        placeholder="Search or type a drug name…"
        extraAction={drugLinkToggle}
      />

      {/* BUG FIX (2026-06-23): fallback for the less-common case of a
          generic-only row (no brand name at all). Brand name via the
          search bar above is the default, primary path; this link only
          appears before any fields have been revealed, so it doesn't
          clutter the row once the admin is already filling it in. */}
      {!isLinked && !showManualFields && (
        <button
          type="button"
          onClick={() => setGenericOnlyMode(true)}
          style={{
            alignSelf: 'flex-start',
            background: 'none', border: 'none', padding: 0,
            fontSize: 12, fontWeight: 600, cursor: 'pointer',
            color: 'var(--color-text-tertiary)', textDecoration: 'underline',
            fontFamily: 'var(--font-body)',
          }}
        >
          Or add generic only (no brand)
        </button>
      )}

      {/* ── Manual drug fields ──
          BUG FIX (2026-06-23): now gated on showManualFields instead of
          plain !isLinked, so a fresh row shows only the search bar until
          the admin commits a brand name there (or opts into
          genericOnlyMode above) — not immediately on row creation. */}
      {showManualFields && (
        <>
          <div>
            <FieldLabel>Generic name</FieldLabel>
            <input
              type="text"
              value={row.generic_name ?? ''}
              onChange={e => patch({ generic_name: e.target.value || null })}
              placeholder="Generic name (e.g. Amoxicillin)"
              style={textInput()}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <FieldLabel>Concentration</FieldLabel>
              <input
                type="text"
                value={row.concentration ?? ''}
                onChange={e => patch({ concentration: e.target.value || null })}
                placeholder="e.g. 500mg"
                style={textInput()}
              />
            </div>
            <div>
              <FieldLabel>Form</FieldLabel>
              <select
                value={row.form ?? ''}
                onChange={e => patch({ form: e.target.value || null })}
                style={{ ...textInput(), appearance: 'none', cursor: 'pointer' }}
              >
                <option value="">— select form —</option>
                {DRUG_FORMS.map(f => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Arabic name — manual entry only for free-text/unlinked rows.
              Once linked, this comes from the library and is shown
              read-only inside DrugSearchField's summary line above
              instead of as a separate editable field (BUG FIX 2026-06-23). */}
          <div>
            <FieldLabel hint="optional">Arabic name</FieldLabel>
            <input
              type="text"
              value={row.name_ar ?? ''}
              onChange={e => patch({ name_ar: e.target.value || null })}
              placeholder="الاسم بالعربي"
              dir="rtl"
              style={textInput({ textAlign: 'right' })}
            />
          </div>
        </>
      )}

      {/* ── Save to library (§2.5) — free-text mode only ──
          BUG FIX (2026-06-23): gated on showManualFields (was !isLinked)
          so this doesn't appear before the admin has actually entered any
          drug info to save — same reasoning as the manual fields above. */}
      {showManualFields && (
        <div style={{
          border: '1.5px dashed var(--color-border)',
          borderRadius: 'var(--radius-md)',
          padding: 10,
          display: 'flex', flexDirection: 'column', gap: 10,
        }}>
          <button
            type="button"
            onClick={() => setPromoteOn(v => !v)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '5px 10px', borderRadius: 'var(--radius-md)',
              border: `1.5px solid ${promoteOn ? 'var(--color-accent)' : 'var(--color-border)'}`,
              backgroundColor: promoteOn ? '#EFF6FF' : 'transparent',
              color: promoteOn ? 'var(--color-accent)' : 'var(--color-text-secondary)',
              fontSize: 12, fontWeight: 600, cursor: 'pointer',
              fontFamily: 'var(--font-body)', alignSelf: 'flex-start',
            }}
          >
            <Library size={13} />
            {promoteOn ? 'Save to library: ON' : 'Save to library'}
          </button>

          {promoteOn && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <FieldLabel>Category</FieldLabel>
                  <select
                    value={promoteCategory}
                    onChange={e => setPromoteCategory(e.target.value)}
                    style={{ ...textInput(), appearance: 'none', cursor: 'pointer' }}
                  >
                    <option value="">— select —</option>
                    {DRUG_CATEGORIES.map(c => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <FieldLabel>Route</FieldLabel>
                  <select
                    value={promoteRoute}
                    onChange={e => setPromoteRoute(e.target.value)}
                    style={{ ...textInput(), appearance: 'none', cursor: 'pointer' }}
                  >
                    <option value="">— select —</option>
                    {DRUG_ROUTES.map(r => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {promoteError && (
                <div style={{
                  fontSize: 11, color: 'var(--color-error, #ef4444)',
                  padding: '4px 8px',
                  background: '#ef444410',
                  border: '1px solid #ef444430',
                  borderRadius: 'var(--radius-md)',
                }}>
                  {promoteError}
                </div>
              )}

              <button
                type="button"
                onClick={handlePromote}
                disabled={promoting}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '6px 12px', borderRadius: 'var(--radius-md)',
                  border: 'none', alignSelf: 'flex-start',
                  backgroundColor: promoting ? 'var(--color-border)' : 'var(--color-accent)',
                  color: promoting ? 'var(--color-text-tertiary)' : '#fff',
                  fontSize: 12, fontWeight: 600,
                  cursor: promoting ? 'not-allowed' : 'pointer',
                  fontFamily: 'var(--font-body)',
                }}
              >
                {promoting ? 'Saving…' : 'Promote now'}
              </button>
            </>
          )}
        </div>
      )}

      {/* ── Dose ── */}
      {mainDoseChoice ? (
        <DoseWhoChooser
          doseRows={mainDoseChoice.doseRows}
          onChoose={finalizeMainDoseChoice}
          onSkip={skipMainDoseChoice}
        />
      ) : (
        <div>
          <FieldLabel hint={row.dose_who ? doseWhoLabel(row.dose_who) : 'pre-filled from library; edits stay on this row only'}>
            Dose / instructions
          </FieldLabel>
          <input
            type="text"
            value={row.dose ?? ''}
            onChange={e => patch({ dose: e.target.value || null })}
            placeholder="e.g. 1 tablet twice daily for 5 days"
            dir="auto"
            style={textInput()}
          />
        </div>
      )}

      {/* ── Note (BUG FIX 2026-06-23) ──
          Starts collapsed behind an "Add a drug note" button instead of
          an always-open (usually empty) input, so the row doesn't show
          an unnecessary open field when there's nothing to say. Stays
          open once opened — no auto-collapse on blur. */}
      {noteOpen ? (
        <div>
          <FieldLabel hint="auto-detects English/Arabic">Drug note</FieldLabel>
          <input
            type="text"
            value={row.note ?? ''}
            onChange={e => patch({ note: e.target.value || null })}
            placeholder="e.g. Only if cramping present"
            dir="auto"
            autoFocus
            style={textInput()}
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setNoteOpen(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '5px 10px', borderRadius: 'var(--radius-md)',
            border: '1.5px dashed var(--color-border)',
            backgroundColor: 'transparent',
            color: 'var(--color-text-secondary)',
            fontSize: 12, fontWeight: 600, cursor: 'pointer',
            fontFamily: 'var(--font-body)', alignSelf: 'flex-start',
          }}
        >
          <Plus size={13} />
          Add a drug note
        </button>
      )}

      {/* ── Alternatives (§2.2a) ── */}
      {hasAlt && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          <div style={{
            fontSize: 11, fontWeight: 700, letterSpacing: '0.05em',
            textTransform: 'uppercase', color: 'var(--color-text-tertiary)',
            marginBottom: 4,
          }}>
            Alternatives
          </div>
          {(row.alternatives ?? []).map((alt, idx) => (
            <AlternativeRow
              key={idx}
              alt={alt}
              parentRow={row}
              onRemove={() => removeAlt(idx)}
              onChange={nextAlt => updateAlt(idx, nextAlt)}
            />
          ))}
        </div>
      )}

      {/* ── Pending alternative dose age-group choice (Phase 3) ── */}
      {pendingAlt && (
        <DoseWhoChooser
          doseRows={pendingAlt.doseRows}
          onChoose={finalizePendingAltDose}
          onSkip={skipPendingAltDose}
        />
      )}

      {/* ── Add alternative buttons ──
          PHASE 1 (2026-06-22): left untouched — these add a brand-new
          alternative line (a separate, Phase 2-scoped concern, not the
          identity-field redesign this phase covers). Each newly added
          alternative renders through AlternativeRow above, which already
          uses the new single DrugSearchField for its own identity entry. */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {row.formulation_id && (
          <button
            type="button"
            onClick={() => setAltScopedBrandPickerOpen(true)}
            title="Only shows brands already under this drug's exact formulation — concentration, form, and dose stay locked to match"
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '5px 10px',
              border: '1.5px dashed var(--color-accent)',
              borderRadius: 'var(--radius-md)',
              background: '#EFF6FF',
              color: 'var(--color-accent)',
              fontSize: 11, fontWeight: 600, cursor: 'pointer',
              fontFamily: 'var(--font-body)',
            }}
          >
            <Plus size={11} /> Alt: same formulation, new brand…
          </button>
        )}
        <button
          type="button"
          onClick={() => setAltBrandPickerOpen(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '5px 10px',
            border: '1.5px dashed var(--color-border)',
            borderRadius: 'var(--radius-md)',
            background: 'transparent',
            color: 'var(--color-text-tertiary)',
            fontSize: 11, fontWeight: 600, cursor: 'pointer',
            fontFamily: 'var(--font-body)',
          }}
        >
          <Plus size={11} /> Alt: pick a brand…
        </button>
        <button
          type="button"
          onClick={() => setAltFormulationPickerOpen(true)}
          title="Use this for a genuinely different drug serving the same purpose"
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '5px 10px',
            border: '1.5px dashed var(--color-border)',
            borderRadius: 'var(--radius-md)',
            background: 'transparent',
            color: 'var(--color-text-tertiary)',
            fontSize: 11, fontWeight: 600, cursor: 'pointer',
            fontFamily: 'var(--font-body)',
          }}
        >
          <Plus size={11} /> Alt: pick a formulation…
        </button>
        <button
          type="button"
          onClick={addFreeTextAlt}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '5px 10px',
            border: '1.5px dashed var(--color-border)',
            borderRadius: 'var(--radius-md)',
            background: 'transparent',
            color: 'var(--color-text-tertiary)',
            fontSize: 11, fontWeight: 600, cursor: 'pointer',
            fontFamily: 'var(--font-body)',
          }}
        >
          <Plus size={11} /> Alt: free text
        </button>
      </div>

      {/* ── Library picker modals (add alternative) ──
          PHASE 1: only the add-alternative modals remain. The main row's
          own brandPickerOpen/formulationPickerOpen modals are removed —
          identity entry no longer opens DrugPickerModal directly. */}
      <DrugPickerModal
        isOpen={altBrandPickerOpen}
        onClose={() => setAltBrandPickerOpen(false)}
        onSelect={brand => {
          setAltBrandPickerOpen(false)
          handleAltBrandPick(brand)
        }}
        mode="brand"
      />
      <DrugPickerModal
        isOpen={altFormulationPickerOpen}
        onClose={() => setAltFormulationPickerOpen(false)}
        onSelect={formulation => {
          setAltFormulationPickerOpen(false)
          handleAltFormulationPick(formulation)
        }}
        mode="formulation"
      />
      {row.formulation_id && (
        <DrugPickerModal
          isOpen={altScopedBrandPickerOpen}
          onClose={() => setAltScopedBrandPickerOpen(false)}
          onSelect={brand => {
            setAltScopedBrandPickerOpen(false)
            handleAltScopedBrandPick(brand)
          }}
          mode="brand-scoped"
          scopeFormulationId={row.formulation_id}
          scopeContext={{
            genericName:   row.generic_name,
            concentration: row.concentration,
            form:          row.form,
            route:         row.route,
            category:      row.category,
          }}
        />
      )}

    </div>
  )
}

// ─── Promote-alternative dialog (step 1.11) ────────────────────────────────────
// Exported separately so PrescriptionSheetEditor can mount it at the list level
// when the user tries to delete a main drug row that has alternatives.
//
// Props:
//   row         — the DrugRow being deleted (so we can show alternative names)
//   onPromote   — (alternativeIndex: number) => void
//   onDeleteAll — () => void
//   onCancel    — () => void

export function PromoteAlternativeDialog({ row, onPromote, onDeleteAll, onCancel }) {
  const alts = row.alternatives ?? []
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: 'var(--color-surface)',
        border: '1.5px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        padding: 24, maxWidth: 440, width: '90%',
        boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
      }}>
        <div style={{
          fontSize: 15, fontWeight: 700,
          color: 'var(--color-text-primary)', marginBottom: 8,
        }}>
          This drug has alternatives
        </div>
        <div style={{
          fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 16,
        }}>
          Deleting <strong>{row.brand_name || row.generic_name || 'this drug'}</strong> will
          also remove its alternatives. You can promote one alternative to take over
          the main slot, or delete everything together.
        </div>

        {/* Promote options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
          {alts.map((alt, idx) => {
            const label = [alt.brand_name, alt.generic_name].filter(Boolean).join(' / ') || `Alternative ${idx + 1}`
            return (
              <button
                key={idx}
                type="button"
                onClick={() => onPromote(idx)}
                style={{
                  padding: '8px 12px', textAlign: 'left',
                  border: '1.5px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--color-bg)',
                  color: 'var(--color-text-primary)',
                  fontSize: 13, fontFamily: 'var(--font-body)',
                  cursor: 'pointer', fontWeight: 500,
                }}
              >
                Promote <strong>{label}</strong> to main slot
              </button>
            )
          })}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            type="button" onClick={onCancel}
            style={{
              padding: '7px 14px',
              border: '1.5px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              background: 'transparent',
              color: 'var(--color-text-secondary)',
              fontSize: 13, fontFamily: 'var(--font-body)',
              cursor: 'pointer', fontWeight: 500,
            }}
          >
            Cancel
          </button>
          <button
            type="button" onClick={onDeleteAll}
            style={{
              padding: '7px 14px',
              border: '1.5px solid #ef4444',
              borderRadius: 'var(--radius-md)',
              background: '#ef444410',
              color: '#ef4444',
              fontSize: 13, fontFamily: 'var(--font-body)',
              cursor: 'pointer', fontWeight: 600,
            }}
          >
            Delete all
          </button>
        </div>
      </div>
    </div>
  )
}


