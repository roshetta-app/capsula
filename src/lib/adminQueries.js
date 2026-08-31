/**
 * adminQueries.js — Supabase write operations for the admin CMS.
 *
 * Sessions:
 *   5.2 — deleteFormulation
 *   5.3 — insertGeneric, updateGeneric, insertFormulation, updateFormulation,
 *           insertBrand, updateBrand, deleteBrand, fetchFormulationWithGeneric
 *   5.4 — insertSpecialty, updateSpecialty, insertCondition, updateCondition,
 *           deleteCondition, fetchConditionForEdit
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
 *   1.8 — fetchGenericsPage: combo matching now checks the real 'ingredients'
 *           array (per-ingredient, "starts with") instead of guessing from
 *           name_en text
 *   12.1 — searchBrandsForCMS (new): live tradename_clean search for the
 *           CMS drug library screen's brand-name search (decision 27)
 *   12.2 — searchBrandsForCMS revised: added real server-side paging
 *           (page/count, matching fetchGenericsPage's shape) now that Brand
 *           mode is its own full results list, not a few extra matches
 *           tacked onto generic results; also added pack_size, fill_volume,
 *           and form_modifier so DrugCMS.jsx can build the full title
 *           suffix via SharedDrugCard/getDrugTitleSuffix
 *   F11 Stage 2 — fetchAllUsers, updateUserRole, updateUserTier, banUser,
 *           unbanUser (new): thin wrappers over the new admin-users Edge
 *           Function, the only path that can read auth.users or write
 *           profiles.role/tier from the CMS
 *   App Gate Phase 1 Step 2a — listReleases, createRelease,
 *           setMinimumSupported (new)
 *   App Gate Phase 1 Step 3a — listGates, createGate, updateGate,
 *           toggleGateActive (new)
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

// ─── Formulations — delete (5.2) ─────────────────────────────────────────────

export async function deleteFormulation(id) {
  const { error } = await supabase
    .from('formulations')
    .delete()
    .eq('id', id)
  if (error) return { error }
  await logAudit('delete', 'formulations', id)
  return touchAppMetadata('drugs_updated_at')
}

// ─── Generics (5.3) ──────────────────────────────────────────────────────────

export async function insertGeneric(data) {
  const { data: row, error } = await supabase
    .from('generics')
    .insert(data)
    .select('id, slug')
    .single()
  if (error || !row) return { data: row, error }
  await logAudit('create', 'generics', row.id, data.name_en, data)
  await touchAppMetadata('drugs_updated_at')
  return { data: row, error: null }
}

export async function updateGeneric(id, data) {
  const { error } = await supabase
    .from('generics')
    .update(data)
    .eq('id', id)
  if (error) return { error }
  await logAudit('update', 'generics', id, data.name_en ?? null, data)
  return touchAppMetadata('drugs_updated_at')
}

export async function fetchFormulationWithGeneric(formulationId) {
  const { data, error } = await supabase
    .from('formulations')
    .select(`
      id, concentration, form, route,
      doses_structured, default_dose_override, is_published,
      generics (
        id, slug, name_en, category, class,
        warnings_legacy, textbook_doses, textbook_dose_notes,
        uses_structured, mechanism_of_action,
        side_effects,
        pregnancy_category, breastfeeding_safety,
        crosses_placenta, crosses_bbb,
        contraindications, drug_interactions, dose_adjustments,
        pharmacokinetics, is_published
      ),
      brands ( id, tradename_clean, manufacturer, is_published )
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
  if (error || !row) return { data: row, error }
  await logAudit('create', 'formulations', row.id, null, data)
  await touchAppMetadata('drugs_updated_at')
  return { data: row, error: null }
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
  if (error || !row) return { data: row, error }
  await logAudit('create', 'brands', row.id, data.name ?? null, data)
  await touchAppMetadata('drugs_updated_at')
  return { data: row, error: null }
}

export async function updateBrand(id, data) {
  const { error } = await supabase
    .from('brands')
    .update(data)
    .eq('id', id)
  if (error) return { error }
  await logAudit('update', 'brands', id, data.name ?? null, data)
  return touchAppMetadata('drugs_updated_at')
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
    .select('id, name')
    .eq('formulation_id', formulationId)
    .order('name')
  return { data: data ?? [], error }
}

// ─── Search & Add — live drug search (Phase 3, Brands + Search & Add) ────────
//
// A fresh, always-live query for the admin "Search & Add" picker
// (DrugPickerModal.jsx). Deliberately NOT a reuse of DrugContext/useDrugs —
// that hook's cache is device-persisted and TTL-based, built for the
// end-user app, so an admin adding a just-created brand wouldn't see it
// until the cache refreshed. This queries Supabase directly every time.
//
// Mirrors fetchFlatDrugs's (src/lib/queries.js) select shape and its three
// publish-flag filters (brand + formulation + generic), so results can be
// rendered with the same display components (SharedDrugCard.jsx,
// drugTitleFormat.js) the rest of the app already uses. Matches on
// tradename_clean, not the legacy brands.name field.

/**
 * Live search for brands by tradename, for the admin Search & Add picker.
 * Returns only published brands whose formulation and generic are also
 * published, shaped to match the app's FlatDrug fields.
 *
 * @param {string} query — partial tradename text
 * @param {{ limit?: number }} [options]
 * @returns {Promise<{ data: object[]|null, error: object|null }>}
 */
export async function searchDrugsForPicker(query, { limit = 30 } = {}) {
  const term = query.trim()
  if (!term) return { data: [], error: null }

  const { data, error } = await supabase
    .from('brands')
    .select(`
      id, slug, tradename_clean, manufacturer, price, pack_size, fill_volume, is_published,
      formulations (
        id, slug, concentration, strength_value, strength_unit, strength_basis, form, form_modifier, route, route_details, is_published,
        doses_structured, default_dose_override,
        generics ( id, slug, name_en, category, class, ingredients, is_published )
      )
    `)
    .eq('is_published', true)
    .ilike('tradename_clean', `%${term}%`)
    .limit(limit)

  if (error) return { data: null, error }

  const mapped = (data ?? [])
    .filter(b => b.formulations?.is_published === true && b.formulations?.generics?.is_published === true)
    .map(b => {
      const f = b.formulations
      const g = f.generics
      return {
        id:              b.id,
        slug:            b.slug,
        tradenameClean:  b.tradename_clean,
        manufacturer:    b.manufacturer,
        price:           b.price,
        packSize:        b.pack_size,
        fillVolume:      b.fill_volume,
        formulationId:       f.id,
        formulationSlug:     f.slug,
        concentration:       f.concentration,
        strengthValue:       f.strength_value,
        strengthUnit:        f.strength_unit,
        strengthBasis:       f.strength_basis,
        form:                f.form,
        formModifier:        f.form_modifier ?? [],
        route:               f.route,
        routeDetails:        f.route_details ?? [],
        dosesStructured:     f.doses_structured ?? null,
        defaultDoseOverride: f.default_dose_override ?? null,
        genericId:       g.id,
        genericSlug:     g.slug,
        genericName:     g.name_en,
        ingredients:     g.ingredients ?? null,
        category:        g.category,
        class:           g.class,
      }
    })

  return { data: mapped, error: null }
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
  if (error || !row) return { data: row, error }
  await logAudit('create', 'conditions', row.id, data.name ?? null, data)
  await touchAppMetadata('conditions_updated_at')
  return { data: row, error: null }
}

export async function updateCondition(id, data) {
  const { error } = await supabase
    .from('conditions')
    .update(data)
    .eq('id', id)
  if (error) return { error }
  await logAudit('update', 'conditions', id, data.name ?? null, data)
  return touchAppMetadata('conditions_updated_at')
}

export async function deleteCondition(id, name = null) {
  const { error } = await supabase
    .from('conditions')
    .delete()
    .eq('id', id)
  if (error) return { error }
  await logAudit('delete', 'conditions', id, name)
  return touchAppMetadata('conditions_updated_at')
}

export async function fetchConditionForEdit(id) {
  const { data, error } = await supabase
    .from('conditions')
    .select(`
      id, name, slug, card_tagline,
      is_published, needs_review, specialty_id,
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
 * Fetch one page of generics for the admin CMS list, always querying the
 * live database directly (never a client-side re-filter of a preloaded
 * list) — so search and category filtering reach every row, not just
 * whatever happened to load first.
 *
 * Search matches at the START of each ingredient, not anywhere inside a
 * word — combo generic names are plain text like "achillea + anise + basil",
 * so a match is either the very start of the name, or right after a
 * " + " separator. Category matches generics.category as
 * free text against the drug_categories.slug value the caller passes in
 * (generics.category stores the slug, not the display label — confirmed
 * against live data).
 *
 * `page` is 0-indexed; combined with `limit` via .range() for real
 * server-side pagination — flipping pages re-queries the DB, it doesn't
 * page through an already-fetched list.
 *
 * `sortBy` picks the ordering: 'name' (default, alphabetical) or 'common'
 * (generics.brand_count descending, alphabetical as the tiebreaker) — that
 * column is a real, trigger-maintained count, not computed here.
 *
 * @param {{ query?: string, category?: string|null, limit?: number, page?: number, sortBy?: 'name'|'common' }} params
 * @returns {Promise<{ data: object[]|null, count: number, error: object|null }>}
 */
export async function fetchGenericsPage({ query = '', category = null, limit = 50, page = 0, sortBy = 'name' } = {}) {
  const term = query.trim()

  // Combo matching (1.8): a search term is checked against each entry in the
  // real 'ingredients' array, not guessed from name_en text (the old
  // '%+ term%' pattern). Mirrors the app's own generic-mode search
  // (searchUtils.js 'genericPrefixFields' — same 'starts with' rule per
  // ingredient), but run as a slim, targeted lookup here instead of against
  // an already-downloaded full drug list, since this CMS list stays
  // server-paged by design. Only id + ingredients are pulled for this
  // check — never the full row — and only when there's something to search.
  let ingredientMatchIds = []
  if (term) {
    const lowerTerm = term.toLowerCase()
    const { data: ingredientRows, error: ingredientError } = await supabase
      .from('generics')
      .select('id, ingredients')
      .not('ingredients', 'is', null)
    if (ingredientError) return { data: null, count: 0, error: ingredientError }

    ingredientMatchIds = (ingredientRows ?? [])
      .filter(g => (g.ingredients ?? []).some(i => i.toLowerCase().startsWith(lowerTerm)))
      .map(g => g.id)
  }

  let q = supabase
    .from('generics')
    .select(`
      id, name_en, category, class,
      is_published, updated_at, brand_count,
      formulations ( id )
    `, { count: 'exact' })
    .range(page * limit, page * limit + limit - 1)

  q = sortBy === 'common'
    ? q.order('brand_count', { ascending: false }).order('name_en', { ascending: true })
    : q.order('name_en', { ascending: true })

  if (category) q = q.eq('category', category)

  if (term) {
    const idFilter = ingredientMatchIds.length > 0 ? `,id.in.(${ingredientMatchIds.join(',')})` : ''
    q = q.or(`name_en.ilike.${term}%${idFilter}`)
  }

  const { data, error, count } = await q
  if (error) return { data: null, count: 0, error }

  const mapped = data.map(g => ({
    ...g,
    formulationCount: (g.formulations ?? []).length,
  }))

  return { data: mapped, count: count ?? 0, error: null }
}

// ─── CMS drug library — brand search (12.1, decision 27; revised 12.2) ───────
//
// Live, uncached search matching brands.tradename_clean (decision 21/27's
// locked field — never brands.name), used alongside fetchGenericsPage above
// so DrugCMS.jsx can find a drug by its brand name, not just its generic
// name.
//
// 12.2 revision: DrugCMS.jsx's Brand mode is now a full standalone results
// list (a Generic/Brand toggle, not a few extra matches folded into the
// generic list), so this needs the same real server-side paging
// fetchGenericsPage already has — {data, count, error}, page * limit via
// .range() — instead of the one-shot .limit() this shipped with in 12.1.
//
// No is_published filter, deliberately — unlike searchDrugsForPicker (which
// is app-facing and only shows published drugs), this is an admin tool that
// needs to find and manage drafts too, matching fetchGenericsPage's own
// lack of a published filter above.
//
// Prefix match ('term%'), not substring — matches fetchGenericsPage's own
// name_en search in the same combined search box, so typing "Panad" behaves
// the same way whether it lands on a generic or a brand match.
//
// Returns enough of each match's real composition (generic name +
// ingredients) for the "Brand — ingredient readout" row decision 27 #4
// calls for, plus the formulation/generic ids the deep-link (step 4) and row
// actions (step 3) need. 12.2 revision also adds pack_size, fill_volume, and
// form_modifier — DrugCMS.jsx reuses SharedDrugCard for brand rows, and its
// title suffix (getDrugTitleSuffix) needs those fields to build the full
// title (e.g. "Panadol Extra 500mg 2 FC Tab.", not just "Panadol Extra
// 500mg"). Still doesn't format the readout text itself; that's
// DrugCMS.jsx's job.
export async function searchBrandsForCMS(query, { limit = 50, page = 0 } = {}) {
  const term = query.trim()
  if (!term) return { data: [], count: 0, error: null }

  const { data, error, count } = await supabase
    .from('brands')
    .select(`
      id, tradename_clean, manufacturer, pack_size, fill_volume, is_published,
      formulations (
        id, concentration, form, form_modifier, is_published,
        generics ( id, name_en, category, class, ingredients, is_published )
      )
    `, { count: 'exact' })
    .ilike('tradename_clean', `${term}%`)
    .range(page * limit, page * limit + limit - 1)

  if (error) return { data: null, count: 0, error }

  const mapped = (data ?? [])
    .filter(b => b.formulations?.generics) // defensive — a brand should always have both, but never render a broken row if data is mid-edit
    .map(b => {
      const f = b.formulations
      const g = f.generics
      return {
        id:               b.id,
        tradenameClean:   b.tradename_clean,
        manufacturer:     b.manufacturer,
        packSize:         b.pack_size,
        fillVolume:       b.fill_volume,
        isPublished:      b.is_published,
        formulationId:        f.id,
        concentration:        f.concentration,
        form:                 f.form,
        formModifier:         f.form_modifier ?? [],
        formulationPublished: f.is_published,
        genericId:        g.id,
        genericName:      g.name_en,
        ingredients:      g.ingredients ?? null,
        category:         g.category,
        class:            g.class,
        genericPublished: g.is_published,
      }
    })

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
 * List all formulations under a generic, for the "Add new drug" quick-entry
 * flow (Unified Drug Row Editor Redesign, Item A, 2026-08-08): once an
 * existing generic is matched by the search box, its formulations are shown
 * so the admin can reuse one instead of typing concentration/form from
 * scratch. Minimal fields — just enough to label each choice and to
 * pre-fill an option the same way handleFormulationPick already does.
 * @param {string} genericId
 */
export async function fetchFormulationsForGeneric(genericId) {
  const { data, error } = await supabase
    .from('formulations')
    .select('id, concentration, form, route, doses_structured')
    .eq('generic_id', genericId)
    .order('concentration')
  return { data: data ?? [], error }
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
 * Find an existing brand under a formulation by exact, case-insensitive
 * tradename match.
 * @param {string} formulationId
 * @param {string} tradenameClean
 */
export async function findBrandMatch(formulationId, tradenameClean) {
  const { data, error } = await supabase
    .from('brands')
    .select('id, tradename_clean')
    .eq('formulation_id', formulationId)
    .ilike('tradename_clean', tradenameClean.trim())
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

// ─── Sources autosuggest (2.4) ───────────────────────────────────────────────

/**
 * Fetch every distinct {source, title, note, url} combination already used
 * across all generics' sources, for CMS autosuggest. Backed by the
 * distinct_sources view (unnests generics.sources jsonb server-side).
 * Returns { source, title, note, url }[].
 */
export async function fetchDistinctSources() {
  const { data, error } = await supabase
    .from('distinct_sources')
    .select('source, title, note, url')
  return { data: data ?? [], error }
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

// ─── Notifications (Phase F9 Stage 1) ──────────────────────────────────────────
// notification_log rows sit as status='pending' after send-notification creates
// them, until the pg_cron-driven deliver-notification function actually sends
// them at scheduled_send_at. These wrap that pending/sent split for the CMS.

/**
 * All notifications still waiting to be sent, soonest first.
 */
export async function fetchPendingNotifications() {
  const { data, error } = await supabase
    .from('notification_log')
    .select('id, type, title, message, scheduled_send_at, sent_by')
    .eq('status', 'pending')
    .order('scheduled_send_at', { ascending: true })

  if (error) throw error
  return data ?? []
}

/**
 * Notifications that have actually been delivered, most recent first.
 * (History table previously showed every row regardless of status — now
 * scoped to 'sent' only, since 'pending'/'cancelled' rows live in their
 * own section.)
 */
export async function fetchSentNotifications({ limit = 100 } = {}) {
  const { data, error } = await supabase
    .from('notification_log')
    .select('id, type, title, message, sent_count, failed_count, click_count, sent_at')
    .eq('status', 'sent')
    .order('sent_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data ?? []
}

/**
 * Cancels a still-pending notification before it goes out.
 */
export async function cancelNotification(id, title = null) {
  const { error } = await supabase
    .from('notification_log')
    .update({ status: 'cancelled' })
    .eq('id', id)
    .eq('status', 'pending')

  if (error) throw error
  await logAudit('cancel', 'notification_log', id, title)
  return { error: null }
}

/**
 * Sends a still-pending notification immediately, overriding its scheduled
 * time. Brings scheduled_send_at up to now (so deliver-notification's due
 * query picks it up) and invokes deliver-notification directly rather than
 * waiting for the next ~1min pg_cron tick — that wait is the whole thing a
 * manual override is meant to skip. deliver-notification processes every
 * row that's actually due at call time, not just this one — a fine side
 * effect, since any other row that happens to already be due would have
 * gone out within a minute anyway via cron.
 */
export async function sendNotificationNow(id, title = null) {
  const { error: updateError } = await supabase
    .from('notification_log')
    .update({ scheduled_send_at: new Date().toISOString() })
    .eq('id', id)
    .eq('status', 'pending')

  if (updateError) throw updateError

  const { error: invokeError } = await supabase.functions.invoke('deliver-notification')
  if (invokeError) throw invokeError

  await logAudit('send_now', 'notification_log', id, title)
  return { error: null }
}

/**
 * Edits a still-pending notification's content and/or send time.
 * @param {string} id
 * @param {{ title?: string, message?: string, type?: string, scheduled_send_at?: string }} data
 */
export async function updateNotification(id, data) {
  const { error } = await supabase
    .from('notification_log')
    .update(data)
    .eq('id', id)
    .eq('status', 'pending')

  if (error) throw error
  await logAudit('update', 'notification_log', id, data.title ?? null, data)
  return { error: null }
}

/**
 * Live search for published conditions by name, for the notification
 * deep-link picker. Mirrors searchDrugsForPicker's shape/contract.
 *
 * @param {string} query
 * @param {{ limit?: number }} [options]
 * @returns {Promise<{ data: object[]|null, error: object|null }>}
 */
export async function searchConditionsForPicker(query, { limit = 30 } = {}) {
  const term = query.trim()
  if (!term) return { data: [], error: null }

  const { data, error } = await supabase
    .from('conditions')
    .select('id, name, slug, is_published')
    .eq('is_published', true)
    .ilike('name', `%${term}%`)
    .order('name')
    .limit(limit)

  if (error) return { data: null, error }
  return { data: data ?? [], error: null }
}

// ─── Notification image upload (Phase F9 Stage 2, D28) ────────────────────────
// Single-image upload, own dedicated bucket — not reused from
// condition-images/ImageGalleryEditor.jsx, which are hard-wired to a
// multi-image gallery shape. Mirrors uploadConditionImage's shape exactly.

export async function uploadNotificationImage(file) {
  const ext      = file.name.split('.').pop()
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const path     = `public/${filename}`

  const { error: uploadError } = await supabase.storage
    .from('notification-images')
    .upload(path, file, { cacheControl: '3600', upsert: false })

  if (uploadError) return { url: null, error: uploadError }

  const { data } = supabase.storage
    .from('notification-images')
    .getPublicUrl(path)

  return { url: data.publicUrl, error: null }
}

// ─── Notification templates (Phase F9 Stage 2, D28) ────────────────────────────
// Simple save/load, no versioning — a template is just a reusable starting
// point for title/message/type, not a live-linked record.

export async function fetchNotificationTemplates() {
  const { data, error } = await supabase
    .from('notification_templates')
    .select('id, title, message, type, created_at')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data ?? []
}

export async function saveNotificationTemplate(data) {
  const { data: row, error } = await supabase
    .from('notification_templates')
    .insert(data)
    .select('id, title, message, type, created_at')
    .single()
  if (!error && row) await logAudit('create', 'notification_templates', row.id, data.title ?? null, data)
  return { data: row, error }
}

export async function deleteNotificationTemplate(id, title = null) {
  const { error } = await supabase
    .from('notification_templates')
    .delete()
    .eq('id', id)
  if (!error) await logAudit('delete', 'notification_templates', id, title)
  return { error }
}

// ─── Users (Phase F11 Stage 2) ────────────────────────────────────────────────
// Thin wrappers over the admin-users Edge Function. Unlike every other
// section in this file, these never touch a Supabase table directly:
// auth.users is structurally unreachable from client code (Supabase blocks
// it by design, confirmed in the F11 Stage 1 audit), and profiles has no
// admin write policy today — the Edge Function runs with the service role
// and is the only place role/tier/ban can actually change.

/**
 * Fetch all accounts for the admin Users list: auth.users joined with each
 * account's profiles row (role, tier, created_at).
 */
export async function fetchAllUsers() {
  const { data, error } = await supabase.functions.invoke('admin-users', {
    body: { action: 'list' },
  })
  if (error) return { data: null, error }
  return { data: data?.users ?? [], error: null }
}

/**
 * Set a user's role ('admin' | 'user').
 * @param {string} userId
 * @param {string} role
 * @param {string|null} email — for the audit log entry only
 */
export async function updateUserRole(userId, role, email = null) {
  const { error } = await supabase.functions.invoke('admin-users', {
    body: { action: 'updateRole', userId, role },
  })
  if (error) return { error }
  await logAudit('update', 'profiles', userId, email, { role })
  return { error: null }
}

/**
 * Set a user's tier ('free' | 'paid'). Plumbing only — tier has no real
 * billing meaning yet (F8 is still undecided); this just records the value.
 * @param {string} userId
 * @param {string} tier
 * @param {string|null} email — for the audit log entry only
 */
export async function updateUserTier(userId, tier, email = null) {
  const { error } = await supabase.functions.invoke('admin-users', {
    body: { action: 'updateTier', userId, tier },
  })
  if (error) return { error }
  await logAudit('update', 'profiles', userId, email, { tier })
  return { error: null }
}

/**
 * Ban a user via Supabase Auth's native banned_until (blocks sign-in).
 * @param {string} userId
 * @param {string|null} email — for the audit log entry only
 */
export async function banUser(userId, email = null) {
  const { error } = await supabase.functions.invoke('admin-users', {
    body: { action: 'ban', userId },
  })
  if (error) return { error }
  await logAudit('ban', 'profiles', userId, email)
  return { error: null }
}

/**
 * Lift a ban, restoring sign-in access.
 * @param {string} userId
 * @param {string|null} email — for the audit log entry only
 */
export async function unbanUser(userId, email = null) {
  const { error } = await supabase.functions.invoke('admin-users', {
    body: { action: 'unban', userId },
  })
  if (error) return { error }
  await logAudit('unban', 'profiles', userId, email)
  return { error: null }
}

// ─── App Releases (App Gate System — Phase 1 Step 2a) ─────────────────────

/**
 * List releases, newest first. Pass a platform to filter to just that one
 * (used by the Releases screen's platform tabs); omit it to get everything.
 * @param {{ platform?: 'web'|'android'|'ios'|null }} [opts]
 */
export async function listReleases({ platform = null } = {}) {
  let query = supabase
    .from('app_releases')
    .select('*')
    .order('created_at', { ascending: false })

  if (platform) query = query.eq('platform', platform)

  const { data, error } = await query
  return { data: data ?? [], error }
}

/**
 * Insert a new release row.
 * @param {{
 *   platform: 'web'|'android'|'ios',
 *   version: string,
 *   release_notes?: string|null,
 *   status?: 'live'|'deprecated'|'blocked',
 *   released_at?: string|null,
 *   created_by?: string|null,
 * }} data
 */
export async function createRelease(data) {
  const { data: row, error } = await supabase
    .from('app_releases')
    .insert(data)
    .select('id, version, platform')
    .single()
  if (!error && row) {
    await logAudit('create', 'app_releases', row.id, `${row.platform} ${row.version}`, data)
  }
  return { data: row, error }
}

/**
 * Flag one release as the minimum-supported version for its platform,
 * turning on Force Update for anyone below it. Only one release per
 * platform may hold this flag — the database enforces that with a partial
 * unique index, so this clears any existing flag for the platform first
 * (as its own statement) before setting the new one, rather than relying
 * on a single update that could momentarily violate that constraint.
 *
 * @param {string} id — the release row to flag
 * @param {'web'|'android'|'ios'} platform
 * @param {string|null} [versionLabel] — for the audit log entry only
 */
export async function setMinimumSupported(id, platform, versionLabel = null) {
  const { error: clearError } = await supabase
    .from('app_releases')
    .update({ is_minimum_supported: false })
    .eq('platform', platform)
    .eq('is_minimum_supported', true)
  if (clearError) return { error: clearError }

  const { error } = await supabase
    .from('app_releases')
    .update({ is_minimum_supported: true })
    .eq('id', id)
  if (!error) {
    await logAudit('update', 'app_releases', id, versionLabel, { is_minimum_supported: true, platform })
  }
  return { error }
}

/**
 * Clear the minimum-supported flag for whichever release currently holds
 * it on this platform — turns Force Update off for that platform with no
 * replacement version set. Distinct from setMinimumSupported, which always
 * moves the flag to a specific release; this is the "turn it off" path
 * that had no button anywhere in the CMS before.
 *
 * @param {'web'|'android'|'ios'} platform
 * @param {string|null} [versionLabel] — for the audit log entry only
 */
export async function clearMinimumSupported(platform, versionLabel = null) {
  const { error } = await supabase
    .from('app_releases')
    .update({ is_minimum_supported: false })
    .eq('platform', platform)
    .eq('is_minimum_supported', true)
  if (!error) {
    await logAudit('update', 'app_releases', null, versionLabel, { is_minimum_supported: false, platform })
  }
  return { error }
}

/**
 * Look up the release currently flagged as minimum-supported for a
 * platform, if any. Used by GatesManager to show the real, live value
 * next to a Force Update message instead of the old free-text field that
 * looked functional but didn't actually control anything.
 *
 * @param {'web'|'android'|'ios'} platform
 */
export async function getMinimumSupported(platform) {
  const { data, error } = await supabase
    .from('app_releases')
    .select('id, version, platform')
    .eq('platform', platform)
    .eq('is_minimum_supported', true)
    .maybeSingle()
  return { data, error }
}

/**
 * Find the existing Force Update message that already targets a given
 * platform, if one exists — used by the "customize what people see" step
 * in ReleasesManager to decide whether to update the existing message or
 * create a new one, so flagging a minimum version and writing its message
 * become one connected action instead of two separate screens to remember.
 *
 * @param {'web'|'android'|'ios'} platform
 */
export async function getForceUpdateGate(platform) {
  const { data, error } = await supabase
    .from('app_gates')
    .select('*')
    .eq('type', 'force_update')
    .contains('platforms', [platform])
    .maybeSingle()
  return { data, error }
}

// ─── App Gates / Remote Messages (App Gate System — Phase 1 Step 3a) ──────

/**
 * List all gates (messages), newest first. Used by GatesManager's list —
 * unlike listReleases there's no platform filter here since a single gate
 * can already target multiple platforms via its own `platforms` column.
 */
export async function listGates() {
  const { data, error } = await supabase
    .from('app_gates')
    .select('*')
    .order('created_at', { ascending: false })
  return { data: data ?? [], error }
}

/**
 * Insert a new gate. Created inactive by default at the database level
 * (see app_gates.active default) so a half-filled draft can never go live
 * by accident — GatesManager flips it on explicitly via toggleGateActive.
 *
 * @param {{
 *   type: 'force_update'|'maintenance'|'critical_announcement'|'promo',
 *   title: string,
 *   message: string,
 *   image_url?: string|null,
 *   cta_label?: string|null,
 *   cta_url?: string|null,
 *   dismissible?: boolean,
 *   platforms?: ('web'|'android'|'ios')[],
 *   min_version?: string|null,
 *   starts_at?: string|null,
 *   ends_at?: string|null,
 *   created_by?: string|null,
 * }} data
 */
export async function createGate(data) {
  const { data: row, error } = await supabase
    .from('app_gates')
    .insert(data)
    .select('id, title, type')
    .single()
  if (!error && row) {
    await logAudit('create', 'app_gates', row.id, `${row.type}: ${row.title}`, data)
  }
  return { data: row, error }
}

/**
 * Update an existing gate's fields (edit form save).
 * @param {string} id
 * @param {object} data — partial column updates
 */
export async function updateGate(id, data) {
  const { error } = await supabase
    .from('app_gates')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (!error) await logAudit('update', 'app_gates', id, data.title ?? null, data)
  return { error }
}

/**
 * Flip a gate's active flag — the instant on/off switch. Turning one on
 * shows it to matching users immediately; turning it off hides it
 * immediately. No deploy, no app-store wait either direction.
 * @param {string} id
 * @param {boolean} isActive
 * @param {string|null} [title] — for the audit log entry only
 */
export async function toggleGateActive(id, isActive, title = null) {
  const { error } = await supabase
    .from('app_gates')
    .update({ active: isActive, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (!error) await logAudit(isActive ? 'publish' : 'unpublish', 'app_gates', id, title)
  return { error }
}