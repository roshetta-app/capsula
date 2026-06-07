/**
 * adminQueries.js — Supabase write operations for the admin CMS.
 *
 * All functions take an authenticated supabase client (from src/lib/supabase.js).
 * Functions are imported directly by admin pages/components.
 *
 * Functions added per session:
 *   5.2 — updateBrandStock, deleteFormulation
 *   5.3 — insertGeneric, updateGeneric, insertFormulation, updateFormulation,
 *           insertBrand, updateBrand, deleteBrand
 *   5.4 — insertSpecialty, updateSpecialty, insertCondition, updateCondition,
 *           deleteCondition, insertConditionImage, deleteConditionImage, uploadConditionImage
 *   5.5 — insertPrescription, updatePrescription, deletePrescription,
 *           insertPrescriptionItem, updatePrescriptionItem, deletePrescriptionItem,
 *           insertDrugAlternative, updateDrugAlternative, deleteDrugAlternative, reorderItems
 */

import { supabase } from './supabase'

// ─── Brands ──────────────────────────────────────────────────────────────────

/**
 * Toggle in_stock or is_available on a single brand row.
 * Optimistic update is handled in BrandStockRow — this just persists it.
 *
 * @param {string}  id      — brand UUID
 * @param {string}  field   — 'in_stock' | 'is_available'
 * @param {boolean} value
 * @returns {Promise<{ error }>}
 */
export async function updateBrandStock(id, field, value) {
  const { error } = await supabase
    .from('brands')
    .update({ [field]: value })
    .eq('id', id)
  return { error }
}

// ─── Formulations ─────────────────────────────────────────────────────────────

/**
 * Delete a formulation (cascades to brands via FK ON DELETE CASCADE).
 *
 * @param {string} id — formulation UUID
 * @returns {Promise<{ error }>}
 */
export async function deleteFormulation(id) {
  const { error } = await supabase
    .from('formulations')
    .delete()
    .eq('id', id)
  return { error }
}
