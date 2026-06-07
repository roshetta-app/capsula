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
 *   5.5 — prescription builder functions (next session)
 */

import { supabase } from './supabase'

// ─── Brands — stock toggles (5.2) ────────────────────────────────────────────

/**
 * Toggle in_stock or is_available on a single brand row.
 * @param {string}  id    — brand UUID
 * @param {string}  field — 'in_stock' | 'is_available'
 * @param {boolean} value
 */
export async function updateBrandStock(id, field, value) {
  const { error } = await supabase
    .from('brands')
    .update({ [field]: value })
    .eq('id', id)
  return { error }
}

// ─── Formulations — delete (5.2) ─────────────────────────────────────────────

/**
 * Delete a formulation (cascades to brands).
 * @param {string} id — formulation UUID
 */
export async function deleteFormulation(id) {
  const { error } = await supabase
    .from('formulations')
    .delete()
    .eq('id', id)
  return { error }
}

// ─── Generics (5.3) ──────────────────────────────────────────────────────────

/**
 * Insert a new generic row.
 * @param {{ slug, name_en, name_ar, category, class, uses, warnings, doses }} data
 * @returns {Promise<{ data: { id, slug }, error }>}
 */
export async function insertGeneric(data) {
  const { data: row, error } = await supabase
    .from('generics')
    .insert(data)
    .select('id, slug')
    .single()
  return { data: row, error }
}

/**
 * Update an existing generic row.
 * @param {string} id
 * @param {Partial<GenericRow>} data
 */
export async function updateGeneric(id, data) {
  const { error } = await supabase
    .from('generics')
    .update(data)
    .eq('id', id)
  return { error }
}

/**
 * Fetch a single formulation with its generic and brands.
 * Used by FormulationDetailEditor to pre-populate all editors.
 * @param {string} formulationId
 */
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

/**
 * Insert a new formulation row.
 * @param {{ generic_id, concentration, form, route, doses }} data
 * @returns {Promise<{ data: { id }, error }>}
 */
export async function insertFormulation(data) {
  const { data: row, error } = await supabase
    .from('formulations')
    .insert(data)
    .select('id')
    .single()
  return { data: row, error }
}

/**
 * Update an existing formulation row.
 * @param {string} id
 * @param {Partial<FormulationRow>} data
 */
export async function updateFormulation(id, data) {
  const { error } = await supabase
    .from('formulations')
    .update(data)
    .eq('id', id)
  return { error }
}

// ─── Brands — full CRUD (5.3) ─────────────────────────────────────────────────

/**
 * Insert a new brand row.
 * @param {{ formulation_id, name, name_ar, manufacturer, in_stock, is_available }} data
 * @returns {Promise<{ data: { id }, error }>}
 */
export async function insertBrand(data) {
  const { data: row, error } = await supabase
    .from('brands')
    .insert(data)
    .select('id')
    .single()
  return { data: row, error }
}

/**
 * Update an existing brand row.
 * @param {string} id
 * @param {Partial<BrandRow>} data
 */
export async function updateBrand(id, data) {
  const { error } = await supabase
    .from('brands')
    .update(data)
    .eq('id', id)
  return { error }
}

/**
 * Delete a brand row.
 * @param {string} id
 */
export async function deleteBrand(id) {
  const { error } = await supabase
    .from('brands')
    .delete()
    .eq('id', id)
  return { error }
}

// ─── Specialties (5.4) ───────────────────────────────────────────────────────

/**
 * Insert a new specialty row.
 * @param {{ name: string, slug: string, sort_order?: number }} data
 * @returns {Promise<{ data: { id, slug }, error }>}
 */
export async function insertSpecialty(data) {
  const { data: row, error } = await supabase
    .from('specialties')
    .insert(data)
    .select('id, slug')
    .single()
  return { data: row, error }
}

/**
 * Update an existing specialty row.
 * @param {string} id
 * @param {Partial<SpecialtyRow>} data
 */
export async function updateSpecialty(id, data) {
  const { error } = await supabase
    .from('specialties')
    .update(data)
    .eq('id', id)
  return { error }
}

// ─── Conditions (5.4) ────────────────────────────────────────────────────────

/**
 * Insert a new condition row.
 * @param {{ specialty_id, name, slug, age_group, clinical_picture,
 *           history_questions, examination, investigations,
 *           patient_instructions }} data
 * @returns {Promise<{ data: { id, slug }, error }>}
 */
export async function insertCondition(data) {
  const { data: row, error } = await supabase
    .from('conditions')
    .insert(data)
    .select('id, slug')
    .single()
  return { data: row, error }
}

/**
 * Update an existing condition row.
 * @param {string} id
 * @param {Partial<ConditionRow>} data
 */
export async function updateCondition(id, data) {
  const { error } = await supabase
    .from('conditions')
    .update(data)
    .eq('id', id)
  return { error }
}

/**
 * Delete a condition (cascades to images, prescriptions, items, alternatives).
 * @param {string} id
 */
export async function deleteCondition(id) {
  const { error } = await supabase
    .from('conditions')
    .delete()
    .eq('id', id)
  return { error }
}

/**
 * Fetch a single condition with its images and prescriptions (for editor pre-fill).
 * @param {string} id — condition UUID
 */
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

/**
 * Insert a condition_images row (after uploading the file separately).
 * @param {{ condition_id, url, caption, sort_order }} data
 * @returns {Promise<{ data: { id }, error }>}
 */
export async function insertConditionImage(data) {
  const { data: row, error } = await supabase
    .from('condition_images')
    .insert(data)
    .select('id')
    .single()
  return { data: row, error }
}

/**
 * Update a condition_images row (e.g. caption or sort_order).
 * @param {string} id
 * @param {{ caption?: string, sort_order?: number }} data
 */
export async function updateConditionImage(id, data) {
  const { error } = await supabase
    .from('condition_images')
    .update(data)
    .eq('id', id)
  return { error }
}

/**
 * Delete a condition_images row.
 * @param {string} id
 */
export async function deleteConditionImage(id) {
  const { error } = await supabase
    .from('condition_images')
    .delete()
    .eq('id', id)
  return { error }
}

/**
 * Upload an image file to Supabase Storage 'condition-images' bucket.
 * Returns the public URL on success.
 *
 * @param {File} file
 * @returns {Promise<{ url: string|null, error }>}
 */
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
