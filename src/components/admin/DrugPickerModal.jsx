/**
 * src/components/admin/DrugPickerModal.jsx
 * Phase 3D — Prescriptions Editor
 * 2026-11-07 (CMS drug picker matches the app search): Pick a brand and Pick a formulation now use
 * DrugPickerSearch.jsx, the app's own search (same bar, search engine, cards and messages) on the
 * app's drug list. What onSelect hands back is unchanged. The old live brand / formulation searches
 * and result rows are gone. The brand-scoped mode (same formulation, different brand, and its add
 * new brand button) is untouched and keeps its own live search.
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
 *   (`{ id, name, formulations: { id, concentration, form, route,
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
import { Plus } from 'lucide-react'
import Modal from './Modal'
import SearchBar from '../ui/SearchBar'
import DrugPickerSearch from './DrugPickerSearch'
import { findBrandMatch, insertBrand, fetchBrandsForFormulation } from '../../lib/adminQueries'

// ─── The app's drug, turned into the shapes this pop-up has always returned ───

// Pick a brand.
function flatToBrandShape(flat) {
  return {
    id:   flat.id,
    name: flat.tradenameClean,
    formulations: {
      id:                    flat.formulationId,
      concentration:         flat.concentration,
      form:                  flat.form,
      route:                 flat.route,
      doses_structured:      flat.doses?.length ? flat.doses : null,
      default_dose_override: flat.defaultDoseOverride,
      generics: {
        id:       flat.genericId,
        name_en:  flat.genericName,
        category: flat.category,
      },
    },
    _flat: flat, // the Notifications screen reads the brand's slug from here
  }
}

// Pick a formulation.
function flatToFormulationShape(flat) {
  return {
    id:                    flat.formulationId,
    slug:                  flat.formulationSlug,
    concentration:         flat.concentration,
    form:                  flat.form,
    route:                 flat.route,
    doses_structured:      flat.doses?.length ? flat.doses : null,
    default_dose_override: flat.defaultDoseOverride,
    generics: {
      id:       flat.genericId,
      name_en:  flat.genericName,
      slug:     flat.genericSlug,
      category: flat.category,
    },
  }
}

// ─── Brand query, scoped to one formulation (new, Phase 3) ───────────────────
// Unlike the app search used by the other two modes (all brands, any formulation),
// this only ever returns brands already attached to scopeFormulationId — used by the
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

  // Search on query change (debounced 250ms) — brand-scoped mode only; the other two modes search
  // inside DrugPickerSearch.
  useEffect(() => {
    if (!isOpen || !isScopedMode) return
    setLoading(true)
    setError(null)
    const timer = setTimeout(async () => {
      const { data, error: err } = await searchBrandsScopedToFormulation(scopeFormulationId, query)
      if (err) {
        setError(err.message ?? 'Search failed')
        setResults([])
      } else {
        setResults(data ?? [])
      }
      setLoading(false)
    }, 250)
    return () => clearTimeout(timer)
  }, [query, isOpen, isScopedMode, scopeFormulationId])

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
        brandRow = { id: existing.id, name: existing.name }
      } else {
        const { data: created, error: insertErr } = await insertBrand({
          formulation_id: scopeFormulationId,
          name,
          manufacturer: null,
          is_published: true,
        })
        if (insertErr) throw new Error(insertErr.message)
        brandRow = { id: created.id, name }
      }

      // Shape to match mode="brand"'s onSelect contract — formulations
      // nested under the brand — using scopeContext for display fields,
      // since this brand-scoped query doesn't re-fetch the full nested shape.
      handleSelect({
        id: brandRow.id,
        name: brandRow.name,
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
  const emptyHint = query.trim()
    ? 'No matching brands under this formulation'
    : 'No other brands yet under this formulation — add one below'

  // The app's drug object for the tapped card, in the shape this pop-up has always returned.
  function handlePickFlat(flat) {
    handleSelect(isBrandMode ? flatToBrandShape(flat) : flatToFormulationShape(flat))
  }

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

      {/* Pick a brand / Pick a formulation: the app's own search */}
      {!isScopedMode && (
        <DrugPickerSearch
          mode={isBrandMode ? 'brand' : 'generic'}
          onPick={handlePickFlat}
        />
      )}

      {/* Brand-scoped mode: its own live search and list */}
      {isScopedMode && (
        <>
          <div style={{ marginBottom: 'var(--space-3)' }}>
            <SearchBar
              ref={inputRef}
              value={query}
              onChange={setQuery}
              placeholder="Search brands under this formulation…"
            />
          </div>

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
              <ScopedBrandResultRow key={item.id} brand={item} onSelect={handleSelect} />
            ))}
          </div>
        </>
      )}

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

      {/* Footer hint (brand-scoped mode only; the other two modes have their own footer) */}
      {isScopedMode && (
        <div style={{
          marginTop: 'var(--space-3)',
          fontSize:  12,
          color:     'var(--color-text-tertiary)',
          textAlign: 'center',
        }}>
          Only brands already under this formulation are shown — concentration, form, and dose stay locked to the parent drug
        </div>
      )}
    </Modal>
  )
}

