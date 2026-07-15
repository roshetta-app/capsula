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
 */

// ─── Drug queries ─────────────────────────────────────────────────────────────

/**
 * Fetch all published drugs as a flat list ready for the drug library UI.
 * Primary key is formulation UUID (one row per formulation).
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @returns {Promise<FlatDrug[]>}
 */
export async function fetchFlatDrugs(supabase) {
  const { data, error } = await supabase
    .from('formulations')
    .select(`
      id, slug, concentration, form, route, doses_structured, default_dose_override,
      generics (
        id, slug, name_en, name_ar, category, class,
        uses_legacy, uses_structured, warnings_legacy,
        side_effects_common, side_effects_serious,
        pregnancy_category, breastfeeding_safety,
        crosses_placenta, crosses_bbb,
        contraindications, drug_interactions, dose_adjustments,
        pharmacokinetics, textbook_doses, textbook_dose_notes,
        mechanism_of_action, card_tagline, is_published
      ),
      brands ( id, name, name_ar, manufacturer, source, is_available, is_published )
    `)
    .eq('is_published', true)
    .order('name_en', { referencedTable: 'generics' })

  if (error) throw error

  return data
    .filter(f => f.generics?.is_published === true)
    .map(f => ({
      id:                   f.id,
      slug:                 f.slug,
      genericId:            f.generics.id,
      genericSlug:          f.generics.slug,
      genericName:          f.generics.name_en,
      arabicName:           f.generics.name_ar,
      category:             f.generics.category,
      class:                f.generics.class,
      cardTagline:          f.generics.card_tagline,
      mechanismOfAction:    f.generics.mechanism_of_action,
      // Uses: prefer structured, fall back to legacy
      uses:                 f.generics.uses_structured ?? (f.generics.uses_legacy ?? []).map(u => ({ use_name: u, context: '' })),
      warnings:             f.generics.warnings_legacy ?? [],
      sideEffectsCommon:    f.generics.side_effects_common   ?? [],
      sideEffectsSerious:   f.generics.side_effects_serious  ?? [],
      pregnancyCategory:    f.generics.pregnancy_category,
      breastfeedingSafety:  f.generics.breastfeeding_safety,
      crossesPlacenta:      f.generics.crosses_placenta,
      crossesBbb:           f.generics.crosses_bbb,
      contraindications:    f.generics.contraindications     ?? [],
      drugInteractions:     f.generics.drug_interactions     ?? [],
      doseAdjustments:      f.generics.dose_adjustments      ?? [],
      pharmacokinetics:     f.generics.pharmacokinetics,
      textbookDoses:        f.generics.textbook_doses        ?? [],
      textbookDoseNotes:    f.generics.textbook_dose_notes,
      // Formulation fields
      concentration:        f.concentration,
      form:                 f.form,
      route:                f.route,
      doses:                f.doses_structured ?? [],
      defaultDoseOverride:  f.default_dose_override,
      // Brands (published only, available only)
      brands: (f.brands ?? [])
        .filter(b => b.is_published && b.is_available)
        .map(b => ({
          id:           b.id,
          name:         b.name,
          nameAr:       b.name_ar,
          manufacturer: b.manufacturer,
          source:       b.source,
          isAvailable:  b.is_available,
        })),
    }))
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
