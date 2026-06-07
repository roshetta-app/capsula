import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, Save, AlertTriangle, Trash2 } from 'lucide-react'
import {
  fetchFormulationWithGeneric,
  updateGeneric,
  updateFormulation,
  insertBrand,
  updateBrand,
  deleteBrand,
  deleteFormulation,
} from '../../lib/adminQueries'
import { useDrugContext } from '../../context/DrugContext'
import GenericEditor from '../../components/admin/GenericEditor'
import FormulationEditor from '../../components/admin/FormulationEditor'
import BrandEditor from '../../components/admin/BrandEditor'

/**
 * FormulationDetailEditor — /admin/drugs/:id
 *
 * Fetches the formulation (with generic + brands) fresh from Supabase on mount.
 * Three collapsible sections: Generic | Formulation | Brands.
 * Save button per section (patch only that section).
 * Delete formulation at bottom (with confirm).
 */

const SECTIONS = ['generic', 'formulation', 'brands']

export default function FormulationDetailEditor() {
  const { id }      = useParams()
  const navigate    = useNavigate()
  const { refresh } = useDrugContext()

  // ─── Fetch state ──────────────────────────────────────────────────────────
  const [loading,  setLoading]  = useState(true)
  const [fetchErr, setFetchErr] = useState(null)

  // ─── Data state ───────────────────────────────────────────────────────────
  const [genericId,       setGenericId]       = useState(null)
  const [generic,         setGeneric]         = useState(null)
  const [formulation,     setFormulation]     = useState(null)
  const [brands,          setBrands]          = useState([])

  // ─── UI state ─────────────────────────────────────────────────────────────
  const [openSection,     setOpenSection]     = useState('generic')
  const [saving,          setSaving]          = useState(null) // 'generic'|'formulation'|'brands'|null
  const [saveError,       setSaveError]       = useState(null)
  const [saveSuccess,     setSaveSuccess]     = useState(null)
  const [confirmDelete,   setConfirmDelete]   = useState(false)
  const [deleting,        setDeleting]        = useState(false)

  // ─── Load ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data, error } = await fetchFormulationWithGeneric(id)
      if (error) {
        setFetchErr(error.message)
        setLoading(false)
        return
      }
      setGenericId(data.generics.id)
      setGeneric({
        name_en:  data.generics.name_en,
        name_ar:  data.generics.name_ar,
        category: data.generics.category,
        class:    data.generics.class,
        uses:     data.generics.uses     ?? [],
        warnings: data.generics.warnings ?? [],
        doses:    data.generics.doses    ?? [],
      })
      setFormulation({
        concentration: data.concentration,
        form:          data.form,
        route:         data.route,
        doses:         data.doses ?? [],
      })
      setBrands((data.brands ?? []).map(b => ({
        id:           b.id,
        name:         b.name,
        name_ar:      b.name_ar,
        manufacturer: b.manufacturer,
        in_stock:     b.in_stock,
        is_available: b.is_available,
      })))
      setLoading(false)
    }
    load()
  }, [id])

  // ─── Section save handlers ────────────────────────────────────────────────

  async function saveGeneric() {
    setSaving('generic')
    setSaveError(null)
    const { error } = await updateGeneric(genericId, {
      name_en:  generic.name_en.trim(),
      name_ar:  generic.name_ar?.trim() || null,
      category: generic.category,
      class:    generic.class?.trim() || null,
      uses:     generic.uses,
      warnings: generic.warnings,
      doses:    generic.doses,
    })
    setSaving(null)
    if (error) { setSaveError(`Generic: ${error.message}`); return }
    setSaveSuccess('generic')
    setTimeout(() => setSaveSuccess(null), 2000)
    await refresh()
  }

  async function saveFormulation() {
    setSaving('formulation')
    setSaveError(null)
    const { error } = await updateFormulation(id, {
      concentration: formulation.concentration.trim(),
      form:          formulation.form,
      route:         formulation.route,
      doses:         formulation.doses,
    })
    setSaving(null)
    if (error) { setSaveError(`Formulation: ${error.message}`); return }
    setSaveSuccess('formulation')
    setTimeout(() => setSaveSuccess(null), 2000)
    await refresh()
  }

  async function saveBrands() {
    setSaving('brands')
    setSaveError(null)
    try {
      for (const brand of brands) {
        const payload = {
          name:         brand.name.trim(),
          name_ar:      brand.name_ar?.trim() || null,
          manufacturer: brand.manufacturer?.trim() || null,
          in_stock:     brand.in_stock,
          is_available: brand.is_available,
        }
        if (brand.id) {
          const { error } = await updateBrand(brand.id, payload)
          if (error) throw new Error(`Brand "${brand.name}": ${error.message}`)
        } else {
          const { error } = await insertBrand({ ...payload, formulation_id: id })
          if (error) throw new Error(`Brand "${brand.name}": ${error.message}`)
        }
      }
      // Brands without id that were removed are not in the list,
      // but existing brands that were removed need explicit delete.
      // BrandEditor tracks removed existing brands via _deleted flag.
      const deleted = brands.filter(b => b._deleted && b.id)
      for (const b of deleted) {
        const { error } = await deleteBrand(b.id)
        if (error) throw new Error(`Delete brand "${b.name}": ${error.message}`)
      }
    } catch (err) {
      setSaveError(err.message)
      setSaving(null)
      return
    }
    setSaving(null)
    setSaveSuccess('brands')
    setTimeout(() => setSaveSuccess(null), 2000)
    await refresh()
  }

  // ─── Delete formulation ───────────────────────────────────────────────────

  async function handleDelete() {
    setDeleting(true)
    const { error } = await deleteFormulation(id)
    if (error) {
      setSaveError(`Delete: ${error.message}`)
      setDeleting(false)
      setConfirmDelete(false)
      return
    }
    await refresh()
    navigate('/admin/drugs', { replace: true })
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  if (loading) return <Shell onBack={() => navigate('/admin/drugs')} title="Edit Drug"><LoadingSkeleton /></Shell>

  if (fetchErr) return (
    <Shell onBack={() => navigate('/admin/drugs')} title="Edit Drug">
      <ErrorBanner message={fetchErr} />
    </Shell>
  )

  return (
    <Shell onBack={() => navigate('/admin/drugs')} title={generic?.name_en ?? 'Edit Drug'}>

      {/* Global save error */}
      {saveError && <ErrorBanner message={saveError} onDismiss={() => setSaveError(null)} />}

      {/* ── Generic section ── */}
      <Section
        title="Generic info"
        open={openSection === 'generic'}
        onToggle={() => setOpenSection(s => s === 'generic' ? null : 'generic')}
        onSave={saveGeneric}
        saving={saving === 'generic'}
        saved={saveSuccess === 'generic'}
        valid={generic?.name_en?.trim() && generic?.category}
      >
        {generic && (
          <GenericEditor
            generic={generic}
            onChange={patch => setGeneric(g => ({ ...g, ...patch }))}
            disabled={saving === 'generic'}
          />
        )}
      </Section>

      {/* ── Formulation section ── */}
      <Section
        title="Formulation"
        open={openSection === 'formulation'}
        onToggle={() => setOpenSection(s => s === 'formulation' ? null : 'formulation')}
        onSave={saveFormulation}
        saving={saving === 'formulation'}
        saved={saveSuccess === 'formulation'}
        valid={formulation?.concentration?.trim() && formulation?.form && formulation?.route}
      >
        {formulation && (
          <FormulationEditor
            formulation={formulation}
            onChange={patch => setFormulation(f => ({ ...f, ...patch }))}
            disabled={saving === 'formulation'}
          />
        )}
      </Section>

      {/* ── Brands section ── */}
      <Section
        title="Brands"
        open={openSection === 'brands'}
        onToggle={() => setOpenSection(s => s === 'brands' ? null : 'brands')}
        onSave={saveBrands}
        saving={saving === 'brands'}
        saved={saveSuccess === 'brands'}
        valid={brands.filter(b => !b._deleted).length > 0}
      >
        <BrandEditor
          brands={brands.filter(b => !b._deleted)}
          onChange={updated => {
            // Merge: keep _deleted flags, replace rest
            const deletedOld = brands.filter(b => b._deleted)
            setBrands([...updated, ...deletedOld])
          }}
          onDelete={brandId => {
            setBrands(prev => prev.map(b => b.id === brandId ? { ...b, _deleted: true } : b))
          }}
          disabled={saving === 'brands'}
        />
      </Section>

      {/* ── Delete formulation ── */}
      <div style={{
        marginTop: 'var(--space-6)',
        padding: 'var(--space-4)',
        backgroundColor: '#FEF2F2',
        border: '1px solid #FECACA',
        borderRadius: 'var(--radius-lg)',
      }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#DC2626', marginBottom: 'var(--space-2)' }}>
          Danger zone
        </div>
        <div style={{ fontSize: 12, color: '#B91C1C', marginBottom: 'var(--space-3)' }}>
          Deleting this formulation will also delete all its brands. This cannot be undone.
        </div>
        {confirmDelete ? (
          <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: '#DC2626', fontWeight: 500 }}>Are you sure?</span>
            <button
              onClick={handleDelete}
              disabled={deleting}
              style={{ ...dangerBtn, opacity: deleting ? 0.5 : 1 }}
            >
              {deleting ? 'Deleting…' : 'Yes, delete'}
            </button>
            <button onClick={() => setConfirmDelete(false)} style={cancelBtn}>
              Cancel
            </button>
          </div>
        ) : (
          <button onClick={() => setConfirmDelete(true)} style={dangerBtn}>
            <Trash2 size={14} />
            Delete formulation
          </button>
        )}
      </div>

    </Shell>
  )
}

// ─── Shell ────────────────────────────────────────────────────────────────────

function Shell({ children, onBack, title }) {
  return (
    <div style={{ minHeight: '100dvh', backgroundColor: 'var(--color-bg)', fontFamily: 'var(--font-body)' }}>
      <header style={{
        display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
        padding: 'var(--space-3) var(--space-4)',
        borderBottom: '1px solid var(--color-border)',
        backgroundColor: 'var(--color-surface)',
        position: 'sticky', top: 0, zIndex: 50,
      }}>
        <button
          onClick={onBack}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--color-accent)', fontSize: 14, fontWeight: 500,
            fontFamily: 'var(--font-body)', padding: '4px 0',
            display: 'flex', alignItems: 'center', gap: 2,
          }}
        >
          <ChevronLeft size={16} />
          Drug Library
        </button>
        <span style={{ color: 'var(--color-border)', fontSize: 16 }}>/</span>
        <span style={{
          fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {title}
        </span>
      </header>
      <main style={{ maxWidth: 600, margin: '0 auto', padding: 'var(--space-5) var(--space-4) var(--space-12)' }}>
        {children}
      </main>
    </div>
  )
}

// ─── Collapsible Section ──────────────────────────────────────────────────────

function Section({ title, open, onToggle, onSave, saving, saved, valid, children }) {
  return (
    <div style={{
      backgroundColor: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
      boxShadow: 'var(--shadow-card)',
      marginBottom: 'var(--space-3)',
    }}>
      {/* Section header */}
      <button
        type="button"
        onClick={onToggle}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: 'var(--space-4)',
          background: 'none', border: 'none', cursor: 'pointer',
          borderBottom: open ? '1px solid var(--color-border)' : 'none',
        }}
      >
        <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)' }}>
          {title}
        </span>
        <span style={{ fontSize: 18, color: 'var(--color-text-tertiary)', lineHeight: 1 }}>
          {open ? '−' : '+'}
        </span>
      </button>

      {/* Section body */}
      {open && (
        <div style={{ padding: 'var(--space-4)' }}>
          {children}

          {/* Save row */}
          <div style={{ marginTop: 'var(--space-4)', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 'var(--space-3)' }}>
            {saved && (
              <span style={{ fontSize: 13, color: 'var(--color-instock)', fontWeight: 500 }}>
                ✓ Saved
              </span>
            )}
            <button
              type="button"
              onClick={onSave}
              disabled={!valid || saving}
              style={{
                display: 'flex', alignItems: 'center', gap: 'var(--space-1)',
                padding: 'var(--space-2) var(--space-4)',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                backgroundColor: (!valid || saving) ? 'var(--color-border)' : 'var(--color-accent)',
                color: (!valid || saving) ? 'var(--color-text-tertiary)' : '#fff',
                fontSize: 13, fontWeight: 600,
                fontFamily: 'var(--font-body)',
                cursor: (!valid || saving) ? 'not-allowed' : 'pointer',
              }}
            >
              <Save size={14} />
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      )}
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
      {[120, 80, 100].map((h, i) => (
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

const dangerBtn = {
  display: 'flex', alignItems: 'center', gap: 'var(--space-1)',
  padding: 'var(--space-2) var(--space-3)',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid #FECACA',
  backgroundColor: '#FEF2F2',
  color: '#DC2626',
  fontSize: 13, fontWeight: 600,
  fontFamily: 'var(--font-body)',
  cursor: 'pointer',
}

const cancelBtn = {
  padding: 'var(--space-2) var(--space-3)',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--color-border)',
  backgroundColor: 'var(--color-surface)',
  color: 'var(--color-text-secondary)',
  fontSize: 13, fontWeight: 500,
  fontFamily: 'var(--font-body)',
  cursor: 'pointer',
}
