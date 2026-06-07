/**
 * adminQueries.js — Supabase write operations for the admin CMS.
 *
 * Sessions:
 *   5.2 — updateBrandStock, deleteFormulation
 *   5.3 — insertGeneric, updateGeneric, insertFormulation, updateFormulation,
 *           insertBrand, updateBrand, deleteBrand
 *   5.4 — insertSpecialty, updateSpecialty, insertCondition, updateCondition,
 *           deleteCondition, insertConditionImage, deleteConditionImage, uploadConditionImage
 *   5.5 — prescription builder functions
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
 * Fetch a single generic with its formulations and brands.
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
