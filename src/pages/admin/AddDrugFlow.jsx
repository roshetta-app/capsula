import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Check, AlertTriangle } from 'lucide-react'
import { insertGeneric, insertFormulation, insertBrand } from '../../lib/adminQueries'
import { useDrugContext } from '../../context/DrugContext'
import GenericEditor from '../../components/admin/GenericEditor'
import FormulationEditor from '../../components/admin/FormulationEditor'
import BrandEditor from '../../components/admin/BrandEditor'

/**
 * AddDrugFlow — /admin/drugs/new
 *
 * 3-step wizard:
 *   Step 1 — Generic info (name EN/AR, category, class, uses, warnings, textbook doses)
 *   Step 2 — Formulation (concentration, form, route, practical doses)
 *   Step 3 — Brands (at least 1 required)
 *
 * On save: insert generic → insert formulation → insert brands → refresh context → navigate to /admin/drugs
 */

const STEPS = ['Generic', 'Formulation', 'Brands']

const EMPTY_GENERIC = {
  name_en:  '',
  name_ar:  '',
  category: '',
  class:    '',
  uses:     [],
  warnings: [],
  doses:    [],
}

const EMPTY_FORMULATION = {
  concentration: '',
  form:          '',
  route:         '',
  doses:         [],
}

const EMPTY_BRAND = {
  name:         '',
  name_ar:      null,
  manufacturer: null,
  in_stock:     true,
  is_available: true,
}

export default function AddDrugFlow() {
  const navigate      = useNavigate()
  const { refresh }   = useDrugContext()

  const [step,        setStep]        = useState(0)
  const [generic,     setGeneric]     = useState(EMPTY_GENERIC)
  const [formulation, setFormulation] = useState(EMPTY_FORMULATION)
  const [brands,      setBrands]      = useState([{ ...EMPTY_BRAND }])
  const [saving,      setSaving]      = useState(false)
  const [error,       setError]       = useState(null)

  // ─── Patch helpers ──────────────────────────────────────────────────────────

  function patchGeneric(patch)     { setGeneric(g     => ({ ...g,     ...patch })) }
  function patchFormulation(patch) { setFormulation(f => ({ ...f,     ...patch })) }

  // ─── Validation per step ───────────────────────────────────────────────────

  function stepValid() {
    if (step === 0) return generic.name_en.trim() && generic.category
    if (step === 1) return formulation.concentration.trim() && formulation.form && formulation.route
    if (step === 2) return brands.length > 0 && brands.every(b => b.name.trim())
    return false
  }

  // ─── Save ──────────────────────────────────────────────────────────────────

  async function handleSave() {
    setError(null)
    setSaving(true)

    try {
      // 1. Insert generic — generate slug from name_en
      const slug = generic.name_en.trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')

      const { data: newGeneric, error: gErr } = await insertGeneric({
        slug,
        name_en:  generic.name_en.trim(),
        name_ar:  generic.name_ar?.trim() || null,
        category: generic.category,
        class:    generic.class?.trim()   || null,
        uses:     generic.uses,
        warnings: generic.warnings,
        doses:    generic.doses,
      })
      if (gErr) throw new Error(`Generic: ${gErr.message}`)

      // 2. Insert formulation
      const { data: newFormulation, error: fErr } = await insertFormulation({
        generic_id:    newGeneric.id,
        concentration: formulation.concentration.trim(),
        form:          formulation.form,
        route:         formulation.route,
        doses:         formulation.doses,
      })
      if (fErr) throw new Error(`Formulation: ${fErr.message}`)

      // 3. Insert brands
      for (const brand of brands) {
        const { error: bErr } = await insertBrand({
          formulation_id: newFormulation.id,
          name:           brand.name.trim(),
          name_ar:        brand.name_ar?.trim() || null,
          manufacturer:   brand.manufacturer?.trim() || null,
          in_stock:       brand.in_stock,
          is_available:   brand.is_available,
        })
        if (bErr) throw new Error(`Brand "${brand.name}": ${bErr.message}`)
      }

      // 4. Refresh drug context + navigate back
      await refresh()
      navigate('/admin/drugs', { replace: true })

    } catch (err) {
      setError(err.message ?? 'Save failed. Please try again.')
      setSaving(false)
    }
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{
      minHeight: '100dvh',
      backgroundColor: 'var(--color-bg)',
      fontFamily: 'var(--font-body)',
    }}>

      {/* Header */}
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: 'var(--space-3) var(--space-4)',
        borderBottom: '1px solid var(--color-border)',
        backgroundColor: 'var(--color-surface)',
        position: 'sticky', top: 0, zIndex: 50,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <button
            onClick={() => step > 0 ? setStep(s => s - 1) : navigate('/admin/drugs')}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--color-accent)', fontSize: 14, fontWeight: 500,
              fontFamily: 'var(--font-body)', padding: '4px 0',
              display: 'flex', alignItems: 'center', gap: 2,
            }}
          >
            <ChevronLeft size={16} />
            {step > 0 ? STEPS[step - 1] : 'Drug Library'}
          </button>
          <span style={{ color: 'var(--color-border)', fontSize: 16 }}>/</span>
          <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)' }}>
            Add Drug
          </span>
        </div>

        {/* Step indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          {STEPS.map((label, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
              <div style={{
                width: 24, height: 24,
                borderRadius: 'var(--radius-full)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700,
                backgroundColor: i < step ? 'var(--color-instock)'
                  : i === step ? 'var(--color-accent)' : 'var(--color-border)',
                color: i <= step ? '#fff' : 'var(--color-text-tertiary)',
                transition: 'background-color 0.2s ease',
              }}>
                {i < step ? <Check size={13} /> : i + 1}
              </div>
              {i < STEPS.length - 1 && (
                <div style={{
                  width: 16, height: 2,
                  backgroundColor: i < step ? 'var(--color-instock)' : 'var(--color-border)',
                  borderRadius: 2,
                }} />
              )}
            </div>
          ))}
        </div>
      </header>

      {/* Content */}
      <main style={{
        maxWidth: 600, margin: '0 auto',
        padding: 'var(--space-6) var(--space-4) var(--space-12)',
      }}>

        {/* Step title */}
        <div style={{ marginBottom: 'var(--space-5)' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
            Step {step + 1} of {STEPS.length}
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-text-primary)' }}>
            {step === 0 && 'Generic information'}
            {step === 1 && 'Formulation details'}
            {step === 2 && 'Brands'}
          </div>
          <div style={{ fontSize: 13, color: 'var(--color-text-tertiary)', marginTop: 4 }}>
            {step === 0 && 'The drug's scientific identity — shared across all formulations'}
            {step === 1 && 'The specific strength, form, and route for this formulation'}
            {step === 2 && 'Commercial brands available for this formulation'}
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: 'var(--space-2)',
            backgroundColor: '#FEF2F2', border: '1px solid #FECACA',
            borderRadius: 'var(--radius-md)', padding: 'var(--space-3)',
            marginBottom: 'var(--space-4)', fontSize: 13, color: '#DC2626',
          }}>
            <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
            {error}
          </div>
        )}

        {/* Active step editor */}
        <div style={{
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          padding: 'var(--space-5)',
          boxShadow: 'var(--shadow-card)',
          marginBottom: 'var(--space-5)',
        }}>
          {step === 0 && (
            <GenericEditor generic={generic} onChange={patchGeneric} disabled={saving} />
          )}
          {step === 1 && (
            <FormulationEditor formulation={formulation} onChange={patchFormulation} disabled={saving} />
          )}
          {step === 2 && (
            <BrandEditor brands={brands} onChange={setBrands} disabled={saving} />
          )}
        </div>

        {/* Navigation buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--space-3)' }}>
          <button
            type="button"
            onClick={() => step > 0 ? setStep(s => s - 1) : navigate('/admin/drugs')}
            style={secondaryBtn}
          >
            <ChevronLeft size={15} />
            {step === 0 ? 'Cancel' : 'Back'}
          </button>

          {step < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={() => setStep(s => s + 1)}
              disabled={!stepValid()}
              style={primaryBtn(!stepValid())}
            >
              Next: {STEPS[step + 1]}
              <ChevronRight size={15} />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSave}
              disabled={!stepValid() || saving}
              style={primaryBtn(!stepValid() || saving)}
            >
              {saving ? 'Saving…' : 'Save drug'}
              {!saving && <Check size={15} />}
            </button>
          )}
        </div>
      </main>
    </div>
  )
}

// ─── Button styles ────────────────────────────────────────────────────────────

const secondaryBtn = {
  display: 'flex', alignItems: 'center', gap: 'var(--space-1)',
  padding: 'var(--space-3) var(--space-4)',
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--color-border)',
  backgroundColor: 'var(--color-surface)',
  color: 'var(--color-text-secondary)',
  fontSize: 14, fontWeight: 500,
  fontFamily: 'var(--font-body)',
  cursor: 'pointer',
}

function primaryBtn(disabled) {
  return {
    display: 'flex', alignItems: 'center', gap: 'var(--space-1)',
    padding: 'var(--space-3) var(--space-5)',
    borderRadius: 'var(--radius-md)',
    border: 'none',
    backgroundColor: disabled ? 'var(--color-border)' : 'var(--color-accent)',
    color: disabled ? 'var(--color-text-tertiary)' : '#fff',
    fontSize: 14, fontWeight: 600,
    fontFamily: 'var(--font-body)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'background-color 0.15s ease',
  }
}
