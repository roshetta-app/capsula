/**
 * queries.js — Supabase data fetching
 *
 * All functions return plain JS objects matching the app's data shapes.
 * Import supabase client at call site and pass it in.
 *
 * Changes from Phase 1:
 *   - Removed in_stock (dropped from DB in 1C — stock is localStorage-only)
 *   - Added is_published filters on generics, formulations, brands
 *   - Added slug on formulations (added in 1B)
 *   - Added icon_name, color_hex on specialties (added in 1E)
 *   - fetchConditions picks up new clinical fields from 1D
 *   - fetchAllConditions (no is_published filter) added for admin CMS
 *   - fetchFlatDrugs reshaped from formulation-per-row to item-per-row (Phase 3, step 3.1):
 *     base table is now brands, each brand/item is its own row, formulationId/
 *     formulationSlug added since top-level id/slug now belong to the brand
 *   - fetchFlatDrugs now also returns the generic's ingredients array (step 3.5.2) —
 *     populated only for combo generics (2+ active ingredients), null otherwise
 *   - fetchFlatDrugs now pages through the full brands table instead of a single
 *     request, since Supabase/PostgREST caps any single request at 1,000 rows —
 *     with the full catalog live (19,771 brands) a single request was silently
 *     truncating the app's drug list.
 *   - 2026-07-16 (cold-start speed): added fetchFlatDrugsLight, a trimmed
 *     sibling of fetchFlatDrugs used only for the very first load on a
 *     device with nothing cached yet. It fetches just what the list/search/
 *     filter screens actually read (name, strength, form, category,
 *     pregnancy/breastfeeding safety, search fields) and skips the heavy
 *     per-drug clinical write-up fields (uses, side effects, interactions,
 *     dosing table, etc.), which only the detail page needs. useDrugs shows
 *     this light list immediately, then quietly runs the full fetchFlatDrugs
 *     in the background and swaps it in once ready. Every visit after the
 *     first (cache already warm) is unaffected — this only changes the very
 *     first, nothing-cached-yet load.
 */

// ─── Drug queries ─────────────────────────────────────────────────────────────

// PostgREST's default per-request row cap. fetchFlatDrugs loops in pages of
// this size until a page comes back short, which is how it knows it has
// reached the end of the table.
const SUPABASE_MAX_ROWS = 1000

// Full select — every field either the list screens or the detail page
// reads. Used by fetchFlatDrugs.
const FULL_BRAND_SELECT = `
  id, slug, name, name_ar, manufacturer, source, price, pack_size, is_published,
  formulations (
    id, slug, concentration, form, route, doses_structured, default_dose_override, is_published,
    generics (
      id, slug, name_en, name_ar, category, class,
      uses_legacy, uses_structured, warnings_legacy,
      side_effects_common, side_effects_serious,
      pregnancy_category, breastfeeding_safety,
      crosses_placenta, crosses_bbb,
      contraindications, drug_interactions, dose_adjustments,
      pharmacokinetics, textbook_doses, textbook_dose_notes,
      mechanism_of_action, card_tagline, is_published, ingredients
    )
  )
`

// Light select — only what the list, search, and filter screens read.
// Leaves out the per-drug clinical write-up fields (uses, side effects,
// interactions, dosing table, etc.), which only the detail page needs.
// pregnancy_category / breastfeeding_safety ARE included here even though
// they're clinical fields, because the pregnancy/breastfeeding filter
// checks every drug in the list at once — deferring those two would make
// that filter briefly wrong right after a cold start.
const LIGHT_BRAND_SELECT = `
  id, slug, name, name_ar, manufacturer, source, price, pack_size, is_published,
  formulations (
    id, slug, concentration, form, route, is_published,
    generics (
      id, slug, name_en, name_ar, category, class,
      pregnancy_category, breastfeeding_safety,
      card_tagline, is_published, ingredients
    )
  )
`

/**
 * Page through the full `brands` table for a given select shape. Looks up
 * the total row count first, then fires every page request at once instead
 * of waiting for each one before starting the next — since range-based
 * pages don't depend on each other, this cuts the real wait time down to
 * roughly one round trip instead of twenty stacked back-to-back. Shared by
 * fetchFlatDrugs and fetchFlatDrugsLight so both stay correct against the
 * same 1,000-row per-request cap.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} selectString
 * @param {(loaded: number, total: number) => void} [onProgress] — called
 *   once up front with (0, totalPages), then again as each page lands.
 */
async function fetchAllBrandRows(supabase, selectString, onProgress) {
  const { count, error: countError } = await supabase
    .from('brands')
    .select('id', { count: 'exact', head: true })
    .eq('is_published', true)

  if (countError) throw countError

  const totalPages = Math.max(1, Math.ceil((count ?? 0) / SUPABASE_MAX_ROWS))
  let loaded = 0
  onProgress?.(0, totalPages)

  const pagePromises = Array.from({ length: totalPages }, (_, i) => {
    const from = i * SUPABASE_MAX_ROWS
    const to   = from + SUPABASE_MAX_ROWS - 1
    return supabase
      .from('brands')
      .select(selectString)
      .eq('is_published', true)
      .order('name_en', { referencedTable: 'formulations.generics' })
      .range(from, to)
      .then(({ data, error }) => {
        if (error) throw error
        loaded += 1
        onProgress?.(loaded, totalPages)
        return data
      })
  })

  const pages = await Promise.all(pagePromises)
  return pages.flat()
}

/**
 * Fetch all published drugs as a flat list ready for the drug library UI.
 * Primary key is brand (item) UUID (one row per item — brand + strength + form).
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {(loaded: number, total: number) => void} [onProgress]
 * @returns {Promise<FlatDrug[]>}
 */
export async function fetchFlatDrugs(supabase, onProgress) {
  const allRows = await fetchAllBrandRows(supabase, FULL_BRAND_SELECT, onProgress)

  return allRows
    .filter(b => b.formulations?.is_published === true && b.formulations?.generics?.is_published === true)
    .map(b => {
      const f = b.formulations
      const g = f.generics

      return {
        id:                   b.id,
        slug:                 b.slug,
        name:                 b.name,
        nameAr:               b.name_ar,
        manufacturer:         b.manufacturer,
        source:               b.source,
        price:                b.price,
        packSize:             b.pack_size,
        // Formulation this item belongs to
        formulationId:        f.id,
        formulationSlug:      f.slug,
        concentration:        f.concentration,
        form:                 f.form,
        route:                f.route,
        doses:                f.doses_structured ?? [],
        defaultDoseOverride:  f.default_dose_override,
        // Generic this item belongs to
        genericId:            g.id,
        genericSlug:          g.slug,
        genericName:          g.name_en,
        arabicName:           g.name_ar,
        // Combo generics only (2+ active ingredients) — null for plain generics.
        // Populated 2026-07-16 (step 3.5.1) from raw_drug_import, lets generic-mode
        // search match a combo by any one of its ingredients, not just the whole name.
        ingredients:          g.ingredients ?? null,
        category:             g.category,
        class:                g.class,
        cardTagline:          g.card_tagline,
        mechanismOfAction:    g.mechanism_of_action,
        // Uses: prefer structured, fall back to legacy
        uses:                 g.uses_structured ?? (g.uses_legacy ?? []).map(u => ({ use_name: u, context: '' })),
        warnings:             g.warnings_legacy ?? [],
        sideEffectsCommon:    g.side_effects_common   ?? [],
        sideEffectsSerious:   g.side_effects_serious  ?? [],
        pregnancyCategory:    g.pregnancy_category,
        breastfeedingSafety:  g.breastfeeding_safety,
        crossesPlacenta:      g.crosses_placenta,
        crossesBbb:           g.crosses_bbb,
        contraindications:    g.contraindications     ?? [],
        drugInteractions:     g.drug_interactions     ?? [],
        doseAdjustments:      g.dose_adjustments      ?? [],
        pharmacokinetics:     g.pharmacokinetics,
        textbookDoses:        g.textbook_doses        ?? [],
        textbookDoseNotes:    g.textbook_dose_notes,
      }
    })
}

/**
 * Fetch a trimmed, list-ready version of the drug catalog — used only for
 * a device's very first load, before anything is cached, so the list can
 * appear without waiting on the full per-drug clinical write-up. Every
 * field the list, search, and filter screens actually read is included;
 * fields only the detail page needs (uses, side effects, interactions,
 * dosing table, etc.) are left out and filled in afterward by a normal
 * fetchFlatDrugs call. Shape matches fetchFlatDrugs's output — callers
 * don't need to know which one they got, except that detail-only fields
 * will be undefined until the full fetch completes.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {(loaded: number, total: number) => void} [onProgress]
 * @returns {Promise<FlatDrug[]>}
 */
export async function fetchFlatDrugsLight(supabase, onProgress) {
  const allRows = await fetchAllBrandRows(supabase, LIGHT_BRAND_SELECT, onProgress)

  return allRows
    .filter(b => b.formulations?.is_published === true && b.formulations?.generics?.is_published === true)
    .map(b => {
      const f = b.formulations
      const g = f.generics

      return {
        id:                   b.id,
        slug:                 b.slug,
        name:                 b.name,
        nameAr:               b.name_ar,
        manufacturer:         b.manufacturer,
        source:               b.source,
        price:                b.price,
        packSize:             b.pack_size,
        formulationId:        f.id,
        formulationSlug:      f.slug,
        concentration:        f.concentration,
        form:                 f.form,
        route:                f.route,
        genericId:            g.id,
        genericSlug:          g.slug,
        genericName:          g.name_en,
        arabicName:           g.name_ar,
        ingredients:          g.ingredients ?? null,
        category:             g.category,
        class:                g.class,
        cardTagline:          g.card_tagline,
        pregnancyCategory:    g.pregnancy_category,
        breastfeedingSafety:  g.breastfeeding_safety,
      }
    })
}

/**
 * Fetch the app_metadata timestamps for cache invalidation.
 * Returns { drugsUpdatedAt: string, conditionsUpdatedAt: string }
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 */
export async function fetchMetadataTimestamps(supabase) {
  const { data, error } = await supabase
    .from('app_metadata')
    .select('drugs_updated_at, conditions_updated_at')
    .eq('id', 1)
    .single()

  if (error) throw error

  return {
    drugsUpdatedAt:      data.drugs_updated_at,
    conditionsUpdatedAt: data.conditions_updated_at,
  }
}

// ─── Conditions queries ───────────────────────────────────────────────────────

/**
 * Shared select + mapper for conditions queries.
 * Used by both fetchConditions (public) and fetchAllConditions (admin).
 */
const CONDITIONS_SELECT = `
  id, name, slug, age_group, card_tagline,
  definition, icd10_code, epidemiology,
  when_to_refer, prognosis,
  differential_diagnosis, red_flags,
  clinical_picture, history_questions, examination, investigations,
  patient_instructions, clinical_blocks, is_published,
  specialties!conditions_specialty_id_fkey ( id, name_en, slug, icon_name, icon_type, icon_url, color_hex, color_token, sort_order ),
  condition_images ( id, url, caption, sort_order ),
  condition_blocks ( id, block_type, order_index, data, created_at, updated_at ),
  condition_tags ( tags ( name ) )
`

function mapConditions(data) {
  return data.map(c => ({
    id:                   c.id,
    specialtyId:          c.specialties?.id,
    specialtyName:        c.specialties?.name_en,
    specialtySlug:        c.specialties?.slug,
    specialtyIcon:        c.specialties?.icon_name,
    specialtyIconType:    c.specialties?.icon_type   ?? 'lucide',
    specialtyIconUrl:     c.specialties?.icon_url    ?? null,
    specialtyColor:       c.specialties?.color_hex,
    specialtyColorToken:  c.specialties?.color_token ?? null,
    specialtySortOrder:   c.specialties?.sort_order,
    name:                 c.name,
    slug:                 c.slug,
    ageGroup:             c.age_group,
    cardTagline:          c.card_tagline,
    definition:           c.definition,
    icd10Code:            c.icd10_code,
    epidemiology:         c.epidemiology,
    whenToRefer:          c.when_to_refer,
    prognosis:            c.prognosis,
    isPublished:          c.is_published ?? true,
    differentialDiagnosis: c.differential_diagnosis ?? [],
    redFlags:             c.red_flags               ?? [],
    clinicalBlocks:       c.clinical_blocks         ?? [],
    // Legacy clinical fields (still used until CMS migrates them to clinical_blocks)
    clinicalPicture:      c.clinical_picture,
    historyQuestions:     c.history_questions        ?? [],
    examination:          c.examination              ?? [],
    investigations:       c.investigations           ?? [],
    patientInstructions:  c.patient_instructions,
    images: (c.condition_images ?? [])
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(img => ({ id: img.id, url: img.url, caption: img.caption })),
    // New unified block-based content (Phase 2.1) — sorted by order_index
    blocks: (c.condition_blocks ?? [])
      .sort((a, b) => a.order_index - b.order_index)
      .map(b => ({ id: b.id, blockType: b.block_type, orderIndex: b.order_index, data: b.data })),
    // Tags for search (Phase 2.1 / 2.9)
    tags: (c.condition_tags ?? [])
      .map(ct => ct.tags?.name)
      .filter(Boolean),
  }))
}

/**
 * Fetch all PUBLISHED conditions — used by public app via useConditions hook.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @returns {Promise<ConditionFull[]>}
 */
export async function fetchConditions(supabase) {
  const { data, error } = await supabase
    .from('conditions')
    .select(CONDITIONS_SELECT)
    .eq('is_published', true)
    .order('name')

  if (error) throw error
  return mapConditions(data)
}

/**
 * Fetch ALL conditions (published + drafts) — used by admin CMS only.
 * Requires an authenticated Supabase session with admin privileges.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @returns {Promise<ConditionFull[]>}
 */
export async function fetchAllConditions(supabase) {
  const { data, error } = await supabase
    .from('conditions')
    .select(CONDITIONS_SELECT)
    .order('name')

  if (error) throw error
  return mapConditions(data)
}

// ─── CMS config ───────────────────────────────────────────────────────────────

/**
 * Fetch a single value from the cms_config key-value table.
 * Used by FreeTextPostEditor to load the directive AI prompt.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} key
 * @returns {Promise<string | null>}
 */
export async function fetchCmsConfig(supabase, key) {
  const { data, error } = await supabase
    .from('cms_config')
    .select('value')
    .eq('key', key)
    .single()

  if (error) throw error
  return data?.value ?? null
}
