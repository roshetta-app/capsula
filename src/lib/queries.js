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
 */

// ─── Drug queries ─────────────────────────────────────────────────────────────

/**
 * Fetch all published drugs as a flat list ready for the drug library UI.
 * Primary key is brand (item) UUID (one row per item — brand + strength + form).
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @returns {Promise<FlatDrug[]>}
 */
export async function fetchFlatDrugs(supabase) {
  const { data, error } = await supabase
    .from('brands')
    .select(`
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
    `)
    .eq('is_published', true)
    .order('name_en', { referencedTable: 'formulations.generics' })

  if (error) throw error

  return data
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
