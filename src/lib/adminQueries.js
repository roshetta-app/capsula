/**
 * adminQueries.js — Supabase write operations for the admin CMS.
 *
 * Sessions:
 *   5.2 — updateBrandStock, deleteFormulation
 *   5.3 — insertGeneric, updateGeneric, insertFormulation, updateFormulation,
 *           insertBrand, updateBrand, deleteBrand, fetchFormulationWithGeneric
 *   5.4 — insertSpecialty, updateSpecialty, insertCondition, updateCondition,
 *           deleteCondition, fetchConditionForEdit
 *   5.5 — insertPrescription, updatePrescription, deletePrescription,
 *           insertPrescriptionItem, updatePrescriptionItem, deletePrescriptionItem,
 *           insertDrugAlternative, updateDrugAlternative, deleteDrugAlternative,
 *           reorderItems, fetchPrescriptionsForCondition, searchBrandsForTypeahead
 *   3B  — toggleConditionPublished, touchAppMetadata
 *   3E  — fetchAllGenerics, toggleGenericPublished, deleteGeneric
 *   3.8 — fetchConditionForEdit updated (condition_blocks join), saveConditionBlocks (new)
 *         toggleFormulationPublished, toggleBrandPublished (new)
 *   3.10 — fetchAllTags, fetchTagsForCondition, syncConditionTags (new)
 *   1A.2 — fetchAllCategories, fetchCategoriesForCMS, insertCategory, updateCategory,
 *           deleteCategory, reorderCategories, toggleCategoryActive
 *   1A.3 — uploadCategoryIcon (new, reuses specialty-icons bucket)
 *   DrugCMS fix — fetchGenericsPage (new, added alongside fetchAllGenerics):
 *           real server-side search/category-filter/50-cap query for the CMS list
 */

import { supabase }  from './supabase'
import { logAudit }  from '../utils/auditLogger'

// ─── Helpers ─────────────────────────────────────────────────────────────────

// Converts a tag name to a URL-safe slug.
// Falls back to a short random suffix for non-Latin names so slug is never empty.
function tagNameToSlug(name) {
  const latin = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  if (latin.length >= 2) return latin
  return `tag-${Math.random().toString(36).slice(2, 6)}`
}

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
  if (!error) await logAudit('delete', 'formulations', id)
  return { error }
}

// ─── Generics (5.3) ──────────────────────────────────────────────────────────

export async function insertGeneric(data) {
  const { data: row, error } = await supabase
    .from('generics')
    .insert(data)
    .select('id, slug')
    .single()
  if (!error && row) await logAudit('create', 'generics', row.id, data.name_en, data)
  return { data: row, error }
}

export async function updateGeneric(id, data) {
  const { error } = await supabase
    .from('generics')
    .update(data)
    .eq('id', id)
  if (!error) await logAudit('update', 'generics', id, data.name_en ?? null, data)
  return { error }
}

export async function fetchFormulationWithGeneric(formulationId) {
  const { data, error } = await supabase
    .from('formulations')
    .select(`
      id, concentration, form, route,
      doses_structured, default_dose_override, is_published,
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
  if (!error && row) await logAudit('create', 'formulations', row.id, null, data)
  return { data: row, error }
}

export async function updateFormulation(id, data) {
  const { error } = await supabase
    .from('formulations')
    .update(data)
    .eq('id', id)
  if (error) return { error }
  await logAudit('update', 'formulations', id, null, data)
  return touchAppMetadata('drugs_updated_at')
}

// ─── Brands — full CRUD (5.3) ─────────────────────────────────────────────────

export async function insertBrand(data) {
  const { data: row, error } = await supabase
    .from('brands')
    .insert(data)
    .select('id')
    .single()
  if (!error && row) await logAudit('create', 'brands', row.id, data.name ?? null, data)
  return { data: row, error }
}

export async function updateBrand(id, data) {
  const { error } = await supabase
    .from('brands')
    .update(data)
    .eq('id', id)
  if (!error) await logAudit('update', 'brands', id, data.name ?? null, data)
  return { error }
}

export async function deleteBrand(id) {
  const { error } = await supabase
    .from('brands')
    .delete()
    .eq('id', id)
  if (!error) await logAudit('delete', 'brands', id)
  return { error }
}

// ─── Brands scoped to one formulation (Phase 3, 2026-06-20) ──────────────────
//
// Used by the "same formulation, different brand" alternative picker
// (masterplan §3.3 / prescription_system_audit_and_plan.md Phase 3). Unlike
// searchBrandsForPicker in DrugPickerModal.jsx (which searches all brands
// across all formulations), this is pre-scoped to exactly one formulation_id
// so the resulting picker can only ever return brands that already share the
// parent row's formulation — making `formulation_id` agreement on the
// resulting alternative a guarantee of the query, not something the caller
// has to remember to check.

/**
 * Fetch all brands attached to one specific formulation, for the
 * formulation-scoped "pick a brand" picker used when adding a
 * same-formulation alternative.
 * @param {string} formulationId
 */
export async function fetchBrandsForFormulation(formulationId) {
  const { data, error } = await supabase
    .from('brands')
    .select('id, name, name_ar')
    .eq('formulation_id', formulationId)
    .order('name')
  return { data: data ?? [], error }
}

// ─── Specialties (5.4 + 3H) ──────────────────────────────────────────────────

export async function insertSpecialty(data) {
  const { data: row, error } = await supabase
    .from('specialties')
    .insert(data)
    .select('id, slug')
    .single()
  if (error || !row) return { data: row, error }
  await logAudit('create', 'specialties', row.id, data.name_en ?? null, data)
  await touchAppMetadata('conditions_updated_at')
  return { data: row, error: null }
}

export async function updateSpecialty(id, data) {
  const { error } = await supabase
    .from('specialties')
    .update(data)
    .eq('id', id)
  if (error) return { error }
  await logAudit('update', 'specialties', id, data.name_en ?? null, data)
  return touchAppMetadata('conditions_updated_at')
}

/**
 * Fetch all ACTIVE specialties for CMS dropdowns (condition form, filter pills).
 * Returns rows from the specialties table directly — never depends on conditions existing.
 */
export async function fetchSpecialtiesForCMS() {
  const { data, error } = await supabase
    .from('specialties')
    .select('id, name_en, slug, icon_name, icon_type, icon_url, color_token, color_hex, sort_order, is_active')
    .eq('is_active', true)
    .neq('id', '00000000-0000-0000-0000-000000000001')
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
      id, name_en, name_ar, slug, icon_name, icon_type, icon_url, color_token, color_hex,
      sort_order, is_active, created_at,
      conditions!conditions_specialty_id_fkey ( id, name )
    `)
    .order('sort_order', { ascending: true })

  if (error) return { data: null, error }

  const mapped = data.map(s => ({
    ...s,
    conditionCount: (s.conditions ?? []).length,
    conditionNames: (s.conditions ?? []).map(c => c.name).sort(),
    conditions: undefined,
  }))

  return { data: mapped, error: null }
}

/**
 * Toggle is_active on a specialty.
 * Deactivating: moves all its conditions to Uncategorized (stores original id).
 * Activating:   restores conditions that were previously moved from this specialty.
 */
export async function toggleSpecialtyActive(id, isActive, name = null) {
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
  await logAudit(isActive ? 'publish' : 'unpublish', 'specialties', id, name)
  return touchAppMetadata('conditions_updated_at')
}

/**
 * Delete a specialty. Only safe when conditionCount === 0 and not Uncategorized.
 */
export async function deleteSpecialty(id, name = null) {
  const { error } = await supabase
    .from('specialties')
    .delete()
    .eq('id', id)
  if (error) return { error }
  await logAudit('delete', 'specialties', id, name)
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

// ─── Drug categories (1A.2) ───────────────────────────────────────────────────
//
// Twin of the specialties CRUD above. Unlike specialties, a generic's category
// is stored as a plain text label (generics.category) rather than a foreign
// key, so there is no "Uncategorized" reassignment step on deactivate — see
// GENERIC_FORMULATION_BRAND_MAPPING_PLAN.md ADR-039. Category names feed the
// drugs list/filter UI, so mutations bump 'drugs_updated_at', not
// 'conditions_updated_at'.

export async function insertCategory(data) {
  const { data: row, error } = await supabase
    .from('drug_categories')
    .insert(data)
    .select('id, slug')
    .single()
  if (error || !row) return { data: row, error }
  await logAudit('create', 'drug_categories', row.id, data.name_en ?? null, data)
  await touchAppMetadata('drugs_updated_at')
  return { data: row, error: null }
}

export async function updateCategory(id, data) {
  const { error } = await supabase
    .from('drug_categories')
    .update(data)
    .eq('id', id)
  if (error) return { error }
  await logAudit('update', 'drug_categories', id, data.name_en ?? null, data)
  return touchAppMetadata('drugs_updated_at')
}

/**
 * Fetch all ACTIVE categories for CMS dropdowns (drug editor's category field).
 */
export async function fetchCategoriesForCMS() {
  const { data, error } = await supabase
    .from('drug_categories')
    .select('id, name_en, slug, icon_name, icon_type, icon_url, color_token, color_hex, sort_order, is_active')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
  return { data: data ?? [], error }
}

/**
 * Fetch all categories (active + inactive) with a generic count per category,
 * for the admin CategoriesManager list. Category is a text label on generics,
 * not a foreign key, so the count is matched by name_en rather than joined.
 */
export async function fetchAllCategories() {
  const { data, error } = await supabase
    .from('drug_categories')
    .select('id, name_en, name_ar, slug, icon_name, icon_type, icon_url, color_token, color_hex, sort_order, is_active, created_at')
    .order('sort_order', { ascending: true })

  if (error) return { data: null, error }

  const { data: generics, error: genericsError } = await supabase
    .from('generics')
    .select('category')

  if (genericsError) return { data: null, error: genericsError }

  const counts = {}
  for (const g of generics ?? []) {
    if (g.category) counts[g.category] = (counts[g.category] ?? 0) + 1
  }

  const mapped = data.map(c => ({
    ...c,
    genericCount: counts[c.name_en] ?? 0,
  }))

  return { data: mapped, error: null }
}

/**
 * Toggle is_active on a category. Simple flip only — no reassignment of
 * affected generics (see file-header note above).
 */
export async function toggleCategoryActive(id, isActive, name = null) {
  const { error } = await supabase
    .from('drug_categories')
    .update({ is_active: isActive })
    .eq('id', id)
  if (error) return { error }
  await logAudit(isActive ? 'publish' : 'unpublish', 'drug_categories', id, name)
  return touchAppMetadata('drugs_updated_at')
}

/**
 * Delete a category.
 */
export async function deleteCategory(id, name = null) {
  const { error } = await supabase
    .from('drug_categories')
    .delete()
    .eq('id', id)
  if (error) return { error }
  await logAudit('delete', 'drug_categories', id, name)
  return touchAppMetadata('drugs_updated_at')
}

/**
 * Upload a custom category icon (SVG). Reuses the specialty-icons storage
 * bucket — same generic SVG storage, no functional reason to split it.
 */
export async function uploadCategoryIcon(file) {
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.svg`
  const path     = `public/${filename}`

  const { error: uploadError } = await supabase.storage
    .from('specialty-icons')
    .upload(path, file, {
      cacheControl: '3600',
      upsert:       false,
      contentType:  'image/svg+xml',
    })

  if (uploadError) return { url: null, error: uploadError }

  const { data } = supabase.storage
    .from('specialty-icons')
    .getPublicUrl(path)

  return { url: data.publicUrl, error: null }
}

/**
 * Batch-update sort_order for reordering categories via drag-and-drop.
 * @param {{ id: string, sort_order: number }[]} items
 */
export async function reorderCategories(items) {
  const updates = items.map(({ id, sort_order }) =>
    supabase.from('drug_categories').update({ sort_order }).eq('id', id)
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
  if (!error && row) await logAudit('create', 'conditions', row.id, data.name ?? null, data)
  return { data: row, error }
}

export async function updateCondition(id, data) {
  const { error } = await supabase
    .from('conditions')
    .update(data)
    .eq('id', id)
  if (!error) await logAudit('update', 'conditions', id, data.name ?? null, data)
  return { error }
}

export async function deleteCondition(id, name = null) {
  const { error } = await supabase
    .from('conditions')
    .delete()
    .eq('id', id)
  if (!error) await logAudit('delete', 'conditions', id, name)
  return { error }
}

export async function fetchConditionForEdit(id) {
  const { data, error } = await supabase
    .from('conditions')
    .select(`
      id, name, slug, age_group, card_tagline,
      icd10_code, is_published, specialty_id,
      condition_blocks ( id, block_type, order_index, data )
    `)
    .eq('id', id)
    .single()
  return { data, error }
}

/**
 * Replace all condition_blocks for a condition (delete + insert).
 * Strips UI-only sentinel keys (_isNew, _formulationMeta) from row data before persisting.
 * Bumps app_metadata.conditions_updated_at on success.
 *
 * @param {string}   conditionId
 * @param {Object[]} blocks — array of block objects from BlockListEditor state
 */
export async function saveConditionBlocks(conditionId, blocks) {
  // 1. Delete all existing blocks for this condition
  const { error: deleteErr } = await supabase
    .from('condition_blocks')
    .delete()
    .eq('condition_id', conditionId)

  if (deleteErr) return { error: deleteErr }

  // 2. Nothing to insert — still bump metadata so cache invalidates
  if (!blocks || blocks.length === 0) {
    return touchAppMetadata('conditions_updated_at')
  }

  // 3. Strip UI-only sentinel keys from each block's data
  function cleanData(blockType, rawData) {
    if (!rawData) return rawData
    if (blockType === 'prescription_sheet') {
      const cleanRows = (rawData.rows ?? []).map(row => {
        // eslint-disable-next-line no-unused-vars
        const { _isNew, _formulationMeta, ...cleanRow } = row
        return cleanRow
      })
      return { ...rawData, rows: cleanRows }
    }
    return rawData
  }

  const rows = blocks.map((block, i) => ({
    condition_id: conditionId,
    block_type:   block.block_type,
    order_index:  block.order_index ?? i,
    data:         cleanData(block.block_type, block.data),
  }))

  const { error: insertErr } = await supabase
    .from('condition_blocks')
    .insert(rows)

  if (insertErr) return { error: insertErr }

  await logAudit('update', 'condition_blocks', conditionId, null, { blockCount: rows.length })
  return touchAppMetadata('conditions_updated_at')
}

// ─── Condition image upload (used by ImageGalleryEditor) ─────────────────────

export async function insertConditionImage(data) {
  const { data: row, error } = await supabase
    .from('condition_images')
    .insert(data)
    .select('id, url, caption, sort_order')
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

// ─── Specialty icon upload (Phase 6) ─────────────────────────────────────────

export async function uploadSpecialtyIcon(file) {
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.svg`
  const path     = `public/${filename}`

  const { error: uploadError } = await supabase.storage
    .from('specialty-icons')
    .upload(path, file, {
      cacheControl: '3600',
      upsert:       false,
      contentType:  'image/svg+xml',
    })

  if (uploadError) return { url: null, error: uploadError }

  const { data } = supabase.storage
    .from('specialty-icons')
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
  if (!error && row) await logAudit('create', 'prescriptions', row.id, row.label ?? null, data)
  return { data: row, error }
}

export async function updatePrescription(id, data) {
  const { error } = await supabase
    .from('prescriptions')
    .update(data)
    .eq('id', id)
  if (!error) await logAudit('update', 'prescriptions', id, data.label ?? null, data)
  return { error }
}

export async function deletePrescription(id, label = null) {
  const { error } = await supabase
    .from('prescriptions')
    .delete()
    .eq('id', id)
  if (!error) await logAudit('delete', 'prescriptions', id, label)
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
export async function toggleConditionPublished(id, isPublished, name = null) {
  const { error } = await supabase
    .from('conditions')
    .update({ is_published: isPublished })
    .eq('id', id)
  if (error) return { error }
  await logAudit(isPublished ? 'publish' : 'unpublish', 'conditions', id, name)
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
 * Fetch one page of generics for the admin CMS list, always querying the
 * live database directly (never a client-side re-filter of a preloaded
 * list) — so search and category filtering reach every row, not just
 * whatever happened to load first.
 *
 * Search matches name_en/name_ar via ilike. Category matches generics.category
 * as free text against the drug_categories.name_en value the caller passes in
 * (same text-matching approach fetchAllCategories already uses for counts —
 * generics.category is not a foreign key). With no query and no category,
 * returns the first `limit` generics alphabetically.
 *
 * @param {{ query?: string, category?: string|null, limit?: number }} params
 * @returns {Promise<{ data: object[]|null, count: number, error: object|null }>}
 */
export async function fetchGenericsPage({ query = '', category = null, limit = 50 } = {}) {
  let q = supabase
    .from('generics')
    .select(`
      id, name_en, name_ar, category, class,
      is_published, updated_at,
      formulations ( id )
    `, { count: 'exact' })
    .order('name_en', { ascending: true })
    .limit(limit)

  if (category) q = q.eq('category', category)

  const term = query.trim()
  if (term) q = q.or(`name_en.ilike.%${term}%,name_ar.ilike.%${term}%`)

  const { data, error, count } = await q
  if (error) return { data: null, count: 0, error }

  const mapped = data.map(g => ({
    ...g,
    formulationCount: (g.formulations ?? []).length,
  }))

  return { data: mapped, count: count ?? 0, error: null }
}

// ─── Promote-to-library matching (Phase 2, masterplan §2.5) ──────────────────
//
// Reuse-or-create lookups used by the free-text "save to library" promote
// flow. Each returns { data: <row|null>, error } — data is null (not an
// error) when nothing matches, which the caller treats as "create new".

/**
 * Find an existing generic by exact, case-insensitive name_en match.
 * @param {string} nameEn
 */
export async function findGenericByName(nameEn) {
  const { data, error } = await supabase
    .from('generics')
    .select('id, name_en, category')
    .ilike('name_en', nameEn.trim())
    .limit(1)
    .maybeSingle()
  return { data: data ?? null, error }
}

/**
 * Find an existing formulation under a generic by concentration + form.
 * Matched case-insensitively on concentration since free text may differ
 * in spacing/case (e.g. "500mg" vs "500 mg"); form is matched exactly since
 * it's selected from a fixed list (config/forms.js) on both sides.
 * @param {string} genericId
 * @param {string} concentration
 * @param {string} form
 */
export async function findFormulationMatch(genericId, concentration, form) {
  const { data, error } = await supabase
    .from('formulations')
    .select('id, concentration, form, route, default_dose_override')
    .eq('generic_id', genericId)
    .eq('form', form)
    .ilike('concentration', concentration.trim())
    .limit(1)
    .maybeSingle()
  return { data: data ?? null, error }
}

/**
 * Find an existing brand under a formulation by exact, case-insensitive name.
 * @param {string} formulationId
 * @param {string} name
 */
export async function findBrandMatch(formulationId, name) {
  const { data, error } = await supabase
    .from('brands')
    .select('id, name, source')
    .eq('formulation_id', formulationId)
    .ilike('name', name.trim())
    .limit(1)
    .maybeSingle()
  return { data: data ?? null, error }
}

/**
 * Toggle is_published on a generic and invalidate the drugs cache.
 */
export async function toggleGenericPublished(id, isPublished, name = null) {
  const { error } = await supabase
    .from('generics')
    .update({ is_published: isPublished })
    .eq('id', id)
  if (error) return { error }
  await logAudit(isPublished ? 'publish' : 'unpublish', 'generics', id, name)
  return touchAppMetadata('drugs_updated_at')
}

/**
 * Delete a generic (cascades to formulations + brands via DB constraints).
 */
export async function deleteGeneric(id, name = null) {
  const { error } = await supabase
    .from('generics')
    .delete()
    .eq('id', id)
  if (error) return { error }
  await logAudit('delete', 'generics', id, name)
  return touchAppMetadata('drugs_updated_at')
}

// ─── Formulations — publish toggle (3L) ──────────────────────────────────────

/**
 * Toggle is_published on a formulation and invalidate the drugs cache.
 */
export async function toggleFormulationPublished(id, isPublished) {
  const { error } = await supabase
    .from('formulations')
    .update({ is_published: isPublished })
    .eq('id', id)
  if (error) return { error }
  await logAudit(isPublished ? 'publish' : 'unpublish', 'formulations', id)
  return touchAppMetadata('drugs_updated_at')
}

// ─── Brands — publish toggle (3L) ────────────────────────────────────────────

/**
 * Toggle is_published on a brand and invalidate the drugs cache.
 */
export async function toggleBrandPublished(id, isPublished, name = null) {
  const { error } = await supabase
    .from('brands')
    .update({ is_published: isPublished })
    .eq('id', id)
  if (error) return { error }
  await logAudit(isPublished ? 'publish' : 'unpublish', 'brands', id, name)
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

// ─── Tags (3.10) ─────────────────────────────────────────────────────────────

/**
 * Fetch all tag names from the tags table (for autocomplete in ConditionEditor).
 * Returns string[] sorted alphabetically.
 */
export async function fetchAllTags() {
  const { data, error } = await supabase
    .from('tags')
    .select('name')
    .order('name')
  return { data: (data ?? []).map(t => t.name), error }
}

/**
 * Fetch tag names currently assigned to a condition.
 * Returns string[].
 */
export async function fetchTagsForCondition(conditionId) {
  const { data, error } = await supabase
    .from('condition_tags')
    .select('tags ( name )')
    .eq('condition_id', conditionId)
  if (error) return { data: [], error }
  const names = (data ?? []).map(row => row.tags?.name).filter(Boolean)
  return { data: names, error: null }
}

/**
 * Sync a condition's tags to match the given array of tag names.
 * - Upserts any new tag records by name.
 * - Replaces condition_tags rows (delete all, insert selected).
 *
 * @param {string}   conditionId
 * @param {string[]} tagNames
 */
export async function syncConditionTags(conditionId, tagNames) {
  // 1. Wipe existing condition_tags
  const { error: deleteErr } = await supabase
    .from('condition_tags')
    .delete()
    .eq('condition_id', conditionId)
  if (deleteErr) return { error: deleteErr }

  if (!tagNames || tagNames.length === 0) return { error: null }

  // 2. Upsert tag names → get back ids
  // slug is NOT NULL in the tags table, so we must supply it.
  // On conflict (name already exists) the slug is left unchanged.
  const { data: tagRows, error: upsertErr } = await supabase
    .from('tags')
    .upsert(
      tagNames.map(name => ({ name, slug: tagNameToSlug(name) })),
      { onConflict: 'name', ignoreDuplicates: false }
    )
    .select('id, name')
  if (upsertErr) return { error: upsertErr }

  // 3. Insert condition_tags rows
  const rows = (tagRows ?? []).map(t => ({ condition_id: conditionId, tag_id: t.id }))
  if (rows.length === 0) return { error: null }

  const { error: insertErr } = await supabase
    .from('condition_tags')
    .insert(rows)
  return { error: insertErr ?? null }
}

// ─── CMS config (Phase 2) ────────────────────────────────────────────────────

/**
 * Update a value in the cms_config key-value table.
 * Used by developers to update the directive AI prompt without a Supabase dashboard visit.
 * (Phase 3 may expose this via a CMS UI — for now it is available but not wired to any screen.)
 *
 * @param {string} key
 * @param {string} value
 */
export async function updateCmsConfig(key, value) {
  const { error } = await supabase
    .from('cms_config')
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' })

  if (error) throw error
  return { error: null }
}
