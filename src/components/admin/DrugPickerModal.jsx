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
 * Props:
 *   isOpen    boolean
 *   onClose   () => void
 *   onSelect  (formulation | brand) => void
 *   mode      'formulation' | 'brand'  (default: 'formulation')
 */

import { useState, useEffect, useRef } from 'react'
import { Search, X } from 'lucide-react'
import Modal from './Modal'
import { supabase } from '../../lib/supabase'

// ─── Formulation query (existing) ─────────────────────────────────────────────

async function searchFormulationsForPicker(query) {
  // Fetch all published formulations with generic + brand names.
  // Filter client-side with the query string (dataset is small enough).
  const { data, error } = await supabase
    .from('formulations')
    .select(`
      id, slug, concentration, form, route,
      doses_structured, default_dose_override,
      generics ( id, name_en, name_ar, slug ),
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
        generics ( id, name_en, name_ar, slug )
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

// ─── Formulation result row (existing) ────────────────────────────────────────

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

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function DrugPickerModal({ isOpen, onClose, onSelect, mode = 'formulation' }) {
  const isBrandMode = mode === 'brand'

  const [query,   setQuery]   = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)
  const inputRef = useRef(null)

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setResults([])
      setError(null)
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
      const { data, error: err } = isBrandMode
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
  }, [query, isOpen, isBrandMode])

  function handleSelect(item) {
    onSelect(item)
    onClose()
  }

  const title       = isBrandMode ? 'Pick a brand'       : 'Pick a formulation'
  const placeholder = isBrandMode
    ? 'Brand name, generic, concentration…'
    : 'Generic name, brand, concentration…'
  const emptyHint   = isBrandMode
    ? (query.trim() ? `No brands found for "${query}"` : 'Type to search brands…')
    : (query.trim() ? `No formulations found for "${query}"` : 'Type to search formulations…')
  const footerHint  = isBrandMode
    ? 'Select a brand to add it as a drug slot'
    : 'Select a formulation to add it as a drug slot'

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="md">

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
          isBrandMode
            ? <BrandResultRow key={item.id} brand={item} onSelect={handleSelect} />
            : <FormulationResultRow key={item.id} formulation={item} onSelect={handleSelect} />
        ))}
      </div>

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
