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
      id, concentration, form, route, doses,
      generics ( id, slug, name_en, name_ar, category, class, uses, warnings, doses ),
      brands   ( id, name, name_ar, manufacturer, in_stock, is_available )
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
  return { error }
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

// ─── Specialties (5.4) ───────────────────────────────────────────────────────

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
      id, name, slug, age_group,
      clinical_picture, history_questions, examination, investigations,
      patient_instructions,
      specialty_id,
      specialties ( id, name, slug ),
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

  // Normalise nested structure
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
 * Works on any table that has id + sort_order columns.
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
 * Returns brand + formulation + generic info needed by DrugRowEditor.
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
