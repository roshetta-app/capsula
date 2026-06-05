/**
 * queries.js — Supabase data fetching
 *
 * All functions return plain JS objects matching the app's data shapes.
 * Import supabase client at call site and pass it in.
 */

// ─── Drug queries ─────────────────────────────────────────────────────────────

/**
 * Fetch all drugs as a flat list ready for the drug library UI.
 * Primary key is formulation UUID (one row per formulation).
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @returns {Promise<FlatDrug[]>}
 */
export async function fetchFlatDrugs(supabase) {
  const { data, error } = await supabase
    .from('formulations')
    .select(`
      id, concentration, form, route, doses,
      generics ( id, slug, name_en, name_ar, category, class, uses, warnings, doses ),
      brands   ( id, name, name_ar, in_stock, is_available )
    `)
    .order('name_en', { referencedTable: 'generics' })

  if (error) throw error

  return data.map(f => ({
    id:            f.id,
    genericId:     f.generics.id,
    slug:          f.generics.slug,
    genericName:   f.generics.name_en,
    arabicName:    f.generics.name_ar,
    category:      f.generics.category,
    class:         f.generics.class,
    uses:          f.generics.uses   ?? [],
    warnings:      f.generics.warnings ?? [],
    textbookDoses: f.generics.doses  ?? [],   // [{ group, instruction }]
    concentration: f.concentration,
    form:          f.form,
    route:         f.route,
    practicalDoses: f.doses          ?? [],   // [{ group, instruction }]
    brands: (f.brands ?? []).map(b => ({
      id:          b.id,
      name:        b.name,
      nameAr:      b.name_ar,
      inStock:     b.in_stock,
      isAvailable: b.is_available,
    })),
    // Derived: true if any brand is in stock
    inStock: (f.brands ?? []).some(b => b.in_stock),
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
 * Fetch all conditions with their full nested data.
 * Returns ConditionFull[] — see Section 4.4 of the project plan.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @returns {Promise<ConditionFull[]>}
 */
export async function fetchConditions(supabase) {
  const { data, error } = await supabase
    .from('conditions')
    .select(`
      id, name, slug, age_group,
      clinical_picture, history_questions, examination, investigations,
      patient_instructions,
      specialties ( id, name, slug ),
      condition_images ( id, url, caption, sort_order ),
      prescriptions (
        id, label, sort_order,
        prescription_items (
          id, type, content, sort_order,
          prescription_drug_alternatives (
            id, dose_instruction, sort_order,
            brands ( id, name, name_ar,
              formulations ( id, concentration, form, route )
            )
          )
        )
      )
    `)
    .order('name')

  if (error) throw error

  return data.map(c => ({
    id:                c.id,
    specialtyId:       c.specialties?.id,
    specialtyName:     c.specialties?.name,
    specialtySlug:     c.specialties?.slug,
    name:              c.name,
    slug:              c.slug,
    ageGroup:          c.age_group,
    clinicalPicture:   c.clinical_picture,
    historyQuestions:  c.history_questions ?? [],
    examination:       c.examination       ?? [],
    investigations:    c.investigations    ?? [],
    patientInstructions: c.patient_instructions,
    images: (c.condition_images ?? [])
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(img => ({ id: img.id, url: img.url, caption: img.caption })),
    prescriptions: (c.prescriptions ?? [])
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(rx => ({
        id:    rx.id,
        label: rx.label,
        items: (rx.prescription_items ?? [])
          .sort((a, b) => a.sort_order - b.sort_order)
          .map(item => ({
            id:      item.id,
            type:    item.type,
            content: item.content,
            alternatives: (item.prescription_drug_alternatives ?? [])
              .sort((a, b) => a.sort_order - b.sort_order)
              .map(alt => ({
                id:              alt.id,
                doseInstruction: alt.dose_instruction,
                brandId:         alt.brands?.id,
                brandName:       alt.brands?.name,
                brandNameAr:     alt.brands?.name_ar,
                concentration:   alt.brands?.formulations?.concentration,
                form:            alt.brands?.formulations?.form,
                route:           alt.brands?.formulations?.route,
              })),
          })),
      })),
  }))
}
