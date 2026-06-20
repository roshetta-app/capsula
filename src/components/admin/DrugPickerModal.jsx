/**
 * src/components/admin/DrugPickerModal.jsx
 * Phase 3D — Prescriptions Editor
 *
 * Modal for selecting a brand or formulation to add as a drug slot.
 *
 * mode="formulation" (default — keeps all existing call sites working):
 *   Searches generic name, formulation concentration+form, brand names.
 *   onSelect(formulation) — full nested formulation object.
 *
 * mode="brand":
 *   Searches brand name (primary), generic name, concentration+form.
 *   onSelect(brand) — brand object with nested formulation+generic.
 *
 * mode="brand-scoped" (Phase 3, 2026-06-20):
 *   Same shape as mode="brand", but pre-filtered server-side to exactly one
 *   formulation_id (passed via the required `scopeFormulationId` prop) — used
 *   for "same formulation, different brand" alternatives, so the result can
 *   never disagree with the parent row's formulation_id. Includes an inline
 *   "+ add new brand" action (reuse-or-create via findBrandMatch/insertBrand,
 *   same pattern as the existing promote-to-library flow) for when the
 *   needed brand doesn't exist under this formulation yet.
 *   onSelect(brand) — brand object shaped like mode="brand"'s result
 *   (`{ id, name, name_ar, formulations: { id, concentration, form, route,
 *   doses_structured, default_dose_override, generics: {...} } }`), so
 *   existing onSelect handlers written for mode="brand" work unchanged.
 *
 * Props:
 *   isOpen              boolean
 *   onClose             () => void
 *   onSelect            (formulation | brand) => void
 *   mode                'formulation' | 'brand' | 'brand-scoped'  (default: 'formulation')
 *   scopeFormulationId  string  — required when mode="brand-scoped"
 *   scopeContext        { genericName, concentration, form, route } — optional,
 *                        display-only context shown above the search box in
 *                        brand-scoped mode so the admin can see which
 *                        formulation they're attaching a brand to.
 */

import { useState, useEffect, useRef } from 'react'
import { Search, X, Plus } from 'lucide-react'
import Modal from './Modal'
import { supabase } from '../../lib/supabase'
import { findBrandMatch, insertBrand, fetchBrandsForFormulation } from '../../lib/adminQueries'
import { SOURCE_FLAG_VALUE } from '../../constants/prescriptionRowSchema'

// ─── Formulation query (existing) ─────────────────────────────────────────────

async function searchFormulationsForPicker(query) {
  // Fetch all published formulations with generic + brand names.
  // Filter client-side with the query string (dataset is small enough).
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

  if (!query || query.trim().length < 1) return { data: data ?? [], error: null }

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

// ─── Brand query (new, Phase 1) ───────────────────────────────────────────────

async function searchBrandsForPicker(query) {
  // Fetch all brands under published formulations with generic context.
  // Filter client-side to keep the pattern consistent with formulation mode.
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

  // Drop brands whose formulation didn't pass the is_published filter
  const published = (data ?? []).filter(b => b.formulations)

  if (!query || query.trim().length < 1) return { data: published, error: null }

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

// ─── Brand query, scoped to one formulation (new, Phase 3) ───────────────────
// Unlike searchBrandsForPicker above (all brands, any formulation), this only
// ever returns brands already attached to scopeFormulationId — used by the
// "same formulation, different brand" alternative picker so the result's
// formulation_id can never disagree with the parent row's.

async function searchBrandsScopedToFormulation(formulationId, query) {
  const { data, error } = await fetchBrandsForFormulation(formulationId)
  if (error) return { data: null, error }

  if (!query || query.trim().length < 1) return { data, error: null }

  const q = query.trim().toLowerCase()
  const filtered = data.filter(b => (b.name ?? '').toLowerCase().includes(q))
  return { data: filtered, error: null }
}

function FormulationResultRow({ formulation, onSelect }) {
  const [hovered, setHovered] = useState(false)
  const g = formulation.generics

  return (
    <button
      onClick={() => onSelect(formulation)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display:         'block',
        width:           '100%',
        textAlign:       'left',
        padding:         '10px 14px',
        background:      hovered ? 'var(--color-bg)' : 'transparent',
        border:          'none',
        borderBottom:    '1px solid var(--color-border)',
        cursor:          'pointer',
        fontFamily:      'var(--font-body)',
        transition:      'background-color 0.1s',
      }}
    >
      {/* Generic name */}
      <div style={{
        fontSize:     14,
        fontWeight:   600,
        color:        'var(--color-text-primary)',
        marginBottom: 2,
      }}>
        {g?.name_en ?? 'Unknown generic'}
      </div>

      {/* Concentration + form */}
      <div style={{
        fontSize:     13,
        color:        'var(--color-text-secondary)',
        marginBottom: 0,
      }}>
        {formulation.concentration} · {formulation.form}
        {formulation.route && ` · ${formulation.route}`}
      </div>
    </button>
  )
}

// ─── Brand result row (new, Phase 1) ──────────────────────────────────────────

function BrandResultRow({ brand, onSelect }) {
  const [hovered, setHovered] = useState(false)
  const f = brand.formulations
  const g = f?.generics

  return (
    <button
      onClick={() => onSelect(brand)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display:         'block',
        width:           '100%',
        textAlign:       'left',
        padding:         '10px 14px',
        background:      hovered ? 'var(--color-bg)' : 'transparent',
        border:          'none',
        borderBottom:    '1px solid var(--color-border)',
        cursor:          'pointer',
        fontFamily:      'var(--font-body)',
        transition:      'background-color 0.1s',
      }}
    >
      {/* Brand name — primary */}
      <div style={{
        fontSize:     14,
        fontWeight:   600,
        color:        'var(--color-text-primary)',
        marginBottom: 2,
      }}>
        {brand.name}
        {brand.name_ar && (
          <span style={{
            fontSize:   13,
            fontWeight: 400,
            color:      'var(--color-text-secondary)',
            marginLeft: 8,
            direction:  'rtl',
          }}>
            {brand.name_ar}
          </span>
        )}
      </div>

      {/* Generic + concentration + form — secondary */}
      {(g || f) && (
        <div style={{
          fontSize: 13,
          color:    'var(--color-text-secondary)',
        }}>
          {g?.name_en ?? ''}
          {f?.concentration && ` · ${f.concentration}`}
          {f?.form && ` ${f.form}`}
          {f?.route && ` · ${f.route}`}
        </div>
      )}
    </button>
  )
}

// ─── Brand-scoped result row (new, Phase 3) ───────────────────────────────────
// Simpler than BrandResultRow: formulation/generic context is already fixed
// and shown once above the list (scopeContext), not repeated per row.

function ScopedBrandResultRow({ brand, onSelect }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={() => onSelect(brand)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display:         'block',
        width:           '100%',
        textAlign:       'left',
        padding:         '10px 14px',
        background:      hovered ? 'var(--color-bg)' : 'transparent',
        border:          'none',
        borderBottom:    '1px solid var(--color-border)',
        cursor:          'pointer',
        fontFamily:      'var(--font-body)',
        transition:      'background-color 0.1s',
      }}
    >
      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)' }}>
        {brand.name}
      </span>
      {brand.name_ar && (
        <span style={{
          fontSize: 13, fontWeight: 400, color: 'var(--color-text-secondary)',
          marginLeft: 8, direction: 'rtl',
        }}>
          {brand.name_ar}
        </span>
      )}
    </button>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function DrugPickerModal({
  isOpen, onClose, onSelect, mode = 'formulation',
  scopeFormulationId = null, scopeContext = null,
}) {
  const isBrandMode  = mode === 'brand'
  const isScopedMode = mode === 'brand-scoped'

  const [query,   setQuery]   = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)
  const inputRef = useRef(null)

  // ── Inline "add new brand" form (brand-scoped mode only, Phase 3) ────────
  const [addingNew, setAddingNew]       = useState(false)
  const [newBrandName, setNewBrandName] = useState('')
  const [addError, setAddError]         = useState(null)
  const [adding, setAdding]             = useState(false)

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setResults([])
      setError(null)
      setAddingNew(false)
      setNewBrandName('')
      setAddError(null)
      const t = setTimeout(() => inputRef.current?.focus(), 80)
      return () => clearTimeout(t)
    }
  }, [isOpen])

  // Search on query change (debounced 250ms)
  useEffect(() => {
    if (!isOpen) return
    setLoading(true)
    setError(null)
    const timer = setTimeout(async () => {
      const { data, error: err } = isScopedMode
        ? await searchBrandsScopedToFormulation(scopeFormulationId, query)
        : isBrandMode
          ? await searchBrandsForPicker(query)
          : await searchFormulationsForPicker(query)
      if (err) {
        setError(err.message ?? 'Search failed')
        setResults([])
      } else {
        setResults(data ?? [])
      }
      setLoading(false)
    }, 250)
    return () => clearTimeout(timer)
  }, [query, isOpen, isBrandMode, isScopedMode, scopeFormulationId])

  function handleSelect(item) {
    onSelect(item)
    onClose()
  }

  // ── Add a new brand to this formulation (brand-scoped mode only) ─────────
  // Reuse-or-create, same pattern as the existing promote-to-library flow:
  // check findBrandMatch first so re-typing an existing name attaches the
  // existing row instead of creating a duplicate.
  async function handleAddNewBrand() {
    const name = newBrandName.trim()
    if (!name) {
      setAddError('Enter a brand name.')
      return
    }
    setAdding(true)
    setAddError(null)
    try {
      const { data: existing, error: findErr } = await findBrandMatch(scopeFormulationId, name)
      if (findErr) throw new Error(findErr.message)

      let brandRow
      if (existing) {
        brandRow = { id: existing.id, name: existing.name, name_ar: null }
      } else {
        const { data: created, error: insertErr } = await insertBrand({
          formulation_id: scopeFormulationId,
          name,
          name_ar: '',
          manufacturer: null,
          source: SOURCE_FLAG_VALUE,
          is_published: true,
          is_available: true,
        })
        if (insertErr) throw new Error(insertErr.message)
        brandRow = { id: created.id, name, name_ar: null }
      }

      // Shape to match mode="brand"'s onSelect contract — formulations
      // nested under the brand — using scopeContext for display fields,
      // since this brand-scoped query doesn't re-fetch the full nested shape.
      handleSelect({
        id: brandRow.id,
        name: brandRow.name,
        name_ar: brandRow.name_ar,
        formulations: {
          id:               scopeFormulationId,
          concentration:    scopeContext?.concentration ?? null,
          form:             scopeContext?.form ?? null,
          route:            scopeContext?.route ?? null,
          doses_structured: scopeContext?.doses_structured ?? null,
          generics: scopeContext?.genericName ? {
            name_en:  scopeContext.genericName,
            category: scopeContext.category ?? null,
          } : null,
        },
      })
    } catch (err) {
      setAddError(err.message ?? 'Could not add brand. Please try again.')
    } finally {
      setAdding(false)
    }
  }

  const title = isScopedMode ? 'Pick a brand (same formulation)'
    : isBrandMode ? 'Pick a brand' : 'Pick a formulation'
  const placeholder = isScopedMode ? 'Search brands under this formulation…'
    : isBrandMode ? 'Brand name, generic, concentration…' : 'Generic name, brand, concentration…'
  const emptyHint = isScopedMode
    ? (query.trim() ? `No matching brands under this formulation` : 'No other brands yet under this formulation — add one below')
    : isBrandMode
      ? (query.trim() ? `No brands found for "${query}"` : 'Type to search brands…')
      : (query.trim() ? `No formulations found for "${query}"` : 'Type to search formulations…')
  const footerHint = isScopedMode
    ? 'Only brands already under this formulation are shown — concentration, form, and dose stay locked to the parent drug'
    : isBrandMode
      ? 'Select a brand to add it as a drug slot'
      : 'Select a formulation to add it as a drug slot'

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="md">

      {/* Scope context banner (brand-scoped mode only) */}
      {isScopedMode && scopeContext && (
        <div style={{
          marginBottom: 'var(--space-3)',
          padding: '8px 12px',
          borderRadius: 'var(--radius-md)',
          background: 'var(--color-bg)',
          border: '1px solid var(--color-border)',
          fontSize: 12,
          color: 'var(--color-text-secondary)',
        }}>
          Attaching a brand to: {[
            scopeContext.genericName,
            scopeContext.concentration,
            scopeContext.form,
          ].filter(Boolean).join(' · ')}
        </div>
      )}

      {/* Search input */}
      <div style={{
        position:     'relative',
        marginBottom: 'var(--space-3)',
      }}>
        <Search
          size={15}
          style={{
            position:      'absolute',
            left:          12,
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
          onChange={e => setQuery(e.target.value)}
          placeholder={placeholder}
          style={{
            width:           '100%',
            boxSizing:       'border-box',
            padding:         '9px 36px',
            border:          '1.5px solid var(--color-border)',
            borderRadius:    'var(--radius-md)',
            fontSize:        14,
            fontFamily:      'var(--font-body)',
            backgroundColor: 'var(--color-surface)',
            color:           'var(--color-text-primary)',
            outline:         'none',
          }}
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            style={{
              position:  'absolute',
              right:     10,
              top:       '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border:    'none',
              cursor:    'pointer',
              color:     'var(--color-text-tertiary)',
              display:   'flex',
              padding:   2,
            }}
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Results list */}
      <div style={{
        border:          '1.5px solid var(--color-border)',
        borderRadius:    'var(--radius-md)',
        maxHeight:       360,
        overflowY:       'auto',
        backgroundColor: 'var(--color-surface)',
      }}>
        {loading && (
          <div style={{
            padding:   'var(--space-5)',
            textAlign: 'center',
            fontSize:  13,
            color:     'var(--color-text-tertiary)',
          }}>
            Searching…
          </div>
        )}

        {!loading && error && (
          <div style={{
            padding:   'var(--space-4)',
            fontSize:  13,
            color:     'var(--color-error, #ef4444)',
            textAlign: 'center',
          }}>
            {error}
          </div>
        )}

        {!loading && !error && results.length === 0 && (
          <div style={{
            padding:   'var(--space-5)',
            textAlign: 'center',
            fontSize:  13,
            color:     'var(--color-text-tertiary)',
          }}>
            {emptyHint}
          </div>
        )}

        {!loading && !error && results.map(item => (
          isScopedMode
            ? <ScopedBrandResultRow key={item.id} brand={item} onSelect={handleSelect} />
            : isBrandMode
              ? <BrandResultRow key={item.id} brand={item} onSelect={handleSelect} />
              : <FormulationResultRow key={item.id} formulation={item} onSelect={handleSelect} />
        ))}
      </div>

      {/* Inline "add new brand" (brand-scoped mode only) */}
      {isScopedMode && (
        <div style={{ marginTop: 'var(--space-3)' }}>
          {!addingNew ? (
            <button
              type="button"
              onClick={() => setAddingNew(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '6px 10px', width: '100%', justifyContent: 'center',
                border: '1.5px dashed var(--color-border)',
                borderRadius: 'var(--radius-md)',
                background: 'transparent',
                color: 'var(--color-text-secondary)',
                fontSize: 12, fontWeight: 600, cursor: 'pointer',
                fontFamily: 'var(--font-body)',
              }}
            >
              <Plus size={12} /> Add new brand to this formulation
            </button>
          ) : (
            <div style={{
              display: 'flex', flexDirection: 'column', gap: 6,
              padding: '10px 12px',
              border: '1.5px solid var(--color-accent)',
              borderRadius: 'var(--radius-md)',
              background: '#EFF6FF',
            }}>
              <input
                type="text"
                autoFocus
                value={newBrandName}
                onChange={e => setNewBrandName(e.target.value)}
                placeholder="New brand name"
                style={{
                  width: '100%', boxSizing: 'border-box',
                  padding: '7px 10px',
                  border: '1.5px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: 13, fontFamily: 'var(--font-body)',
                  backgroundColor: 'var(--color-surface)',
                  color: 'var(--color-text-primary)',
                  outline: 'none',
                }}
              />
              {addError && (
                <div style={{ fontSize: 11, color: 'var(--color-error, #ef4444)' }}>
                  {addError}
                </div>
              )}
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  type="button"
                  onClick={handleAddNewBrand}
                  disabled={adding}
                  style={{
                    padding: '6px 12px', borderRadius: 'var(--radius-md)',
                    border: 'none',
                    backgroundColor: adding ? 'var(--color-border)' : 'var(--color-accent)',
                    color: adding ? 'var(--color-text-tertiary)' : '#fff',
                    fontSize: 12, fontWeight: 600,
                    cursor: adding ? 'not-allowed' : 'pointer',
                    fontFamily: 'var(--font-body)',
                  }}
                >
                  {adding ? 'Adding…' : 'Add & select'}
                </button>
                <button
                  type="button"
                  onClick={() => { setAddingNew(false); setNewBrandName(''); setAddError(null) }}
                  style={{
                    padding: '6px 12px', borderRadius: 'var(--radius-md)',
                    border: '1.5px solid var(--color-border)',
                    background: 'transparent',
                    color: 'var(--color-text-secondary)',
                    fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    fontFamily: 'var(--font-body)',
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Footer hint */}
      <div style={{
        marginTop: 'var(--space-3)',
        fontSize:  12,
        color:     'var(--color-text-tertiary)',
        textAlign: 'center',
      }}>
        {footerHint}
      </div>
    </Modal>
  )
}


