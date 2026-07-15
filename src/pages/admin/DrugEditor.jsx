/**
 * DrugEditor.jsx — /admin/drugs/generic/:genericId
 *
 * Unified editor: one page to manage a generic's info, all its formulations,
 * and each formulation's brands — no more bouncing between 3 separate screens.
 *
 * Layout:
 *   ┌─ Header: Drug Library › {genericName}  [Save Generic] ─────────────────┐
 *   │                                                                          │
 *   │  ▾ Generic info          (collapsible, open by default)                 │
 *   │                                                                          │
 *   │  ▾ 500mg · Capsule · Oral          [● Live]  [Save]  [✕]               │
 *   │      FormulationEditor + BrandEditor inline                              │
 *   │                                                                          │
 *   │  ▾ 250mg/5ml · Syrup · Oral        [○ Draft] [Save]  [✕]               │
 *   │      ...                                                                 │
 *   │                                                                          │
 *   │  [+ Add Formulation]                                                     │
 *   └──────────────────────────────────────────────────────────────────────────┘
 */

import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, Plus, Save, Trash2, AlertTriangle, Check, ChevronDown, ChevronRight } from 'lucide-react'
import { useToast } from '../../context/ToastContext'
import { useDrugContext } from '../../context/DrugContext'
import GenericEditor from '../../components/admin/GenericEditor'
import FormulationEditor from '../../components/admin/FormulationEditor'
import BrandEditor from '../../components/admin/BrandEditor'
import ConfirmModal from '../../components/admin/ConfirmModal'
import {
  updateGeneric,
  insertFormulation,
  updateFormulation,
  deleteFormulation,
  insertBrand,
  updateBrand,
  deleteBrand,
  touchAppMetadata,
} from '../../lib/adminQueries'
import { supabase } from '../../lib/supabase'

// ─── Empty states ─────────────────────────────────────────────────────────────

const EMPTY_FORMULATION = {
  concentration: '',
  form: '',
  route: '',
  doses: [],
  default_dose_override: null,
  is_published: true,
  strength_value: null,
  strength_unit: null,
  strength_basis: null,
  form_modifier: [],
  device_type: null,
  route_details: [],
  formulation_note: null,
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function DrugEditor() {
  const { genericId } = useParams()
  const navigate      = useNavigate()
  const { toast }     = useToast()
  const { refresh }   = useDrugContext()

  // ── Fetch state ─────────────────────────────────────────────────────────────
  const [loading,  setLoading]  = useState(true)
  const [fetchErr, setFetchErr] = useState(null)

  // ── Data ────────────────────────────────────────────────────────────────────
  const [generic,       setGeneric]       = useState(null)
  const [formulations,  setFormulations]  = useState([])  // each has .brands[]

  // ── UI ──────────────────────────────────────────────────────────────────────
  const [genericOpen,   setGenericOpen]   = useState(true)
  const [openFormId,    setOpenFormId]    = useState(null)  // which formulation is expanded
  const [savingGeneric, setSavingGeneric] = useState(false)
  const [savedGeneric,  setSavedGeneric]  = useState(false)
  const [savingFormId,  setSavingFormId]  = useState(null)
  const [savedFormId,   setSavedFormId]   = useState(null)
  const [confirmDel,    setConfirmDel]    = useState(null)  // formulation to delete
  const [deleting,      setDeleting]      = useState(false)
  const [globalError,   setGlobalError]   = useState(null)
  const [addingForm,    setAddingForm]    = useState(false)

  // ── Load ────────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true)
    setFetchErr(null)

    const { data: gData, error: gErr } = await supabase
      .from('generics')
      .select(`
        id, slug, name_en, name_ar, category, class, is_published,
        card_tagline, mechanism_of_action,
        uses_legacy, uses_structured,
        warnings_legacy,
        side_effects_common, side_effects_serious,
        pregnancy_category, breastfeeding_safety,
        crosses_placenta, crosses_bbb,
        contraindications, drug_interactions, dose_adjustments,
        pharmacokinetics, textbook_doses, textbook_dose_notes
      `)
      .eq('id', genericId)
      .single()

    if (gErr) { setFetchErr(gErr.message); setLoading(false); return }
    setGeneric(gData)

    const { data: fData, error: fErr } = await supabase
      .from('formulations')
      .select(`
        id, concentration, form, route,
        strength_value, strength_unit, strength_basis, strength_structured,
        form_modifier, device_type, route_details, formulation_note,
        doses_structured, default_dose_override, is_published,
        brands ( id, name, name_ar, manufacturer, source, is_published )
      `)
      .eq('generic_id', genericId)
      .order('concentration')

    if (fErr) { setFetchErr(fErr.message); setLoading(false); return }

    setFormulations(fData.map(f => ({
      ...f,
      doses: f.doses_structured ?? [],
      brands: (f.brands ?? []).map(b => ({ ...b })),
    })))

    setLoading(false)
  }, [genericId])

  useEffect(() => { load() }, [load])

  // ── Save generic ────────────────────────────────────────────────────────────
  async function saveGeneric() {
    setSavingGeneric(true)
    setGlobalError(null)
    const { error } = await updateGeneric(genericId, {
      name_en:              generic.name_en?.trim(),
      name_ar:              generic.name_ar?.trim() || null,
      category:             generic.category,
      class:                generic.class?.trim() || null,
      is_published:         generic.is_published ?? true,
      card_tagline:         generic.card_tagline?.trim() || null,
      mechanism_of_action:  generic.mechanism_of_action?.trim() || null,
      uses_structured:      generic.uses_structured ?? null,
      uses_legacy:          generic.uses_legacy ?? [],
      warnings_legacy:      generic.warnings_legacy ?? [],
      side_effects_common:  generic.side_effects_common ?? [],
      side_effects_serious: generic.side_effects_serious ?? [],
      pregnancy_category:   generic.pregnancy_category || null,
      breastfeeding_safety: generic.breastfeeding_safety || null,
      crosses_placenta:     generic.crosses_placenta || null,
      crosses_bbb:          generic.crosses_bbb || null,
      contraindications:    generic.contraindications ?? [],
      drug_interactions:    generic.drug_interactions ?? [],
      dose_adjustments:     generic.dose_adjustments ?? [],
      pharmacokinetics:     generic.pharmacokinetics ?? null,
      textbook_doses:       generic.textbook_doses ?? [],
      textbook_dose_notes:  generic.textbook_dose_notes?.trim() || null,
    })
    setSavingGeneric(false)
    if (error) { setGlobalError(`Generic: ${error.message}`); return }
    setSavedGeneric(true)
    setTimeout(() => setSavedGeneric(false), 2500)
    await touchAppMetadata('drugs_updated_at')
    await refresh()
    toast.success('Generic saved')
  }

  // ── Save formulation ────────────────────────────────────────────────────────
  async function saveFormulation(f) {
    setSavingFormId(f.id)
    setGlobalError(null)

    // 1. Update formulation fields
    const { error: fErr } = await updateFormulation(f.id, {
      concentration:        f.concentration.trim(),
      form:                 f.form,
      route:                f.route,
      strength_value:       f.strength_value?.trim() || null,
      strength_unit:        f.strength_unit?.trim() || null,
      strength_basis:       f.strength_basis?.trim() || null,
      strength_structured:  f.strength_structured ?? null,
      form_modifier:        f.form_modifier ?? [],
      device_type:          f.device_type?.trim() || null,
      route_details:        f.route_details ?? [],
      formulation_note:     f.formulation_note?.trim() || null,
      doses_structured:     f.doses,
      default_dose_override: f.default_dose_override || null,
      is_published:         f.is_published ?? true,
    })
    if (fErr) { setGlobalError(`Formulation: ${fErr.message}`); setSavingFormId(null); return }

    // 2. Sync brands: upsert existing, insert new, delete marked
    try {
      for (const brand of f.brands) {
        if (brand._deleted) {
          if (brand.id) {
            const { error } = await deleteBrand(brand.id)
            if (error) throw new Error(`Delete brand: ${error.message}`)
          }
          continue
        }
        const payload = {
          name:         brand.name.trim(),
          name_ar:      brand.name_ar?.trim() || null,
          manufacturer: brand.manufacturer?.trim() || null,
          source:       brand.source ?? 'manual',
          is_published: brand.is_published ?? true,
        }
        if (brand.id) {
          const { error } = await updateBrand(brand.id, payload)
          if (error) throw new Error(`Update brand "${brand.name}": ${error.message}`)
        } else {
          const { error } = await insertBrand({ ...payload, formulation_id: f.id })
          if (error) throw new Error(`Insert brand "${brand.name}": ${error.message}`)
        }
      }
    } catch (err) {
      setGlobalError(err.message)
      setSavingFormId(null)
      return
    }

    setSavingFormId(null)
    setSavedFormId(f.id)
    setTimeout(() => setSavedFormId(null), 2500)
    await refresh()
    toast.success('Formulation saved')
    // Reload brands to pick up new IDs
    load()
  }

  // ── Add formulation ─────────────────────────────────────────────────────────
  async function addFormulation() {
    setAddingForm(true)
    setGlobalError(null)

    // Generate a slug: generic slug + timestamp for uniqueness
    const { data: gRow } = await supabase
      .from('generics').select('slug').eq('id', genericId).single()
    const base = gRow?.slug ?? genericId
    const slug = `${base}-new-${Date.now()}`

    const { data: newF, error } = await insertFormulation({
      generic_id:    genericId,
      concentration: 'New concentration',
      form:          'tablet',
      route:         'oral',
      slug,
      strength_value:    null,
      strength_unit:     null,
      strength_basis:    null,
      strength_structured: null,
      form_modifier:     [],
      device_type:       null,
      route_details:     [],
      formulation_note:  null,
      doses_structured: [],
      is_published:  false,
    })

    setAddingForm(false)
    if (error) { setGlobalError(`Add formulation: ${error.message}`); return }

    // Reload and open the new formulation
    await load()
    setOpenFormId(newF.id)
    toast.success('Formulation added — fill in the details and save')
  }

  // ── Delete formulation ──────────────────────────────────────────────────────
  async function handleDeleteFormulation() {
    const f = confirmDel
    setConfirmDel(null)
    setDeleting(true)
    const { error } = await deleteFormulation(f.id)
    setDeleting(false)
    if (error) { setGlobalError(`Delete: ${error.message}`); return }
    setFormulations(prev => prev.filter(x => x.id !== f.id))
    if (openFormId === f.id) setOpenFormId(null)
    await refresh()
    toast.success('Formulation deleted')
  }

  // ── Patch helpers ────────────────────────────────────────────────────────────
  function patchFormulation(id, patch) {
    setFormulations(prev => prev.map(f => f.id === id ? { ...f, ...patch } : f))
  }

  function patchBrands(formId, updatedBrands) {
    setFormulations(prev => prev.map(f =>
      f.id === formId ? { ...f, brands: updatedBrands } : f
    ))
  }

  function markBrandDeleted(formId, brandId) {
    setFormulations(prev => prev.map(f =>
      f.id === formId
        ? { ...f, brands: f.brands.map(b => b.id === brandId ? { ...b, _deleted: true } : b) }
        : f
    ))
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  if (loading) return (
    <Shell name="Loading…" onBack={() => navigate('/admin/drugs')}>
      <LoadingSkeleton />
    </Shell>
  )

  if (fetchErr) return (
    <Shell name="Error" onBack={() => navigate('/admin/drugs')}>
      <ErrorBanner message={fetchErr} />
    </Shell>
  )

  const genericValid = generic?.name_en?.trim() && generic?.category

  return (
    <Shell name={generic?.name_en ?? 'Drug'} onBack={() => navigate('/admin/drugs')}>

      {globalError && (
        <ErrorBanner message={globalError} onDismiss={() => setGlobalError(null)} />
      )}

      {/* ── Generic section ────────────────────────────────────────────────── */}
      <SectionCard
        title="Generic info"
        badge={generic?.is_published ? 'Live' : 'Draft'}
        badgeLive={generic?.is_published}
        open={genericOpen}
        onToggle={() => setGenericOpen(o => !o)}
        saveSlot={
          <SaveRow
            onSave={saveGeneric}
            saving={savingGeneric}
            saved={savedGeneric}
            valid={genericValid}
          />
        }
      >
        <GenericEditor
          generic={generic}
          onChange={patch => setGeneric(g => ({ ...g, ...patch }))}
          disabled={savingGeneric}
        />
      </SectionCard>

      {/* ── Formulations ───────────────────────────────────────────────────── */}
      <div style={{ marginTop: 'var(--space-5)' }}>
        <div style={{
          fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
          letterSpacing: '0.08em', color: 'var(--color-text-tertiary)',
          marginBottom: 'var(--space-3)',
        }}>
          Formulations ({formulations.length})
        </div>

        {formulations.length === 0 && (
          <div style={{
            textAlign: 'center', padding: 'var(--space-8)',
            color: 'var(--color-text-tertiary)', fontSize: 14,
            backgroundColor: 'var(--color-surface)',
            border: '1px dashed var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            marginBottom: 'var(--space-3)',
          }}>
            No formulations yet. Add one below.
          </div>
        )}

        {formulations.map(f => {
          const isOpen    = openFormId === f.id
          const isSaving  = savingFormId === f.id
          const isSaved   = savedFormId === f.id
          const visibleBrands = f.brands.filter(b => !b._deleted)
          const formValid = f.form && f.route

          return (
            <SectionCard
              key={f.id}
              title={[f.concentration, f.form, f.route].filter(Boolean).join(' · ')}
              badge={f.is_published ? 'Live' : 'Draft'}
              badgeLive={f.is_published}
              open={isOpen}
              onToggle={() => setOpenFormId(isOpen ? null : f.id)}
              deleteSlot={
                <button
                  onClick={e => { e.stopPropagation(); setConfirmDel(f) }}
                  title="Delete formulation"
                  style={iconDangerBtnStyle}
                >
                  <Trash2 size={13} />
                </button>
              }
              saveSlot={
                <SaveRow
                  onSave={() => saveFormulation(f)}
                  saving={isSaving}
                  saved={isSaved}
                  valid={formValid}
                />
              }
            >
              {/* Formulation fields */}
              <FormulationEditor
                formulation={{
                  concentration:        f.concentration,
                  form:                 f.form,
                  route:                f.route,
                  doses:                f.doses,
                  default_dose_override: f.default_dose_override,
                  is_published:         f.is_published,
                  strength_value:       f.strength_value,
                  strength_unit:        f.strength_unit,
                  strength_basis:       f.strength_basis,
                  strength_structured:  f.strength_structured,
                  form_modifier:        f.form_modifier,
                  device_type:          f.device_type,
                  route_details:        f.route_details,
                  formulation_note:     f.formulation_note,
                }}
                genericName={generic?.name_en}
                onChange={patch => patchFormulation(f.id, patch)}
                disabled={isSaving}
              />

              {/* Brand divider */}
              <div style={{
                margin: 'var(--space-5) 0 var(--space-4)',
                borderTop: '1px solid var(--color-border)',
                paddingTop: 'var(--space-4)',
              }}>
                <div style={{
                  fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                  letterSpacing: '0.08em', color: 'var(--color-text-tertiary)',
                  marginBottom: 'var(--space-3)',
                }}>
                  Brands ({visibleBrands.length})
                </div>
                <BrandEditor
                  brands={visibleBrands}
                  onChange={updated => patchBrands(f.id, [
                    ...updated,
                    ...f.brands.filter(b => b._deleted),
                  ])}
                  onDelete={brandId => markBrandDeleted(f.id, brandId)}
                  disabled={isSaving}
                />
              </div>
            </SectionCard>
          )
        })}

        {/* Add Formulation */}
        <button
          onClick={addFormulation}
          disabled={addingForm}
          style={{
            display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
            width: '100%',
            padding: 'var(--space-3) var(--space-4)',
            borderRadius: 'var(--radius-lg)',
            border: '1.5px dashed var(--color-border)',
            backgroundColor: 'transparent',
            color: addingForm ? 'var(--color-text-tertiary)' : 'var(--color-accent)',
            fontSize: 14, fontWeight: 500,
            fontFamily: 'var(--font-body)',
            cursor: addingForm ? 'not-allowed' : 'pointer',
            justifyContent: 'center',
            marginTop: 'var(--space-3)',
          }}
        >
          <Plus size={15} />
          {addingForm ? 'Adding…' : 'Add Formulation'}
        </button>
      </div>

      {/* Confirm delete formulation */}
      {confirmDel && (
        <ConfirmModal
          isOpen
          title="Delete formulation?"
          message={`Delete "${confirmDel.concentration} ${confirmDel.form}"? All its brands will also be deleted. This cannot be undone.`}
          confirmLabel={deleting ? 'Deleting…' : 'Delete'}
          danger
          onConfirm={handleDeleteFormulation}
          onCancel={() => setConfirmDel(null)}
        />
      )}

    </Shell>
  )
}

// ─── Shell ────────────────────────────────────────────────────────────────────

function Shell({ children, name, onBack }) {
  return (
    <div style={{ minHeight: '100dvh', backgroundColor: 'var(--color-bg)', fontFamily: 'var(--font-body)' }}>
      <header style={{
        display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
        padding: 'var(--space-3) var(--space-4)',
        borderBottom: '1px solid var(--color-border)',
        backgroundColor: 'var(--color-surface)',
        position: 'sticky', top: 0, zIndex: 50,
      }}>
        <button onClick={onBack} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--color-accent)', fontSize: 14, fontWeight: 500,
          fontFamily: 'var(--font-body)', padding: '4px 0',
          display: 'flex', alignItems: 'center', gap: 2,
        }}>
          <ChevronLeft size={16} />
          Drug Library
        </button>
        <span style={{ color: 'var(--color-border)', fontSize: 16 }}>/</span>
        <span style={{
          fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {name}
        </span>
      </header>
      <main style={{
        maxWidth: 680, margin: '0 auto',
        padding: 'var(--space-5) var(--space-4) var(--space-16)',
      }}>
        {children}
      </main>
    </div>
  )
}

// ─── SectionCard ──────────────────────────────────────────────────────────────

function SectionCard({ title, badge, badgeLive, open, onToggle, children, saveSlot, deleteSlot }) {
  return (
    <div style={{
      backgroundColor: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
      boxShadow: 'var(--shadow-card)',
      marginBottom: 'var(--space-3)',
    }}>
      {/* Header row — clickable to toggle */}
      <div
        onClick={onToggle}
        style={{
          display: 'flex', alignItems: 'center',
          padding: 'var(--space-3) var(--space-4)',
          borderBottom: open ? '1px solid var(--color-border)' : 'none',
          cursor: 'pointer', userSelect: 'none',
          gap: 'var(--space-2)',
        }}
      >
        <span style={{ color: 'var(--color-text-tertiary)', flexShrink: 0 }}>
          {open ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
        </span>
        <span style={{
          flex: 1, fontSize: 14, fontWeight: 600,
          color: 'var(--color-text-primary)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {title}
        </span>
        {badge && (
          <span style={{
            fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
            padding: '2px 8px', borderRadius: 'var(--radius-full)',
            backgroundColor: badgeLive ? '#D1FAE5' : 'var(--color-bg)',
            color: badgeLive ? '#065F46' : 'var(--color-text-tertiary)',
            border: `1px solid ${badgeLive ? '#6EE7B7' : 'var(--color-border)'}`,
            flexShrink: 0,
          }}>
            {badge}
          </span>
        )}
        {/* Stop propagation on action buttons so clicks don't toggle */}
        {deleteSlot && (
          <span onClick={e => e.stopPropagation()}>
            {deleteSlot}
          </span>
        )}
      </div>

      {/* Body */}
      {open && (
        <div style={{ padding: 'var(--space-4)' }}>
          {children}
          {saveSlot && (
            <div style={{ marginTop: 'var(--space-4)', borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-4)' }}>
              {saveSlot}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── SaveRow ──────────────────────────────────────────────────────────────────

function SaveRow({ onSave, saving, saved, valid }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 'var(--space-3)' }}>
      {saved && (
        <span style={{ fontSize: 13, color: 'var(--color-instock)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4 }}>
          <Check size={13} /> Saved
        </span>
      )}
      <button
        onClick={onSave}
        disabled={!valid || saving}
        style={{
          display: 'flex', alignItems: 'center', gap: 'var(--space-1)',
          padding: 'var(--space-2) var(--space-4)',
          borderRadius: 'var(--radius-sm)', border: 'none',
          backgroundColor: (!valid || saving) ? 'var(--color-border)' : 'var(--color-accent)',
          color: (!valid || saving) ? 'var(--color-text-tertiary)' : '#fff',
          fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-body)',
          cursor: (!valid || saving) ? 'not-allowed' : 'pointer',
        }}
      >
        <Save size={13} />
        {saving ? 'Saving…' : 'Save'}
      </button>
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ErrorBanner({ message, onDismiss }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 'var(--space-2)',
      backgroundColor: '#FEF2F2', border: '1px solid #FECACA',
      borderRadius: 'var(--radius-md)', padding: 'var(--space-3)',
      marginBottom: 'var(--space-4)', fontSize: 13, color: '#DC2626',
    }}>
      <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
      <span style={{ flex: 1 }}>{message}</span>
      {onDismiss && (
        <button onClick={onDismiss} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#DC2626', padding: 0 }}>
          ✕
        </button>
      )}
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      {[160, 80, 100].map((h, i) => (
        <div key={i} style={{
          height: h,
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          animation: 'shimmer 1.4s ease-in-out infinite',
        }} />
      ))}
    </div>
  )
}

const iconDangerBtnStyle = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  width: 26, height: 26,
  borderRadius: 'var(--radius-sm)',
  border: '1px solid #FECACA',
  backgroundColor: '#FEF2F2',
  color: '#DC2626',
  cursor: 'pointer',
  flexShrink: 0,
}