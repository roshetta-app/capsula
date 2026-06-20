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
 *   1.1  All fields: brand name (autocomplete), generic name (autocomplete),
 *        concentration, form (dropdown), dose, note_en, note_ar.
 *   1.2  Brand-name autocomplete: queries brands+formulations+generics; on
 *        select pre-fills concentration / form / generic_name / generic_id /
 *        formulation_id from the picked brand's formulation. Free-text if no match.
 *   1.3  Generic-name autocomplete (§2.6): independent of brand matching;
 *        links generic_id when a match is found, null otherwise.
 *   1.4  dose_override removed. Single pre-fillable, freely editable dose field.
 *   1.5  Validation: block save if both brand_name and generic_name are empty.
 *        (Validation state is surfaced via a visible error inside the component;
 *        the parent PrescriptionSheetEditor should also gate its save.)
 *   1.5a "Not in library" always-visible tag on any row without real library IDs.
 *   1.6  Data shape matches prescriptionRowSchema.js DRUG_ROW_TEMPLATE exactly.
 *   1.8  "Add alternative" button opens DrugPickerModal or free-text entry;
 *        appends to row.alternatives array.
 *   1.9  Alternatives rendered nested under main drug (indented), each with
 *        its own remove control.
 *   1.10 Shared-vs-own dose: uses alternativeSharesParentDose() from schema file.
 *   1.11 Delete-with-promote flow: if a row has alternatives, the parent is
 *        notified via onDeleteRequest (not onDelete) so PrescriptionSheetEditor
 *        can show the promote dialog. This component exports the
 *        PromoteAlternativeDialog too, for use in PrescriptionSheetEditor.
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
    }}>
      Not in library
    </span>
  )
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
  const [open, setOpen]           = useState(false)
  const [suggestions, setSuggestions] = useState([])
  const [loading, setLoading]     = useState(false)
  const timerRef = useRef(null)
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

async function fetchBrandSuggestions(query) {
  // Returns brands with their formulation + generic for pre-fill on select
  const q = query.toLowerCase()
  const { data } = await supabase
    .from('brands')
    .select(`
      id, name,
      formulations (
        id, concentration, form, route, default_dose_override,
        generics ( id, name_en, name_ar )
      )
    `)
    .ilike('name', `%${query}%`)
    .eq('formulations.is_published', true)
    .limit(12)
  return (data ?? []).filter(b => b.formulations)
}

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
  const [pickerOpen, setPickerOpen] = useState(false)

  function patch(updates) {
    onChange({ ...alt, ...updates })
  }

  // When a library formulation is picked for this alternative
  function handleFormulationPick(formulation) {
    const generic = formulation.generics
    patch({
      brand_name:      (formulation.brands?.[0]?.name) ?? alt.brand_name,
      brand_id:        (formulation.brands?.[0]?.id)   ?? null,
      generic_name:    generic?.name_en ?? null,
      generic_id:      generic?.id      ?? null,
      formulation_id:  formulation.id,
      concentration:   formulation.concentration ?? null,
      form:            formulation.form ?? null,
      dose:            sharesParentDose ? alt.dose : (formulation.default_dose_override ?? null),
      _formulationMeta: {
        name_en:       generic?.name_en ?? '',
        concentration: formulation.concentration ?? '',
        form:          formulation.form ?? '',
        route:         formulation.route ?? '',
      },
    })
  }

  const isLinked = !!(alt.brand_id || alt.generic_id)

  return (
    <div style={{
      marginLeft: 18,
      paddingLeft: 14,
      borderLeft: '2px solid var(--color-border)',
      display: 'flex', flexDirection: 'column', gap: 8,
      paddingTop: 8, paddingBottom: 4,
    }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{
          fontSize: 10, fontWeight: 700, letterSpacing: '0.05em',
          textTransform: 'uppercase', color: 'var(--color-text-tertiary)',
        }}>
          Or
        </span>
        {!isLinked && <NotInLibraryTag />}
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          style={{
            marginLeft: 'auto', padding: '3px 9px',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            background: 'var(--color-surface)',
            color: 'var(--color-text-secondary)',
            fontSize: 11, fontWeight: 600, cursor: 'pointer',
            fontFamily: 'var(--font-body)',
          }}
        >
          Pick from library…
        </button>
        <button
          type="button"
          onClick={onRemove}
          title="Remove alternative"
          style={{
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

      {/* Brand + generic row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <div>
          <FieldLabel>Brand name</FieldLabel>
          <AutocompleteInput
            value={alt.brand_name ?? ''}
            onChange={val => patch({ brand_name: val || null, brand_id: null })}
            onSelect={brand => {
              const f = brand.formulations
              patch({
                brand_name:     brand.name,
                brand_id:       brand.id,
                generic_name:   f?.generics?.name_en ?? alt.generic_name,
                generic_id:     f?.generics?.id      ?? alt.generic_id,
                formulation_id: f?.id                ?? null,
                concentration:  f?.concentration     ?? null,
                form:           f?.form              ?? null,
                dose:           sharesParentDose ? alt.dose : (f?.default_dose_override ?? null),
              })
            }}
            placeholder="e.g. Adol"
            fetchSuggestions={fetchBrandSuggestions}
            renderSuggestion={b => (
              <span style={{ fontSize: 13 }}>
                <strong>{b.name}</strong>
                {b.formulations?.generics?.name_en && (
                  <span style={{ color: 'var(--color-text-tertiary)', marginLeft: 6 }}>
                    {b.formulations.generics.name_en}
                  </span>
                )}
              </span>
            )}
          />
        </div>
        <div>
          <FieldLabel>Generic name</FieldLabel>
          <AutocompleteInput
            value={alt.generic_name ?? ''}
            onChange={val => patch({ generic_name: val || null, generic_id: null })}
            onSelect={g => patch({ generic_name: g.name_en, generic_id: g.id })}
            placeholder="e.g. paracetamol"
            fetchSuggestions={fetchGenericSuggestions}
            renderSuggestion={g => (
              <span style={{ fontSize: 13 }}>
                <strong>{g.name_en}</strong>
                {g.name_ar && <span style={{ color: 'var(--color-text-tertiary)', marginLeft: 6 }}>{g.name_ar}</span>}
              </span>
            )}
          />
        </div>
      </div>

      {/* Concentration + Form */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
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
            style={{ ...textInput(), appearance: 'none' }}
          >
            <option value="">— select —</option>
            {DRUG_FORMS.map(f => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Dose — shared or independent */}
      <div>
        <FieldLabel hint={sharesParentDose ? 'Same formulation — shared with main drug' : undefined}>
          Dose / instructions
        </FieldLabel>
        {sharesParentDose ? (
          <div style={{
            ...textInput(),
            backgroundColor: 'var(--color-bg)',
            color: 'var(--color-text-tertiary)',
            fontStyle: 'italic',
            cursor: 'not-allowed',
          }}>
            {parentRow.dose || 'Shared with main drug'}
          </div>
        ) : (
          <input
            type="text"
            value={alt.dose ?? ''}
            onChange={e => patch({ dose: e.target.value || null })}
            placeholder="e.g. 10mg/kg every 8h"
            dir="auto"
            style={textInput()}
          />
        )}
      </div>

      {/* Picker modal */}
      <DrugPickerModal
        isOpen={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={handleFormulationPick}
      />
    </div>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function UnifiedDrugRowEditor({ row, onChange }) {
  const [pickerOpen, setPickerOpen] = useState(false)
  // addingAltFreetext: when true, shows a quick inline free-text alt entry
  // instead of the picker. Could be expanded later; for now picker is the
  // primary path. This state isn't required by Phase 1 spec but keeps the
  // "add alternative" area extensible.
  const [altPickerOpen, setAltPickerOpen] = useState(false)

  // ── Save-to-library promote flow (Phase 2, masterplan §2.5) ───────────────
  const [promoteOn, setPromoteOn]       = useState(false)
  const [promoteCategory, setPromoteCategory] = useState('')
  const [promoteRoute, setPromoteRoute]       = useState('')
  const [promoting, setPromoting]       = useState(false)
  const [promoteError, setPromoteError] = useState(null)

  function patch(updates) {
    onChange({ ...row, ...updates })
  }

  // ── Brand autocomplete select ────────────────────────────────────────────
  function handleBrandSelect(brand) {
    const f = brand.formulations
    const generic = f?.generics
    patch({
      brand_name:      brand.name,
      brand_id:        brand.id,
      generic_name:    generic?.name_en   ?? row.generic_name,
      generic_id:      generic?.id        ?? row.generic_id,
      formulation_id:  f?.id              ?? null,
      concentration:   f?.concentration   ?? null,
      form:            f?.form            ?? null,
      dose:            f?.default_dose_override ?? row.dose,
      _formulationMeta: f ? {
        name_en:       generic?.name_en ?? '',
        concentration: f.concentration ?? '',
        form:          f.form ?? '',
        route:         f.route ?? '',
      } : row._formulationMeta,
    })
  }

  // ── Library picker select ────────────────────────────────────────────────
  // (DrugPickerModal picks a formulation, not a brand directly)
  function handleFormulationPick(formulation) {
    const generic = formulation.generics
    patch({
      formulation_id:  formulation.id,
      generic_name:    generic?.name_en   ?? row.generic_name,
      generic_id:      generic?.id        ?? row.generic_id,
      concentration:   formulation.concentration ?? null,
      form:            formulation.form ?? null,
      dose:            formulation.default_dose_override ?? row.dose,
      _formulationMeta: {
        name_en:       generic?.name_en ?? '',
        concentration: formulation.concentration ?? '',
        form:          formulation.form ?? '',
        route:         formulation.route ?? '',
      },
    })
  }

  // ── Generic autocomplete select ──────────────────────────────────────────
  function handleGenericSelect(generic) {
    patch({ generic_name: generic.name_en, generic_id: generic.id })
  }

  // ── Promote to library (§2.5) ────────────────────────────────────────────
  // Runs the reuse-or-create sequence immediately when the admin clicks
  // "Promote now": generic → formulation → brand, in that order, mirroring
  // AddDrugFlow.jsx's sequential insert pattern. On success, links the row
  // to the resulting ids and tags it source_flag: 'manual_entry'.
  //
  // Decision (flagged, not assumed): if a step fails partway, we do NOT roll
  // back earlier inserts — there is no client-side transaction available,
  // and deleting a just-created generic/formulation could race with other
  // concurrent admin activity. Instead we surface exactly which step
  // succeeded and which failed, so the admin can finish manually (e.g. via
  // the Generics CMS) or retry. Retrying re-runs the match step first, so a
  // retry after a partial failure will find and reuse what was already
  // created rather than duplicating it.
  async function handlePromote() {
    setPromoteError(null)

    const genericName = row.generic_name?.trim()
    const concentration = row.concentration?.trim()

    // Preconditions — surfaced as a message, not silently worked around.
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
    let genericId = row.generic_id ?? null
    let formulationId = null
    let brandId = null

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
            name_ar: '',
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
        const { data: newFormulation, error: fErr } = await insertFormulation({
          generic_id: genericId,
          concentration,
          form: row.form,
          route: promoteRoute,
          doses: [],
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
            name_ar: null,
            manufacturer: null,
            source: SOURCE_FLAG_VALUE,
            is_published: true,
            in_stock: true,
            is_available: true,
          })
          if (bErr) throw new Error(`Creating brand "${brandName}": ${bErr.message}`)
          brandId = newBrand.id
        }
      }

      // 4. Link the row to the real library ids; typed text stays as-is.
      patch({
        generic_id: genericId,
        formulation_id: formulationId,
        brand_id: brandId,
        source_flag: SOURCE_FLAG_VALUE,
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

  function handleAltPickerSelect(formulation) {
    const generic = formulation.generics
    const newAlt = {
      ...ALTERNATIVE_DRUG_TEMPLATE,
      generic_name:   generic?.name_en   ?? null,
      generic_id:     generic?.id        ?? null,
      formulation_id: formulation.id,
      concentration:  formulation.concentration ?? null,
      form:           formulation.form ?? null,
      dose:           formulation.default_dose_override ?? null,
      _formulationMeta: {
        name_en:       generic?.name_en ?? '',
        concentration: formulation.concentration ?? '',
        form:          formulation.form ?? '',
        route:         formulation.route ?? '',
      },
    }
    patch({ alternatives: [...(row.alternatives ?? []), newAlt] })
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

  const isLinked     = !!(row.brand_id || row.generic_id || row.formulation_id)
  const showLink     = row.drug_link_enabled ?? true
  const hasAlt       = (row.alternatives ?? []).length > 0

  // Validation: at least one of brand_name / generic_name must be non-empty
  const hasName      = !!(row.brand_name?.trim() || row.generic_name?.trim())

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* ── Library link status + "not in library" tag (§2.4b) ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        {!isLinked && <NotInLibraryTag />}
        {isLinked && (
          <span style={{
            display: 'inline-flex', alignItems: 'center',
            padding: '1px 7px', borderRadius: 99,
            fontSize: 10, fontWeight: 700, letterSpacing: '0.04em',
            textTransform: 'uppercase',
            background: '#10b98118',
            color: '#065f46',
            border: '1px solid #10b98140',
          }}>
            Linked to library
          </span>
        )}
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          style={{
            marginLeft: isLinked ? 0 : 'auto',
            padding: '4px 10px',
            border: '1.5px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            background: 'var(--color-surface)',
            color: 'var(--color-text-secondary)',
            fontSize: 11, fontWeight: 600, cursor: 'pointer',
            fontFamily: 'var(--font-body)',
          }}
        >
          {isLinked ? 'Change formulation…' : 'Pick from library…'}
        </button>
      </div>

      {/* ── Validation error ── */}
      {!hasName && (
        <div style={{
          fontSize: 11, color: 'var(--color-error, #ef4444)',
          padding: '4px 8px',
          background: '#ef444410',
          border: '1px solid #ef444430',
          borderRadius: 'var(--radius-md)',
        }}>
          A drug row must have at least a brand name or generic name.
        </div>
      )}

      {/* ── Brand name + Generic name (side by side) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div>
          <FieldLabel>Brand name</FieldLabel>
          <AutocompleteInput
            value={row.brand_name ?? ''}
            onChange={val => patch({ brand_name: val || null, brand_id: null })}
            onSelect={handleBrandSelect}
            placeholder="e.g. Augmentin"
            fetchSuggestions={fetchBrandSuggestions}
            renderSuggestion={b => (
              <span style={{ fontSize: 13 }}>
                <strong>{b.name}</strong>
                {b.formulations?.concentration && (
                  <span style={{ color: 'var(--color-text-tertiary)', marginLeft: 6 }}>
                    {b.formulations.concentration} {b.formulations.form}
                  </span>
                )}
              </span>
            )}
          />
        </div>
        <div>
          <FieldLabel hint="optional">Generic name</FieldLabel>
          <AutocompleteInput
            value={row.generic_name ?? ''}
            onChange={val => patch({ generic_name: val || null, generic_id: null })}
            onSelect={handleGenericSelect}
            placeholder="e.g. amoxicillin-clavulanate"
            fetchSuggestions={fetchGenericSuggestions}
            renderSuggestion={g => (
              <span style={{ fontSize: 13 }}>
                <strong>{g.name_en}</strong>
                {g.name_ar && (
                  <span style={{ color: 'var(--color-text-tertiary)', marginLeft: 6 }}>{g.name_ar}</span>
                )}
              </span>
            )}
          />
        </div>
      </div>

      {/* ── Concentration + Form ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div>
          <FieldLabel>Concentration</FieldLabel>
          <input
            type="text"
            value={row.concentration ?? ''}
            onChange={e => patch({ concentration: e.target.value || null })}
            placeholder="e.g. 500mg, 120mg/5ml"
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
            <option value="">— select —</option>
            {DRUG_FORMS.map(f => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Save to library (§2.5) — free-text mode only ── */}
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

      {/* ── Dose ── */}
      <div>
        <FieldLabel hint="pre-filled from library; edits stay on this row only">
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

      {/* ── Note EN ── */}
      <div>
        <FieldLabel hint="English">Drug note</FieldLabel>
        <input
          type="text"
          value={row.note_en ?? ''}
          onChange={e => patch({ note_en: e.target.value || null })}
          placeholder="e.g. Only if cramping present"
          style={textInput()}
        />
      </div>

      {/* ── Note AR ── */}
      <div>
        <FieldLabel hint="Arabic (RTL)">Drug note — Arabic</FieldLabel>
        <input
          type="text"
          value={row.note_ar ?? ''}
          onChange={e => patch({ note_ar: e.target.value || null })}
          placeholder="ملاحظة بالعربي (اختياري)"
          dir="rtl"
          style={textInput({ textAlign: 'right' })}
        />
      </div>

      {/* ── Drug link toggle ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button
          type="button"
          onClick={() => patch({ drug_link_enabled: !showLink })}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '5px 10px', borderRadius: 'var(--radius-md)',
            border: `1.5px solid ${showLink ? 'var(--color-accent)' : 'var(--color-border)'}`,
            backgroundColor: showLink ? '#EFF6FF' : 'transparent',
            color: showLink ? 'var(--color-accent)' : 'var(--color-text-tertiary)',
            fontSize: 12, fontWeight: 600, cursor: 'pointer',
            fontFamily: 'var(--font-body)',
          }}
        >
          {showLink ? <Link size={12} /> : <Unlink size={12} />}
          {showLink ? 'Drug link: ON' : 'Drug link: OFF'}
        </button>
        <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>
          {showLink
            ? 'Name taps navigate to Drug Detail screen'
            : 'Name shown as plain text'}
        </span>
      </div>

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

      {/* ── Add alternative button + mini-menu ── */}
      <div style={{ display: 'flex', gap: 6 }}>
        <button
          type="button"
          onClick={() => setAltPickerOpen(true)}
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
          <Plus size={11} /> Add alternative (library)
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
          <Plus size={11} /> Add alternative (free text)
        </button>
      </div>

      {/* ── Library picker modal (main drug) ── */}
      <DrugPickerModal
        isOpen={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={handleFormulationPick}
      />

      {/* ── Library picker modal (add alternative) ── */}
      <DrugPickerModal
        isOpen={altPickerOpen}
        onClose={() => setAltPickerOpen(false)}
        onSelect={formulation => {
          setAltPickerOpen(false)
          handleAltPickerSelect(formulation)
        }}
      />

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

