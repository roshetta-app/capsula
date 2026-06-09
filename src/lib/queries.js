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
      id, slug, concentration, form, route, doses, doses_structured, default_dose_override,
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
    .eq('generics.is_published', true)
    .order('name_en', { referencedTable: 'generics' })

  if (error) throw error

  return data
    .filter(f => f.generics?.is_published !== false)
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
      doses:                f.doses_structured ?? f.doses ?? [],   // prefer new structured
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
  specialties!conditions_specialty_id_fkey ( id, name_en, slug, icon_name, color_hex, sort_order ),
  condition_images ( id, url, caption, sort_order ),
  prescriptions (
    id, label, sort_order,
    prescription_items (
      id, type, content, sort_order,
      dose_override, drug_note, drug_note_ar, show_generic_link,
      prescription_drug_alternatives (
        id, dose_instruction, sort_order,
        brands ( id, name, name_ar, is_published,
          formulations ( id, slug, concentration, form, route )
        )
      )
    )
  )
`

function mapConditions(data) {
  return data.map(c => ({
    id:                   c.id,
    specialtyId:          c.specialties?.id,
    specialtyName:        c.specialties?.name_en,
    specialtySlug:        c.specialties?.slug,
    specialtyIcon:        c.specialties?.icon_name,
    specialtyColor:       c.specialties?.color_hex,
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
    prescriptions: (c.prescriptions ?? [])
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(rx => ({
        id:    rx.id,
        label: rx.label,
        items: (rx.prescription_items ?? [])
          .sort((a, b) => a.sort_order - b.sort_order)
          .map(item => ({
            id:              item.id,
            type:            item.type,
            content:         item.content,
            doseOverride:    item.dose_override,
            drugNote:        item.drug_note,
            drugNoteAr:      item.drug_note_ar,
            showGenericLink: item.show_generic_link ?? true,
            alternatives: (item.prescription_drug_alternatives ?? [])
              .filter(alt => alt.brands?.is_published !== false)
              .sort((a, b) => a.sort_order - b.sort_order)
              .map(alt => ({
                id:              alt.id,
                doseInstruction: alt.dose_instruction,
                brandId:         alt.brands?.id,
                brandName:       alt.brands?.name,
                brandNameAr:     alt.brands?.name_ar,
                formulationSlug: alt.brands?.formulations?.slug,
                concentration:   alt.brands?.formulations?.concentration,
                form:            alt.brands?.formulations?.form,
                route:           alt.brands?.formulations?.route,
              })),
          })),
      })),
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



File: src/pages/ConditionsScreen.jsx
---
/**
 * Phase 2I — Search shared components: swap to ui/SearchBar + ui/AutocompleteDropdown.
 *
 * Layout (top to bottom):
 *   1. Search bar (with autocomplete dropdown)
 *   2. Recently viewed chips row (hidden if empty)
 *   3. Specialty filter pills
 *   4. Condition cards list
 *
 * Uses:
 *   useConditionSearch  — fuzzy search + autocomplete + gap logging
 *   useRecentlyViewed   — last 5 viewed conditions from localStorage
 *   SpecialtyFilterPills — extracted specialty filter component
 *   RecentlyViewedChips  — recently viewed row
 *   ConditionCard        — rebuilt card (no bookmark, no age, has tagline + chevron)
 */

import { useNavigate } from 'react-router-dom'
import Layout from '../components/layout'
import SearchBar from '../components/ui/SearchBar'
import AutocompleteDropdown from '../components/ui/AutocompleteDropdown'
import ConditionCard from '../components/ConditionCard'
import SpecialtyFilterPills from '../components/conditions/SpecialtyFilterPills'
import RecentlyViewedChips  from '../components/conditions/RecentlyViewedChips'
import { useConditionContext }  from '../context/ConditionContext'
import { useConditionSearch }  from '../hooks/useConditionSearch'
import { useRecentlyViewed }   from '../hooks/useRecentlyViewed'
import { ROUTES } from '../router'

// ─── Shimmer skeleton ─────────────────────────────────────────────────────────

function shimmer(extra = {}) {
  return {
    backgroundColor: 'var(--color-border)',
    borderRadius:    'var(--radius-sm)',
    animation:       'shimmer 1.4s ease-in-out infinite',
    ...extra,
  }
}

function SkeletonCard() {
  return (
    <div style={{
      backgroundColor: 'var(--color-surface)',
      border:          '1px solid var(--color-border)',
      borderRadius:    'var(--radius-lg)',
      padding:         '12px var(--space-4)',
      marginBottom:    'var(--space-2)',
      display:         'flex',
      alignItems:      'center',
      gap:             'var(--space-3)',
    }}>
      <div style={shimmer({ width: 36, height: 36, borderRadius: 'var(--radius-md)', flexShrink: 0 })} />
      <div style={{ flex: 1 }}>
        <div style={shimmer({ width: 60, height: 10, marginBottom: 6 })} />
        <div style={shimmer({ width: '60%', height: 15 })} />
      </div>
    </div>
  )
}

// ─── ConditionsScreen ─────────────────────────────────────────────────────────

export default function ConditionsScreen() {
  const navigate = useNavigate()
  const { conditions, specialties, loading } = useConditionContext()
  const { recentlyViewed } = useRecentlyViewed()

  const {
    query,
    setQuery,
    activeSpecialty,
    setActiveSpecialty,
    results,
    suggestions,
    showSuggestions,
    clearSuggestions,
  } = useConditionSearch(conditions)

  // ── Autocomplete: navigate to selected suggestion ─────────────────────────
  function handleSuggestionSelect(suggestion) {
    clearSuggestions()
    setQuery('')
    navigate(ROUTES.CONDITION_DETAIL(suggestion.slug))
  }

  // ── Card tap ──────────────────────────────────────────────────────────────
  function handleCardTap(condition) {
    navigate(ROUTES.CONDITION_DETAIL(condition.slug))
  }

  // ── Cold start skeleton ───────────────────────────────────────────────────
  if (loading && conditions.length === 0) {
    return (
      <Layout>
        <div style={{ paddingTop: 'var(--space-5)' }}>
          <div style={shimmer({ width: '100%', height: 44, marginBottom: 'var(--space-3)', borderRadius: 'var(--radius-lg)' })} />
          <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-3)', overflow: 'hidden' }}>
            {[80, 100, 70, 90, 110].map((w, i) => (
              <div key={i} style={shimmer({ width: w, height: 32, borderRadius: 'var(--radius-full)', flexShrink: 0 })} />
            ))}
          </div>
          {[1, 2, 3, 4].map(i => <SkeletonCard key={i} />)}
        </div>
      </Layout>
    )
  }

  // ── Main render ───────────────────────────────────────────────────────────
  return (
    <Layout>
      <div style={{ paddingTop: 'var(--space-5)' }}>

        {/* 1. Search bar + autocomplete dropdown */}
        <div style={{ position: 'relative', marginBottom: 'var(--space-3)' }}>
          <SearchBar
            value={query}
            onChange={(val) => {
              setQuery(val)
              if (!val) clearSuggestions()
            }}
            placeholder="Search conditions…"
          />
          {showSuggestions && (
            <AutocompleteDropdown
              suggestions={suggestions}
              onSelect={handleSuggestionSelect}
              onDismiss={clearSuggestions}
            />
          )}
        </div>

        {/* 2. Recently viewed chips (hidden if empty) */}
        <RecentlyViewedChips recentlyViewed={recentlyViewed} />

        {/* 3. Specialty filter pills */}
        <SpecialtyFilterPills
          specialties={specialties}
          activeSpecialty={activeSpecialty}
          onSelect={setActiveSpecialty}
        />

        {/* Result count */}
        <div style={{
          fontSize:     12,
          color:        'var(--color-text-tertiary)',
          fontFamily:   'var(--font-mono)',
          marginBottom: 'var(--space-3)',
        }}>
          {results.length} condition{results.length !== 1 ? 's' : ''}
          {query && ` for "${query}"`}
        </div>

        {/* 4. Condition cards list */}
        {results.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding:   'var(--space-12) var(--space-4)',
            color:     'var(--color-text-tertiary)',
          }}>
            <div style={{ marginBottom: 'var(--space-3)', opacity: 0.4 }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="1.5"
                strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
            </div>
            <div style={{ fontSize: 15, color: 'var(--color-text-secondary)' }}>
              No conditions found{query && ` for "${query}"`}
            </div>
          </div>
        ) : (
          results.map(condition => (
            <ConditionCard
              key={condition.id}
              condition={condition}
              onTap={handleCardTap}
            />
          ))
        )}

      </div>
    </Layout>
  )
}






File: src/pages/DrugDetailScreen.jsx
---
/**
 * src/pages/DrugDetailScreen.jsx
 * Phase 2G — Drug Detail Screen (full rebuild)
 *
 * Route: /drugs/:slug
 * Replaces the Phase 2B stub with the full-featured detail screen.
 *
 * Layout (top → bottom):
 *   1. DrugHeader    — name, concentration·form, category badge, back + star
 *   2. DoseTable     — practical doses + collapsible reference dose
 *   3. BrandsList    — Egyptian brands with per-brand stock dot
 *   4. DrugInfoSections — mechanism, uses, side effects, pregnancy, etc.
 */

import { useParams, useNavigate }   from 'react-router-dom'
import Layout                        from '../components/layout'
import DrugHeader                    from '../components/drugs/DrugHeader'
import DoseTable                     from '../components/drugs/DoseTable'
import BrandsList                    from '../components/drugs/BrandsList'
import DrugInfoSections              from '../components/drugs/DrugInfoSections'
import { useDrugContext }            from '../context/DrugContext'
import { useStock }                  from '../hooks/useStock'
import { useFavouritesContext }      from '../context/FavouritesContext'

export default function DrugDetailScreen() {
  const { slug }   = useParams()
  const navigate   = useNavigate()

  const { drugs, loading }          = useDrugContext()
  const { stockMap, toggleStock }   = useStock(drugs)
  const { isDrugFavourited, toggleDrug } = useFavouritesContext()

  // Match by formulation slug first, fall back to id
  const drug = drugs.find(d => d.slug === slug || d.id === slug)

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading && !drug) {
    return (
      <Layout>
        <div style={{
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
          minHeight:      '60dvh',
          color:          'var(--color-text-tertiary)',
          fontSize:       14,
        }}>
          Loading…
        </div>
      </Layout>
    )
  }

  // ── Not found ──────────────────────────────────────────────────────────────
  if (!drug) {
    return (
      <Layout>
        <div style={{
          display:        'flex',
          flexDirection:  'column',
          alignItems:     'center',
          justifyContent: 'center',
          minHeight:      '60dvh',
          gap:            'var(--space-3)',
          color:          'var(--color-text-tertiary)',
          padding:        'var(--space-6)',
          textAlign:      'center',
        }}>
          <div style={{ fontSize: 32, opacity: 0.3 }}>💊</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-text-secondary)' }}>
            Drug not found
          </div>
          <div style={{ fontSize: 13 }}>
            This drug may have been removed or the link is incorrect.
          </div>
          <button
            onClick={() => navigate('/drugs')}
            style={{
              marginTop:    'var(--space-2)',
              padding:      '8px 20px',
              borderRadius: 'var(--radius-sm)',
              border:       '1px solid var(--color-border)',
              background:   'none',
              fontSize:     13,
              fontWeight:   500,
              color:        'var(--color-text-secondary)',
              cursor:       'pointer',
              fontFamily:   'var(--font-body)',
            }}
          >
            ← Back to Drugs
          </button>
        </div>
      </Layout>
    )
  }

  // ── Per-brand stock toggle ─────────────────────────────────────────────────
  // stockMap keys by any id; brand ids work the same as formulation ids.
  // Default: in stock (true) unless explicitly set to false.
  const brandStockMap = {}
  drug.brands?.forEach(b => {
    brandStockMap[b.id] = stockMap[b.id] !== false
  })

  function handleBrandStockToggle(brandId) {
    const current = brandStockMap[brandId]
    toggleStock(brandId, !current)
  }

  // ── Detail ─────────────────────────────────────────────────────────────────
  return (
    <Layout>
      <div style={{ paddingBottom: 'var(--space-12)' }}>

        <DrugHeader
          drug={drug}
          isFavourited={isDrugFavourited(drug.id)}
          onBack={() => navigate(-1)}
          onToggleFav={() => toggleDrug(drug.id)}
        />

        <div style={{
          backgroundColor: 'var(--color-surface)',
          border:          '1px solid var(--color-border)',
          borderRadius:    'var(--radius-lg)',
          padding:         'var(--space-5)',
          boxShadow:       'var(--shadow-card)',
        }}>

          <DoseTable
            doses={drug.doses}
            defaultDoseOverride={drug.defaultDoseOverride}
            textbookDoses={drug.textbookDoses}
            textbookDoseNotes={drug.textbookDoseNotes}
          />

          <BrandsList
            brands={drug.brands}
            concentration={drug.concentration}
            form={drug.form}
            stockMap={brandStockMap}
            onToggleStock={handleBrandStockToggle}
          />

          <DrugInfoSections drug={drug} />

        </div>
      </div>
    </Layout>
  )
}



File: src/pages/DrugsScreen.jsx
---
/**
 * src/pages/DrugsScreen.jsx
 * Phase 2I — adds fuzzy search + autocomplete dropdown.
 *
 * Changes from 2F:
 *  - useSearch (simple includes) → useDrugSearch (Fuse.js fuzzy, gap logging)
 *  - Inline SearchBar → shared src/components/ui/SearchBar
 *  - AutocompleteDropdown added below search bar in results view
 *  - Autocomplete: tap suggestion → navigate directly to /drugs/:slug
 */

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/layout'
import DrugFilterPanel from '../components/drugs/DrugFilterPanel'
import SearchBar from '../components/ui/SearchBar'
import AutocompleteDropdown from '../components/ui/AutocompleteDropdown'
import { useDrugContext } from '../context/DrugContext'
import { useDrugSearch } from '../hooks/useDrugSearch'
import { useStock } from '../hooks/useStock'
import { DRUG_CATEGORIES } from '../config/categories'
import { getCategoryMeta } from '../constants/drugCategories'
import { ROUTES } from '../router'

const RECENT_KEY = 'capsula_recent_drugs'
const MAX_RECENT = 5

// ─── Recently viewed drugs (localStorage) ────────────────────────────────────

function readRecentDrugs() {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]') } catch { return [] }
}
function addRecentDrug(drug) {
  try {
    const prev    = readRecentDrugs()
    const filtered = prev.filter(d => d.id !== drug.id)
    const next    = [{ id: drug.id, name: drug.genericName, slug: drug.slug || drug.id }, ...filtered].slice(0, MAX_RECENT)
    localStorage.setItem(RECENT_KEY, JSON.stringify(next))
  } catch { /* ignore */ }
}

// ─── applyFilters ─────────────────────────────────────────────────────────────

function applyFilters(drugs, filters) {
  if (!filters) return drugs
  let result = drugs

  // Form
  if (!filters.forms.includes('all')) {
    result = result.filter(d =>
      d.formulations?.some(f => filters.forms.includes(f.form?.toLowerCase()))
    )
  }

  // Pregnancy
  if (filters.pregnancySafe && !filters.pregnancyUnsafe) {
    result = result.filter(d => ['A', 'B'].includes(d.pregnancyCategory))
  } else if (filters.pregnancyUnsafe && !filters.pregnancySafe) {
    result = result.filter(d => ['C', 'D', 'X'].includes(d.pregnancyCategory))
  }

  // Breastfeeding
  if (filters.bfSafe && !filters.bfUnsafe) {
    result = result.filter(d => d.breastfeedingSafety === 'safe')
  } else if (filters.bfUnsafe && !filters.bfSafe) {
    result = result.filter(d => ['caution', 'unsafe'].includes(d.breastfeedingSafety))
  }

  return result
}

// ─── DrugsScreen ──────────────────────────────────────────────────────────────

export default function DrugsScreen() {
  const navigate           = useNavigate()
  const { drugs, loading } = useDrugContext()
  const {
    query,
    setQuery,
    results:         searchResults,
    suggestions,
    showSuggestions,
    clearSuggestions,
  } = useDrugSearch(drugs)
  const { stockMap, toggleStock } = useStock(drugs)

  const [activeCategory, setActiveCategory] = useState(null) // null = category list
  const [filterOpen,     setFilterOpen]     = useState(false)
  const [activeFilters,  setActiveFilters]  = useState(null)
  const [recentDrugs,    setRecentDrugs]    = useState(() => readRecentDrugs())

  // Refresh recent list when navigating back
  useEffect(() => {
    setRecentDrugs(readRecentDrugs())
  }, [])

  function handleDrugTap(drug) {
    addRecentDrug(drug)
    setRecentDrugs(readRecentDrugs())
    navigate(ROUTES.DRUG_DETAIL(drug.slug || drug.id))
  }

  function handleApplyFilters(filters) {
    // Check if anything is actually active
    const hasActive = !filters.forms.includes('all') || filters.pregnancySafe || filters.pregnancyUnsafe || filters.bfSafe || filters.bfUnsafe
    setActiveFilters(hasActive ? filters : null)
  }

  function handleSuggestionSelect(suggestion) {
    clearSuggestions()
    setQuery('')
    navigate(ROUTES.DRUG_DETAIL(suggestion.slug || suggestion.id))
  }

  const hasQuery = query.trim().length > 0
  const hasFilters = !!activeFilters

  // ── Search results view ───────────────────────────────────────────────────
  if (hasQuery || (activeCategory !== null)) {
    const base = hasQuery
      ? searchResults
      : drugs.filter(d => activeCategory === '__all' || d.category === activeCategory)

    const displayed = applyFilters(base, activeFilters)
      .slice()
      .sort((a, b) => a.genericName.localeCompare(b.genericName))

    return (
      <Layout>
        <div style={{ paddingTop: 'var(--space-5)' }}>
        {/* Search bar + autocomplete */}
        <div style={{ position: 'relative', marginBottom: 'var(--space-3)' }}>
          <SearchBar
            value={query}
            onChange={(val) => {
              setQuery(val)
              if (!val) clearSuggestions()
            }}
            placeholder="Search drugs…"
            onFilter={() => setFilterOpen(true)}
            hasActiveFilters={hasFilters}
          />
          {showSuggestions && (
            <AutocompleteDropdown
              suggestions={suggestions}
              onSelect={handleSuggestionSelect}
              onDismiss={clearSuggestions}
            />
          )}
        </div>

          {/* Back to categories button (only when in a category, not searching) */}
          {!hasQuery && activeCategory !== null && (
            <button
              onClick={() => setActiveCategory(null)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--color-accent)', fontSize: 14, fontWeight: 500,
                fontFamily: 'var(--font-body)', padding: '4px 0',
                marginBottom: 'var(--space-3)',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
              {activeCategory === '__all'
                ? 'All Drugs'
                : (DRUG_CATEGORIES.find(c => c.value === activeCategory)?.label ?? activeCategory)
              }
            </button>
          )}

          <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginBottom: 'var(--space-3)' }}>
            {displayed.length} drug{displayed.length !== 1 ? 's' : ''}
            {query && ` for "${query}"`}
          </div>

          {displayed.length === 0 ? (
            <EmptyState query={query} />
          ) : (
            displayed.map(drug => (
              <DrugListRow
                key={drug.id}
                drug={drug}
                isInStock={stockMap[drug.id] ?? true}
                onTap={handleDrugTap}
              />
            ))
          )}
        </div>

        <DrugFilterPanel
          isOpen={filterOpen}
          onClose={() => setFilterOpen(false)}
          onApply={handleApplyFilters}
        />
      </Layout>
    )
  }

  // ── Category list view ────────────────────────────────────────────────────
  const categoriesWithCounts = DRUG_CATEGORIES
    .map(cat => ({
      ...cat,
      count: drugs.filter(d => d.category === cat.value).length,
    }))
    .filter(c => c.count > 0)

  return (
    <Layout>
      <div style={{ paddingTop: 'var(--space-5)' }}>
        <SearchBar
          value={query}
          onChange={(val) => {
            setQuery(val)
            if (!val) clearSuggestions()
          }}
          placeholder="Search drugs…"
          onFilter={() => setFilterOpen(true)}
          hasActiveFilters={hasFilters}
        />

        {/* Recently viewed chips */}
        {recentDrugs.length > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
            overflowX: 'auto', paddingBottom: 'var(--space-1)',
            marginBottom: 'var(--space-3)',
            scrollbarWidth: 'none', msOverflowStyle: 'none',
          }}>
            <span style={{
              fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
              textTransform: 'uppercase', color: 'var(--color-text-tertiary)',
              flexShrink: 0, paddingRight: 'var(--space-1)',
            }}>
              Recent
            </span>
            {recentDrugs.map(d => (
              <button
                key={d.id}
                onClick={() => navigate(ROUTES.DRUG_DETAIL(d.slug || d.id))}
                style={{
                  flexShrink: 0, padding: '5px 12px',
                  borderRadius: 'var(--radius-full)',
                  fontSize: 12, fontWeight: 500,
                  cursor: 'pointer', whiteSpace: 'nowrap',
                  border: '1.5px solid var(--color-border)',
                  backgroundColor: 'var(--color-surface)',
                  color: 'var(--color-text-secondary)',
                  fontFamily: 'var(--font-body)',
                  WebkitTapHighlightColor: 'transparent', outline: 'none',
                }}
              >
                {d.name}
              </button>
            ))}
          </div>
        )}

        {/* Loading skeleton */}
        {loading && drugs.length === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} style={{
                height: 64,
                backgroundColor: 'var(--color-border)',
                borderRadius: 'var(--radius-lg)',
                animation: 'shimmer 1.4s ease-in-out infinite',
              }} />
            ))}
          </div>
        )}

        {/* "All Drugs" row */}
        {!loading && (
          <>
            <CategoryRow
              label="All Drugs"
              count={drugs.length}
              icon="fa-pills"
              color="#F3F4F6"
              textColor="#374151"
              onTap={() => setActiveCategory('__all')}
            />

            {/* Category rows */}
            {categoriesWithCounts.map(cat => {
              const meta = getCategoryMeta(cat.value)
              return (
                <CategoryRow
                  key={cat.value}
                  label={cat.label}
                  count={cat.count}
                  icon={meta.icon}
                  color={meta.color}
                  textColor={meta.textColor}
                  onTap={() => setActiveCategory(cat.value)}
                />
              )
            })}
          </>
        )}
      </div>

      <DrugFilterPanel
        isOpen={filterOpen}
        onClose={() => setFilterOpen(false)}
        onApply={handleApplyFilters}
      />
    </Layout>
  )
}

// ─── CategoryRow ──────────────────────────────────────────────────────────────

function CategoryRow({ label, count, icon, color, textColor, onTap }) {
  return (
    <div
      onClick={onTap}
      style={{
        display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-3) var(--space-4)',
        marginBottom: 'var(--space-2)',
        cursor: 'pointer',
        boxShadow: 'var(--shadow-card)',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      {/* Icon in tinted circle */}
      <div style={{
        width: 40, height: 40, borderRadius: '50%',
        backgroundColor: color,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <i className={`fa-solid ${icon}`} style={{ color: textColor, fontSize: 16 }} />
      </div>

      {/* Name + count */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)', lineHeight: 1.3 }}>
          {label}
        </div>
        <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginTop: 1 }}>
          {count} drug{count !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Chevron */}
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-tertiary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
        <polyline points="9 18 15 12 9 6"/>
      </svg>
    </div>
  )
}

// ─── DrugListRow ──────────────────────────────────────────────────────────────

function DrugListRow({ drug, isInStock, onTap }) {
  const brandNames = drug.brands?.map(b => b.name) ?? []
  const meta = getCategoryMeta(drug.category)

  return (
    <div
      onClick={() => onTap(drug)}
      style={{
        display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-3) var(--space-4)',
        marginBottom: 'var(--space-2)',
        cursor: 'pointer',
        opacity: isInStock ? 1 : 0.55,
        boxShadow: 'var(--shadow-card)',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      {/* Stock dot */}
      <div style={{
        width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
        backgroundColor: isInStock ? 'var(--color-instock, #10B981)' : 'var(--color-outstock, #9CA3AF)',
      }} />

      {/* Name + brands */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)', lineHeight: 1.3 }}>
          {drug.genericName}
        </div>
        {brandNames.length > 0 && (
          <div style={{ fontSize: 12, color: 'var(--color-accent)', fontWeight: 500, marginTop: 1, lineHeight: 1.3 }}>
            {brandNames.slice(0, 4).join(' · ')}{brandNames.length > 4 ? ' …' : ''}
          </div>
        )}
      </div>

      {/* Category pill */}
      <span style={{
        fontSize: 11, fontWeight: 500, flexShrink: 0,
        backgroundColor: meta.color, color: meta.textColor,
        borderRadius: 'var(--radius-full)', padding: '2px 8px',
        letterSpacing: '0.03em',
      }}>
        {DRUG_CATEGORIES.find(c => c.value === drug.category)?.label ?? drug.category}
      </span>
    </div>
  )
}

// ─── EmptyState ───────────────────────────────────────────────────────────────

function EmptyState({ query }) {
  return (
    <div style={{ textAlign: 'center', padding: 'var(--space-12) var(--space-4)', color: 'var(--color-text-tertiary)' }}>
      <div style={{ marginBottom: 'var(--space-3)', opacity: 0.4 }}>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
      </div>
      <div style={{ fontSize: 15, marginBottom: 'var(--space-2)', color: 'var(--color-text-secondary)' }}>
        No drugs found{query ? ` for "${query}"` : ''}
      </div>
      <div style={{ fontSize: 13 }}>Try searching by generic name or brand name</div>
    </div>
  )
}






File: src/pages/ConditionDetailScreen.jsx
---
import { useState, useRef, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useConditionContext } from '../context/ConditionContext'
import { useFavouritesContext } from '../context/FavouritesContext'
import { useRecentlyViewed } from '../hooks/useRecentlyViewed'
import PrescriptionsTab from '../components/conditions/PrescriptionsTab'
import ClinicalDataTab from '../components/conditions/ClinicalDataTab'
import BottomNav from '../components/BottomNav'
import ShareCard from '../components/ui/ShareCard'
import { shareConditionPrescription } from '../utils/sharing'

const AGE_STYLES = {
  adult:     { bg: '#DBEAFE', color: '#1E40AF' },
  pediatric: { bg: '#D1FAE5', color: '#065F46' },
  both:      { bg: '#EDE9FE', color: '#5B21B6' },
}

function ageLabel(group) {
  if (group === 'pediatric') return 'Pediatric'
  if (group === 'both')      return 'All ages'
  return 'Adult'
}

const TABS = ['Rx', 'Clinical']

export default function ConditionDetailScreen() {
  const { slug }    = useParams()
  const navigate    = useNavigate()
  const { conditions, loading } = useConditionContext()
  const { isConditionFavourited, toggleCondition } = useFavouritesContext()
  const { addRecentlyViewed } = useRecentlyViewed()

  const [activeTab, setActiveTab]                   = useState(0)
  const [activePrescriptionIdx, setActivePrescriptionIdx] = useState(0)
  const touchStartX  = useRef(null)
  const touchStartY  = useRef(null)
  const shareCardRef = useRef(null)

  function handleTouchStart(e) {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }

  function handleTouchEnd(e) {
    if (touchStartX.current === null) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    const dy = e.changedTouches[0].clientY - touchStartY.current
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) {
      if (dx < 0 && activeTab < TABS.length - 1) setActiveTab(t => t + 1)
      if (dx > 0 && activeTab > 0)               setActiveTab(t => t - 1)
    }
    touchStartX.current = null
    touchStartY.current = null
  }

  // Add to recently viewed once condition is resolved
  const condition = conditions.find(c => c.slug === slug)
  const isFav = condition ? isConditionFavourited(condition.id) : false

  useEffect(() => {
    if (condition) {
      addRecentlyViewed({ id: condition.id, name: condition.name, slug: condition.slug })
    }
  }, [condition?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Build share card prescription snapshot ─────────────────────────────────

  function buildSharePrescription() {
    const rx = condition?.prescriptions?.[activePrescriptionIdx]
    if (!rx) return null
    return {
      label: rx.label,
      drugs: (rx.drugs ?? []).map(d => ({
        brandName:     d.primaryBrand ?? d.brandName ?? d.name ?? '',
        concentration: d.concentration ?? '',
        form:          d.form ?? '',
        dose:          d.dose_override ?? d.instruction ?? '',
        note:          d.drug_note ?? '',
      })),
    }
  }

  function handleShare() {
    shareConditionPrescription(condition, buildSharePrescription(), shareCardRef)
  }

  // ─── Loading / not found guards ─────────────────────────────────────────────

  if (loading) {
    return (
      <div style={pageStyle}>
        <DetailHeader onBack={() => navigate('/')} condition={null} />
        <div style={{ maxWidth: 680, margin: '0 auto', padding: 'var(--space-8) var(--space-4)', textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: 14 }}>
          Loading…
        </div>
        <BottomNav />
      </div>
    )
  }

  if (!condition) {
    return (
      <div style={pageStyle}>
        <DetailHeader onBack={() => navigate('/')} condition={null} />
        <div style={{ maxWidth: 680, margin: '0 auto', padding: 'var(--space-8) var(--space-4)', textAlign: 'center' }}>
          <div style={{ fontSize: 15, color: 'var(--color-text-secondary)', marginBottom: 'var(--space-2)' }}>Condition not found</div>
          <div style={{ fontSize: 13, color: 'var(--color-text-tertiary)' }}>"{slug}" does not match any condition in the database.</div>
        </div>
        <BottomNav />
      </div>
    )
  }

  return (
    <div style={pageStyle}>
      <DetailHeader
        onBack={() => navigate(-1)}
        condition={condition}
        isFav={isFav}
        onFavToggle={() => toggleCondition(condition.id)}
        onShare={handleShare}
      />

      {/* Hidden ShareCard — off-screen, captured by html2canvas on share */}
      <div style={{ position: 'fixed', top: -9999, left: -9999, zIndex: -1, pointerEvents: 'none' }}>
        <ShareCard
          ref={shareCardRef}
          condition={{ name: condition.name, specialtyName: condition.specialtyName }}
          prescription={buildSharePrescription()}
        />
      </div>

      {/* Tab strip — full-width background, content centred */}
      <div style={{
        position: 'sticky',
        top: 57,
        zIndex: 40,
        backgroundColor: 'var(--color-surface)',
        borderBottom: '1px solid var(--color-border)',
      }}>
        <div style={{
          maxWidth: 680,
          margin: '0 auto',
          display: 'flex',
        }}>
          {TABS.map((label, i) => {
            const isActive = activeTab === i
            return (
              <button
                key={label}
                onClick={() => setActiveTab(i)}
                style={{
                  flex: 1,
                  padding: 'var(--space-3) var(--space-4)',
                  fontSize: 14,
                  fontWeight: isActive ? 600 : 400,
                  fontFamily: 'var(--font-body)',
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  color: isActive ? 'var(--color-accent)' : 'var(--color-text-tertiary)',
                  borderBottom: isActive ? '2px solid var(--color-accent)' : '2px solid transparent',
                  transition: 'color 0.15s ease, border-color 0.15s ease',
                  WebkitTapHighlightColor: 'transparent',
                  outline: 'none',
                }}
              >
                {label}
              </button>
            )
          })}
        </div>
      </div>

      {/*
        Swipeable viewport.
        overflow:hidden clips the off-screen panel.
        The inner 200%-wide row is fine because THIS element has overflow:hidden —
        it never causes a horizontal scrollbar on the page.
      */}
      <div
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        style={{ overflow: 'hidden' }}
      >
        <div style={{
          display: 'flex',
          width: '200%',
          transform: `translateX(${activeTab === 0 ? '0%' : '-50%'})`,
          transition: 'transform 0.28s cubic-bezier(0.4, 0, 0.2, 1)',
        }}>

          {/* Panel 0 — Prescriptions */}
          <div style={{ width: '50%', flexShrink: 0, boxSizing: 'border-box' }}>
            <div style={{ maxWidth: 680, margin: '0 auto', padding: 'var(--space-5) var(--space-4)', paddingBottom: 'calc(var(--space-12) + 60px)' }}>
              <PrescriptionsTab
                prescriptions={condition.prescriptions}
                patientInstructions={condition.patientInstructions}
                conditionId={condition.id}
                onPrescriptionChange={setActivePrescriptionIdx}
              />
            </div>
          </div>

          {/* Panel 1 — Clinical Data */}
          <div style={{ width: '50%', flexShrink: 0, boxSizing: 'border-box' }}>
            <div style={{ maxWidth: 680, margin: '0 auto', padding: 'var(--space-5) var(--space-4)', paddingBottom: 'calc(var(--space-12) + 60px)' }}>
              <ClinicalDataTab condition={condition} />
            </div>
          </div>

        </div>
      </div>

      <BottomNav />
    </div>
  )
}

// ─── Shared page style — same bg, no box ──────────────────────────────────────

const pageStyle = {
  minHeight: '100dvh',
  backgroundColor: 'var(--color-bg)',
  fontFamily: 'var(--font-body)',
  color: 'var(--color-text-primary)',
}

// ─── DetailHeader — full-width bg, content centred ────────────────────────────

function DetailHeader({ onBack, condition, isFav, onFavToggle, onShare }) {
  const ageStyle = condition
    ? (AGE_STYLES[condition.ageGroup] ?? { bg: '#F3F4F6', color: '#374151' })
    : null

  return (
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 50,
      backgroundColor: 'var(--color-surface)',
      borderBottom: '1px solid var(--color-border)',
    }}>
      <div style={{ maxWidth: 680, margin: '0 auto', padding: 'var(--space-3) var(--space-4)' }}>
        {/* Top row: back button + action buttons */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: condition ? 'var(--space-2)' : 0 }}>
          <button
            onClick={onBack}
            aria-label="Back"
            style={{
              display: 'flex', alignItems: 'center', gap: 'var(--space-1)',
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--color-accent)', fontSize: 14, fontWeight: 500,
              fontFamily: 'var(--font-body)', padding: '4px 0',
              WebkitTapHighlightColor: 'transparent', outline: 'none',
            }}
          >
            <ArrowLeft size={16} strokeWidth={2} />
            Back
          </button>

          {/* Share + Star buttons */}
          {condition && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>

              {/* Share button */}
              <button
                onClick={onShare}
                aria-label="Share prescription"
                style={{
                  background: 'none', border: 'none', cursor: 'pointer', padding: 4,
                  color: 'var(--color-text-tertiary)',
                  WebkitTapHighlightColor: 'transparent', outline: 'none',
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24"
                  fill="none" stroke="currentColor" strokeWidth="2"
                  strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                  <polyline points="16 6 12 2 8 6" />
                  <line x1="12" y1="2" x2="12" y2="15" />
                </svg>
              </button>

              {/* Star favourite button */}
              <button
                onClick={onFavToggle}
                aria-label={isFav ? 'Remove from favourites' : 'Add to favourites'}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer', padding: 4,
                  color: isFav ? '#F59E0B' : 'var(--color-text-tertiary)',
                  transition: 'color 0.15s ease',
                  WebkitTapHighlightColor: 'transparent', outline: 'none',
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24"
                  fill={isFav ? 'currentColor' : 'none'}
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                </svg>
              </button>

            </div>
          )}
        </div>

        {condition && (
          <div>
            <h1 style={{
              fontSize: 18, fontWeight: 700,
              color: 'var(--color-text-primary)',
              margin: '0 0 var(--space-2) 0',
              lineHeight: 1.25, letterSpacing: '-0.2px',
            }}>
              {condition.name}
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
              {condition.specialtyName && (
                <span style={{
                  fontSize: 11, fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase',
                  color: 'var(--color-text-tertiary)', backgroundColor: 'var(--color-bg)',
                  border: '1px solid var(--color-border)', padding: '2px 8px', borderRadius: 'var(--radius-full)',
                }}>
                  {condition.specialtyName}
                </span>
              )}
              {condition.ageGroup && (
                <span style={{
                  fontSize: 11, fontWeight: 500,
                  backgroundColor: ageStyle.bg, color: ageStyle.color,
                  padding: '2px 8px', borderRadius: 'var(--radius-full)',
                }}>
                  {ageLabel(condition.ageGroup)}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  )
}



File: src/pages/FavouritesScreen.jsx
---
/**
 * src/pages/FavouritesScreen.jsx
 * Phase 2H — Favourites Screen rebuild
 *
 * Changes from stub:
 *  - Symmetric pill tabs: equal width, centered, Star icon, count badge
 *  - Empty state: Star icon (not Bookmark)
 *  - Drug card onTap → navigate to /drugs/:slug (FIX — was dead () => {})
 *  - Removing a favourite shows a brief snackbar: "Removed from favourites"
 *  - Snackbar is triggered by wrapping toggleDrug / toggleCondition
 */

import { useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Star } from 'lucide-react'
import Layout from '../components/layout'
import ConditionCard from '../components/ConditionCard'
import DrugCard from '../components/DrugCard'
import { useConditionContext } from '../context/ConditionContext'
import { useDrugContext } from '../context/DrugContext'
import { useFavouritesContext } from '../context/FavouritesContext'
import { useStock } from '../hooks/useStock'

// ─── Snackbar ─────────────────────────────────────────────────────────────────

function Snackbar({ visible, message }) {
  return (
    <div
      aria-live="polite"
      style={{
        position:        'fixed',
        bottom:          80,           // above bottom nav
        left:            '50%',
        transform:       `translateX(-50%) translateY(${visible ? 0 : 12}px)`,
        opacity:         visible ? 1 : 0,
        transition:      'opacity 0.2s ease, transform 0.2s ease',
        backgroundColor: 'var(--color-text-primary)',
        color:           'var(--color-bg)',
        fontSize:        13,
        fontWeight:      500,
        padding:         '8px 18px',
        borderRadius:    'var(--radius-full)',
        boxShadow:       'var(--shadow-elevated)',
        whiteSpace:      'nowrap',
        pointerEvents:   'none',
        zIndex:          9999,
      }}
    >
      {message}
    </div>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ label }) {
  return (
    <div style={{
      display:        'flex',
      flexDirection:  'column',
      alignItems:     'center',
      justifyContent: 'center',
      padding:        'var(--space-12) var(--space-4)',
      gap:            'var(--space-3)',
      color:          'var(--color-text-tertiary)',
    }}>
      <Star size={36} style={{ opacity: 0.25 }} />
      <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text-secondary)' }}>
        No saved {label} yet
      </div>
      <div style={{ fontSize: 13, textAlign: 'center' }}>
        Tap the star on any {label === 'conditions' ? 'condition' : 'drug'} to save it here
      </div>
    </div>
  )
}

// ─── FavouritesScreen ─────────────────────────────────────────────────────────

export default function FavouritesScreen() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('conditions')

  // Snackbar state
  const [snackVisible, setSnackVisible] = useState(false)
  const snackTimer = useRef(null)

  function showSnack() {
    if (snackTimer.current) clearTimeout(snackTimer.current)
    setSnackVisible(true)
    snackTimer.current = setTimeout(() => setSnackVisible(false), 2000)
  }

  const { favourites, toggleDrug, toggleCondition } = useFavouritesContext()
  const { conditions } = useConditionContext()
  const { drugs }      = useDrugContext()
  const { stockMap }   = useStock(drugs)

  // Look up full objects from context
  const savedConditions = favourites.conditions
    .map(id => conditions.find(c => c.id === id))
    .filter(Boolean)

  const savedDrugs = favourites.drugs
    .map(id => drugs.find(d => d.id === id))
    .filter(Boolean)

  // Wrappers that also trigger the snackbar (called on remove = already favourited)
  const handleRemoveDrug = useCallback((id) => {
    toggleDrug(id)
    showSnack()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toggleDrug])

  const handleRemoveCondition = useCallback((id) => {
    toggleCondition(id)
    showSnack()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toggleCondition])

  const tabs = [
    { key: 'conditions', label: 'Conditions', count: savedConditions.length },
    { key: 'drugs',      label: 'Drugs',      count: savedDrugs.length      },
  ]

  return (
    <Layout>
      <div style={{ paddingTop: 'var(--space-5)' }}>

        {/* Page heading */}
        <h1 style={{
          fontSize:      20,
          fontWeight:    700,
          color:         'var(--color-text-primary)',
          margin:        '0 0 var(--space-4)',
          letterSpacing: '-0.3px',
        }}>
          Favourites
        </h1>

        {/* Symmetric pill tabs — equal width, centered, star icon */}
        <div style={{
          display:       'grid',
          gridTemplateColumns: '1fr 1fr',
          gap:           'var(--space-2)',
          marginBottom:  'var(--space-4)',
        }}>
          {tabs.map(tab => {
            const isActive = activeTab === tab.key
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  display:         'flex',
                  alignItems:      'center',
                  justifyContent:  'center',
                  gap:             'var(--space-2)',
                  padding:         '8px 0',
                  borderRadius:    'var(--radius-full)',
                  fontSize:        13,
                  fontWeight:      isActive ? 600 : 400,
                  fontFamily:      'var(--font-body)',
                  cursor:          'pointer',
                  transition:      'all 0.15s ease',
                  border:          isActive
                    ? '1.5px solid var(--color-accent)'
                    : '1.5px solid var(--color-border)',
                  backgroundColor: isActive
                    ? 'var(--color-accent)'
                    : 'var(--color-surface)',
                  color:           isActive
                    ? '#ffffff'
                    : 'var(--color-text-secondary)',
                }}
              >
                <Star
                  size={13}
                  fill={isActive ? '#ffffff' : 'none'}
                  strokeWidth={isActive ? 0 : 1.5}
                  color={isActive ? '#ffffff' : 'var(--color-text-tertiary)'}
                />
                {tab.label}
                {tab.count > 0 && (
                  <span style={{
                    fontSize:        11,
                    fontWeight:      600,
                    backgroundColor: isActive
                      ? 'rgba(255,255,255,0.25)'
                      : 'var(--color-accent-light)',
                    color:           isActive ? '#ffffff' : 'var(--color-accent)',
                    borderRadius:    'var(--radius-full)',
                    padding:         '1px 6px',
                    lineHeight:      1.5,
                  }}>
                    {tab.count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* ── Conditions tab ── */}
        {activeTab === 'conditions' && (
          savedConditions.length === 0
            ? <EmptyState label="conditions" />
            : savedConditions.map(condition => (
                <ConditionCard
                  key={condition.id}
                  condition={condition}
                  onTap={() => handleRemoveCondition(condition.id)}
                />
              ))
        )}

        {/* ── Drugs tab ── */}
        {activeTab === 'drugs' && (
          savedDrugs.length === 0
            ? <EmptyState label="drugs" />
            : savedDrugs.map(drug => (
                <DrugCard
                  key={drug.id}
                  drug={drug}
                  isInStock={stockMap[drug.id] ?? drug.inStock}
                  onTap={() => navigate(`/drugs/${drug.slug}`)}
                />
              ))
        )}

      </div>

      <Snackbar visible={snackVisible} message="Removed from favourites" />
    </Layout>
  )
}



File: src/pages/admin/AddDrugFlow.jsx
---
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Check, AlertTriangle } from 'lucide-react'
import { insertGeneric, insertFormulation, insertBrand } from '../../lib/adminQueries'
import { useDrugContext } from '../../context/DrugContext'
import GenericEditor from '../../components/admin/GenericEditor'
import FormulationEditor from '../../components/admin/FormulationEditor'
import BrandEditor from '../../components/admin/BrandEditor'

/**
 * AddDrugFlow — /admin/drugs/new
 *
 * 3-step wizard:
 *   Step 1 — Generic info (name EN/AR, category, class, uses, warnings, textbook doses)
 *   Step 2 — Formulation (concentration, form, route, practical doses)
 *   Step 3 — Brands (at least 1 required)
 *
 * On save: insert generic → insert formulation → insert brands → refresh context → navigate to /admin/drugs
 */

const STEPS = ['Generic', 'Formulation', 'Brands']

const EMPTY_GENERIC = {
  name_en:  '',
  name_ar:  '',
  category: '',
  class:    '',
  uses:     [],
  warnings: [],
  doses:    [],
}

const EMPTY_FORMULATION = {
  concentration: '',
  form:          '',
  route:         '',
  doses:         [],
}

const EMPTY_BRAND = {
  name:         '',
  name_ar:      null,
  manufacturer: null,
  in_stock:     true,
  is_available: true,
}

export default function AddDrugFlow() {
  const navigate      = useNavigate()
  const { refresh }   = useDrugContext()

  const [step,        setStep]        = useState(0)
  const [generic,     setGeneric]     = useState(EMPTY_GENERIC)
  const [formulation, setFormulation] = useState(EMPTY_FORMULATION)
  const [brands,      setBrands]      = useState([{ ...EMPTY_BRAND }])
  const [saving,      setSaving]      = useState(false)
  const [error,       setError]       = useState(null)

  // ─── Patch helpers ──────────────────────────────────────────────────────────

  function patchGeneric(patch)     { setGeneric(g     => ({ ...g,     ...patch })) }
  function patchFormulation(patch) { setFormulation(f => ({ ...f,     ...patch })) }

  // ─── Validation per step ───────────────────────────────────────────────────

  function stepValid() {
    if (step === 0) return generic.name_en.trim() && generic.category
    if (step === 1) return formulation.concentration.trim() && formulation.form && formulation.route
    if (step === 2) return brands.length > 0 && brands.every(b => b.name.trim())
    return false
  }

  // ─── Save ──────────────────────────────────────────────────────────────────

  async function handleSave() {
    setError(null)
    setSaving(true)

    try {
      // 1. Insert generic — generate slug from name_en
      const slugBase = generic.name_en.trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
      const slug = slugBase || `generic-${Date.now()}`

      const { data: newGeneric, error: gErr } = await insertGeneric({
        slug,
        name_en:  generic.name_en.trim(),
        name_ar:  generic.name_ar?.trim() || '',
        category: generic.category,
        class:    generic.class?.trim()   || null,
        uses:     generic.uses,
        warnings: generic.warnings,
        doses:    generic.doses,
      })
      if (gErr) throw new Error(`Generic: ${gErr.message}`)

      // 2. Insert formulation
      const { data: newFormulation, error: fErr } = await insertFormulation({
        generic_id:    newGeneric.id,
        concentration: formulation.concentration.trim(),
        form:          formulation.form,
        route:         formulation.route,
        doses:         formulation.doses,
      })
      if (fErr) throw new Error(`Formulation: ${fErr.message}`)

      // 3. Insert brands
      for (const brand of brands) {
        const { error: bErr } = await insertBrand({
          formulation_id: newFormulation.id,
          name:           brand.name.trim(),
          name_ar:        brand.name_ar?.trim() || null,
          manufacturer:   brand.manufacturer?.trim() || null,
          in_stock:       brand.in_stock,
          is_available:   brand.is_available,
        })
        if (bErr) throw new Error(`Brand "${brand.name}": ${bErr.message}`)
      }

      // 4. Refresh drug context + navigate back
      await refresh()
      navigate('/admin/drugs', { replace: true })

    } catch (err) {
      setError(err.message ?? 'Save failed. Please try again.')
      setSaving(false)
    }
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{
      minHeight: '100dvh',
      backgroundColor: 'var(--color-bg)',
      fontFamily: 'var(--font-body)',
    }}>

      {/* Header */}
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: 'var(--space-3) var(--space-4)',
        borderBottom: '1px solid var(--color-border)',
        backgroundColor: 'var(--color-surface)',
        position: 'sticky', top: 0, zIndex: 50,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <button
            onClick={() => step > 0 ? setStep(s => s - 1) : navigate('/admin/drugs')}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--color-accent)', fontSize: 14, fontWeight: 500,
              fontFamily: 'var(--font-body)', padding: '4px 0',
              display: 'flex', alignItems: 'center', gap: 2,
            }}
          >
            <ChevronLeft size={16} />
            {step > 0 ? STEPS[step - 1] : 'Drug Library'}
          </button>
          <span style={{ color: 'var(--color-border)', fontSize: 16 }}>/</span>
          <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)' }}>
            Add Drug
          </span>
        </div>

        {/* Step indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          {STEPS.map((label, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
              <div style={{
                width: 24, height: 24,
                borderRadius: 'var(--radius-full)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700,
                backgroundColor: i < step ? 'var(--color-instock)'
                  : i === step ? 'var(--color-accent)' : 'var(--color-border)',
                color: i <= step ? '#fff' : 'var(--color-text-tertiary)',
                transition: 'background-color 0.2s ease',
              }}>
                {i < step ? <Check size={13} /> : i + 1}
              </div>
              {i < STEPS.length - 1 && (
                <div style={{
                  width: 16, height: 2,
                  backgroundColor: i < step ? 'var(--color-instock)' : 'var(--color-border)',
                  borderRadius: 2,
                }} />
              )}
            </div>
          ))}
        </div>
      </header>

      {/* Content */}
      <main style={{
        maxWidth: 600, margin: '0 auto',
        padding: 'var(--space-6) var(--space-4) var(--space-12)',
      }}>

        {/* Step title */}
        <div style={{ marginBottom: 'var(--space-5)' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
            Step {step + 1} of {STEPS.length}
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-text-primary)' }}>
            {step === 0 && 'Generic information'}
            {step === 1 && 'Formulation details'}
            {step === 2 && 'Brands'}
          </div>
          <div style={{ fontSize: 13, color: 'var(--color-text-tertiary)', marginTop: 4 }}>
            {step === 0 && "The drug's scientific identity — shared across all formulations"}
            {step === 1 && 'The specific strength, form, and route for this formulation'}
            {step === 2 && 'Commercial brands available for this formulation'}
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: 'var(--space-2)',
            backgroundColor: '#FEF2F2', border: '1px solid #FECACA',
            borderRadius: 'var(--radius-md)', padding: 'var(--space-3)',
            marginBottom: 'var(--space-4)', fontSize: 13, color: '#DC2626',
          }}>
            <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
            {error}
          </div>
        )}

        {/* Active step editor */}
        <div style={{
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          padding: 'var(--space-5)',
          boxShadow: 'var(--shadow-card)',
          marginBottom: 'var(--space-5)',
        }}>
          {step === 0 && (
            <GenericEditor generic={generic} onChange={patchGeneric} disabled={saving} />
          )}
          {step === 1 && (
            <FormulationEditor formulation={formulation} onChange={patchFormulation} disabled={saving} />
          )}
          {step === 2 && (
            <BrandEditor brands={brands} onChange={setBrands} disabled={saving} />
          )}
        </div>

        {/* Navigation buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--space-3)' }}>
          <button
            type="button"
            onClick={() => step > 0 ? setStep(s => s - 1) : navigate('/admin/drugs')}
            style={secondaryBtn}
          >
            <ChevronLeft size={15} />
            {step === 0 ? 'Cancel' : 'Back'}
          </button>

          {step < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={() => setStep(s => s + 1)}
              disabled={!stepValid()}
              style={primaryBtn(!stepValid())}
            >
              Next: {STEPS[step + 1]}
              <ChevronRight size={15} />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSave}
              disabled={!stepValid() || saving}
              style={primaryBtn(!stepValid() || saving)}
            >
              {saving ? 'Saving…' : 'Save drug'}
              {!saving && <Check size={15} />}
            </button>
          )}
        </div>
      </main>
    </div>
  )
}

// ─── Button styles ────────────────────────────────────────────────────────────

const secondaryBtn = {
  display: 'flex', alignItems: 'center', gap: 'var(--space-1)',
  padding: 'var(--space-3) var(--space-4)',
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--color-border)',
  backgroundColor: 'var(--color-surface)',
  color: 'var(--color-text-secondary)',
  fontSize: 14, fontWeight: 500,
  fontFamily: 'var(--font-body)',
  cursor: 'pointer',
}

function primaryBtn(disabled) {
  return {
    display: 'flex', alignItems: 'center', gap: 'var(--space-1)',
    padding: 'var(--space-3) var(--space-5)',
    borderRadius: 'var(--radius-md)',
    border: 'none',
    backgroundColor: disabled ? 'var(--color-border)' : 'var(--color-accent)',
    color: disabled ? 'var(--color-text-tertiary)' : '#fff',
    fontSize: 14, fontWeight: 600,
    fontFamily: 'var(--font-body)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'background-color 0.15s ease',
  }
}





File: src/pages/admin/AdminDashboard.jsx
---
import { useNavigate } from 'react-router-dom'
import { LogOut, ChevronRight } from 'lucide-react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCapsules, faNotesMedical, faStethoscope } from '@fortawesome/free-solid-svg-icons'
import { useAuth } from '../../hooks/useAuth'

/**
 * AdminDashboard — /admin
 *
 * Nav cards: Drug Library → /admin/drugs
 *            Conditions   → /admin/conditions
 *            Specialties  → /admin/specialties   (added 3H)
 */

const NAV_CARDS = [
  {
    path:    '/admin/drugs',
    label:   'Drug Library',
    sub:     'Manage generics, formulations & stock',
    faIcon:  faCapsules,
  },
  {
    path:    '/admin/conditions',
    label:   'Conditions',
    sub:     'Manage clinical cards & prescriptions',
    faIcon:  faNotesMedical,
  },
  {
    path:    '/admin/specialties',
    label:   'Specialties',
    sub:     'Manage specialty list, icons & order',
    faIcon:  faStethoscope,
  },
]

export default function AdminDashboard() {
  const { signOut } = useAuth()
  const navigate    = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/admin/login', { replace: true })
  }

  return (
    <div style={{
      minHeight: '100dvh',
      backgroundColor: 'var(--color-bg)',
      display: 'flex',
      flexDirection: 'column',
    }}>

      {/* Header */}
      <header style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 'var(--space-4) var(--space-4)',
        borderBottom: '1px solid var(--color-border)',
        backgroundColor: 'var(--color-surface)',
      }}>
        <div>
          <div style={{
            fontSize: 20,
            fontWeight: 700,
            fontFamily: 'var(--font-body)',
            color: 'var(--color-text-primary)',
            letterSpacing: '-0.01em',
          }}>
            Capsula Admin
          </div>
          <div style={{
            fontSize: 12,
            color: 'var(--color-text-tertiary)',
            fontFamily: 'var(--font-mono)',
            marginTop: 2,
          }}>
            Content management
          </div>
        </div>

        <button
          onClick={handleSignOut}
          aria-label="Sign out"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-1)',
            padding: 'var(--space-2) var(--space-3)',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--color-border)',
            backgroundColor: 'transparent',
            color: 'var(--color-text-secondary)',
            fontSize: 13,
            fontWeight: 500,
            fontFamily: 'var(--font-body)',
            cursor: 'pointer',
          }}
        >
          <LogOut size={15} />
          Sign out
        </button>
      </header>

      {/* Nav cards */}
      <main style={{
        flex: 1,
        padding: 'var(--space-6) var(--space-4)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-3)',
        maxWidth: 520,
        width: '100%',
        margin: '0 auto',
      }}>
        {NAV_CARDS.map(card => (
          <button
            key={card.path}
            onClick={() => navigate(card.path)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-4)',
              padding: 'var(--space-4) var(--space-4)',
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-card)',
              cursor: 'pointer',
              textAlign: 'left',
              width: '100%',
              fontFamily: 'var(--font-body)',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            {/* Icon */}
            <div style={{
              width: 48,
              height: 48,
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--color-accent-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              color: 'var(--color-accent)',
            }}>
              <FontAwesomeIcon icon={card.faIcon} style={{ width: 22, height: 22 }} />
            </div>

            {/* Text */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 16,
                fontWeight: 600,
                color: 'var(--color-text-primary)',
                marginBottom: 3,
              }}>
                {card.label}
              </div>
              <div style={{
                fontSize: 13,
                color: 'var(--color-text-tertiary)',
                lineHeight: 1.4,
              }}>
                {card.sub}
              </div>
            </div>

            {/* Chevron */}
            <ChevronRight size={18} color="var(--color-text-tertiary)" style={{ flexShrink: 0 }} />
          </button>
        ))}
      </main>
    </div>
  )
}



File: src/pages/admin/AdminLogin.jsx
---
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

/**
 * AdminLogin — /admin/login
 *
 * No BottomNav (admin area has its own nav pattern).
 * Inline error display on bad credentials.
 * Successful sign-in navigates to /admin.
 */
export default function AdminLogin() {
  const { signIn } = useAuth()
  const navigate   = useNavigate()

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState(null)
  const [busy,     setBusy]     = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (busy) return
    setError(null)
    setBusy(true)

    const { error: authError } = await signIn(email.trim(), password)

    if (authError) {
      setError(authError.message ?? 'Sign-in failed. Check your credentials.')
      setBusy(false)
      return
    }

    navigate('/admin', { replace: true })
  }

  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 'var(--space-6) var(--space-4)',
      backgroundColor: 'var(--color-bg)',
    }}>

      {/* Logo / wordmark */}
      <div style={{ marginBottom: 'var(--space-8)', textAlign: 'center' }}>
        <div style={{
          fontSize: 28,
          fontWeight: 700,
          fontFamily: 'var(--font-body)',
          color: 'var(--color-text-primary)',
          letterSpacing: '-0.02em',
        }}>
          Capsula
        </div>
        <div style={{
          marginTop: 'var(--space-1)',
          fontSize: 13,
          color: 'var(--color-text-tertiary)',
          fontFamily: 'var(--font-mono)',
        }}>
          Admin access
        </div>
      </div>

      {/* Card */}
      <div style={{
        width: '100%',
        maxWidth: 360,
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-6)',
        boxShadow: 'var(--shadow-card)',
      }}>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>

          {/* Email */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
            <label style={labelStyle}>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoComplete="email"
              style={inputStyle}
            />
          </div>

          {/* Password */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
            <label style={labelStyle}>Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
              style={inputStyle}
            />
          </div>

          {/* Inline error */}
          {error && (
            <div style={{
              fontSize: 13,
              color: '#DC2626',
              backgroundColor: '#FEF2F2',
              border: '1px solid #FECACA',
              borderRadius: 'var(--radius-sm)',
              padding: 'var(--space-2) var(--space-3)',
              lineHeight: 1.4,
            }}>
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={busy}
            style={{
              padding: 'var(--space-3)',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              backgroundColor: busy ? 'var(--color-border)' : 'var(--color-accent)',
              color: busy ? 'var(--color-text-tertiary)' : '#ffffff',
              fontSize: 15,
              fontWeight: 600,
              fontFamily: 'var(--font-body)',
              cursor: busy ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.15s ease',
            }}
          >
            {busy ? 'Signing in…' : 'Sign in'}
          </button>

        </form>
      </div>
    </div>
  )
}

// ─── Shared styles ────────────────────────────────────────────────────────────

const labelStyle = {
  fontSize: 13,
  fontWeight: 500,
  color: 'var(--color-text-secondary)',
  fontFamily: 'var(--font-body)',
}

const inputStyle = {
  width: '100%',
  boxSizing: 'border-box',
  padding: 'var(--space-2) var(--space-3)',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--color-border)',
  backgroundColor: 'var(--color-bg)',
  color: 'var(--color-text-primary)',
  fontSize: 15,
  fontFamily: 'var(--font-body)',
  outline: 'none',
  appearance: 'none',
  WebkitAppearance: 'none',
}



File: src/pages/admin/ConditionFormModal.jsx
---
/**
 * src/pages/admin/ConditionFormModal.jsx
 * Phase 3B — Create / edit a condition via a proper modal (no window.prompt).
 *
 * Props:
 *   isOpen       boolean
 *   onClose      () => void
 *   onSaved      (condition) => void   — called after successful save
 *   condition    object | null         — null = create mode, object = edit mode
 *   specialties  { id, name }[]
 */

import { useState, useEffect } from 'react'
import Modal from '../../components/admin/Modal'
import { useToast } from '../../context/ToastContext'
import { useDirtyState } from '../../hooks/useDirtyState'
import { insertCondition, updateCondition, touchAppMetadata } from '../../lib/adminQueries'

const EMPTY = {
  name_en:     '',
  name_ar:     '',
  specialty_id: '',
  card_tagline: '',
  definition:  '',
  icd10_code:  '',
  is_published: true,
}

function toForm(condition) {
  if (!condition) return EMPTY
  return {
    name_en:      condition.name      ?? '',
    name_ar:      condition.nameAr    ?? '',
    specialty_id: condition.specialtyId ?? '',
    card_tagline: condition.cardTagline ?? '',
    definition:   condition.definition  ?? '',
    icd10_code:   condition.icd10Code   ?? '',
    is_published: condition.isPublished ?? true,
  }
}

export default function ConditionFormModal({ isOpen, onClose, onSaved, condition, specialties = [] }) {
  const { toast } = useToast()
  const isEdit = Boolean(condition?.id)

  const [form,    setForm]    = useState(EMPTY)
  const [saving,  setSaving]  = useState(false)
  const [errors,  setErrors]  = useState({})

  // Initialise / reset form when modal opens or condition changes
  useEffect(() => {
    if (isOpen) {
      setForm(toForm(condition))
      setErrors({})
    }
  }, [isOpen, condition])

  const savedSnapshot = isEdit ? toForm(condition) : EMPTY
  const isDirty = useDirtyState(savedSnapshot, form)

  function set(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
    setErrors(prev => ({ ...prev, [field]: undefined }))
  }

  function validate() {
    const e = {}
    if (!form.name_en.trim()) e.name_en = 'Name is required'
    return e
  }

  async function handleSave() {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }

    setSaving(true)

    const payload = {
      name:         form.name_en.trim(),
      name_ar:      form.name_ar.trim() || null,
      specialty_id: form.specialty_id || null,
      card_tagline: form.card_tagline.trim() || null,
      definition:   form.definition.trim()   || null,
      icd10_code:   form.icd10_code.trim()   || null,
      is_published: form.is_published,
    }

    let result
    if (isEdit) {
      result = await updateCondition(condition.id, payload)
    } else {
      result = await insertCondition(payload)
    }

    if (result.error) {
      toast.error(result.error.message ?? 'Save failed')
      setSaving(false)
      return
    }

    // Invalidate cache so app picks up the change
    await touchAppMetadata('conditions_updated_at')

    toast.success(isEdit ? 'Condition updated' : 'Condition created')
    setSaving(false)
    onSaved(result.data ?? { id: condition?.id, ...payload })
    onClose()
  }

  function handleClose() {
    if (isDirty && !window.confirm('You have unsaved changes. Leave without saving?')) return
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={isEdit ? 'Edit Condition' : 'New Condition'}
      size="md"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>

        {/* Name EN */}
        <Field label="Name (English)" required error={errors.name_en}>
          <input
            type="text"
            value={form.name_en}
            onChange={e => set('name_en', e.target.value)}
            placeholder="e.g. Hypertension"
            style={inputStyle(errors.name_en)}
          />
        </Field>

        {/* Name AR */}
        <Field label="Name (Arabic)">
          <input
            type="text"
            dir="rtl"
            value={form.name_ar}
            onChange={e => set('name_ar', e.target.value)}
            placeholder="الاسم بالعربية"
            style={inputStyle()}
          />
        </Field>

        {/* Specialty */}
        <Field label="Specialty">
          <select
            value={form.specialty_id}
            onChange={e => set('specialty_id', e.target.value)}
            style={inputStyle()}
          >
            <option value="">— Uncategorized —</option>
            {specialties.map(s => (
              <option key={s.id} value={s.id}>{s.name_en}</option>
            ))}
          </select>
        </Field>

        {/* Card tagline */}
        <Field label="Card Tagline" hint="Short one-line summary shown on condition cards">
          <input
            type="text"
            value={form.card_tagline}
            onChange={e => set('card_tagline', e.target.value)}
            placeholder="e.g. Persistently elevated blood pressure ≥ 140/90 mmHg"
            style={inputStyle()}
          />
        </Field>

        {/* ICD-10 */}
        <Field label="ICD-10 Code">
          <input
            type="text"
            value={form.icd10_code}
            onChange={e => set('icd10_code', e.target.value.toUpperCase())}
            placeholder="e.g. I10"
            style={{ ...inputStyle(), maxWidth: 140 }}
          />
        </Field>

        {/* Definition */}
        <Field label="Definition">
          <textarea
            value={form.definition}
            onChange={e => set('definition', e.target.value)}
            placeholder="Brief clinical definition…"
            rows={3}
            style={{ ...inputStyle(), resize: 'vertical', lineHeight: 1.5 }}
          />
        </Field>

        {/* Published toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <label style={{
            position: 'relative', display: 'inline-block',
            width: 40, height: 22, flexShrink: 0,
          }}>
            <input
              type="checkbox"
              checked={form.is_published}
              onChange={e => set('is_published', e.target.checked)}
              style={{ opacity: 0, width: 0, height: 0 }}
            />
            <span style={{
              position: 'absolute', inset: 0,
              backgroundColor: form.is_published ? 'var(--color-success)' : 'var(--color-border)',
              borderRadius: 'var(--radius-full)',
              cursor: 'pointer',
              transition: 'background-color 0.2s',
            }}>
              <span style={{
                position: 'absolute',
                top: 3, left: form.is_published ? 21 : 3,
                width: 16, height: 16,
                backgroundColor: '#fff',
                borderRadius: '50%',
                transition: 'left 0.2s',
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
              }} />
            </span>
          </label>
          <span style={{ fontSize: 14, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-body)' }}>
            {form.is_published ? 'Published — visible in app' : 'Draft — hidden from app'}
          </span>
        </div>

        {/* Footer buttons */}
        <div style={{
          display: 'flex', justifyContent: 'flex-end',
          gap: 'var(--space-2)', paddingTop: 'var(--space-2)',
          borderTop: '1px solid var(--color-border)',
          marginTop: 'var(--space-2)',
        }}>
          <button onClick={handleClose} disabled={saving} style={cancelBtnStyle}>
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving} style={saveBtnStyle(isDirty, saving)}>
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Condition'}
          </button>
        </div>

      </div>
    </Modal>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Field({ label, required, hint, error, children }) {
  return (
    <div>
      <label style={{
        display: 'block',
        fontSize: 13, fontWeight: 600,
        color: 'var(--color-text-primary)',
        fontFamily: 'var(--font-body)',
        marginBottom: 'var(--space-1)',
      }}>
        {label}
        {required && <span style={{ color: 'var(--color-danger)', marginLeft: 3 }}>*</span>}
      </label>
      {hint && (
        <div style={{
          fontSize: 12, color: 'var(--color-text-tertiary)',
          fontFamily: 'var(--font-body)', marginBottom: 'var(--space-1)',
        }}>
          {hint}
        </div>
      )}
      {children}
      {error && (
        <div style={{ fontSize: 12, color: 'var(--color-danger)', marginTop: 4, fontFamily: 'var(--font-body)' }}>
          {error}
        </div>
      )}
    </div>
  )
}

// ─── Style helpers ────────────────────────────────────────────────────────────

function inputStyle(error) {
  return {
    width: '100%',
    boxSizing: 'border-box',
    padding: '9px 12px',
    border: `1.5px solid ${error ? 'var(--color-danger)' : 'var(--color-border)'}`,
    borderRadius: 'var(--radius-md)',
    fontSize: 14,
    fontFamily: 'var(--font-body)',
    backgroundColor: 'var(--color-surface)',
    color: 'var(--color-text-primary)',
    outline: 'none',
  }
}

const cancelBtnStyle = {
  padding: '9px 18px',
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--color-border)',
  backgroundColor: 'transparent',
  color: 'var(--color-text-secondary)',
  fontSize: 14, fontWeight: 500,
  fontFamily: 'var(--font-body)',
  cursor: 'pointer',
}

function saveBtnStyle(isDirty, saving) {
  return {
    padding: '9px 18px',
    borderRadius: 'var(--radius-md)',
    border: 'none',
    backgroundColor: 'var(--color-accent)',
    color: '#fff',
    fontSize: 14, fontWeight: 600,
    fontFamily: 'var(--font-body)',
    cursor: saving ? 'default' : 'pointer',
    opacity: saving ? 0.7 : 1,
    boxShadow: isDirty ? '0 0 0 3px rgba(37,99,235,0.25)' : 'none',
    transition: 'box-shadow 0.2s',
  }
}



File: src/pages/admin/ConditionsCMS.jsx
---
/**
 * src/pages/admin/ConditionsCMS.jsx
 * Phase 3B — Conditions Editor
 *
 * Changes from previous version:
 *   - Replaced inline DeleteDialog with ConfirmModal (3A component)
 *   - Added is_published toggle per row (immediate Supabase update)
 *   - "Add New" now opens ConditionFormModal instead of navigating away
 *   - Edit still navigates to /admin/conditions/:id (full editor)
 *   - useToast for all success/error feedback
 *   - FIX: uses fetchAllConditions (no is_published filter) so drafts appear
 */

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Edit2, Trash2, ChevronLeft } from 'lucide-react'
import { useConditionContext } from '../../context/ConditionContext'
import { useToast } from '../../context/ToastContext'
import { deleteCondition, toggleConditionPublished, fetchSpecialtiesForCMS } from '../../lib/adminQueries'
import { fetchAllConditions } from '../../lib/queries'
import { supabase } from '../../lib/supabase'
import ConfirmModal from '../../components/admin/ConfirmModal'
import ConditionFormModal from './ConditionFormModal'

// ─── Age group badge ──────────────────────────────────────────────────────────

const AGE_STYLES = {
  adult:     { bg: '#DBEAFE', color: '#1E40AF' },
  pediatric: { bg: '#D1FAE5', color: '#065F46' },
  both:      { bg: '#EDE9FE', color: '#5B21B6' },
}

function AgeGroupBadge({ group }) {
  const style = AGE_STYLES[group] ?? { bg: '#F3F4F6', color: '#374151' }
  const label = group === 'pediatric' ? 'Pediatric' : group === 'both' ? 'All ages' : 'Adult'
  return (
    <span style={{
      fontSize: 11, fontWeight: 500,
      backgroundColor: style.bg, color: style.color,
      padding: '2px 8px', borderRadius: 'var(--radius-full)',
      flexShrink: 0,
    }}>
      {label}
    </span>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function ConditionsCMS() {
  const navigate = useNavigate()
  // useConditionContext for public cache refresh only
  const { refresh: refreshPublicCache } = useConditionContext()

  // Specialties loaded directly from DB so empty specialties (no conditions yet) still appear
  const [specialties, setSpecialties] = useState([])
  useEffect(() => {
    fetchSpecialtiesForCMS().then(({ data }) => {
      if (data) setSpecialties(data)
    })
  }, [])
  const { toast } = useToast()

  // ── Admin condition list (all, including drafts) ───────────────────────────
  const [conditions, setConditions] = useState([])
  const [loadingList, setLoadingList] = useState(true)

  async function loadAll() {
    setLoadingList(true)
    try {
      const data = await fetchAllConditions(supabase)
      setConditions(data)
    } catch (err) {
      toast.error(err.message ?? 'Failed to load conditions')
    } finally {
      setLoadingList(false)
    }
  }

  useEffect(() => { loadAll() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const [query,           setQuery]           = useState('')
  const [activeSpecialty, setActiveSpecialty] = useState('all')

  // Delete confirm modal
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting,     setDeleting]     = useState(false)

  // New condition modal
  const [formOpen, setFormOpen] = useState(false)

  // Optimistic publish overrides — { [conditionId]: boolean }
  const [publishedOverrides, setPublishedOverrides] = useState({})

  // ─── Filter ────────────────────────────────────────────────────────────────

  const filtered = conditions.filter(c => {
    const matchesSpecialty = activeSpecialty === 'all' || c.specialtyId === activeSpecialty
    const matchesQuery = !query.trim() || (
      c.name?.toLowerCase().includes(query.toLowerCase()) ||
      c.specialtyName?.toLowerCase().includes(query.toLowerCase())
    )
    return matchesSpecialty && matchesQuery
  })

  // ─── Delete ────────────────────────────────────────────────────────────────

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    const { error } = await deleteCondition(deleteTarget.id)
    setDeleting(false)
    if (error) {
      toast.error(error.message ?? 'Delete failed')
    } else {
      toast.success(`"${deleteTarget.name}" deleted`)
      setDeleteTarget(null)
      await loadAll()
      await refreshPublicCache()
    }
  }

  // ─── Publish toggle ────────────────────────────────────────────────────────

  async function handleTogglePublished(condition) {
    const current = publishedOverrides[condition.id] ?? condition.isPublished ?? true
    const next    = !current
    // Optimistic update
    setPublishedOverrides(prev => ({ ...prev, [condition.id]: next }))
    const { error } = await toggleConditionPublished(condition.id, next)
    if (error) {
      // Revert
      setPublishedOverrides(prev => ({ ...prev, [condition.id]: current }))
      toast.error('Failed to update publish status')
    } else {
      toast.success(next ? `"${condition.name}" published` : `"${condition.name}" unpublished`)
      await refreshPublicCache()
    }
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{
      minHeight: '100dvh',
      backgroundColor: 'var(--color-bg)',
      fontFamily: 'var(--font-body)',
      color: 'var(--color-text-primary)',
    }}>

      {/* Header */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        backgroundColor: 'var(--color-surface)',
        borderBottom: '1px solid var(--color-border)',
      }}>
        <div style={{
          maxWidth: 680, margin: '0 auto',
          padding: 'var(--space-3) var(--space-4)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-3)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <button
              onClick={() => navigate('/admin')}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--color-accent)', fontSize: 14, fontWeight: 500,
                fontFamily: 'var(--font-body)', padding: '4px 0',
                display: 'flex', alignItems: 'center', gap: 2,
              }}
            >
              <ChevronLeft size={16} />
              Dashboard
            </button>
            <span style={{ color: 'var(--color-border)', fontSize: 16 }}>/</span>
            <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)' }}>
              Conditions
            </span>
          </div>

          <button
            onClick={() => setFormOpen(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 'var(--space-1)',
              padding: '7px 14px', borderRadius: 'var(--radius-md)',
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
              border: 'none', backgroundColor: 'var(--color-accent)', color: '#fff',
              fontFamily: 'var(--font-body)',
            }}
          >
            <Plus size={15} />
            Add New
          </button>
        </div>
      </header>

      <main style={{ maxWidth: 680, margin: '0 auto', padding: 'var(--space-4) var(--space-4) var(--space-12)' }}>

        {/* Search */}
        <div style={{ marginBottom: 'var(--space-3)' }}>
          <input
            type="search"
            placeholder="Search conditions…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            style={{
              width: '100%', boxSizing: 'border-box',
              padding: '10px 16px',
              border: '1.5px solid var(--color-border)',
              borderRadius: 'var(--radius-lg)',
              fontSize: 15, fontFamily: 'var(--font-body)',
              backgroundColor: 'var(--color-surface)',
              color: 'var(--color-text-primary)',
              outline: 'none',
            }}
          />
        </div>

        {/* Specialty filter pills */}
        {specialties.length > 0 && (
          <div style={{
            display: 'flex', gap: 'var(--space-2)',
            overflowX: 'auto', paddingBottom: 'var(--space-2)',
            marginBottom: 'var(--space-4)', scrollbarWidth: 'none',
          }}>
            {['all', ...specialties.map(s => s.id)].map(id => {
              const isActive = activeSpecialty === id
              const label    = id === 'all' ? 'All' : specialties.find(s => s.id === id)?.name_en
              return (
                <button
                  key={id}
                  onClick={() => setActiveSpecialty(id)}
                  style={{
                    flexShrink: 0, padding: '6px 14px',
                    borderRadius: 'var(--radius-full)',
                    fontSize: 13, fontWeight: isActive ? 600 : 400,
                    fontFamily: 'var(--font-body)', cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    border: isActive ? '1.5px solid var(--color-accent)' : '1.5px solid var(--color-border)',
                    backgroundColor: isActive ? 'var(--color-accent)' : 'var(--color-surface)',
                    color: isActive ? '#ffffff' : 'var(--color-text-secondary)',
                  }}
                >
                  {label}
                </button>
              )
            })}
          </div>
        )}

        {/* Count */}
        <div style={{
          fontSize: 12, color: 'var(--color-text-tertiary)',
          fontFamily: 'var(--font-mono)', marginBottom: 'var(--space-3)',
        }}>
          {loadingList ? 'Loading…' : `${filtered.length} condition${filtered.length !== 1 ? 's' : ''}`}
        </div>

        {/* List */}
        {!loadingList && filtered.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: 'var(--space-12) var(--space-4)',
            color: 'var(--color-text-tertiary)', fontSize: 14,
          }}>
            {query ? `No conditions matching "${query}"` : 'No conditions yet. Add one above.'}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {filtered.map(condition => {
              const isPublished = publishedOverrides[condition.id] ?? condition.isPublished ?? true
              return (
                <ConditionRow
                  key={condition.id}
                  condition={condition}
                  isPublished={isPublished}
                  onEdit={() => navigate(`/admin/conditions/${condition.id}`)}
                  onDelete={() => setDeleteTarget(condition)}
                  onTogglePublished={() => handleTogglePublished(condition)}
                />
              )
            })}
          </div>
        )}
      </main>

      {/* Delete confirm modal (3A) */}
      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete condition?"
        message={
          deleteTarget
            ? `This will permanently delete "${deleteTarget.name}" including all its prescriptions and images. This cannot be undone.`
            : ''
        }
        confirmLabel={deleting ? 'Deleting…' : 'Delete'}
        confirmVariant="danger"
      />

      {/* New condition modal (3B) */}
      <ConditionFormModal
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={async () => { await loadAll(); await refreshPublicCache() }}
        condition={null}
        specialties={specialties}
      />
    </div>
  )
}

// ─── Condition row ────────────────────────────────────────────────────────────

function ConditionRow({ condition, isPublished, onEdit, onDelete, onTogglePublished }) {
  const rxCount = condition.prescriptions?.length ?? 0

  return (
    <div style={{
      backgroundColor: 'var(--color-surface)',
      border: `1px solid ${isPublished ? 'var(--color-border)' : 'var(--color-border-subtle)'}`,
      borderRadius: 'var(--radius-lg)',
      padding: 'var(--space-3) var(--space-4)',
      boxShadow: 'var(--shadow-card)',
      display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
      opacity: isPublished ? 1 : 0.65,
    }}>
      {/* Publish toggle */}
      <button
        onClick={onTogglePublished}
        title={isPublished ? 'Published — click to unpublish' : 'Draft — click to publish'}
        style={{
          flexShrink: 0,
          width: 10, height: 10,
          borderRadius: '50%',
          border: 'none',
          backgroundColor: isPublished ? 'var(--color-success)' : 'var(--color-border)',
          cursor: 'pointer',
          padding: 0,
        }}
      />

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 15, fontWeight: 600,
          color: 'var(--color-text-primary)',
          marginBottom: 'var(--space-1)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
        }}>
          {condition.name}
          {!isPublished && (
            <span style={{
              fontSize: 10, fontWeight: 600, letterSpacing: '0.05em',
              color: 'var(--color-text-tertiary)',
              backgroundColor: 'var(--color-bg)',
              border: '1px solid var(--color-border)',
              padding: '1px 6px', borderRadius: 'var(--radius-full)',
              textTransform: 'uppercase',
            }}>
              Draft
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
          {condition.specialtyName && (
            <span style={{
              fontSize: 11, fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase',
              color: 'var(--color-text-tertiary)', backgroundColor: 'var(--color-bg)',
              border: '1px solid var(--color-border)', padding: '2px 8px', borderRadius: 'var(--radius-full)',
            }}>
              {condition.specialtyName}
            </span>
          )}
          <AgeGroupBadge group={condition.ageGroup} />
          <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-mono)' }}>
            {rxCount} rx
          </span>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexShrink: 0 }}>
        <button
          onClick={onEdit}
          aria-label="Edit condition"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 34, height: 34, borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border)',
            backgroundColor: 'var(--color-surface)', color: 'var(--color-text-secondary)',
            cursor: 'pointer',
          }}
        >
          <Edit2 size={15} />
        </button>
        <button
          onClick={onDelete}
          aria-label="Delete condition"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 34, height: 34, borderRadius: 'var(--radius-md)',
            border: '1px solid #FECACA',
            backgroundColor: '#FEF2F2', color: '#DC2626',
            cursor: 'pointer',
          }}
        >
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  )
}



File: src/pages/admin/DrugCMS.jsx
---
/**
 * DrugCMS.jsx — Phase 3E rebuild
 * /admin/drugs
 *
 * Lists all generics (published + drafts) in a table with:
 *   - Columns: Name | Category | Formulations | Published | Actions
 *   - Published toggle (immediate update + ConfirmModal for unpublish)
 *   - Edit (pencil) → navigates to DrugEditor (/admin/drugs/generic/:id)
 *   - Delete → ConfirmModal
 *   - "Forms" count → navigates to DrugEditor
 *   - "+ Add New" → navigates to AddDrugFlow (/admin/drugs/new)
 *   - Search (name_en, name_ar) + category filter pills
 */

import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Edit2, Trash2, Search, X, AlertTriangle, Layers } from 'lucide-react'
import { useToast } from '../../context/ToastContext'
import ConfirmModal from '../../components/admin/ConfirmModal'
import {
  fetchAllGenerics,
  toggleGenericPublished,
  deleteGeneric,
} from '../../lib/adminQueries'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function DrugCMS() {
  const navigate    = useNavigate()
  const { toast }   = useToast()

  const [generics,     setGenerics]     = useState([])
  const [loading,      setLoading]      = useState(true)
  const [loadError,    setLoadError]    = useState(null)

  const [query,           setQuery]           = useState('')
  const [activeCategory,  setActiveCategory]  = useState(null)

  const [confirmUnpub, setConfirmUnpub] = useState(null)
  const [confirmDel,   setConfirmDel]   = useState(null)
  const [actionId,     setActionId]     = useState(null)

  // ── Load ────────────────────────────────────────────────────────────────────
  async function load() {
    setLoading(true)
    setLoadError(null)
    const { data, error } = await fetchAllGenerics()
    setLoading(false)
    if (error) { setLoadError(error.message); return }
    setGenerics(data)
  }

  useEffect(() => { load() }, [])

  // ── Derived category list ───────────────────────────────────────────────────
  const categories = useMemo(() => {
    const cats = [...new Set(generics.map(g => g.category).filter(Boolean))].sort()
    return cats
  }, [generics])

  // ── Filter ──────────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = generics
    if (activeCategory) list = list.filter(g => g.category === activeCategory)
    if (query.trim()) {
      const q = query.toLowerCase()
      list = list.filter(g =>
        g.name_en?.toLowerCase().includes(q) ||
        (g.name_ar && g.name_ar.includes(query))
      )
    }
    return list
  }, [generics, query, activeCategory])

  // ── Publish toggle ──────────────────────────────────────────────────────────
  async function handlePublishToggle(generic) {
    const toPublish = !generic.is_published
    if (!toPublish) {
      setConfirmUnpub(generic)
      return
    }
    setActionId(generic.id)
    const { error } = await toggleGenericPublished(generic.id, true)
    setActionId(null)
    if (error) { toast.error(`Failed: ${error.message}`); return }
    setGenerics(prev => prev.map(g => g.id === generic.id ? { ...g, is_published: true } : g))
    toast.success('Generic published')
  }

  async function confirmUnpublish() {
    const g = confirmUnpub
    setConfirmUnpub(null)
    setActionId(g.id)
    const { error } = await toggleGenericPublished(g.id, false)
    setActionId(null)
    if (error) { toast.error(`Failed: ${error.message}`); return }
    setGenerics(prev => prev.map(x => x.id === g.id ? { ...x, is_published: false } : x))
    toast.success('Generic unpublished')
  }

  // ── Delete ──────────────────────────────────────────────────────────────────
  async function handleDelete() {
    const g = confirmDel
    setConfirmDel(null)
    setActionId(g.id)
    const { error } = await deleteGeneric(g.id)
    setActionId(null)
    if (error) { toast.error(`Delete failed: ${error.message}`); return }
    setGenerics(prev => prev.filter(x => x.id !== g.id))
    toast.success('Generic deleted')
  }

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <AdminShell onAdd={() => navigate('/admin/drugs/new')}>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 'var(--space-3)' }}>
        <Search size={15} style={{
          position: 'absolute', left: 'var(--space-3)', top: '50%',
          transform: 'translateY(-50%)', color: 'var(--color-text-tertiary)',
          pointerEvents: 'none',
        }} />
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search generic name…"
          style={searchInputStyle}
        />
        {query && (
          <button onClick={() => setQuery('')} style={clearBtnStyle}>
            <X size={14} />
          </button>
        )}
      </div>

      {/* Category pills */}
      {categories.length > 0 && (
        <div style={{
          display: 'flex', gap: 'var(--space-2)',
          overflowX: 'auto', paddingBottom: 'var(--space-2)',
          marginBottom: 'var(--space-4)', scrollbarWidth: 'none',
        }}>
          {[{ value: null, label: 'All' }, ...categories.map(c => ({ value: c, label: c }))].map(cat => {
            const active = activeCategory === cat.value
            return (
              <button
                key={cat.value ?? 'all'}
                onClick={() => setActiveCategory(cat.value)}
                style={{
                  flexShrink: 0,
                  padding: '5px 14px',
                  borderRadius: 'var(--radius-full)',
                  fontSize: 12,
                  fontWeight: active ? 600 : 400,
                  fontFamily: 'var(--font-body)',
                  cursor: 'pointer',
                  border: active ? '1.5px solid var(--color-accent)' : '1.5px solid var(--color-border)',
                  backgroundColor: active ? 'var(--color-accent)' : 'var(--color-surface)',
                  color: active ? '#fff' : 'var(--color-text-secondary)',
                  transition: 'all 0.15s ease',
                  whiteSpace: 'nowrap',
                }}
              >
                {cat.label}
              </button>
            )
          })}
        </div>
      )}

      {/* Count */}
      <div style={{
        fontSize: 12, color: 'var(--color-text-tertiary)',
        fontFamily: 'var(--font-mono)', marginBottom: 'var(--space-3)',
      }}>
        {loading ? 'Loading…' : `${filtered.length} generic${filtered.length !== 1 ? 's' : ''}`}
        {query && ` for "${query}"`}
      </div>

      {/* Load error */}
      {loadError && (
        <ErrorBanner message={loadError} onDismiss={() => setLoadError(null)} />
      )}

      {/* Table */}
      {!loading && filtered.length === 0 ? (
        <EmptyState query={query} />
      ) : (
        <div style={{
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-card)',
        }}>

          {/* Header row */}
          <div style={theadStyle}>
            <span style={thStyle}>Generic</span>
            <span style={{ ...thStyle, textAlign: 'center' }}>Forms</span>
            <span style={{ ...thStyle, textAlign: 'center' }}>Published</span>
            <span style={thStyle}>Actions</span>
          </div>

          {loading
            ? [1,2,3,4].map(i => <SkeletonRow key={i} />)
            : filtered.map((g, idx) => {
                const isLast   = idx === filtered.length - 1
                const isActing = actionId === g.id

                return (
                  <div
                    key={g.id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'minmax(0,1fr) 64px 90px 80px',
                      alignItems: 'center',
                      padding: 'var(--space-3) var(--space-4)',
                      gap: 'var(--space-3)',
                      borderBottom: isLast ? 'none' : '1px solid var(--color-border-subtle)',
                      opacity: isActing ? 0.5 : 1,
                      transition: 'opacity 0.15s ease',
                      backgroundColor: g.is_published ? 'transparent' : 'var(--color-bg)',
                    }}
                  >
                    {/* Name + meta */}
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                        <span style={{
                          fontSize: 14, fontWeight: 600,
                          color: g.is_published ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
                        }}>
                          {g.name_en}
                        </span>
                        {!g.is_published && (
                          <span style={draftBadgeStyle}>Draft</span>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 3, flexWrap: 'wrap', alignItems: 'center' }}>
                        {g.category && (
                          <span style={catChipStyle}>{g.category}</span>
                        )}
                        {g.name_ar && (
                          <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)', direction: 'rtl' }}>
                            {g.name_ar}
                          </span>
                        )}
                        <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>
                          {formatDate(g.updated_at)}
                        </span>
                      </div>
                    </div>

                    {/* Formulation count — click to open DrugEditor */}
                    <div style={{ textAlign: 'center' }}>
                      <button
                        onClick={() => navigate(`/admin/drugs/generic/${g.id}`)}
                        title="Edit formulations & brands"
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          fontSize: 13, fontWeight: 500,
                          color: 'var(--color-accent)',
                          background: 'none', border: 'none', cursor: 'pointer',
                          padding: '2px 4px', borderRadius: 'var(--radius-sm)',
                          fontFamily: 'var(--font-body)',
                          textDecoration: 'underline', textUnderlineOffset: 2,
                        }}
                      >
                        <Layers size={12} />
                        {g.formulationCount}
                      </button>
                    </div>

                    {/* Publish toggle */}
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                      <button
                        onClick={() => !isActing && handlePublishToggle(g)}
                        disabled={isActing}
                        aria-label={g.is_published ? 'Unpublish' : 'Publish'}
                        title={g.is_published ? 'Click to unpublish' : 'Click to publish'}
                        style={{
                          ...toggleBtnStyle,
                          backgroundColor: g.is_published ? '#D1FAE5' : 'var(--color-bg)',
                          color: g.is_published ? '#065F46' : 'var(--color-text-tertiary)',
                          border: `1px solid ${g.is_published ? '#6EE7B7' : 'var(--color-border)'}`,
                        }}
                      >
                        {g.is_published ? '● Live' : '○ Draft'}
                      </button>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: 'var(--space-1)', justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => navigate(`/admin/drugs/generic/${g.id}`)}
                        aria-label="Edit"
                        title="Edit generic, formulations & brands"
                        style={iconBtnStyle}
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => setConfirmDel(g)}
                        aria-label="Delete"
                        title="Delete"
                        style={{ ...iconBtnStyle, color: '#DC2626' }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                )
              })
          }
        </div>
      )}

      {/* Confirm unpublish */}
      {confirmUnpub && (
        <ConfirmModal
          isOpen
          title="Unpublish generic?"
          message={`"${confirmUnpub.name_en}" will be hidden from the app. You can republish it at any time.`}
          confirmLabel="Unpublish"
          danger
          onConfirm={confirmUnpublish}
          onCancel={() => setConfirmUnpub(null)}
        />
      )}

      {/* Confirm delete */}
      {confirmDel && (
        <ConfirmModal
          isOpen
          title="Delete generic?"
          message={`Delete "${confirmDel.name_en}"? This will also delete all formulations and brands under it. This cannot be undone.`}
          confirmLabel="Delete"
          danger
          onConfirm={handleDelete}
          onCancel={() => setConfirmDel(null)}
        />
      )}

    </AdminShell>
  )
}

// ─── AdminShell ───────────────────────────────────────────────────────────────

function AdminShell({ children, onAdd }) {
  const navigate = useNavigate()

  return (
    <div style={{ minHeight: '100dvh', backgroundColor: 'var(--color-bg)', fontFamily: 'var(--font-body)' }}>
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: 'var(--space-3) var(--space-4)',
        borderBottom: '1px solid var(--color-border)',
        backgroundColor: 'var(--color-surface)',
        position: 'sticky', top: 0, zIndex: 50,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <button
            onClick={() => navigate('/admin')}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--color-accent)', fontSize: 14, fontWeight: 500,
              fontFamily: 'var(--font-body)', padding: '4px 0',
              display: 'flex', alignItems: 'center',
            }}
          >
            ‹ Admin
          </button>
          <span style={{ color: 'var(--color-border)', fontSize: 16 }}>/</span>
          <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)' }}>
            Drug Library
          </span>
        </div>

        <button onClick={onAdd} style={primaryBtnStyle}>
          <Plus size={15} />
          Add Generic
        </button>
      </header>

      <main style={{ maxWidth: 760, margin: '0 auto', padding: 'var(--space-5) var(--space-4) var(--space-12)' }}>
        {children}
      </main>
    </div>
  )
}

// ─── Small components ─────────────────────────────────────────────────────────

function ErrorBanner({ message, onDismiss }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
      backgroundColor: '#FEF2F2', border: '1px solid #FECACA',
      borderRadius: 'var(--radius-md)', padding: 'var(--space-3)',
      marginBottom: 'var(--space-3)', fontSize: 13, color: '#DC2626',
    }}>
      <AlertTriangle size={15} style={{ flexShrink: 0 }} />
      {message}
      <button onClick={onDismiss} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#DC2626' }}>
        <X size={14} />
      </button>
    </div>
  )
}

function EmptyState({ query }) {
  return (
    <div style={{ textAlign: 'center', padding: 'var(--space-12) var(--space-4)', color: 'var(--color-text-tertiary)' }}>
      <div style={{ marginBottom: 'var(--space-3)', opacity: 0.4 }}>
        <Search size={32} />
      </div>
      <div style={{ fontSize: 15, color: 'var(--color-text-secondary)', marginBottom: 'var(--space-1)' }}>
        No generics found{query ? ` for "${query}"` : ''}
      </div>
      <div style={{ fontSize: 13 }}>Try a different search or category filter</div>
    </div>
  )
}

function SkeletonRow() {
  return (
    <div style={{
      height: 56,
      borderBottom: '1px solid var(--color-border-subtle)',
      backgroundColor: 'var(--color-surface)',
      animation: 'shimmer 1.4s ease-in-out infinite',
    }} />
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const theadStyle = {
  display: 'grid',
  gridTemplateColumns: 'minmax(0,1fr) 64px 90px 80px',
  gap: 'var(--space-3)',
  padding: 'var(--space-2) var(--space-4)',
  backgroundColor: 'var(--color-bg)',
  borderBottom: '1px solid var(--color-border)',
}

const thStyle = {
  fontSize: 11,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  color: 'var(--color-text-tertiary)',
}

const catChipStyle = {
  fontSize: 10, fontWeight: 500,
  textTransform: 'uppercase', letterSpacing: '0.04em',
  color: 'var(--color-text-tertiary)',
  backgroundColor: 'var(--color-bg)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-full)',
  padding: '1px 7px',
}

const draftBadgeStyle = {
  fontSize: 10, fontWeight: 600,
  textTransform: 'uppercase', letterSpacing: '0.05em',
  color: 'var(--color-text-tertiary)',
  backgroundColor: 'var(--color-bg)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-full)',
  padding: '1px 7px',
}

const toggleBtnStyle = {
  padding: '3px 10px',
  borderRadius: 'var(--radius-full)',
  fontSize: 11,
  fontWeight: 600,
  fontFamily: 'var(--font-body)',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  transition: 'all 0.15s ease',
}

const iconBtnStyle = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  width: 30, height: 30,
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--color-border)',
  backgroundColor: 'var(--color-surface)',
  color: 'var(--color-text-secondary)',
  cursor: 'pointer',
}

const primaryBtnStyle = {
  display: 'flex', alignItems: 'center', gap: 'var(--space-1)',
  padding: 'var(--space-2) var(--space-3)',
  borderRadius: 'var(--radius-sm)',
  border: 'none',
  backgroundColor: 'var(--color-accent)',
  color: '#fff',
  fontSize: 13, fontWeight: 600,
  fontFamily: 'var(--font-body)',
  cursor: 'pointer',
}

const searchInputStyle = {
  width: '100%',
  boxSizing: 'border-box',
  padding: 'var(--space-2) var(--space-3) var(--space-2) var(--space-8)',
  fontSize: 14,
  fontFamily: 'var(--font-body)',
  backgroundColor: 'var(--color-surface)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-lg)',
  color: 'var(--color-text-primary)',
  outline: 'none',
  boxShadow: 'var(--shadow-card)',
}

const clearBtnStyle = {
  position: 'absolute', right: 'var(--space-3)', top: '50%',
  transform: 'translateY(-50%)',
  background: 'none', border: 'none', cursor: 'pointer',
  color: 'var(--color-text-tertiary)',
  display: 'flex', alignItems: 'center', padding: 0,
}



File: src/pages/admin/DrugEditor.jsx
---
/**
 * DrugEditor.jsx — /admin/drugs/generic/:genericId
 *
 * Unified editor: one page to manage a generic's info, all its formulations,
 * and each formulation's brands — no more bouncing between 3 separate screens.
 *
 * Layout:
 *   ┌─ Header: Drug Library › {genericName}  [Save Generic] ─────────────────┐
 *   │                                                                          │
 *   │  ▾ Generic info          (collapsible, open by default)                 │
 *   │                                                                          │
 *   │  ▾ 500mg · Capsule · Oral          [● Live]  [Save]  [✕]               │
 *   │      FormulationEditor + BrandEditor inline                              │
 *   │                                                                          │
 *   │  ▾ 250mg/5ml · Syrup · Oral        [○ Draft] [Save]  [✕]               │
 *   │      ...                                                                 │
 *   │                                                                          │
 *   │  [+ Add Formulation]                                                     │
 *   └──────────────────────────────────────────────────────────────────────────┘
 */

import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, Plus, Save, Trash2, AlertTriangle, Check, ChevronDown, ChevronRight } from 'lucide-react'
import { useToast } from '../../context/ToastContext'
import { useDrugContext } from '../../context/DrugContext'
import GenericEditor from '../../components/admin/GenericEditor'
import FormulationEditor from '../../components/admin/FormulationEditor'
import BrandEditor from '../../components/admin/BrandEditor'
import ConfirmModal from '../../components/admin/ConfirmModal'
import {
  updateGeneric,
  insertFormulation,
  updateFormulation,
  deleteFormulation,
  insertBrand,
  updateBrand,
  deleteBrand,
  touchAppMetadata,
} from '../../lib/adminQueries'
import { supabase } from '../../lib/supabase'

// ─── Empty states ─────────────────────────────────────────────────────────────

const EMPTY_FORMULATION = {
  concentration: '',
  form: '',
  route: '',
  doses: [],
  default_dose_override: null,
  is_published: true,
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function DrugEditor() {
  const { genericId } = useParams()
  const navigate      = useNavigate()
  const { toast }     = useToast()
  const { refresh }   = useDrugContext()

  // ── Fetch state ─────────────────────────────────────────────────────────────
  const [loading,  setLoading]  = useState(true)
  const [fetchErr, setFetchErr] = useState(null)

  // ── Data ────────────────────────────────────────────────────────────────────
  const [generic,       setGeneric]       = useState(null)
  const [formulations,  setFormulations]  = useState([])  // each has .brands[]

  // ── UI ──────────────────────────────────────────────────────────────────────
  const [genericOpen,   setGenericOpen]   = useState(true)
  const [openFormId,    setOpenFormId]    = useState(null)  // which formulation is expanded
  const [savingGeneric, setSavingGeneric] = useState(false)
  const [savedGeneric,  setSavedGeneric]  = useState(false)
  const [savingFormId,  setSavingFormId]  = useState(null)
  const [savedFormId,   setSavedFormId]   = useState(null)
  const [confirmDel,    setConfirmDel]    = useState(null)  // formulation to delete
  const [deleting,      setDeleting]      = useState(false)
  const [globalError,   setGlobalError]   = useState(null)
  const [addingForm,    setAddingForm]    = useState(false)

  // ── Load ────────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true)
    setFetchErr(null)

    const { data: gData, error: gErr } = await supabase
      .from('generics')
      .select(`
        id, slug, name_en, name_ar, category, class, is_published,
        card_tagline, mechanism_of_action,
        uses_legacy, uses_structured,
        warnings_legacy,
        side_effects_common, side_effects_serious,
        pregnancy_category, breastfeeding_safety,
        crosses_placenta, crosses_bbb,
        contraindications, drug_interactions, dose_adjustments,
        pharmacokinetics, textbook_doses, textbook_dose_notes
      `)
      .eq('id', genericId)
      .single()

    if (gErr) { setFetchErr(gErr.message); setLoading(false); return }
    setGeneric(gData)

    const { data: fData, error: fErr } = await supabase
      .from('formulations')
      .select(`
        id, concentration, form, route,
        doses, doses_structured, default_dose_override, is_published,
        brands ( id, name, name_ar, manufacturer, source, is_published )
      `)
      .eq('generic_id', genericId)
      .order('concentration')

    if (fErr) { setFetchErr(fErr.message); setLoading(false); return }

    setFormulations(fData.map(f => ({
      ...f,
      doses: f.doses_structured ?? f.doses ?? [],
      brands: (f.brands ?? []).map(b => ({ ...b })),
    })))

    setLoading(false)
  }, [genericId])

  useEffect(() => { load() }, [load])

  // ── Save generic ────────────────────────────────────────────────────────────
  async function saveGeneric() {
    setSavingGeneric(true)
    setGlobalError(null)
    const { error } = await updateGeneric(genericId, {
      name_en:              generic.name_en?.trim(),
      name_ar:              generic.name_ar?.trim() || null,
      category:             generic.category,
      class:                generic.class?.trim() || null,
      is_published:         generic.is_published ?? true,
      card_tagline:         generic.card_tagline?.trim() || null,
      mechanism_of_action:  generic.mechanism_of_action?.trim() || null,
      uses_structured:      generic.uses_structured ?? null,
      uses_legacy:          generic.uses_legacy ?? [],
      warnings_legacy:      generic.warnings_legacy ?? [],
      side_effects_common:  generic.side_effects_common ?? [],
      side_effects_serious: generic.side_effects_serious ?? [],
      pregnancy_category:   generic.pregnancy_category || null,
      breastfeeding_safety: generic.breastfeeding_safety || null,
      crosses_placenta:     generic.crosses_placenta || null,
      crosses_bbb:          generic.crosses_bbb || null,
      contraindications:    generic.contraindications ?? [],
      drug_interactions:    generic.drug_interactions ?? [],
      dose_adjustments:     generic.dose_adjustments ?? [],
      pharmacokinetics:     generic.pharmacokinetics ?? null,
      textbook_doses:       generic.textbook_doses ?? [],
      textbook_dose_notes:  generic.textbook_dose_notes?.trim() || null,
    })
    setSavingGeneric(false)
    if (error) { setGlobalError(`Generic: ${error.message}`); return }
    setSavedGeneric(true)
    setTimeout(() => setSavedGeneric(false), 2500)
    await touchAppMetadata('drugs_updated_at')
    await refresh()
    toast.success('Generic saved')
  }

  // ── Save formulation ────────────────────────────────────────────────────────
  async function saveFormulation(f) {
    setSavingFormId(f.id)
    setGlobalError(null)

    // 1. Update formulation fields
    const { error: fErr } = await updateFormulation(f.id, {
      concentration:        f.concentration.trim(),
      form:                 f.form,
      route:                f.route,
      doses_structured:     f.doses,
      default_dose_override: f.default_dose_override || null,
      is_published:         f.is_published ?? true,
    })
    if (fErr) { setGlobalError(`Formulation: ${fErr.message}`); setSavingFormId(null); return }

    // 2. Sync brands: upsert existing, insert new, delete marked
    try {
      for (const brand of f.brands) {
        if (brand._deleted) {
          if (brand.id) {
            const { error } = await deleteBrand(brand.id)
            if (error) throw new Error(`Delete brand: ${error.message}`)
          }
          continue
        }
        const payload = {
          name:         brand.name.trim(),
          name_ar:      brand.name_ar?.trim() || null,
          manufacturer: brand.manufacturer?.trim() || null,
          source:       brand.source ?? 'manual',
          is_published: brand.is_published ?? true,
        }
        if (brand.id) {
          const { error } = await updateBrand(brand.id, payload)
          if (error) throw new Error(`Update brand "${brand.name}": ${error.message}`)
        } else {
          const { error } = await insertBrand({ ...payload, formulation_id: f.id })
          if (error) throw new Error(`Insert brand "${brand.name}": ${error.message}`)
        }
      }
    } catch (err) {
      setGlobalError(err.message)
      setSavingFormId(null)
      return
    }

    setSavingFormId(null)
    setSavedFormId(f.id)
    setTimeout(() => setSavedFormId(null), 2500)
    await refresh()
    toast.success('Formulation saved')
    // Reload brands to pick up new IDs
    load()
  }

  // ── Add formulation ─────────────────────────────────────────────────────────
  async function addFormulation() {
    setAddingForm(true)
    setGlobalError(null)

    // Generate a slug: generic slug + timestamp for uniqueness
    const { data: gRow } = await supabase
      .from('generics').select('slug').eq('id', genericId).single()
    const base = gRow?.slug ?? genericId
    const slug = `${base}-new-${Date.now()}`

    const { data: newF, error } = await insertFormulation({
      generic_id:    genericId,
      concentration: 'New concentration',
      form:          'tablet',
      route:         'oral',
      slug,
      doses_structured: [],
      is_published:  false,
    })

    setAddingForm(false)
    if (error) { setGlobalError(`Add formulation: ${error.message}`); return }

    // Reload and open the new formulation
    await load()
    setOpenFormId(newF.id)
    toast.success('Formulation added — fill in the details and save')
  }

  // ── Delete formulation ──────────────────────────────────────────────────────
  async function handleDeleteFormulation() {
    const f = confirmDel
    setConfirmDel(null)
    setDeleting(true)
    const { error } = await deleteFormulation(f.id)
    setDeleting(false)
    if (error) { setGlobalError(`Delete: ${error.message}`); return }
    setFormulations(prev => prev.filter(x => x.id !== f.id))
    if (openFormId === f.id) setOpenFormId(null)
    await refresh()
    toast.success('Formulation deleted')
  }

  // ── Patch helpers ────────────────────────────────────────────────────────────
  function patchFormulation(id, patch) {
    setFormulations(prev => prev.map(f => f.id === id ? { ...f, ...patch } : f))
  }

  function patchBrands(formId, updatedBrands) {
    setFormulations(prev => prev.map(f =>
      f.id === formId ? { ...f, brands: updatedBrands } : f
    ))
  }

  function markBrandDeleted(formId, brandId) {
    setFormulations(prev => prev.map(f =>
      f.id === formId
        ? { ...f, brands: f.brands.map(b => b.id === brandId ? { ...b, _deleted: true } : b) }
        : f
    ))
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  if (loading) return (
    <Shell name="Loading…" onBack={() => navigate('/admin/drugs')}>
      <LoadingSkeleton />
    </Shell>
  )

  if (fetchErr) return (
    <Shell name="Error" onBack={() => navigate('/admin/drugs')}>
      <ErrorBanner message={fetchErr} />
    </Shell>
  )

  const genericValid = generic?.name_en?.trim() && generic?.category

  return (
    <Shell name={generic?.name_en ?? 'Drug'} onBack={() => navigate('/admin/drugs')}>

      {globalError && (
        <ErrorBanner message={globalError} onDismiss={() => setGlobalError(null)} />
      )}

      {/* ── Generic section ────────────────────────────────────────────────── */}
      <SectionCard
        title="Generic info"
        badge={generic?.is_published ? 'Live' : 'Draft'}
        badgeLive={generic?.is_published}
        open={genericOpen}
        onToggle={() => setGenericOpen(o => !o)}
        saveSlot={
          <SaveRow
            onSave={saveGeneric}
            saving={savingGeneric}
            saved={savedGeneric}
            valid={genericValid}
          />
        }
      >
        <GenericEditor
          generic={generic}
          onChange={patch => setGeneric(g => ({ ...g, ...patch }))}
          disabled={savingGeneric}
        />
      </SectionCard>

      {/* ── Formulations ───────────────────────────────────────────────────── */}
      <div style={{ marginTop: 'var(--space-5)' }}>
        <div style={{
          fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
          letterSpacing: '0.08em', color: 'var(--color-text-tertiary)',
          marginBottom: 'var(--space-3)',
        }}>
          Formulations ({formulations.length})
        </div>

        {formulations.length === 0 && (
          <div style={{
            textAlign: 'center', padding: 'var(--space-8)',
            color: 'var(--color-text-tertiary)', fontSize: 14,
            backgroundColor: 'var(--color-surface)',
            border: '1px dashed var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            marginBottom: 'var(--space-3)',
          }}>
            No formulations yet. Add one below.
          </div>
        )}

        {formulations.map(f => {
          const isOpen    = openFormId === f.id
          const isSaving  = savingFormId === f.id
          const isSaved   = savedFormId === f.id
          const visibleBrands = f.brands.filter(b => !b._deleted)
          const formValid = f.concentration?.trim() && f.form && f.route

          return (
            <SectionCard
              key={f.id}
              title={[f.concentration, f.form, f.route].filter(Boolean).join(' · ')}
              badge={f.is_published ? 'Live' : 'Draft'}
              badgeLive={f.is_published}
              open={isOpen}
              onToggle={() => setOpenFormId(isOpen ? null : f.id)}
              deleteSlot={
                <button
                  onClick={e => { e.stopPropagation(); setConfirmDel(f) }}
                  title="Delete formulation"
                  style={iconDangerBtnStyle}
                >
                  <Trash2 size={13} />
                </button>
              }
              saveSlot={
                <SaveRow
                  onSave={() => saveFormulation(f)}
                  saving={isSaving}
                  saved={isSaved}
                  valid={formValid}
                />
              }
            >
              {/* Formulation fields */}
              <FormulationEditor
                formulation={{
                  concentration:        f.concentration,
                  form:                 f.form,
                  route:                f.route,
                  doses:                f.doses,
                  default_dose_override: f.default_dose_override,
                  is_published:         f.is_published,
                }}
                onChange={patch => patchFormulation(f.id, patch)}
                disabled={isSaving}
              />

              {/* Brand divider */}
              <div style={{
                margin: 'var(--space-5) 0 var(--space-4)',
                borderTop: '1px solid var(--color-border)',
                paddingTop: 'var(--space-4)',
              }}>
                <div style={{
                  fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                  letterSpacing: '0.08em', color: 'var(--color-text-tertiary)',
                  marginBottom: 'var(--space-3)',
                }}>
                  Brands ({visibleBrands.length})
                </div>
                <BrandEditor
                  brands={visibleBrands}
                  onChange={updated => patchBrands(f.id, [
                    ...updated,
                    ...f.brands.filter(b => b._deleted),
                  ])}
                  onDelete={brandId => markBrandDeleted(f.id, brandId)}
                  disabled={isSaving}
                />
              </div>
            </SectionCard>
          )
        })}

        {/* Add Formulation */}
        <button
          onClick={addFormulation}
          disabled={addingForm}
          style={{
            display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
            width: '100%',
            padding: 'var(--space-3) var(--space-4)',
            borderRadius: 'var(--radius-lg)',
            border: '1.5px dashed var(--color-border)',
            backgroundColor: 'transparent',
            color: addingForm ? 'var(--color-text-tertiary)' : 'var(--color-accent)',
            fontSize: 14, fontWeight: 500,
            fontFamily: 'var(--font-body)',
            cursor: addingForm ? 'not-allowed' : 'pointer',
            justifyContent: 'center',
            marginTop: 'var(--space-3)',
          }}
        >
          <Plus size={15} />
          {addingForm ? 'Adding…' : 'Add Formulation'}
        </button>
      </div>

      {/* Confirm delete formulation */}
      {confirmDel && (
        <ConfirmModal
          isOpen
          title="Delete formulation?"
          message={`Delete "${confirmDel.concentration} ${confirmDel.form}"? All its brands will also be deleted. This cannot be undone.`}
          confirmLabel={deleting ? 'Deleting…' : 'Delete'}
          danger
          onConfirm={handleDeleteFormulation}
          onCancel={() => setConfirmDel(null)}
        />
      )}

    </Shell>
  )
}

// ─── Shell ────────────────────────────────────────────────────────────────────

function Shell({ children, name, onBack }) {
  return (
    <div style={{ minHeight: '100dvh', backgroundColor: 'var(--color-bg)', fontFamily: 'var(--font-body)' }}>
      <header style={{
        display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
        padding: 'var(--space-3) var(--space-4)',
        borderBottom: '1px solid var(--color-border)',
        backgroundColor: 'var(--color-surface)',
        position: 'sticky', top: 0, zIndex: 50,
      }}>
        <button onClick={onBack} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--color-accent)', fontSize: 14, fontWeight: 500,
          fontFamily: 'var(--font-body)', padding: '4px 0',
          display: 'flex', alignItems: 'center', gap: 2,
        }}>
          <ChevronLeft size={16} />
          Drug Library
        </button>
        <span style={{ color: 'var(--color-border)', fontSize: 16 }}>/</span>
        <span style={{
          fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {name}
        </span>
      </header>
      <main style={{
        maxWidth: 680, margin: '0 auto',
        padding: 'var(--space-5) var(--space-4) var(--space-16)',
      }}>
        {children}
      </main>
    </div>
  )
}

// ─── SectionCard ──────────────────────────────────────────────────────────────

function SectionCard({ title, badge, badgeLive, open, onToggle, children, saveSlot, deleteSlot }) {
  return (
    <div style={{
      backgroundColor: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
      boxShadow: 'var(--shadow-card)',
      marginBottom: 'var(--space-3)',
    }}>
      {/* Header row — clickable to toggle */}
      <div
        onClick={onToggle}
        style={{
          display: 'flex', alignItems: 'center',
          padding: 'var(--space-3) var(--space-4)',
          borderBottom: open ? '1px solid var(--color-border)' : 'none',
          cursor: 'pointer', userSelect: 'none',
          gap: 'var(--space-2)',
        }}
      >
        <span style={{ color: 'var(--color-text-tertiary)', flexShrink: 0 }}>
          {open ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
        </span>
        <span style={{
          flex: 1, fontSize: 14, fontWeight: 600,
          color: 'var(--color-text-primary)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {title}
        </span>
        {badge && (
          <span style={{
            fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
            padding: '2px 8px', borderRadius: 'var(--radius-full)',
            backgroundColor: badgeLive ? '#D1FAE5' : 'var(--color-bg)',
            color: badgeLive ? '#065F46' : 'var(--color-text-tertiary)',
            border: `1px solid ${badgeLive ? '#6EE7B7' : 'var(--color-border)'}`,
            flexShrink: 0,
          }}>
            {badge}
          </span>
        )}
        {/* Stop propagation on action buttons so clicks don't toggle */}
        {deleteSlot && (
          <span onClick={e => e.stopPropagation()}>
            {deleteSlot}
          </span>
        )}
      </div>

      {/* Body */}
      {open && (
        <div style={{ padding: 'var(--space-4)' }}>
          {children}
          {saveSlot && (
            <div style={{ marginTop: 'var(--space-4)', borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-4)' }}>
              {saveSlot}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── SaveRow ──────────────────────────────────────────────────────────────────

function SaveRow({ onSave, saving, saved, valid }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 'var(--space-3)' }}>
      {saved && (
        <span style={{ fontSize: 13, color: 'var(--color-instock)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4 }}>
          <Check size={13} /> Saved
        </span>
      )}
      <button
        onClick={onSave}
        disabled={!valid || saving}
        style={{
          display: 'flex', alignItems: 'center', gap: 'var(--space-1)',
          padding: 'var(--space-2) var(--space-4)',
          borderRadius: 'var(--radius-sm)', border: 'none',
          backgroundColor: (!valid || saving) ? 'var(--color-border)' : 'var(--color-accent)',
          color: (!valid || saving) ? 'var(--color-text-tertiary)' : '#fff',
          fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-body)',
          cursor: (!valid || saving) ? 'not-allowed' : 'pointer',
        }}
      >
        <Save size={13} />
        {saving ? 'Saving…' : 'Save'}
      </button>
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ErrorBanner({ message, onDismiss }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 'var(--space-2)',
      backgroundColor: '#FEF2F2', border: '1px solid #FECACA',
      borderRadius: 'var(--radius-md)', padding: 'var(--space-3)',
      marginBottom: 'var(--space-4)', fontSize: 13, color: '#DC2626',
    }}>
      <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
      <span style={{ flex: 1 }}>{message}</span>
      {onDismiss && (
        <button onClick={onDismiss} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#DC2626', padding: 0 }}>
          ✕
        </button>
      )}
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      {[160, 80, 100].map((h, i) => (
        <div key={i} style={{
          height: h,
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          animation: 'shimmer 1.4s ease-in-out infinite',
        }} />
      ))}
    </div>
  )
}

const iconDangerBtnStyle = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  width: 26, height: 26,
  borderRadius: 'var(--radius-sm)',
  border: '1px solid #FECACA',
  backgroundColor: '#FEF2F2',
  color: '#DC2626',
  cursor: 'pointer',
  flexShrink: 0,
}



File: src/pages/admin/FormulationDetailEditor.jsx
---
import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, Save, AlertTriangle, Trash2 } from 'lucide-react'
import {
  fetchFormulationWithGeneric,
  updateGeneric,
  updateFormulation,
  insertBrand,
  updateBrand,
  deleteBrand,
  deleteFormulation,
} from '../../lib/adminQueries'
import { useDrugContext } from '../../context/DrugContext'
import GenericEditor from '../../components/admin/GenericEditor'
import FormulationEditor from '../../components/admin/FormulationEditor'
import BrandEditor from '../../components/admin/BrandEditor'

/**
 * FormulationDetailEditor — /admin/drugs/:id
 *
 * Fetches the formulation (with generic + brands) fresh from Supabase on mount.
 * Three collapsible sections: Generic | Formulation | Brands.
 * Save button per section (patch only that section).
 * Delete formulation at bottom (with confirm).
 */

const SECTIONS = ['generic', 'formulation', 'brands']

export default function FormulationDetailEditor() {
  const { id }      = useParams()
  const navigate    = useNavigate()
  const { refresh } = useDrugContext()

  // ─── Fetch state ──────────────────────────────────────────────────────────
  const [loading,  setLoading]  = useState(true)
  const [fetchErr, setFetchErr] = useState(null)

  // ─── Data state ───────────────────────────────────────────────────────────
  const [genericId,       setGenericId]       = useState(null)
  const [generic,         setGeneric]         = useState(null)
  const [formulation,     setFormulation]     = useState(null)
  const [brands,          setBrands]          = useState([])

  // ─── UI state ─────────────────────────────────────────────────────────────
  const [openSection,     setOpenSection]     = useState('generic')
  const [saving,          setSaving]          = useState(null) // 'generic'|'formulation'|'brands'|null
  const [saveError,       setSaveError]       = useState(null)
  const [saveSuccess,     setSaveSuccess]     = useState(null)
  const [confirmDelete,   setConfirmDelete]   = useState(false)
  const [deleting,        setDeleting]        = useState(false)

  // ─── Load ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data, error } = await fetchFormulationWithGeneric(id)
      if (error) {
        setFetchErr(error.message)
        setLoading(false)
        return
      }
      setGenericId(data.generics.id)
      setGeneric({
        name_en:  data.generics.name_en,
        name_ar:  data.generics.name_ar,
        category: data.generics.category,
        class:    data.generics.class,
        uses:     data.generics.uses_legacy     ?? [],
        warnings: data.generics.warnings_legacy ?? [],
        doses:    data.generics.textbook_doses  ?? [],
      })
      setFormulation({
        concentration:        data.concentration,
        form:                 data.form,
        route:                data.route,
        doses:                data.doses_structured ?? data.doses ?? [],
        default_dose_override: data.default_dose_override ?? null,
        is_published:         data.is_published ?? true,
      })
      setBrands((data.brands ?? []).map(b => ({
        id:           b.id,
        name:         b.name,
        name_ar:      b.name_ar,
        manufacturer: b.manufacturer,
        source:       b.source ?? 'manual',
        is_published: b.is_published ?? true,
      })))
      setLoading(false)
    }
    load()
  }, [id])

  // ─── Section save handlers ────────────────────────────────────────────────

  async function saveGeneric() {
    setSaving('generic')
    setSaveError(null)
    const { error } = await updateGeneric(genericId, {
      name_en:         generic.name_en.trim(),
      name_ar:         generic.name_ar?.trim() || null,
      category:        generic.category,
      class:           generic.class?.trim() || null,
      uses_legacy:     generic.uses,
      warnings_legacy: generic.warnings,
      textbook_doses:  generic.doses,
    })
    setSaving(null)
    if (error) { setSaveError(`Generic: ${error.message}`); return }
    setSaveSuccess('generic')
    setTimeout(() => setSaveSuccess(null), 2000)
    await refresh()
  }

  async function saveFormulation() {
    setSaving('formulation')
    setSaveError(null)
    const { error } = await updateFormulation(id, {
      concentration:        formulation.concentration.trim(),
      form:                 formulation.form,
      route:                formulation.route,
      doses_structured:     formulation.doses,
      default_dose_override: formulation.default_dose_override || null,
      is_published:         formulation.is_published ?? true,
    })
    setSaving(null)
    if (error) { setSaveError(`Formulation: ${error.message}`); return }
    setSaveSuccess('formulation')
    setTimeout(() => setSaveSuccess(null), 2000)
    await refresh()
  }

  async function saveBrands() {
    setSaving('brands')
    setSaveError(null)
    try {
      for (const brand of brands) {
        const payload = {
          name:         brand.name.trim(),
          name_ar:      brand.name_ar?.trim() || null,
          manufacturer: brand.manufacturer?.trim() || null,
          source:       brand.source ?? 'manual',
          is_published: brand.is_published ?? true,
        }
        if (brand.id) {
          const { error } = await updateBrand(brand.id, payload)
          if (error) throw new Error(`Brand "${brand.name}": ${error.message}`)
        } else {
          const { error } = await insertBrand({ ...payload, formulation_id: id })
          if (error) throw new Error(`Brand "${brand.name}": ${error.message}`)
        }
      }
      // Brands without id that were removed are not in the list,
      // but existing brands that were removed need explicit delete.
      // BrandEditor tracks removed existing brands via _deleted flag.
      const deleted = brands.filter(b => b._deleted && b.id)
      for (const b of deleted) {
        const { error } = await deleteBrand(b.id)
        if (error) throw new Error(`Delete brand "${b.name}": ${error.message}`)
      }
    } catch (err) {
      setSaveError(err.message)
      setSaving(null)
      return
    }
    setSaving(null)
    setSaveSuccess('brands')
    setTimeout(() => setSaveSuccess(null), 2000)
    await refresh()
  }

  // ─── Delete formulation ───────────────────────────────────────────────────

  async function handleDelete() {
    setDeleting(true)
    const { error } = await deleteFormulation(id)
    if (error) {
      setSaveError(`Delete: ${error.message}`)
      setDeleting(false)
      setConfirmDelete(false)
      return
    }
    await refresh()
    navigate('/admin/drugs', { replace: true })
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  if (loading) return <Shell onBack={() => navigate('/admin/drugs')} title="Edit Drug"><LoadingSkeleton /></Shell>

  if (fetchErr) return (
    <Shell onBack={() => navigate('/admin/drugs')} title="Edit Drug">
      <ErrorBanner message={fetchErr} />
    </Shell>
  )

  return (
    <Shell onBack={() => navigate('/admin/drugs')} title={generic?.name_en ?? 'Edit Drug'}>

      {/* Global save error */}
      {saveError && <ErrorBanner message={saveError} onDismiss={() => setSaveError(null)} />}

      {/* ── Generic section ── */}
      <Section
        title="Generic info"
        open={openSection === 'generic'}
        onToggle={() => setOpenSection(s => s === 'generic' ? null : 'generic')}
        onSave={saveGeneric}
        saving={saving === 'generic'}
        saved={saveSuccess === 'generic'}
        valid={generic?.name_en?.trim() && generic?.category}
      >
        {generic && (
          <GenericEditor
            generic={generic}
            onChange={patch => setGeneric(g => ({ ...g, ...patch }))}
            disabled={saving === 'generic'}
          />
        )}
      </Section>

      {/* ── Formulation section ── */}
      <Section
        title="Formulation"
        open={openSection === 'formulation'}
        onToggle={() => setOpenSection(s => s === 'formulation' ? null : 'formulation')}
        onSave={saveFormulation}
        saving={saving === 'formulation'}
        saved={saveSuccess === 'formulation'}
        valid={formulation?.concentration?.trim() && formulation?.form && formulation?.route}
      >
        {formulation && (
          <FormulationEditor
            formulation={formulation}
            onChange={patch => setFormulation(f => ({ ...f, ...patch }))}
            disabled={saving === 'formulation'}
          />
        )}
      </Section>

      {/* ── Brands section ── */}
      <Section
        title="Brands"
        open={openSection === 'brands'}
        onToggle={() => setOpenSection(s => s === 'brands' ? null : 'brands')}
        onSave={saveBrands}
        saving={saving === 'brands'}
        saved={saveSuccess === 'brands'}
        valid={brands.filter(b => !b._deleted).length > 0}
      >
        <BrandEditor
          brands={brands.filter(b => !b._deleted)}
          formulationLabel={
            formulation
              ? [formulation.concentration, formulation.form].filter(Boolean).join(' · ')
              : null
          }
          onChange={updated => {
            // Merge: keep _deleted flags, replace rest
            const deletedOld = brands.filter(b => b._deleted)
            setBrands([...updated, ...deletedOld])
          }}
          onDelete={brandId => {
            setBrands(prev => prev.map(b => b.id === brandId ? { ...b, _deleted: true } : b))
          }}
          disabled={saving === 'brands'}
        />
      </Section>

      {/* ── Delete formulation ── */}
      <div style={{
        marginTop: 'var(--space-6)',
        padding: 'var(--space-4)',
        backgroundColor: '#FEF2F2',
        border: '1px solid #FECACA',
        borderRadius: 'var(--radius-lg)',
      }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#DC2626', marginBottom: 'var(--space-2)' }}>
          Danger zone
        </div>
        <div style={{ fontSize: 12, color: '#B91C1C', marginBottom: 'var(--space-3)' }}>
          Deleting this formulation will also delete all its brands. This cannot be undone.
        </div>
        {confirmDelete ? (
          <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: '#DC2626', fontWeight: 500 }}>Are you sure?</span>
            <button
              onClick={handleDelete}
              disabled={deleting}
              style={{ ...dangerBtn, opacity: deleting ? 0.5 : 1 }}
            >
              {deleting ? 'Deleting…' : 'Yes, delete'}
            </button>
            <button onClick={() => setConfirmDelete(false)} style={cancelBtn}>
              Cancel
            </button>
          </div>
        ) : (
          <button onClick={() => setConfirmDelete(true)} style={dangerBtn}>
            <Trash2 size={14} />
            Delete formulation
          </button>
        )}
      </div>

    </Shell>
  )
}

// ─── Shell ────────────────────────────────────────────────────────────────────

function Shell({ children, onBack, title }) {
  return (
    <div style={{ minHeight: '100dvh', backgroundColor: 'var(--color-bg)', fontFamily: 'var(--font-body)' }}>
      <header style={{
        display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
        padding: 'var(--space-3) var(--space-4)',
        borderBottom: '1px solid var(--color-border)',
        backgroundColor: 'var(--color-surface)',
        position: 'sticky', top: 0, zIndex: 50,
      }}>
        <button
          onClick={onBack}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--color-accent)', fontSize: 14, fontWeight: 500,
            fontFamily: 'var(--font-body)', padding: '4px 0',
            display: 'flex', alignItems: 'center', gap: 2,
          }}
        >
          <ChevronLeft size={16} />
          Drug Library
        </button>
        <span style={{ color: 'var(--color-border)', fontSize: 16 }}>/</span>
        <span style={{
          fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {title}
        </span>
      </header>
      <main style={{ maxWidth: 600, margin: '0 auto', padding: 'var(--space-5) var(--space-4) var(--space-12)' }}>
        {children}
      </main>
    </div>
  )
}

// ─── Collapsible Section ──────────────────────────────────────────────────────

function Section({ title, open, onToggle, onSave, saving, saved, valid, children }) {
  return (
    <div style={{
      backgroundColor: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
      boxShadow: 'var(--shadow-card)',
      marginBottom: 'var(--space-3)',
    }}>
      {/* Section header */}
      <button
        type="button"
        onClick={onToggle}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: 'var(--space-4)',
          background: 'none', border: 'none', cursor: 'pointer',
          borderBottom: open ? '1px solid var(--color-border)' : 'none',
        }}
      >
        <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)' }}>
          {title}
        </span>
        <span style={{ fontSize: 18, color: 'var(--color-text-tertiary)', lineHeight: 1 }}>
          {open ? '−' : '+'}
        </span>
      </button>

      {/* Section body */}
      {open && (
        <div style={{ padding: 'var(--space-4)' }}>
          {children}

          {/* Save row */}
          <div style={{ marginTop: 'var(--space-4)', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 'var(--space-3)' }}>
            {saved && (
              <span style={{ fontSize: 13, color: 'var(--color-instock)', fontWeight: 500 }}>
                ✓ Saved
              </span>
            )}
            <button
              type="button"
              onClick={onSave}
              disabled={!valid || saving}
              style={{
                display: 'flex', alignItems: 'center', gap: 'var(--space-1)',
                padding: 'var(--space-2) var(--space-4)',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                backgroundColor: (!valid || saving) ? 'var(--color-border)' : 'var(--color-accent)',
                color: (!valid || saving) ? 'var(--color-text-tertiary)' : '#fff',
                fontSize: 13, fontWeight: 600,
                fontFamily: 'var(--font-body)',
                cursor: (!valid || saving) ? 'not-allowed' : 'pointer',
              }}
            >
              <Save size={14} />
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ErrorBanner({ message, onDismiss }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 'var(--space-2)',
      backgroundColor: '#FEF2F2', border: '1px solid #FECACA',
      borderRadius: 'var(--radius-md)', padding: 'var(--space-3)',
      marginBottom: 'var(--space-4)', fontSize: 13, color: '#DC2626',
    }}>
      <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
      <span style={{ flex: 1 }}>{message}</span>
      {onDismiss && (
        <button onClick={onDismiss} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#DC2626', padding: 0 }}>
          ✕
        </button>
      )}
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      {[120, 80, 100].map((h, i) => (
        <div key={i} style={{
          height: h,
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          animation: 'shimmer 1.4s ease-in-out infinite',
        }} />
      ))}
    </div>
  )
}

const dangerBtn = {
  display: 'flex', alignItems: 'center', gap: 'var(--space-1)',
  padding: 'var(--space-2) var(--space-3)',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid #FECACA',
  backgroundColor: '#FEF2F2',
  color: '#DC2626',
  fontSize: 13, fontWeight: 600,
  fontFamily: 'var(--font-body)',
  cursor: 'pointer',
}

const cancelBtn = {
  padding: 'var(--space-2) var(--space-3)',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--color-border)',
  backgroundColor: 'var(--color-surface)',
  color: 'var(--color-text-secondary)',
  fontSize: 13, fontWeight: 500,
  fontFamily: 'var(--font-body)',
  cursor: 'pointer',
}



File: src/pages/admin/GenericFormulationsPage.jsx
---
/**
 * GenericFormulationsPage — /admin/drugs/generic/:genericId
 *
 * Lists all formulations for a given generic.
 * Each row links to FormulationDetailEditor (/admin/drugs/:formulationId).
 * "+ Add Formulation" button links to AddDrugFlow (or a future AddFormulationFlow).
 */

import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, Plus, Edit2, Layers } from 'lucide-react'
import { supabase } from '../../lib/supabase'

export default function GenericFormulationsPage() {
  const { genericId } = useParams()
  const navigate      = useNavigate()

  const [genericName,   setGenericName]   = useState('')
  const [formulations,  setFormulations]  = useState([])
  const [loading,       setLoading]       = useState(true)
  const [error,         setError]         = useState(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data, error } = await supabase
        .from('formulations')
        .select(`
          id, concentration, form, route, is_published,
          generics ( id, name_en ),
          brands ( id )
        `)
        .eq('generic_id', genericId)
        .order('concentration')

      if (error) { setError(error.message); setLoading(false); return }

      if (data.length > 0) setGenericName(data[0].generics?.name_en ?? '')
      setFormulations(data)
      setLoading(false)
    }
    load()
  }, [genericId])

  return (
    <div style={{ minHeight: '100dvh', backgroundColor: 'var(--color-bg)', fontFamily: 'var(--font-body)' }}>

      {/* Header */}
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: 'var(--space-3) var(--space-4)',
        borderBottom: '1px solid var(--color-border)',
        backgroundColor: 'var(--color-surface)',
        position: 'sticky', top: 0, zIndex: 50,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <button
            onClick={() => navigate('/admin/drugs')}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--color-accent)', fontSize: 14, fontWeight: 500,
              fontFamily: 'var(--font-body)', padding: '4px 0',
              display: 'flex', alignItems: 'center', gap: 2,
            }}
          >
            <ChevronLeft size={16} />
            Drug Library
          </button>
          <span style={{ color: 'var(--color-border)', fontSize: 16 }}>/</span>
          <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)' }}>
            {genericName || 'Formulations'}
          </span>
        </div>
      </header>

      <main style={{ maxWidth: 640, margin: '0 auto', padding: 'var(--space-5) var(--space-4) var(--space-12)' }}>

        {/* Section header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <Layers size={16} style={{ color: 'var(--color-text-tertiary)' }} />
            <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
              {loading ? '…' : `${formulations.length} formulation${formulations.length !== 1 ? 's' : ''}`}
            </span>
          </div>
        </div>

        {error && (
          <div style={{
            backgroundColor: '#FEF2F2', border: '1px solid #FECACA',
            borderRadius: 'var(--radius-md)', padding: 'var(--space-3)',
            fontSize: 13, color: '#DC2626', marginBottom: 'var(--space-4)',
          }}>
            {error}
          </div>
        )}

        {/* Formulation list */}
        {!loading && formulations.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 'var(--space-12)', color: 'var(--color-text-tertiary)', fontSize: 14 }}>
            No formulations yet for this generic.
          </div>
        ) : (
          <div style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
            boxShadow: 'var(--shadow-card)',
          }}>
            {loading
              ? [1,2,3].map(i => (
                  <div key={i} style={{
                    height: 60,
                    borderBottom: '1px solid var(--color-border-subtle)',
                    animation: 'shimmer 1.4s ease-in-out infinite',
                  }} />
                ))
              : formulations.map((f, idx) => {
                  const isLast = idx === formulations.length - 1
                  return (
                    <div
                      key={f.id}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: 'var(--space-3) var(--space-4)',
                        borderBottom: isLast ? 'none' : '1px solid var(--color-border-subtle)',
                        backgroundColor: f.is_published ? 'transparent' : 'var(--color-bg)',
                        gap: 'var(--space-3)',
                      }}
                    >
                      {/* Left: concentration + form + route */}
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                          <span style={{
                            fontSize: 14, fontWeight: 600,
                            color: f.is_published ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
                          }}>
                            {f.concentration}
                          </span>
                          <span style={{
                            fontSize: 11, fontWeight: 500,
                            color: 'var(--color-text-secondary)',
                            backgroundColor: 'var(--color-bg)',
                            border: '1px solid var(--color-border)',
                            borderRadius: 'var(--radius-full)',
                            padding: '1px 8px',
                            textTransform: 'capitalize',
                          }}>
                            {f.form}
                          </span>
                          {!f.is_published && (
                            <span style={{
                              fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                              letterSpacing: '0.05em', color: 'var(--color-text-tertiary)',
                              backgroundColor: 'var(--color-bg)',
                              border: '1px solid var(--color-border)',
                              borderRadius: 'var(--radius-full)',
                              padding: '1px 7px',
                            }}>Draft</span>
                          )}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginTop: 2 }}>
                          {f.route} · {(f.brands ?? []).length} brand{(f.brands ?? []).length !== 1 ? 's' : ''}
                        </div>
                      </div>

                      {/* Edit button → FormulationDetailEditor */}
                      <button
                        onClick={() => navigate(`/admin/drugs/${f.id}`)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 'var(--space-1)',
                          padding: 'var(--space-2) var(--space-3)',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--color-border)',
                          backgroundColor: 'var(--color-surface)',
                          color: 'var(--color-text-secondary)',
                          fontSize: 13, fontWeight: 500,
                          fontFamily: 'var(--font-body)',
                          cursor: 'pointer', flexShrink: 0,
                        }}
                      >
                        <Edit2 size={13} />
                        Edit
                      </button>
                    </div>
                  )
                })
            }
          </div>
        )}
      </main>
    </div>
  )
}



File: src/pages/admin/SpecialtiesManager.jsx
---
import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, GripVertical, Pencil, Trash2, ToggleLeft, ToggleRight } from 'lucide-react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faStethoscope, faHeartPulse, faBrain, faBone, faEye, faEarListen,
  faTooth, faLungs, faVial, faDroplet, faSyringe, faBaby,
  faPersonPregnant, faVirus, faBacteria, faPills, faFlask,
  faMicroscope, faRadiation, faScissors, faUserDoctor, faWheelchair,
  faHospital, faFileMedical, faNotesMedical, faHeart, faXRay,
  faThermometer, faBriefcaseMedical, faCircleQuestion,
} from '@fortawesome/free-solid-svg-icons'
import { useToast } from '../../context/ToastContext'
import Modal from '../../components/admin/Modal'
import ConfirmModal from '../../components/admin/ConfirmModal'
import {
  fetchAllSpecialties,
  insertSpecialty,
  updateSpecialty,
  toggleSpecialtyActive,
  deleteSpecialty,
  reorderSpecialties,
} from '../../lib/adminQueries'

// ─── Icon picker catalogue ────────────────────────────────────────────────────

const ICON_OPTIONS = [
  { name: 'fa-stethoscope',       icon: faStethoscope },
  { name: 'fa-heart-pulse',       icon: faHeartPulse },
  { name: 'fa-brain',             icon: faBrain },
  { name: 'fa-bone',              icon: faBone },
  { name: 'fa-eye',               icon: faEye },
  { name: 'fa-ear-listen',        icon: faEarListen },
  { name: 'fa-tooth',             icon: faTooth },
  { name: 'fa-lungs',             icon: faLungs },
  { name: 'fa-vial',              icon: faVial },
  { name: 'fa-droplet',           icon: faDroplet },
  { name: 'fa-syringe',           icon: faSyringe },
  { name: 'fa-baby',              icon: faBaby },
  { name: 'fa-person-pregnant',   icon: faPersonPregnant },
  { name: 'fa-virus',             icon: faVirus },
  { name: 'fa-bacteria',          icon: faBacteria },
  { name: 'fa-pills',             icon: faPills },
  { name: 'fa-flask',             icon: faFlask },
  { name: 'fa-microscope',        icon: faMicroscope },
  { name: 'fa-radiation',         icon: faRadiation },
  { name: 'fa-scissors',          icon: faScissors },
  { name: 'fa-user-doctor',       icon: faUserDoctor },
  { name: 'fa-wheelchair',        icon: faWheelchair },
  { name: 'fa-hospital',          icon: faHospital },
  { name: 'fa-file-medical',      icon: faFileMedical },
  { name: 'fa-notes-medical',     icon: faNotesMedical },
  { name: 'fa-heart',             icon: faHeart },
  { name: 'fa-x-ray',            icon: faXRay },
  { name: 'fa-thermometer',       icon: faThermometer },
  { name: 'fa-briefcase-medical', icon: faBriefcaseMedical },
  { name: 'fa-circle-question',   icon: faCircleQuestion },
]

const ICON_MAP = Object.fromEntries(ICON_OPTIONS.map(o => [o.name, o.icon]))

const PALETTE_COLORS = [
  '#DBEAFE', '#D1FAE5', '#FEF3C7', '#FCE7F3',
  '#EDE9FE', '#FEE2E2', '#E0F2FE', '#D1FAE5',
  '#F3F4F6', '#FFF7ED',
]

const UNCATEGORIZED_ID = '00000000-0000-0000-0000-000000000001'

// ─── Slug helper ──────────────────────────────────────────────────────────────

function toSlug(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
}

// ─── Empty form state ─────────────────────────────────────────────────────────

const EMPTY_FORM = {
  name_en:    '',
  name_ar:    '',
  icon_name:  'fa-stethoscope',
  color_hex:  '#DBEAFE',
  sort_order: 0,   // 0 = auto; computed from existing rows on open
}

// ─── SpecialtyModal ───────────────────────────────────────────────────────────

function SpecialtyModal({ open, specialty, onClose, onSaved, nextOrder }) {
  const { showToast } = useToast()
  const [form, setForm]   = useState(EMPTY_FORM)
  const [busy, setBusy]   = useState(false)

  useEffect(() => {
    if (open) {
      setForm(specialty
        ? {
            name_en:    specialty.name_en   ?? '',
            name_ar:    specialty.name_ar   ?? '',
            icon_name:  specialty.icon_name ?? 'fa-stethoscope',
            color_hex:  specialty.color_hex ?? '#DBEAFE',
            sort_order: specialty.sort_order ?? 99,
          }
        : { ...EMPTY_FORM, sort_order: (nextOrder ?? 99) }
      )
    }
  }, [open, specialty])

  function patch(field, value) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSave() {
    if (!form.name_en.trim()) {
      showToast('Name (EN) is required', 'error')
      return
    }
    setBusy(true)

    const payload = {
      name_en:    form.name_en.trim(),
      name_ar:    form.name_ar.trim() || null,
      icon_name:  form.icon_name,
      color_hex:  form.color_hex,
      sort_order: Number(form.sort_order) || 99,
    }

    let result
    if (specialty) {
      result = await updateSpecialty(specialty.id, payload)
    } else {
      payload.slug      = toSlug(form.name_en)
      payload.is_active = true
      result = await insertSpecialty(payload)
    }

    setBusy(false)

    if (result.error) {
      showToast(result.error.message ?? 'Save failed', 'error')
      return
    }

    showToast(specialty ? 'Specialty updated' : 'Specialty added', 'success')
    onSaved()   // parent: setModalOpen(false) + load()
    onClose()   // ensure modal closes even if onSaved doesn't
  }

  return (
    <Modal
      isOpen={open}
      title={specialty ? 'Edit Specialty' : 'Add Specialty'}
      onClose={onClose}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Name EN */}
        <label style={labelStyle}>
          Name (English) *
          <input
            value={form.name_en}
            onChange={e => patch('name_en', e.target.value)}
            placeholder="e.g. Gastroenterology"
            style={inputStyle}
          />
        </label>

        {/* Name AR */}
        <label style={labelStyle}>
          Name (Arabic)
          <input
            value={form.name_ar}
            onChange={e => patch('name_ar', e.target.value)}
            placeholder="اختياري"
            dir="rtl"
            style={inputStyle}
          />
        </label>

        {/* Sort order */}
        <label style={labelStyle}>
          Sort Order
          <input
            type="number"
            value={form.sort_order}
            onChange={e => patch('sort_order', e.target.value)}
            min={1}
            style={{ ...inputStyle, width: 90 }}
          />
        </label>

        {/* Color palette */}
        <div>
          <div style={labelText}>Icon Background Color</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
            {PALETTE_COLORS.map(c => (
              <button
                key={c}
                onClick={() => patch('color_hex', c)}
                style={{
                  width: 32, height: 32,
                  borderRadius: 8,
                  backgroundColor: c,
                  border: form.color_hex === c
                    ? '2px solid var(--color-accent)'
                    : '2px solid transparent',
                  cursor: 'pointer',
                }}
              />
            ))}
            {/* Custom hex input */}
            <input
              type="color"
              value={form.color_hex}
              onChange={e => patch('color_hex', e.target.value)}
              title="Custom colour"
              style={{
                width: 32, height: 32,
                padding: 2,
                borderRadius: 8,
                border: '1px solid var(--color-border)',
                cursor: 'pointer',
              }}
            />
          </div>
        </div>

        {/* Icon picker */}
        <div>
          <div style={labelText}>Icon</div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(40px, 1fr))',
            gap: 6,
            marginTop: 6,
            maxHeight: 180,
            overflowY: 'auto',
            border: '1px solid var(--color-border)',
            borderRadius: 8,
            padding: 8,
          }}>
            {ICON_OPTIONS.map(({ name, icon }) => (
              <button
                key={name}
                title={name}
                onClick={() => patch('icon_name', name)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 40,
                  height: 40,
                  borderRadius: 8,
                  backgroundColor: form.icon_name === name
                    ? (form.color_hex || 'var(--color-accent-light)')
                    : 'transparent',
                  border: form.icon_name === name
                    ? '2px solid var(--color-accent)'
                    : '1px solid transparent',
                  color: form.icon_name === name
                    ? 'var(--color-accent)'
                    : 'var(--color-text-secondary)',
                  cursor: 'pointer',
                  fontSize: 16,
                }}
              >
                <FontAwesomeIcon icon={icon} />
              </button>
            ))}
          </div>
        </div>

        {/* Preview */}
        <div>
          <div style={labelText}>Preview</div>
          <div style={{
            marginTop: 6,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '12px 16px',
            border: '1px solid var(--color-border)',
            borderRadius: 10,
            backgroundColor: 'var(--color-bg)',
          }}>
            <div style={{
              width: 44, height: 44,
              borderRadius: 12,
              backgroundColor: form.color_hex || '#DBEAFE',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-accent)',
              fontSize: 20,
              flexShrink: 0,
            }}>
              <FontAwesomeIcon icon={ICON_MAP[form.icon_name] ?? faStethoscope} />
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--color-text-primary)' }}>
                {form.name_en || 'Specialty Name'}
              </div>
              {form.name_ar && (
                <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', direction: 'rtl' }}>
                  {form.name_ar}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 8 }}>
          <button onClick={onClose} style={btnSecondary}>Cancel</button>
          <button onClick={handleSave} disabled={busy} style={btnPrimary}>
            {busy ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function SpecialtiesManager() {
  const navigate         = useNavigate()
  const { showToast }    = useToast()

  const [rows, setRows]  = useState([])
  const [loading, setLoading] = useState(true)

  // Modal state
  const [modalOpen, setModalOpen]   = useState(false)
  const [editTarget, setEditTarget] = useState(null)   // null = add, object = edit

  // Confirm modal
  const [confirmOpen, setConfirmOpen]   = useState(false)
  const [confirmConfig, setConfirmConfig] = useState({})

  // Drag state
  const dragIdx   = useRef(null)
  const dragOver  = useRef(null)

  // ── Load ──────────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await fetchAllSpecialties()
    setLoading(false)
    if (error) { showToast('Failed to load specialties', 'error'); return }
    setRows(data ?? [])
  }, [showToast])

  useEffect(() => { load() }, [load])

  // ── Toggle active ─────────────────────────────────────────────────────────

  function handleToggleActive(specialty) {
    const turningOff = specialty.is_active

    if (turningOff && specialty.conditionCount > 0) {
      setConfirmConfig({
        title:   'Deactivate Specialty?',
        message: `All ${specialty.conditionCount} condition(s) in "${specialty.name_en}" will be moved to Uncategorized. Continue?`,
        onConfirm: () => doToggle(specialty, false),
      })
      setConfirmOpen(true)
      return
    }

    doToggle(specialty, !specialty.is_active)
  }

  async function doToggle(specialty, newValue) {
    // optimistic
    setRows(r => r.map(s => s.id === specialty.id ? { ...s, is_active: newValue } : s))
    const { error } = await toggleSpecialtyActive(specialty.id, newValue)
    if (error) {
      showToast('Update failed', 'error')
      setRows(r => r.map(s => s.id === specialty.id ? { ...s, is_active: !newValue } : s))
    } else {
      showToast(newValue ? 'Specialty activated' : 'Specialty deactivated', 'success')
    }
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  function handleDelete(specialty) {
    if (specialty.id === UNCATEGORIZED_ID) {
      showToast('Cannot delete Uncategorized', 'error'); return
    }
    if (specialty.conditionCount > 0) {
      showToast(`Move all ${specialty.conditionCount} condition(s) out first`, 'error'); return
    }
    setConfirmConfig({
      title:   'Delete Specialty?',
      message: `Delete "${specialty.name_en}" permanently? This cannot be undone.`,
      onConfirm: async () => {
        const { error } = await deleteSpecialty(specialty.id)
        if (error) { showToast('Delete failed', 'error'); return }
        showToast('Specialty deleted', 'success')
        load()
      },
    })
    setConfirmOpen(true)
  }

  // ── Drag to reorder ───────────────────────────────────────────────────────

  function onDragStart(e, idx) {
    dragIdx.current = idx
    e.dataTransfer.effectAllowed = 'move'
  }

  function onDragOver(e, idx) {
    e.preventDefault()
    dragOver.current = idx
  }

  async function onDrop() {
    const from = dragIdx.current
    const to   = dragOver.current
    if (from === null || to === null || from === to) return

    const reordered = [...rows]
    const [moved]   = reordered.splice(from, 1)
    reordered.splice(to, 0, moved)

    const withOrder = reordered.map((s, i) => ({ ...s, sort_order: i + 1 }))
    setRows(withOrder)

    const { error } = await reorderSpecialties(
      withOrder.map(s => ({ id: s.id, sort_order: s.sort_order }))
    )
    if (error) {
      showToast('Reorder failed', 'error')
      load() // revert
    }

    dragIdx.current  = null
    dragOver.current = null
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{
      minHeight: '100dvh',
      backgroundColor: 'var(--color-bg)',
      display: 'flex',
      flexDirection: 'column',
    }}>

      {/* Header */}
      <header style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 'var(--space-4)',
        borderBottom: '1px solid var(--color-border)',
        backgroundColor: 'var(--color-surface)',
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <button onClick={() => navigate('/admin')} style={iconBtn} aria-label="Back">
            <ArrowLeft size={18} />
          </button>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--color-text-primary)', fontFamily: 'var(--font-body)' }}>
              Specialties
            </div>
            <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-mono)' }}>
              {rows.length} specialt{rows.length === 1 ? 'y' : 'ies'}
            </div>
          </div>
        </div>

        <button
          onClick={() => { setEditTarget(null); setModalOpen(true) }}
          style={btnPrimary}
        >
          <Plus size={15} />
          Add Specialty
        </button>
      </header>

      {/* Body */}
      <main style={{ flex: 1, padding: 'var(--space-4)', maxWidth: 720, width: '100%', margin: '0 auto' }}>

        {loading && (
          <div style={{ textAlign: 'center', padding: 48, color: 'var(--color-text-tertiary)', fontSize: 14 }}>
            Loading…
          </div>
        )}

        {!loading && rows.length === 0 && (
          <div style={{ textAlign: 'center', padding: 48, color: 'var(--color-text-tertiary)', fontSize: 14 }}>
            No specialties found. Add one to get started.
          </div>
        )}

        {!loading && rows.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>

            {/* Legend row */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '28px 48px 1fr 80px 60px 80px',
              gap: 8,
              padding: '4px 12px',
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--color-text-tertiary)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}>
              <span />
              <span />
              <span>Name</span>
              <span style={{ textAlign: 'center' }}>Conditions</span>
              <span style={{ textAlign: 'center' }}>Active</span>
              <span />
            </div>

            {rows.map((specialty, idx) => {
              const isUncategorized = specialty.id === UNCATEGORIZED_ID
              const icon = ICON_MAP[specialty.icon_name] ?? faCircleQuestion

              return (
                <div
                  key={specialty.id}
                  draggable={!isUncategorized}
                  onDragStart={e => onDragStart(e, idx)}
                  onDragOver={e => onDragOver(e, idx)}
                  onDrop={onDrop}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '28px 48px 1fr 80px 60px 80px',
                    gap: 8,
                    alignItems: 'center',
                    padding: '10px 12px',
                    backgroundColor: specialty.is_active
                      ? 'var(--color-surface)'
                      : 'var(--color-bg)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 10,
                    opacity: specialty.is_active ? 1 : 0.6,
                    cursor: isUncategorized ? 'default' : 'grab',
                    userSelect: 'none',
                  }}
                >
                  {/* Drag handle */}
                  <div style={{ color: isUncategorized ? 'transparent' : 'var(--color-text-tertiary)', display: 'flex', alignItems: 'center' }}>
                    <GripVertical size={16} />
                  </div>

                  {/* Icon chip */}
                  <div style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    backgroundColor: specialty.color_hex || '#DBEAFE',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--color-accent)',
                    fontSize: 18,
                    flexShrink: 0,
                  }}>
                    <FontAwesomeIcon icon={icon} />
                  </div>

                  {/* Name */}
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      {specialty.name_en}
                      {isUncategorized && (
                        <span style={{
                          fontSize: 10,
                          fontWeight: 600,
                          padding: '2px 6px',
                          borderRadius: 4,
                          backgroundColor: 'var(--color-accent-light)',
                          color: 'var(--color-accent)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                        }}>
                          Default
                        </span>
                      )}
                      {!specialty.is_active && (
                        <span style={{
                          fontSize: 10,
                          fontWeight: 600,
                          padding: '2px 6px',
                          borderRadius: 4,
                          backgroundColor: 'var(--color-border)',
                          color: 'var(--color-text-tertiary)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                        }}>
                          Inactive
                        </span>
                      )}
                    </div>
                    {specialty.name_ar && (
                      <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', direction: 'rtl', marginTop: 1 }}>
                        {specialty.name_ar}
                      </div>
                    )}
                  </div>

                  {/* Condition count */}
                  <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--color-text-secondary)' }}>
                    {specialty.conditionCount}
                  </div>

                  {/* Active toggle */}
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    {isUncategorized ? (
                      <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>—</span>
                    ) : (
                      <button
                        onClick={() => handleToggleActive(specialty)}
                        style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', lineHeight: 0 }}
                        aria-label={specialty.is_active ? 'Deactivate' : 'Activate'}
                        title={specialty.is_active ? 'Deactivate' : 'Activate'}
                      >
                        {specialty.is_active
                          ? <ToggleRight size={24} color="var(--color-accent)" />
                          : <ToggleLeft  size={24} color="var(--color-text-tertiary)" />
                        }
                      </button>
                    )}
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                    {!isUncategorized && (
                      <>
                        <button
                          onClick={() => { setEditTarget(specialty); setModalOpen(true) }}
                          style={iconBtn}
                          aria-label="Edit"
                          title="Edit"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(specialty)}
                          style={{ ...iconBtn, color: 'var(--color-error, #dc2626)' }}
                          aria-label="Delete"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      {/* Modals */}
      <SpecialtyModal
        open={modalOpen}
        specialty={editTarget}
        onClose={() => setModalOpen(false)}
        onSaved={() => { setModalOpen(false); load() }}
        nextOrder={rows.length > 0 ? Math.max(...rows.map(r => r.sort_order ?? 0)) + 1 : 1}
      />

      <ConfirmModal
        isOpen={confirmOpen}
        title={confirmConfig.title}
        message={confirmConfig.message}
        onConfirm={() => { setConfirmOpen(false); confirmConfig.onConfirm?.() }}
        onClose={() => setConfirmOpen(false)}
      />
    </div>
  )
}

// ─── Shared micro styles ──────────────────────────────────────────────────────

const btnPrimary = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  padding: '8px 14px',
  borderRadius: 'var(--radius-sm)',
  border: 'none',
  backgroundColor: 'var(--color-accent)',
  color: '#fff',
  fontSize: 13,
  fontWeight: 600,
  fontFamily: 'var(--font-body)',
  cursor: 'pointer',
}

const btnSecondary = {
  padding: '8px 14px',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--color-border)',
  backgroundColor: 'transparent',
  color: 'var(--color-text-secondary)',
  fontSize: 13,
  fontWeight: 500,
  fontFamily: 'var(--font-body)',
  cursor: 'pointer',
}

const iconBtn = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 30,
  height: 30,
  borderRadius: 6,
  border: '1px solid var(--color-border)',
  backgroundColor: 'transparent',
  color: 'var(--color-text-secondary)',
  cursor: 'pointer',
  padding: 0,
}

const labelStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  fontSize: 13,
  fontWeight: 600,
  color: 'var(--color-text-secondary)',
  fontFamily: 'var(--font-body)',
}

const labelText = {
  fontSize: 13,
  fontWeight: 600,
  color: 'var(--color-text-secondary)',
  fontFamily: 'var(--font-body)',
}

const inputStyle = {
  padding: '8px 10px',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--color-border)',
  backgroundColor: 'var(--color-bg)',
  color: 'var(--color-text-primary)',
  fontSize: 14,
  fontFamily: 'var(--font-body)',
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
}



File: src/router.jsx
---
/**
 * src/router.jsx
 * Phase 2B — Navigation & Routing Overhaul
 *
 * Single source of truth for all app routes.
 * Import ROUTES for programmatic navigation (useNavigate, Link).
 * AppRoutes renders the <Routes> tree — drop it inside <BrowserRouter>.
 */

import { Routes, Route } from 'react-router-dom'

// ─── Public screens ───────────────────────────────────────────────────────────

import ConditionsScreen      from './pages/ConditionsScreen'
import ConditionDetailScreen from './pages/ConditionDetailScreen'
import DrugsScreen           from './pages/DrugsScreen'
import DrugDetailScreen      from './pages/DrugDetailScreen'
import FavouritesScreen      from './pages/FavouritesScreen'

// ─── Admin screens ────────────────────────────────────────────────────────────

import AuthGuard       from './components/admin/AuthGuard'
import AdminLogin      from './pages/admin/AdminLogin'
import AdminDashboard  from './pages/admin/AdminDashboard'
import DrugCMS         from './pages/admin/DrugCMS'
import AddDrugFlow     from './pages/admin/AddDrugFlow'
import DrugEditor      from './pages/admin/DrugEditor'
import ConditionsCMS   from './pages/admin/ConditionsCMS'
import ConditionEditor      from './components/admin/ConditionEditor'
import SpecialtiesManager   from './pages/admin/SpecialtiesManager'

// ─── Route path constants ─────────────────────────────────────────────────────
//
// Use these constants everywhere instead of hardcoded strings.
// Example:  navigate(ROUTES.CONDITION_DETAIL('upper-respiratory-tract-infection'))
//           navigate(ROUTES.DRUG_DETAIL('amoxicillin-500mg-capsule'))

export const ROUTES = {
  // Public
  CONDITIONS:        '/conditions',
  CONDITION_DETAIL:  (slug) => `/conditions/${slug}`,
  DRUGS:             '/drugs',
  DRUG_DETAIL:       (slug) => `/drugs/${slug}`,
  FAVOURITES:        '/favourites',

  // Admin
  ADMIN_LOGIN:          '/admin/login',
  ADMIN:                '/admin',
  ADMIN_DRUGS:          '/admin/drugs',
  ADMIN_DRUGS_NEW:      '/admin/drugs/new',
  ADMIN_DRUGS_GENERIC:  (genericId) => `/admin/drugs/generic/${genericId}`,
  ADMIN_CONDITIONS:     '/admin/conditions',
  ADMIN_CONDITIONS_NEW: '/admin/conditions/new',
  ADMIN_CONDITIONS_EDIT:(id) => `/admin/conditions/${id}`,
  ADMIN_SPECIALTIES:    '/admin/specialties',
}

// ─── AppRoutes — rendered inside <BrowserRouter> in App.jsx ──────────────────

export default function AppRoutes() {
  return (
    <Routes>

      {/* ── Public routes ────────────────────────────────────────────────── */}

      {/* Default: redirect "/" to "/conditions" */}
      <Route path="/"                    element={<ConditionsScreen />} />
      <Route path="/conditions"          element={<ConditionsScreen />} />
      <Route path="/conditions/:slug"    element={<ConditionDetailScreen />} />

      <Route path="/drugs"               element={<DrugsScreen />} />
      <Route path="/drugs/:slug"         element={<DrugDetailScreen />} />

      <Route path="/favourites"          element={<FavouritesScreen />} />

      {/* ── Admin routes ─────────────────────────────────────────────────── */}

      <Route path="/admin/login"         element={<AdminLogin />} />

      <Route path="/admin"
        element={<AuthGuard><AdminDashboard /></AuthGuard>}
      />
      <Route path="/admin/drugs"
        element={<AuthGuard><DrugCMS /></AuthGuard>}
      />
      {/* NOTE: /new must come before /generic/:genericId so React Router
          doesn't treat "new" as a genericId */}
      <Route path="/admin/drugs/new"
        element={<AuthGuard><AddDrugFlow /></AuthGuard>}
      />
      {/* Unified drug editor — generic + all formulations + brands in one place */}
      <Route path="/admin/drugs/generic/:genericId"
        element={<AuthGuard><DrugEditor /></AuthGuard>}
      />
      <Route path="/admin/conditions"
        element={<AuthGuard><ConditionsCMS /></AuthGuard>}
      />
      <Route path="/admin/conditions/new"
        element={<AuthGuard><ConditionEditor /></AuthGuard>}
      />
      <Route path="/admin/conditions/:id"
        element={<AuthGuard><ConditionEditor /></AuthGuard>}
      />
      <Route path="/admin/specialties"
        element={<AuthGuard><SpecialtiesManager /></AuthGuard>}
      />

    </Routes>
  )
}



File: src/screens/OnboardingScreen.jsx
---
/**
 * src/screens/OnboardingScreen.jsx
 * Phase 2J — Onboarding
 *
 * Shown only on first launch (localStorage key: capsula_onboarded absent).
 * 3 swipeable cards. Dot indicators. Skip top-right. Next/Get Started bottom-right.
 * Always light theme — no dark mode override.
 * On completion: sets capsula_onboarded = true, calls onDone() to unmount.
 */

import { useState, useRef } from 'react'

// ─── Slide data ───────────────────────────────────────────────────────────────

const SLIDES = [
  {
    icon: (
      <svg width="64" height="64" viewBox="0 0 24 24" fill="none"
        stroke="#1E40AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-4" />
        <path d="M9 3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2H9V3z" />
        <line x1="9" y1="12" x2="15" y2="12" />
        <line x1="9" y1="16" x2="13" y2="16" />
      </svg>
    ),
    headline: 'Drug Library',
    body: 'Egyptian market drugs with doses, brands, and clinical information.',
  },
  {
    icon: (
      <svg width="64" height="64" viewBox="0 0 24 24" fill="none"
        stroke="#1E40AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3" />
        <path d="M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4" />
        <circle cx="20" cy="10" r="2" />
      </svg>
    ),
    headline: 'Clinical Conditions',
    body: 'Prescriptions and clinical reference for GP practice.',
  },
  {
    icon: (
      <svg width="64" height="64" viewBox="0 0 24 24" fill="none"
        stroke="#1E40AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ),
    headline: 'Your Personal Reference',
    body: 'Save favourites, add notes, manage your stock.',
  },
]

// ─── OnboardingScreen ─────────────────────────────────────────────────────────

export default function OnboardingScreen({ onDone }) {
  const [current, setCurrent]   = useState(0)
  const touchStartX             = useRef(null)

  function complete() {
    localStorage.setItem('capsula_onboarded', 'true')
    onDone()
  }

  function next() {
    if (current < SLIDES.length - 1) setCurrent(c => c + 1)
    else complete()
  }

  function handleTouchStart(e) {
    touchStartX.current = e.touches[0].clientX
  }

  function handleTouchEnd(e) {
    if (touchStartX.current === null) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    if (Math.abs(dx) > 50) {
      if (dx < 0 && current < SLIDES.length - 1) setCurrent(c => c + 1)
      if (dx > 0 && current > 0)                 setCurrent(c => c - 1)
    }
    touchStartX.current = null
  }

  const slide = SLIDES[current]
  const isLast = current === SLIDES.length - 1

  return (
    /* Force light theme regardless of device setting */
    <div
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      style={{
        position:        'fixed',
        inset:           0,
        backgroundColor: '#FFFFFF',
        display:         'flex',
        flexDirection:   'column',
        fontFamily:      "'DM Sans', sans-serif",
        userSelect:      'none',
        zIndex:          9999,
      }}
    >

      {/* ── Skip button ── */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '16px 20px 0' }}>
        <button
          onClick={complete}
          style={{
            background:  'none',
            border:      'none',
            cursor:      'pointer',
            fontSize:    14,
            fontWeight:  500,
            color:       '#6B7280',
            fontFamily:  "'DM Sans', sans-serif",
            padding:     '4px 0',
          }}
        >
          Skip
        </button>
      </div>

      {/* ── Slide area ── */}
      <div style={{
        flex:           1,
        display:        'flex',
        flexDirection:  'column',
        alignItems:     'center',
        justifyContent: 'center',
        padding:        '0 40px',
        gap:            28,
        overflow:       'hidden',
      }}>
        {/* Icon circle */}
        <div style={{
          width:           120,
          height:          120,
          borderRadius:    '50%',
          backgroundColor: '#DBEAFE',
          display:         'flex',
          alignItems:      'center',
          justifyContent:  'center',
          flexShrink:      0,
        }}>
          {slide.icon}
        </div>

        {/* Text */}
        <div style={{ textAlign: 'center' }}>
          <h2 style={{
            fontSize:      26,
            fontWeight:    700,
            color:         '#111827',
            margin:        '0 0 12px',
            letterSpacing: '-0.4px',
            lineHeight:    1.2,
          }}>
            {slide.headline}
          </h2>
          <p style={{
            fontSize:   15,
            color:      '#6B7280',
            lineHeight: 1.6,
            margin:     0,
          }}>
            {slide.body}
          </p>
        </div>
      </div>

      {/* ── Dot indicators ── */}
      <div style={{
        display:        'flex',
        justifyContent: 'center',
        gap:            8,
        paddingBottom:  24,
      }}>
        {SLIDES.map((_, i) => (
          <div
            key={i}
            onClick={() => setCurrent(i)}
            style={{
              width:           i === current ? 20 : 8,
              height:          8,
              borderRadius:    4,
              backgroundColor: i === current ? '#1E40AF' : '#D1D5DB',
              transition:      'all 0.25s ease',
              cursor:          'pointer',
            }}
          />
        ))}
      </div>

      {/* ── Bottom action ── */}
      <div style={{ padding: '0 24px 40px', display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={next}
          style={{
            backgroundColor: '#1E40AF',
            color:           '#FFFFFF',
            border:          'none',
            borderRadius:    999,
            padding:         '12px 28px',
            fontSize:        15,
            fontWeight:      600,
            fontFamily:      "'DM Sans', sans-serif",
            cursor:          'pointer',
            display:         'flex',
            alignItems:      'center',
            gap:             8,
          }}
        >
          {isLast ? 'Get Started' : 'Next'}
          {!isLast && (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          )}
        </button>
      </div>

    </div>
  )
}



File: src/styles/globals.css
---
/* =============================================================================
   Capsula — src/styles/globals.css
   Phase 2A: Design system — Tailwind v4 @theme, tokens, dark mode, RTL
   ============================================================================= */

/* ─── Fonts ──────────────────────────────────────────────────────────────────── */
@import "@fontsource/dm-sans";
@import "@fontsource/dm-sans/500.css";
@import "@fontsource/dm-sans/600.css";
@import "@fontsource/dm-sans/700.css";
@import "@fontsource/dm-mono";

/* ─── Tailwind v4 ────────────────────────────────────────────────────────────── */
@import "tailwindcss";

/* ─── Tailwind v4 Theme — maps to CSS vars below ────────────────────────────── */
@theme {
  /* Brand */
  --color-primary:       #2563EB;
  --color-primary-light: #EFF4FF;
  --color-primary-hover: #1D4ED8;
  --color-primary-dark:  #1E3A8A;

  --color-accent:        #0EA5E9;
  --color-accent-light:  #BAE6FD;

  /* Surfaces — light */
  --color-bg:            #FAFAF9;
  --color-surface:       #FFFFFF;
  --color-surface-muted: #F9FAFB;
  --color-border:        #E8E6E1;
  --color-border-subtle: #F0EEE9;

  /* Semantic */
  --color-danger:        #DC2626;
  --color-danger-light:  #FEE2E2;
  --color-warning:       #D97706;
  --color-warning-light: #FEF3C7;
  --color-success:       #059669;
  --color-success-light: #D1FAE5;

  /* Text — light */
  --color-ink:           #1A1916;
  --color-ink-muted:     #6B7280;
  --color-ink-faint:     #9E9B95;

  /* Font families */
  --font-sans:  "DM Sans", sans-serif;
  --font-mono:  "DM Mono", monospace;

  /* Border radius */
  --radius-sm:   6px;
  --radius-md:   10px;
  --radius-lg:   16px;
  --radius-card: 12px;
  --radius-pill: 9999px;

  /* Shadows */
  --shadow-card:     0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04);
  --shadow-elevated: 0 4px 12px rgba(0,0,0,0.08);
  --shadow-nav:      0 -1px 0 0 #E8E6E1;
}

/* ─── CSS custom properties — light mode (root) ──────────────────────────────── */
:root {
  --color-bg:               #FAFAF9;
  --color-surface:          #FFFFFF;
  --color-surface-muted:    #F9FAFB;
  --color-border:           #E8E6E1;
  --color-border-subtle:    #F0EEE9;

  --color-text-primary:     #1A1916;
  --color-text-secondary:   #6B7280;
  --color-text-tertiary:    #9E9B95;
  --color-text-arabic:      #4A4845;

  --color-accent:           #2563EB;
  --color-accent-light:     #EFF4FF;
  --color-accent-hover:     #1D4ED8;

  --color-danger:           #DC2626;
  --color-danger-light:     #FEE2E2;
  --color-warning:          #D97706;
  --color-warning-light:    #FEF3C7;
  --color-success:          #059669;
  --color-success-light:    #D1FAE5;

  --color-instock:          #16A34A;
  --color-instock-bg:       #F0FDF4;
  --color-outstock:         #D1D5DB;
  --color-outstock-bg:      #F9FAFB;

  --font-display:           "DM Sans", sans-serif;
  --font-body:              "DM Sans", sans-serif;
  --font-arabic:            "Noto Sans Arabic", sans-serif;
  --font-mono:              "DM Mono", monospace;

  --radius-sm:              6px;
  --radius-md:              10px;
  --radius-lg:              16px;
  --radius-full:            9999px;

  --shadow-card:            0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04);
  --shadow-elevated:        0 4px 12px rgba(0,0,0,0.08);

  --space-1: 4px;  --space-2: 8px;   --space-3: 12px;
  --space-4: 16px; --space-5: 20px;  --space-6: 24px;
  --space-8: 32px; --space-10: 40px; --space-12: 48px;
}

/* ─── Dark mode overrides — activated by .dark on <html> ────────────────────── */
.dark {
  --color-bg:               #111827;
  --color-surface:          #1F2937;
  --color-surface-muted:    #111827;
  --color-border:           #374151;
  --color-border-subtle:    #1F2937;

  --color-text-primary:     #F9FAFB;
  --color-text-secondary:   #9CA3AF;
  --color-text-tertiary:    #6B7280;
  --color-text-arabic:      #D1D5DB;

  --color-accent:           #3B82F6;
  --color-accent-light:     #1E3A5F;
  --color-accent-hover:     #60A5FA;

  --color-danger:           #F87171;
  --color-danger-light:     #450A0A;
  --color-warning:          #FCD34D;
  --color-warning-light:    #451A03;
  --color-success:          #34D399;
  --color-success-light:    #064E3B;

  --color-instock:          #34D399;
  --color-instock-bg:       #064E3B;
  --color-outstock:         #4B5563;
  --color-outstock-bg:      #1F2937;

  --shadow-card:            0 1px 3px rgba(0,0,0,0.3), 0 1px 2px rgba(0,0,0,0.2);
  --shadow-elevated:        0 4px 12px rgba(0,0,0,0.4);
}

/* ─── Base styles ────────────────────────────────────────────────────────────── */
*, *::before, *::after {
  box-sizing: border-box;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

html {
  font-family: var(--font-body);
  background-color: var(--color-bg);
  color: var(--color-text-primary);
  transition: background-color 0.15s ease, color 0.15s ease;
}

body {
  margin: 0;
  min-height: 100dvh;
  background-color: var(--color-bg);
  overscroll-behavior-y: none;
}

/* ─── RTL / Arabic support ───────────────────────────────────────────────────── */
.rtl {
  direction: rtl;
  font-family: var(--font-arabic);
}

.prose-ar {
  direction: rtl;
  font-family: var(--font-arabic);
  line-height: 1.8;
  color: var(--color-text-arabic);
}

/* ─── Shimmer animation (used in skeleton loaders) ───────────────────────────── */
@keyframes shimmer {
  0%   { opacity: 1; }
  50%  { opacity: 0.4; }
  100% { opacity: 1; }
}

.shimmer {
  animation: shimmer 1.4s ease-in-out infinite;
  background-color: var(--color-border);
  border-radius: var(--radius-sm);
}

/* ─── Safe area padding utility (PWA bottom nav) ─────────────────────────────── */
.pb-safe {
  padding-bottom: env(safe-area-inset-bottom);
}

/* ─── Phase 3A: Modal & Toast animations ─────────────────────────────────────── */
@keyframes toast-in {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}



File: src/utils/cache.js
---
/**
 * cache.js — localStorage cache with timestamp invalidation + 7-day TTL
 *
 * Two slices: 'drugs' and 'conditions'
 * Each slice: { data: [], fetchedAt: ISO string, version: string }
 *
 * Invalidation logic (called from useDrugs / useConditions):
 *   1. Fetch app_metadata timestamp from Supabase (one lightweight request)
 *   2. If timestamp differs from cached version → re-fetch
 *   3. If timestamp matches BUT fetchedAt is older than 7 days → re-fetch
 *   4. If both match and within TTL → use cached data, no network request
 */

import { CACHE_KEYS, CACHE_TTL_MS } from '../constants/cache'

// ─── Internal helpers ─────────────────────────────────────────────────────────

function readAll() {
  try {
    const drugs      = localStorage.getItem(CACHE_KEYS.DRUGS)
    const conditions = localStorage.getItem(CACHE_KEYS.CONDITIONS)
    return {
      drugs:      drugs      ? JSON.parse(drugs)      : null,
      conditions: conditions ? JSON.parse(conditions) : null,
    }
  } catch {
    return { drugs: null, conditions: null }
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Write a cache slice.
 * @param {'drugs'|'conditions'} key
 * @param {Array}  data        — the full fetched dataset
 * @param {string} version     — ISO timestamp from app_metadata
 */
export function writeCache(key, data, version) {
  try {
    const cacheKey = key === 'drugs' ? CACHE_KEYS.DRUGS : CACHE_KEYS.CONDITIONS
    localStorage.setItem(cacheKey, JSON.stringify({
      data,
      version,
      fetchedAt: new Date().toISOString(),
    }))
  } catch {
    // localStorage full or unavailable — fail silently
  }
}

/**
 * Read the cached data array for a given slice, or null.
 * @param {'drugs'|'conditions'} key
 */
export function getCacheData(key) {
  try {
    const cacheKey = key === 'drugs' ? CACHE_KEYS.DRUGS : CACHE_KEYS.CONDITIONS
    const raw = localStorage.getItem(cacheKey)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed?.data ?? null
  } catch {
    return null
  }
}

/**
 * Return the cached version string (app_metadata timestamp) for a slice, or null.
 * @param {'drugs'|'conditions'} key
 */
export function getCacheTimestamp(key) {
  try {
    const cacheKey = key === 'drugs' ? CACHE_KEYS.DRUGS : CACHE_KEYS.CONDITIONS
    const raw = localStorage.getItem(cacheKey)
    if (!raw) return null
    return JSON.parse(raw)?.version ?? null
  } catch {
    return null
  }
}

/**
 * Returns true if the cache slice is older than CACHE_TTL_MS (7 days),
 * regardless of version. Forces a re-fetch even if version matches.
 * @param {'drugs'|'conditions'} key
 */
export function isCacheExpired(key) {
  try {
    const cacheKey = key === 'drugs' ? CACHE_KEYS.DRUGS : CACHE_KEYS.CONDITIONS
    const raw = localStorage.getItem(cacheKey)
    if (!raw) return true
    const { fetchedAt } = JSON.parse(raw)
    if (!fetchedAt) return true
    return (Date.now() - new Date(fetchedAt).getTime()) > CACHE_TTL_MS
  } catch {
    return true
  }
}

/**
 * Clear one or both cache slices.
 * @param {'drugs'|'conditions'|'all'} key
 */
export function clearCache(key = 'all') {
  try {
    if (key === 'all' || key === 'drugs')      localStorage.removeItem(CACHE_KEYS.DRUGS)
    if (key === 'all' || key === 'conditions') localStorage.removeItem(CACHE_KEYS.CONDITIONS)
  } catch {
    // fail silently
  }
}



File: src/utils/searchUtils.js
---
/**
 * src/utils/searchUtils.js
 * Phase 2I — adds drug fuzzy search on top of existing condition search.
 *
 * Drug search keys (masterplan spec):
 *   genericName       weight 0.5
 *   category          weight 0.2
 *   concentration+form weight 0.2  (via virtual field — search brands array too)
 *   brands[].name     weight 0.1
 */

import Fuse from 'fuse.js'

// ─── Conditions fuzzy search (unchanged from 2C) ──────────────────────────────

const CONDITION_FUSE_OPTIONS = {
  keys: [
    { name: 'name',          weight: 0.6 },
    { name: 'specialtyName', weight: 0.25 },
    { name: 'card_tagline',  weight: 0.15 },
  ],
  threshold:          0.35,
  minMatchCharLength: 2,
  includeScore:       true,
  ignoreLocation:     true,
}

export function buildConditionIndex(conditions) {
  return new Fuse(conditions, CONDITION_FUSE_OPTIONS)
}

export function fuzzySearchConditions(fuseIndex, query) {
  if (!query || query.trim().length < 2) return null
  const results = fuseIndex.search(query.trim())
  return results.map(r => r.item)
}

export function getAutocompleteSuggestions(fuseIndex, query, limit = 5) {
  if (!query || query.trim().length < 2) return []
  const results = fuseIndex.search(query.trim(), { limit })
  return results.map(r => ({
    id:   r.item.id,
    name: r.item.name,
    slug: r.item.slug,
  }))
}

// ─── Drugs fuzzy search (new in 2I) ──────────────────────────────────────────

const DRUG_FUSE_OPTIONS = {
  keys: [
    { name: 'genericName',    weight: 0.5  },
    { name: 'category',       weight: 0.2  },
    { name: 'concentration',  weight: 0.1  },
    { name: 'form',           weight: 0.1  },
    { name: 'brands.name',    weight: 0.1  },
  ],
  threshold:          0.35,
  minMatchCharLength: 2,
  includeScore:       true,
  ignoreLocation:     true,
}

/**
 * Build a Fuse index for a drugs array.
 * @param {object[]} drugs — flat drug objects from DrugContext
 * @returns {Fuse}
 */
export function buildDrugIndex(drugs) {
  return new Fuse(drugs, DRUG_FUSE_OPTIONS)
}

/**
 * Run fuzzy drug search. Returns null when query is too short (= show all).
 * @param {Fuse}   fuseIndex
 * @param {string} query
 * @returns {object[]|null}
 */
export function fuzzySearchDrugs(fuseIndex, query) {
  if (!query || query.trim().length < 2) return null
  const results = fuseIndex.search(query.trim())
  return results.map(r => r.item)
}

/**
 * Top-N autocomplete suggestions for drugs.
 * @param {Fuse}   fuseIndex
 * @param {string} query
 * @param {number} limit
 * @returns {{ id, name, slug }[]}
 */
export function getDrugAutocompleteSuggestions(fuseIndex, query, limit = 5) {
  if (!query || query.trim().length < 2) return []
  const results = fuseIndex.search(query.trim(), { limit })
  return results.map(r => ({
    id:   r.item.id,
    name: r.item.genericName,
    slug: r.item.slug,
  }))
}



File: src/utils/sharing.js
---
/**
 * src/utils/sharing.js
 * Phase 2J — Sharing
 *
 * shareConditionPrescription(condition, prescription, cardRef)
 *
 *   1. Captures the off-screen <ShareCard> via html2canvas → PNG blob
 *   2. Tries navigator.share (Web Share API) for native share sheet (WhatsApp, Telegram …)
 *   3. Falls back to direct download if Web Share API is unavailable or unsupported
 *
 * Requires: html2canvas  (npm install html2canvas)
 *
 * Usage in ConditionDetailScreen:
 *   import { shareConditionPrescription } from '../utils/sharing'
 *   import ShareCard from '../components/ui/ShareCard'
 *
 *   const shareCardRef = useRef(null)
 *   ...
 *   <ShareCard ref={shareCardRef} condition={condition} prescription={activePrescription} />
 *   ...
 *   <button onClick={() => shareConditionPrescription(condition, activePrescription, shareCardRef)}>Share</button>
 */

/**
 * Captures a React ref as a PNG and shares or downloads it.
 *
 * @param {object} condition     - { name } — used for the filename
 * @param {object} prescription  - { label } — used for the filename
 * @param {React.RefObject} cardRef - ref pointing to the rendered <ShareCard> DOM node
 */
export async function shareConditionPrescription(condition, prescription, cardRef) {
  if (!cardRef?.current) {
    console.warn('[sharing] cardRef is null — ShareCard not mounted')
    return
  }

  // Dynamically import html2canvas so it is only loaded when sharing is triggered
  let html2canvas
  try {
    html2canvas = (await import('html2canvas')).default
  } catch (err) {
    console.error('[sharing] html2canvas not installed. Run: npm install html2canvas', err)
    alert('Sharing is unavailable. Please try again later.')
    return
  }

  let blob
  try {
    const canvas = await html2canvas(cardRef.current, {
      scale:              2,          // 2× for retina sharpness
      useCORS:            true,       // needed if card loads remote images
      backgroundColor:    '#FFFFFF',  // force white — card is always light
      logging:            false,
    })
    blob = await new Promise(resolve =>
      canvas.toBlob(resolve, 'image/png')
    )
  } catch (err) {
    console.error('[sharing] html2canvas capture failed', err)
    alert('Could not generate the share image. Please try again.')
    return
  }

  if (!blob) {
    console.error('[sharing] toBlob returned null')
    return
  }

  const conditionName   = condition?.name    ?? 'condition'
  const prescriptionLabel = prescription?.label ?? 'prescription'
  const filename = `capsula-${slugify(conditionName)}-${slugify(prescriptionLabel)}.png`

  // ── Try Web Share API ──────────────────────────────────────────────────────
  const canShare = typeof navigator.share === 'function'
  const file     = new File([blob], filename, { type: 'image/png' })

  if (canShare && navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title: `${conditionName} — Capsula`,
        text:  'Prescription from Capsula — Clinical reference only. Verify before prescribing.',
      })
      return
    } catch (err) {
      // User cancelled or share failed — fall through to download
      if (err.name === 'AbortError') return   // user cancelled — don't download
      console.warn('[sharing] navigator.share failed, falling back to download', err)
    }
  }

  // ── Fallback: direct download ─────────────────────────────────────────────
  const url = URL.createObjectURL(blob)
  const a   = document.createElement('a')
  a.href     = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function slugify(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}



File: src/utils/stockStorage.js
---
const STORAGE_KEY = 'capsula_stock_v1'

export function loadStockMap() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function saveStockMap(map) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
  } catch {
    // localStorage unavailable — fail silently
  }
}

export function clearStockMap() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // fail silently
  }
}


File: supabase/migration/001_generics_rebuild.sql
---
-- =============================================================================
-- CAPSULA — Phase 1A: Generics Table Schema Migration
-- File: supabase/migrations/001_generics_rebuild.sql
--
-- Adds all new columns to the generics table.
-- Renames uses → uses_legacy, warnings → warnings_legacy.
-- Adds is_published, updated_at, and all clinical enrichment columns.
-- Safe to run once. All ADDs use IF NOT EXISTS guards.
-- =============================================================================

BEGIN;

-- ─── Rename legacy columns ────────────────────────────────────────────────────
-- Keep old data intact for reference during data migration (Phase 1F.4)

ALTER TABLE generics
  RENAME COLUMN uses TO uses_legacy;

ALTER TABLE generics
  RENAME COLUMN warnings TO warnings_legacy;

-- ─── Add new columns ──────────────────────────────────────────────────────────

-- Card display
ALTER TABLE generics
  ADD COLUMN IF NOT EXISTS card_tagline TEXT;

-- Clinical detail
ALTER TABLE generics
  ADD COLUMN IF NOT EXISTS mechanism_of_action TEXT;

-- Structured uses (replaces uses_legacy)
ALTER TABLE generics
  ADD COLUMN IF NOT EXISTS uses_structured JSONB;
-- Shape: [{ use_name: string, context: string }]

-- Side effects
ALTER TABLE generics
  ADD COLUMN IF NOT EXISTS side_effects_common TEXT[] DEFAULT '{}';

ALTER TABLE generics
  ADD COLUMN IF NOT EXISTS side_effects_serious TEXT[] DEFAULT '{}';

-- Pregnancy / safety
ALTER TABLE generics
  ADD COLUMN IF NOT EXISTS pregnancy_category TEXT;
-- Allowed: A, B, C, D, X, N

ALTER TABLE generics
  ADD COLUMN IF NOT EXISTS breastfeeding_safety TEXT;
-- Allowed: safe, caution, unsafe, unknown

ALTER TABLE generics
  ADD COLUMN IF NOT EXISTS crosses_placenta TEXT;
-- Allowed: yes, no, unknown

ALTER TABLE generics
  ADD COLUMN IF NOT EXISTS crosses_bbb TEXT;
-- Allowed: yes, no, unknown (BBB = blood-brain barrier)

-- Contraindications & interactions
ALTER TABLE generics
  ADD COLUMN IF NOT EXISTS contraindications TEXT[] DEFAULT '{}';

ALTER TABLE generics
  ADD COLUMN IF NOT EXISTS drug_interactions JSONB;
-- Shape: [{ drug_name: string, risk: string, severity: 'major'|'moderate'|'minor' }]

-- Dose adjustments
ALTER TABLE generics
  ADD COLUMN IF NOT EXISTS dose_adjustments JSONB;
-- Shape: [{ condition: 'renal'|'hepatic'|'elderly'|'pediatric', adjustment: string }]

-- Pharmacokinetics
ALTER TABLE generics
  ADD COLUMN IF NOT EXISTS pharmacokinetics JSONB;
-- Shape: { onset, peak, duration, half_life, bioavailability } — all strings

-- Textbook reference doses (shown collapsed in Drug Detail screen)
ALTER TABLE generics
  ADD COLUMN IF NOT EXISTS textbook_doses JSONB;
-- Same dose-row structure as formulations.doses_structured

ALTER TABLE generics
  ADD COLUMN IF NOT EXISTS textbook_dose_notes TEXT;

-- Publish control
ALTER TABLE generics
  ADD COLUMN IF NOT EXISTS is_published BOOLEAN NOT NULL DEFAULT true;

-- updated_at (trigger already exists from Phase 0 — trg_generics_updated_at)
-- Column was already present. No action needed.

-- ─── CHECK constraints ────────────────────────────────────────────────────────

ALTER TABLE generics DROP CONSTRAINT IF EXISTS generics_pregnancy_category_check;
ALTER TABLE generics
  ADD CONSTRAINT generics_pregnancy_category_check
  CHECK (pregnancy_category IS NULL OR pregnancy_category IN ('A','B','C','D','X','N'));

ALTER TABLE generics DROP CONSTRAINT IF EXISTS generics_breastfeeding_safety_check;
ALTER TABLE generics
  ADD CONSTRAINT generics_breastfeeding_safety_check
  CHECK (breastfeeding_safety IS NULL OR breastfeeding_safety IN ('safe','caution','unsafe','unknown'));

ALTER TABLE generics DROP CONSTRAINT IF EXISTS generics_crosses_placenta_check;
ALTER TABLE generics
  ADD CONSTRAINT generics_crosses_placenta_check
  CHECK (crosses_placenta IS NULL OR crosses_placenta IN ('yes','no','unknown'));

ALTER TABLE generics DROP CONSTRAINT IF EXISTS generics_crosses_bbb_check;
ALTER TABLE generics
  ADD CONSTRAINT generics_crosses_bbb_check
  CHECK (crosses_bbb IS NULL OR crosses_bbb IN ('yes','no','unknown'));

-- ─── Index: is_published (app queries filter by this) ─────────────────────────

CREATE INDEX IF NOT EXISTS idx_generics_is_published
  ON generics (is_published);

-- ─── VERIFY ───────────────────────────────────────────────────────────────────

SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name   = 'generics'
ORDER BY ordinal_position;

COMMIT;



File: supabase/migration/002_formulations_doses_rebuild.sql
---
-- =============================================================================
-- CAPSULA — Phase 1B: Formulations & Doses Schema Migration
-- File: supabase/migrations/002_formulations_doses_rebuild.sql
--
-- Adds to formulations:
--   doses_structured      JSONB   — structured dose rows (replaces old doses blob)
--   default_dose_override TEXT    — free-text note shown above dose table
--   is_published          BOOLEAN — hide from app without deleting
--   updated_at            TIMESTAMPTZ — auto-updated via trigger
--   slug                  TEXT    — URL-safe identifier for /drugs/:slug route
--
-- Adds to generics (dose fields needed by 1B, missed in 1A):
--   textbook_doses and textbook_dose_notes already added in 1A — no action.
--
-- Wires updated_at trigger on formulations.
-- =============================================================================

BEGIN;

-- ─── formulations: new columns ────────────────────────────────────────────────

-- Slug for /drugs/:slug route (format: generic-slug-concentration-form)
ALTER TABLE formulations
  ADD COLUMN IF NOT EXISTS slug TEXT;

-- Structured dose rows — replaces the old doses JSONB blob on formulations
-- Shape: [{ who: string, instruction: string, max_dose: string|null, route: string|null }]
-- who values: 'adult' | 'child' | 'child_6_12' | 'child_under_6' | 'elderly' | 'neonate'
ALTER TABLE formulations
  ADD COLUMN IF NOT EXISTS doses_structured JSONB;

-- Optional free-text note displayed above the dose table in the app
ALTER TABLE formulations
  ADD COLUMN IF NOT EXISTS default_dose_override TEXT;

-- Publish control — unpublishing hides formulation AND all its brands from app
ALTER TABLE formulations
  ADD COLUMN IF NOT EXISTS is_published BOOLEAN NOT NULL DEFAULT true;

-- updated_at — will be managed by trigger below
ALTER TABLE formulations
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- ─── formulations: slug unique constraint ─────────────────────────────────────

-- Populate slugs from existing data before adding constraint
-- Format: <generic_slug>-<concentration_slugified>-<form_slugified>
UPDATE formulations f
SET slug = (
  SELECT
    g.slug
    || '-' || lower(regexp_replace(f.concentration, '[^a-zA-Z0-9]+', '-', 'g'))
    || '-' || lower(regexp_replace(f.form, '[^a-zA-Z0-9]+', '-', 'g'))
  FROM generics g
  WHERE g.id = f.generic_id
)
WHERE f.slug IS NULL;

-- Make slug unique and not null now that it's populated
ALTER TABLE formulations
  ALTER COLUMN slug SET NOT NULL;

ALTER TABLE formulations
  DROP CONSTRAINT IF EXISTS formulations_slug_key;

ALTER TABLE formulations
  ADD CONSTRAINT formulations_slug_key UNIQUE (slug);

-- ─── Index: is_published ──────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_formulations_is_published
  ON formulations (is_published);

-- ─── Index: slug ──────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_formulations_slug
  ON formulations (slug);

-- ─── Trigger: auto-update updated_at on formulations ─────────────────────────
-- The trigger function update_updated_at() already exists from Phase 0.
-- The trigger trg_formulations_updated_at already exists from Phase 0.
-- No action needed.

-- ─── prescription_items: new columns (per masterplan §1D) ────────────────────
-- Added here because they extend the prescription flow tied to formulation doses.

ALTER TABLE prescription_items
  ADD COLUMN IF NOT EXISTS dose_override TEXT;
-- Overrides formulation's doses_structured for this specific prescription context.
-- If null, app uses the parent formulation's doses_structured.

ALTER TABLE prescription_items
  ADD COLUMN IF NOT EXISTS drug_note TEXT;
-- Admin note shown under this drug in the prescription card.
-- E.g. 'Only if cramping present'. English or Arabic.

ALTER TABLE prescription_items
  ADD COLUMN IF NOT EXISTS drug_note_ar TEXT;
-- Arabic version of drug_note. Shown below English note if both present.

ALTER TABLE prescription_items
  ADD COLUMN IF NOT EXISTS show_generic_link BOOLEAN NOT NULL DEFAULT true;
-- If true, drug name is tappable and links to Drug Detail screen.

-- ─── VERIFY ───────────────────────────────────────────────────────────────────

SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('formulations', 'prescription_items')
ORDER BY table_name, ordinal_position;

COMMIT;



File: supabase/seed.js
---
#!/usr/bin/env node
/**
 * Capsula — Phase 1.2 Seed Script
 * Seeds 138 drugs from drugs.json into Supabase:
 *   generics → formulations → brands
 * Then stamps app_metadata.drugs_updated_at.
 *
 * Usage:
 *   node supabase/seed.js
 *
 * Requires: @supabase/supabase-js, dotenv
 *   npm install @supabase/supabase-js dotenv
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { config } from 'dotenv';

// ─── Bootstrap ───────────────────────────────────────────────────────────────

config(); // load .env

const SUPABASE_URL     = process.env.VITE_SUPABASE_URL;
const SERVICE_KEY      = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌  Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

const __dirname = dirname(fileURLToPath(import.meta.url));
const drugsRaw  = JSON.parse(readFileSync(join(__dirname, '../src/data/drugs.json'), 'utf8'));
const drugs     = drugsRaw.drugs;

console.log(`\n🌱  Capsula seed — ${drugs.length} drugs to process\n`);

// ─── Mapping tables ──────────────────────────────────────────────────────────

const CATEGORY_MAP = {
  'antibiotic':            'antibiotic',
  'antifungal':            'antifungal',
  'antiviral':             'antiviral',
  'analgesic-nsaid':       'analgesic-nsaid',
  'antipyretic':           'analgesic-nsaid',
  'cardiovascular':        'cardiovascular',
  'antihypertensive':      'cardiovascular',
  'respiratory':           'respiratory',
  'antihistamine':         'respiratory',
  'gastrointestinal':      'gastrointestinal',
  'proton-pump-inhibitor': 'gastrointestinal',
  'antispasmodic':         'gastrointestinal',
  'antidiabetic':          'endocrine-metabolic',
  'steroid':               'endocrine-metabolic',
  'ophthalmic-otic':       'ophthalmic-otic',
  'topical':               'dermatological',
  'gynecological':         'obstetric-gynecological',
  'antiparasitic':         'antiparasitic',
  'vitamins-minerals':     'vitamins-minerals',
  'emergency':             'other',
};

/** Normalise free-text route → DRUG_ROUTES values */
function mapRoute(route) {
  if (!route) return 'oral';
  const l = route.toLowerCase();
  if (l === 'oral')                                            return 'oral';
  if (l.includes('inhal') || l.includes('nebul'))             return 'inhaled';
  if (l === 'rectal')                                          return 'rectal';
  if (l.includes('ophthalm') || l.includes('otic'))           return 'ocular';
  if (l === 'vaginal' || l === 'vaginal (topical)')            return 'other';
  if (l.includes('topical') || l.includes('oral gel') ||
      l.includes('oral) / oral'))                              return 'topical';
  if (l.startsWith('sc'))                                      return 'im';  // SubCut → IM bucket
  if (l.includes('iv') && l.includes('im'))                   return 'iv';
  if (l.startsWith('iv'))                                      return 'iv';
  if (l.startsWith('im'))                                      return 'im';
  return 'other';
}

/** Build a stable slug from genericName */
function toSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Extract concentration string from genericName.
 * e.g. "Amoxicillin 500mg" → "500mg"
 *      "Amoxicillin 500mg + Clavulanic acid 125mg" → "500mg/125mg"
 *      "Paracetamol" → ""
 */
function extractConcentration(name) {
  // Match numbers (with optional commas e.g. 1,200,000) + unit
  const matches = name.match(/[\d,]+(?:\.\d+)?(?:\s*(?:mg|g|mcg|iu|iu\/ml|mg\/ml|ml|%|unit))/gi);
  if (!matches) return '';
  // Normalise: remove spaces between number and unit, strip commas from display
  return matches.map(m => m.replace(/\s+/, '').replace(/,/g, '')).join('/');
}

// ─── Build generics map (deduplicate by genericName base) ────────────────────
// Each drug in drugs.json is already one generic+concentration pair.
// We treat each unique genericName as its own generic row since concentrations
// are part of the name (e.g. "Amoxicillin 500mg" vs "Amoxicillin 875mg+125mg").

function buildGenericRows(drugs) {
  const seen  = new Map(); // slug → generic row
  const order = [];        // preserve insertion order

  for (const d of drugs) {
    const slug = toSlug(d.genericName);
    if (!seen.has(slug)) {
      seen.set(slug, {
        slug,
        name_en:  d.genericName,
        name_ar:  d.arabicName,
        category: CATEGORY_MAP[d.category] || 'other',
        class:    d.class || null,
        uses:     d.uses    || [],
        warnings: d.warnings || [],
        doses: d.dose ? buildTextbookDoses(d.dose) : [],
      });
      order.push(slug);
    }
  }

  return order.map(s => seen.get(s));
}

/**
 * Build generics.doses (textbook reference):
 * [{ group: "Adult", instruction: "..." }, { group: "Child", instruction: "..." }]
 */
function buildTextbookDoses(dose) {
  const rows = [];
  if (dose.adult) {
    let instruction = dose.adult;
    if (dose.duration) instruction += ` — ${dose.duration}`;
    if (dose.notes)    instruction += `. ${dose.notes}`;
    rows.push({ group: 'Adult', instruction });
  }
  if (dose.pediatric && dose.pediatric !== 'See formulation') {
    rows.push({ group: 'Child', instruction: dose.pediatric });
  }
  return rows;
}

/**
 * Build formulations.doses (practical, patient-oriented):
 * One entry per adult dose line — stripped of notes which live on generic.
 */
function buildPracticalDoses(dose, form) {
  const rows = [];
  if (dose.adult) {
    rows.push({ group: 'Adult', instruction: dose.adult });
  }
  if (dose.pediatric && dose.pediatric !== 'See formulation') {
    rows.push({ group: 'Child', instruction: dose.pediatric });
  }
  return rows;
}

// ─── Seed functions ──────────────────────────────────────────────────────────

async function clearExisting() {
  console.log('🗑   Clearing existing seed data …');
  // Delete in reverse FK order
  await supabase.from('brands').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('formulations').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('generics').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log('   ✓ Cleared\n');
}

async function insertGenerics(genericRows) {
  console.log(`📦  Inserting ${genericRows.length} generics …`);
  const { data, error } = await supabase
    .from('generics')
    .insert(genericRows)
    .select('id, slug');

  if (error) {
    console.error('❌  generics insert failed:', error.message);
    throw error;
  }

  // Build slug → id map
  const slugToId = {};
  for (const row of data) slugToId[row.slug] = row.id;
  console.log(`   ✓ ${data.length} generics inserted\n`);
  return slugToId;
}

async function insertFormulationsAndBrands(drugs, slugToId) {
  let formulationCount = 0;
  let brandCount       = 0;

  console.log('💊  Inserting formulations + brands …');

  for (const d of drugs) {
    const genericId = slugToId[toSlug(d.genericName)];
    if (!genericId) {
      console.warn(`   ⚠  No generic id for "${d.genericName}" — skipping`);
      continue;
    }

    const route        = mapRoute(d.dose?.route);
    const concentration = extractConcentration(d.genericName);
    const forms        = d.forms?.length ? d.forms : ['tablet'];

    for (const form of forms) {
      // Insert one formulation per form
      const formulationRow = {
        generic_id:    genericId,
        concentration: concentration || 'standard',
        form,
        route,
        doses: buildPracticalDoses(d.dose || {}, form),
      };

      const { data: fData, error: fErr } = await supabase
        .from('formulations')
        .insert(formulationRow)
        .select('id')
        .single();

      if (fErr) {
        console.error(`   ❌  formulation insert failed for "${d.genericName}" [${form}]:`, fErr.message);
        continue;
      }

      formulationCount++;
      const formulationId = fData.id;

      // Insert brands for this formulation
      const brandNames = d.brandNames || [];
      if (brandNames.length === 0) continue;

      const brandRows = brandNames.map(name => ({
        formulation_id: formulationId,
        name,
        name_ar:       null,          // drugs.json has no Arabic brand names
        manufacturer:  null,
        in_stock:      d.inStock ?? true,
        is_available:  true,
      }));

      const { data: bData, error: bErr } = await supabase
        .from('brands')
        .insert(brandRows)
        .select('id');

      if (bErr) {
        console.error(`   ❌  brands insert failed for "${d.genericName}":`, bErr.message);
        continue;
      }

      brandCount += bData.length;
    }
  }

  console.log(`   ✓ ${formulationCount} formulations inserted`);
  console.log(`   ✓ ${brandCount} brands inserted\n`);
  return { formulationCount, brandCount };
}

async function stampMetadata() {
  console.log('🕐  Stamping app_metadata.drugs_updated_at …');
  const { error } = await supabase
    .from('app_metadata')
    .update({ drugs_updated_at: new Date().toISOString() })
    .eq('id', 1);

  if (error) {
    console.error('   ❌  app_metadata update failed:', error.message);
    throw error;
  }
  console.log('   ✓ Stamped\n');
}

async function verifyCounts() {
  console.log('🔍  Verifying counts …');
  const [g, f, b] = await Promise.all([
    supabase.from('generics').select('*', { count: 'exact', head: true }),
    supabase.from('formulations').select('*', { count: 'exact', head: true }),
    supabase.from('brands').select('*', { count: 'exact', head: true }),
  ]);
  console.log(`   generics:     ${g.count}`);
  console.log(`   formulations: ${f.count}`);
  console.log(`   brands:       ${b.count}`);
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  try {
    await clearExisting();

    const genericRows = buildGenericRows(drugs);
    const slugToId    = await insertGenerics(genericRows);

    await insertFormulationsAndBrands(drugs, slugToId);
    await stampMetadata();
    await verifyCounts();

    console.log('\n✅  Seed complete!\n');
  } catch (err) {
    console.error('\n❌  Seed failed:', err.message || err);
    process.exit(1);
  }
}

main();



File: vite.config.js
---
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/capsula/',
})
