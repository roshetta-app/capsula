/**
 * adminQueries.js — Supabase write operations for the admin CMS.
 *
 * Sessions:
 *   5.2 — updateBrandStock, deleteFormulation
 *   5.3 — insertGeneric, updateGeneric, insertFormulation, updateFormulation,
 *           insertBrand, updateBrand, deleteBrand, fetchFormulationWithGeneric
 *   5.4 — insertSpecialty, updateSpecialty, insertCondition, updateCondition,
 *           deleteCondition, insertConditionImage, deleteConditionImage,
 *           uploadConditionImage, fetchConditionForEdit
 *   5.5 — insertPrescription, updatePrescription, deletePrescription,
 *           insertPrescriptionItem, updatePrescriptionItem, deletePrescriptionItem,
 *           insertDrugAlternative, updateDrugAlternative, deleteDrugAlternative,
 *           reorderItems, fetchPrescriptionsForCondition, searchBrandsForTypeahead
 *   3B  — toggleConditionPublished, touchAppMetadata
 */

import { supabase } from './supabase'

// ─── Brands — stock toggles (5.2) ────────────────────────────────────────────

export async function updateBrandStock(id, field, value) {
  const { error } = await supabase
    .from('brands')
    .update({ [field]: value })
    .eq('id', id)
  return { error }
}

// ─── Formulations — delete (5.2) ─────────────────────────────────────────────

export async function deleteFormulation(id) {
  const { error } = await supabase
    .from('formulations')
    .delete()
    .eq('id', id)
  return { error }
}

// ─── Generics (5.3) ──────────────────────────────────────────────────────────

export async function insertGeneric(data) {
  const { data: row, error } = await supabase
    .from('generics')
    .insert(data)
    .select('id, slug')
    .single()
  return { data: row, error }
}

export async function updateGeneric(id, data) {
  const { error } = await supabase
    .from('generics')
    .update(data)
    .eq('id', id)
  return { error }
}

export async function fetchFormulationWithGeneric(formulationId) {
  const { data, error } = await supabase
    .from('formulations')
    .select(`
      id, concentration, form, route,
      doses, doses_structured, default_dose_override, is_published,
      generics (
        id, slug, name_en, name_ar, category, class,
        uses_legacy, warnings_legacy, textbook_doses, textbook_dose_notes,
        uses_structured, mechanism_of_action, card_tagline,
        side_effects_common, side_effects_serious,
        pregnancy_category, breastfeeding_safety,
        crosses_placenta, crosses_bbb,
        contraindications, drug_interactions, dose_adjustments,
        pharmacokinetics, is_published
      ),
      brands ( id, name, name_ar, manufacturer, source, is_published )
    `)
    .eq('id', formulationId)
    .single()
  return { data, error }
}

// ─── Formulations (5.3) ──────────────────────────────────────────────────────

export async function insertFormulation(data) {
  const { data: row, error } = await supabase
    .from('formulations')
    .insert(data)
    .select('id')
    .single()
  return { data: row, error }
}

export async function updateFormulation(id, data) {
  const { error } = await supabase
    .from('formulations')
    .update(data)
    .eq('id', id)
  if (error) return { error }
  return touchAppMetadata('drugs_updated_at')
}

// ─── Brands — full CRUD (5.3) ─────────────────────────────────────────────────

export async function insertBrand(data) {
  const { data: row, error } = await supabase
    .from('brands')
    .insert(data)
    .select('id')
    .single()
  return { data: row, error }
}

export async function updateBrand(id, data) {
  const { error } = await supabase
    .from('brands')
    .update(data)
    .eq('id', id)
  return { error }
}

export async function deleteBrand(id) {
  const { error } = await supabase
    .from('brands')
    .delete()
    .eq('id', id)
  return { error }
}

// ─── Specialties (5.4 + 3H) ──────────────────────────────────────────────────

export async function insertSpecialty(data) {
  const { data: row, error } = await supabase
    .from('specialties')
    .insert(data)
    .select('id, slug')
    .single()
  return { data: row, error }
}

export async function updateSpecialty(id, data) {
  const { error } = await supabase
    .from('specialties')
    .update(data)
    .eq('id', id)
  return { error }
}

/**
 * Fetch all ACTIVE specialties for CMS dropdowns (condition form, filter pills).
 * Returns rows from the specialties table directly — never depends on conditions existing.
 */
export async function fetchSpecialtiesForCMS() {
  const { data, error } = await supabase
    .from('specialties')
    .select('id, name_en, slug, icon_name, color_hex, sort_order, is_active')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
  return { data: data ?? [], error }
}

/**
 * Fetch all specialties with condition counts for the admin manager.
 */
export async function fetchAllSpecialties() {
  const { data, error } = await supabase
    .from('specialties')
    .select(`
      id, name_en, name_ar, slug, icon_name, color_hex,
      sort_order, is_active, created_at,
      conditions!conditions_specialty_id_fkey ( id )
    `)
    .order('sort_order', { ascending: true })

  if (error) return { data: null, error }

  const mapped = data.map(s => ({
    ...s,
    conditionCount: (s.conditions ?? []).length,
    conditions: undefined,
  }))

  return { data: mapped, error: null }
}

/**
 * Toggle is_active on a specialty.
 * Deactivating: moves all its conditions to Uncategorized (stores original id).
 * Activating:   restores conditions that were previously moved from this specialty.
 */
export async function toggleSpecialtyActive(id, isActive) {
  // Move conditions before flipping the flag
  if (!isActive) {
    await supabase.rpc('deactivate_specialty_conditions', { p_specialty_id: id })
  } else {
    await supabase.rpc('restore_conditions_to_specialty', { p_specialty_id: id })
  }

  const { error } = await supabase
    .from('specialties')
    .update({ is_active: isActive })
    .eq('id', id)
  if (error) return { error }
  return touchAppMetadata('conditions_updated_at')
}

/**
 * Delete a specialty. Only safe when conditionCount === 0 and not Uncategorized.
 */
export async function deleteSpecialty(id) {
  const { error } = await supabase
    .from('specialties')
    .delete()
    .eq('id', id)
  if (error) return { error }
  return touchAppMetadata('conditions_updated_at')
}

/**
 * Batch-update sort_order for reordering specialties via drag-and-drop.
 * @param {{ id: string, sort_order: number }[]} items
 */
export async function reorderSpecialties(items) {
  const updates = items.map(({ id, sort_order }) =>
    supabase.from('specialties').update({ sort_order }).eq('id', id)
  )
  const results = await Promise.all(updates)
  const firstError = results.find(r => r.error)?.error ?? null
  return { error: firstError }
}

// ─── Conditions (5.4) ────────────────────────────────────────────────────────

export async function insertCondition(data) {
  const { data: row, error } = await supabase
    .from('conditions')
    .insert(data)
    .select('id, slug')
    .single()
  return { data: row, error }
}

export async function updateCondition(id, data) {
  const { error } = await supabase
    .from('conditions')
    .update(data)
    .eq('id', id)
  return { error }
}

export async function deleteCondition(id) {
  const { error } = await supabase
    .from('conditions')
    .delete()
    .eq('id', id)
  return { error }
}

export async function fetchConditionForEdit(id) {
  const { data, error } = await supabase
    .from('conditions')
    .select(`
      id, name, slug, age_group, is_published,
      card_tagline, definition, icd10_code, epidemiology,
      differential_diagnosis, red_flags, when_to_refer, prognosis,
      clinical_picture, history_questions, examination, investigations,
      patient_instructions, clinical_blocks,
      specialty_id,
      specialties ( id, name_en, slug ),
      condition_images ( id, url, caption, sort_order ),
      prescriptions ( id, label, sort_order )
    `)
    .eq('id', id)
    .single()
  return { data, error }
}

// ─── Condition images (5.4) ──────────────────────────────────────────────────

export async function insertConditionImage(data) {
  const { data: row, error } = await supabase
    .from('condition_images')
    .insert(data)
    .select('id')
    .single()
  return { data: row, error }
}

export async function deleteConditionImage(id) {
  const { error } = await supabase
    .from('condition_images')
    .delete()
    .eq('id', id)
  return { error }
}

export async function uploadConditionImage(file) {
  const ext      = file.name.split('.').pop()
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const path     = `public/${filename}`

  const { error: uploadError } = await supabase.storage
    .from('condition-images')
    .upload(path, file, { cacheControl: '3600', upsert: false })

  if (uploadError) return { url: null, error: uploadError }

  const { data } = supabase.storage
    .from('condition-images')
    .getPublicUrl(path)

  return { url: data.publicUrl, error: null }
}

// ─── Prescriptions (5.5) ─────────────────────────────────────────────────────

/**
 * Fetch all prescriptions for a condition, with full nested items + alternatives.
 * Used by PrescriptionBuilder on mount.
 */
export async function fetchPrescriptionsForCondition(conditionId) {
  const { data, error } = await supabase
    .from('prescriptions')
    .select(`
      id, label, sort_order,
      prescription_items (
        id, type, content, sort_order,
        dose_override, drug_note, drug_note_ar, show_generic_link,
        prescription_drug_alternatives (
          id, dose_instruction, sort_order,
          brand_id,
          brands (
            id, name, name_ar,
            formulation_id,
            formulations (
              id, concentration, form,
              generics ( id, name_en, slug, category )
            )
          )
        )
      )
    `)
    .eq('condition_id', conditionId)
    .order('sort_order', { ascending: true })

  if (error) return { data: null, error }

  const normalised = data.map(p => ({
    ...p,
    prescription_items: (p.prescription_items ?? [])
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(item => ({
        ...item,
        prescription_drug_alternatives: (item.prescription_drug_alternatives ?? [])
          .sort((a, b) => a.sort_order - b.sort_order),
      })),
  }))

  return { data: normalised, error: null }
}

export async function insertPrescription(data) {
  const { data: row, error } = await supabase
    .from('prescriptions')
    .insert(data)
    .select('id, label, sort_order')
    .single()
  return { data: row, error }
}

export async function updatePrescription(id, data) {
  const { error } = await supabase
    .from('prescriptions')
    .update(data)
    .eq('id', id)
  return { error }
}

export async function deletePrescription(id) {
  const { error } = await supabase
    .from('prescriptions')
    .delete()
    .eq('id', id)
  return { error }
}

// ─── Prescription items (5.5) ─────────────────────────────────────────────────

export async function insertPrescriptionItem(data) {
  const { data: row, error } = await supabase
    .from('prescription_items')
    .insert(data)
    .select('id, type, content, sort_order')
    .single()
  return { data: row, error }
}

export async function updatePrescriptionItem(id, data) {
  const { error } = await supabase
    .from('prescription_items')
    .update(data)
    .eq('id', id)
  return { error }
}

export async function deletePrescriptionItem(id) {
  const { error } = await supabase
    .from('prescription_items')
    .delete()
    .eq('id', id)
  return { error }
}

/**
 * Batch update sort_order for a list of items.
 * @param {string} table — 'prescriptions' | 'prescription_items' | 'prescription_drug_alternatives'
 * @param {{ id: string, sort_order: number }[]} items
 */
export async function reorderItems(table, items) {
  const updates = items.map(({ id, sort_order }) =>
    supabase.from(table).update({ sort_order }).eq('id', id)
  )
  const results = await Promise.all(updates)
  const firstError = results.find(r => r.error)?.error ?? null
  return { error: firstError }
}

// ─── Drug alternatives (5.5) ─────────────────────────────────────────────────

export async function insertDrugAlternative(data) {
  const { data: row, error } = await supabase
    .from('prescription_drug_alternatives')
    .insert(data)
    .select('id, brand_id, dose_instruction, sort_order')
    .single()
  return { data: row, error }
}

export async function updateDrugAlternative(id, data) {
  const { error } = await supabase
    .from('prescription_drug_alternatives')
    .update(data)
    .eq('id', id)
  return { error }
}

export async function deleteDrugAlternative(id) {
  const { error } = await supabase
    .from('prescription_drug_alternatives')
    .delete()
    .eq('id', id)
  return { error }
}

/**
 * Typeahead search for brands by name.
 * @param {string} query — partial brand name
 */
export async function searchBrandsForTypeahead(query) {
  const { data, error } = await supabase
    .from('brands')
    .select(`
      id, name, name_ar,
      formulations (
        id, concentration, form,
        generics ( id, name_en, slug, category, doses )
      )
    `)
    .ilike('name', `%${query}%`)
    .limit(20)

  return { data: data ?? [], error }
}

// ─── Conditions — publish toggle (3B) ────────────────────────────────────────

/**
 * Toggle is_published on a condition and invalidate the app cache.
 */
export async function toggleConditionPublished(id, isPublished) {
  const { error } = await supabase
    .from('conditions')
    .update({ is_published: isPublished })
    .eq('id', id)
  if (error) return { error }
  return touchAppMetadata('conditions_updated_at')
}

// ─── Generics — publish toggle + list (3E) ───────────────────────────────────

/**
 * Fetch all generics (published + draft) for the admin CMS list.
 * Returns one row per generic with formulation count.
 */
export async function fetchAllGenerics() {
  const { data, error } = await supabase
    .from('generics')
    .select(`
      id, name_en, name_ar, category, class,
      is_published, updated_at,
      mechanism_of_action,
      uses_legacy, uses_structured,
      warnings_legacy,
      side_effects_common, side_effects_serious,
      pregnancy_category, breastfeeding_safety,
      crosses_placenta, crosses_bbb,
      contraindications, drug_interactions, dose_adjustments,
      pharmacokinetics, textbook_doses, textbook_dose_notes,
      card_tagline,
      formulations ( id )
    `)
    .order('name_en')

  if (error) return { data: null, error }

  const mapped = data.map(g => ({
    ...g,
    formulationCount: (g.formulations ?? []).length,
  }))

  return { data: mapped, error: null }
}

/**
 * Toggle is_published on a generic and invalidate the drugs cache.
 */
export async function toggleGenericPublished(id, isPublished) {
  const { error } = await supabase
    .from('generics')
    .update({ is_published: isPublished })
    .eq('id', id)
  if (error) return { error }
  return touchAppMetadata('drugs_updated_at')
}

/**
 * Delete a generic (cascades to formulations + brands via DB constraints).
 */
export async function deleteGeneric(id) {
  const { error } = await supabase
    .from('generics')
    .delete()
    .eq('id', id)
  if (error) return { error }
  return touchAppMetadata('drugs_updated_at')
}

// ─── Cache invalidation (3B+) ────────────────────────────────────────────────

/**
 * Bump a timestamp column on app_metadata so every client's cache TTL expires.
 * column — e.g. 'conditions_updated_at' | 'drugs_updated_at'
 *
 * Assumes a single-row app_metadata table with id = 'singleton'.
 * Silently succeeds even if the table/column doesn't exist yet.
 */
export async function touchAppMetadata(column) {
  const { error } = await supabase
    .from('app_metadata')
    .update({ [column]: new Date().toISOString() })
    .eq('id', 1)
  return { error: error ?? null }
}



File: src/index.css
---
/* Single entry point — all styles, tokens, and Tailwind come from globals.css */
@import "./styles/globals.css";



File: src/lib/supabase.js
---
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_ANON) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env')
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON)



File: src/pages/ConditionDetailScreen.jsx
---
import { useState, useRef, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useConditionContext } from '../context/ConditionContext'
import { useFavouritesContext } from '../context/FavouritesContext'
import { useRecentlyViewed } from '../hooks/useRecentlyViewed'
import PrescriptionsTab from '../components/conditions/PrescriptionsTab'
import ClinicalDataTab from '../components/conditions/ClinicalDataTab'
import BottomNav from '../components/BottomNav'
import ShareCard from '../components/ui/ShareCard'
import { shareConditionPrescription } from '../utils/sharing'

const AGE_STYLES = {
  adult:     { bg: '#DBEAFE', color: '#1E40AF' },
  pediatric: { bg: '#D1FAE5', color: '#065F46' },
  both:      { bg: '#EDE9FE', color: '#5B21B6' },
}

function ageLabel(group) {
  if (group === 'pediatric') return 'Pediatric'
  if (group === 'both')      return 'All ages'
  return 'Adult'
}

const TABS = ['Rx', 'Clinical']

export default function ConditionDetailScreen() {
  const { slug }    = useParams()
  const navigate    = useNavigate()
  const { conditions, loading } = useConditionContext()
  const { isConditionFavourited, toggleCondition } = useFavouritesContext()
  const { addRecentlyViewed } = useRecentlyViewed()

  const [activeTab, setActiveTab]                   = useState(0)
  const [activePrescriptionIdx, setActivePrescriptionIdx] = useState(0)
  const touchStartX  = useRef(null)
  const touchStartY  = useRef(null)
  const shareCardRef = useRef(null)

  function handleTouchStart(e) {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }

  function handleTouchEnd(e) {
    if (touchStartX.current === null) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    const dy = e.changedTouches[0].clientY - touchStartY.current
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) {
      if (dx < 0 && activeTab < TABS.length - 1) setActiveTab(t => t + 1)
      if (dx > 0 && activeTab > 0)               setActiveTab(t => t - 1)
    }
    touchStartX.current = null
    touchStartY.current = null
  }

  // Add to recently viewed once condition is resolved
  const condition = conditions.find(c => c.slug === slug)
  const isFav = condition ? isConditionFavourited(condition.id) : false

  useEffect(() => {
    if (condition) {
      addRecentlyViewed({ id: condition.id, name: condition.name, slug: condition.slug })
    }
  }, [condition?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Build share card prescription snapshot ─────────────────────────────────

  function buildSharePrescription() {
    const rx = condition?.prescriptions?.[activePrescriptionIdx]
    if (!rx) return null
    return {
      label: rx.label,
      drugs: (rx.drugs ?? []).map(d => ({
        brandName:     d.primaryBrand ?? d.brandName ?? d.name ?? '',
        concentration: d.concentration ?? '',
        form:          d.form ?? '',
        dose:          d.dose_override ?? d.instruction ?? '',
        note:          d.drug_note ?? '',
      })),
    }
  }

  function handleShare() {
    shareConditionPrescription(condition, buildSharePrescription(), shareCardRef)
  }

  // ─── Loading / not found guards ─────────────────────────────────────────────

  if (loading) {
    return (
      <div style={pageStyle}>
        <DetailHeader onBack={() => navigate('/')} condition={null} />
        <div style={{ maxWidth: 680, margin: '0 auto', padding: 'var(--space-8) var(--space-4)', textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: 14 }}>
          Loading…
        </div>
        <BottomNav />
      </div>
    )
  }

  if (!condition) {
    return (
      <div style={pageStyle}>
        <DetailHeader onBack={() => navigate('/')} condition={null} />
        <div style={{ maxWidth: 680, margin: '0 auto', padding: 'var(--space-8) var(--space-4)', textAlign: 'center' }}>
          <div style={{ fontSize: 15, color: 'var(--color-text-secondary)', marginBottom: 'var(--space-2)' }}>Condition not found</div>
          <div style={{ fontSize: 13, color: 'var(--color-text-tertiary)' }}>"{slug}" does not match any condition in the database.</div>
        </div>
        <BottomNav />
      </div>
    )
  }

  return (
    <div style={pageStyle}>
      <DetailHeader
        onBack={() => navigate(-1)}
        condition={condition}
        isFav={isFav}
        onFavToggle={() => toggleCondition(condition.id)}
        onShare={handleShare}
      />

      {/* Hidden ShareCard — off-screen, captured by html2canvas on share */}
      <div style={{ position: 'fixed', top: -9999, left: -9999, zIndex: -1, pointerEvents: 'none' }}>
        <ShareCard
          ref={shareCardRef}
          condition={{ name: condition.name, specialtyName: condition.specialtyName }}
          prescription={buildSharePrescription()}
        />
      </div>

      {/* Tab strip — full-width background, content centred */}
      <div style={{
        position: 'sticky',
        top: 57,
        zIndex: 40,
        backgroundColor: 'var(--color-surface)',
        borderBottom: '1px solid var(--color-border)',
      }}>
        <div style={{
          maxWidth: 680,
          margin: '0 auto',
          display: 'flex',
        }}>
          {TABS.map((label, i) => {
            const isActive = activeTab === i
            return (
              <button
                key={label}
                onClick={() => setActiveTab(i)}
                style={{
                  flex: 1,
                  padding: 'var(--space-3) var(--space-4)',
                  fontSize: 14,
                  fontWeight: isActive ? 600 : 400,
                  fontFamily: 'var(--font-body)',
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  color: isActive ? 'var(--color-accent)' : 'var(--color-text-tertiary)',
                  borderBottom: isActive ? '2px solid var(--color-accent)' : '2px solid transparent',
                  transition: 'color 0.15s ease, border-color 0.15s ease',
                  WebkitTapHighlightColor: 'transparent',
                  outline: 'none',
                }}
              >
                {label}
              </button>
            )
          })}
        </div>
      </div>

      {/*
        Swipeable viewport.
        overflow:hidden clips the off-screen panel.
        The inner 200%-wide row is fine because THIS element has overflow:hidden —
        it never causes a horizontal scrollbar on the page.
      */}
      <div
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        style={{ overflow: 'hidden' }}
      >
        <div style={{
          display: 'flex',
          width: '200%',
          transform: `translateX(${activeTab === 0 ? '0%' : '-50%'})`,
          transition: 'transform 0.28s cubic-bezier(0.4, 0, 0.2, 1)',
        }}>

          {/* Panel 0 — Prescriptions */}
          <div style={{ width: '50%', flexShrink: 0, boxSizing: 'border-box' }}>
            <div style={{ maxWidth: 680, margin: '0 auto', padding: 'var(--space-5) var(--space-4)', paddingBottom: 'calc(var(--space-12) + 60px)' }}>
              <PrescriptionsTab
                prescriptions={condition.prescriptions}
                patientInstructions={condition.patientInstructions}
                conditionId={condition.id}
                onPrescriptionChange={setActivePrescriptionIdx}
              />
            </div>
          </div>

          {/* Panel 1 — Clinical Data */}
          <div style={{ width: '50%', flexShrink: 0, boxSizing: 'border-box' }}>
            <div style={{ maxWidth: 680, margin: '0 auto', padding: 'var(--space-5) var(--space-4)', paddingBottom: 'calc(var(--space-12) + 60px)' }}>
              <ClinicalDataTab condition={condition} />
            </div>
          </div>

        </div>
      </div>

      <BottomNav />
    </div>
  )
}

// ─── Shared page style — same bg, no box ──────────────────────────────────────

const pageStyle = {
  minHeight: '100dvh',
  backgroundColor: 'var(--color-bg)',
  fontFamily: 'var(--font-body)',
  color: 'var(--color-text-primary)',
}

// ─── DetailHeader — full-width bg, content centred ────────────────────────────

function DetailHeader({ onBack, condition, isFav, onFavToggle, onShare }) {
  const ageStyle = condition
    ? (AGE_STYLES[condition.ageGroup] ?? { bg: '#F3F4F6', color: '#374151' })
    : null

  return (
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 50,
      backgroundColor: 'var(--color-surface)',
      borderBottom: '1px solid var(--color-border)',
    }}>
      <div style={{ maxWidth: 680, margin: '0 auto', padding: 'var(--space-3) var(--space-4)' }}>
        {/* Top row: back button + action buttons */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: condition ? 'var(--space-2)' : 0 }}>
          <button
            onClick={onBack}
            aria-label="Back"
            style={{
              display: 'flex', alignItems: 'center', gap: 'var(--space-1)',
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--color-accent)', fontSize: 14, fontWeight: 500,
              fontFamily: 'var(--font-body)', padding: '4px 0',
              WebkitTapHighlightColor: 'transparent', outline: 'none',
            }}
          >
            <ArrowLeft size={16} strokeWidth={2} />
            Back
          </button>

          {/* Share + Star buttons */}
          {condition && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>

              {/* Share button */}
              <button
                onClick={onShare}
                aria-label="Share prescription"
                style={{
                  background: 'none', border: 'none', cursor: 'pointer', padding: 4,
                  color: 'var(--color-text-tertiary)',
                  WebkitTapHighlightColor: 'transparent', outline: 'none',
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24"
                  fill="none" stroke="currentColor" strokeWidth="2"
                  strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                  <polyline points="16 6 12 2 8 6" />
                  <line x1="12" y1="2" x2="12" y2="15" />
                </svg>
              </button>

              {/* Star favourite button */}
              <button
                onClick={onFavToggle}
                aria-label={isFav ? 'Remove from favourites' : 'Add to favourites'}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer', padding: 4,
                  color: isFav ? '#F59E0B' : 'var(--color-text-tertiary)',
                  transition: 'color 0.15s ease',
                  WebkitTapHighlightColor: 'transparent', outline: 'none',
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24"
                  fill={isFav ? 'currentColor' : 'none'}
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                </svg>
              </button>

            </div>
          )}
        </div>

        {condition && (
          <div>
            <h1 style={{
              fontSize: 18, fontWeight: 700,
              color: 'var(--color-text-primary)',
              margin: '0 0 var(--space-2) 0',
              lineHeight: 1.25, letterSpacing: '-0.2px',
            }}>
              {condition.name}
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
              {condition.specialtyName && (
                <span style={{
                  fontSize: 11, fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase',
                  color: 'var(--color-text-tertiary)', backgroundColor: 'var(--color-bg)',
                  border: '1px solid var(--color-border)', padding: '2px 8px', borderRadius: 'var(--radius-full)',
                }}>
                  {condition.specialtyName}
                </span>
              )}
              {condition.ageGroup && (
                <span style={{
                  fontSize: 11, fontWeight: 500,
                  backgroundColor: ageStyle.bg, color: ageStyle.color,
                  padding: '2px 8px', borderRadius: 'var(--radius-full)',
                }}>
                  {ageLabel(condition.ageGroup)}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  )
}


