/**
 * src/pages/DrugDetailScreen.jsx
 *
 * 2026-07-25 (drug_library_ui_ux, plan §7 Phase 0, decisions 4.1, 4.2):
 * Rebuilt root — <Layout> dropped entirely (same as ConditionDetailScreen.jsx),
 * measured-height/overflow-hidden pattern adopted, DrugHeader + DrugDetailSheet
 * mounted directly, BottomNav self-rendered at the end of the page.
 *
 * 2026-07-25 (drug_library_ui_ux, plan §7 Phase 1 step 1.1, decision 4.5):
 * GenericOverviewSection.jsx mounted first per the locked §11.3 order. The 4
 * old grouped sections (ClinicalOverview, DosingSection, SafetySection,
 * PrescribingSection) stay mounted, unchanged behaviorally, and will render
 * side-by-side with the new ones until each is individually replaced.
 *
 * 2026-07-25 (drug_library_ui_ux, plan §7 Phase 1 step 1.2, decision 4.10):
 * UsesSection.jsx mounted here, second in the section order per the locked
 * §11.3 order (Generic Overview → Uses → ...). Receives `colors`/`isDark`
 * — same category-color token already resolved below for DrugHeader — so
 * its tinted box matches the drug's category. ClinicalOverview stays
 * mounted (now renders nothing; see its own file header) until
 * STEPS_DRUG_DETAIL.md 1.10 retires it alongside the other old grouped
 * sections.
 *
 * 2026-07-25 (drug_library_ui_ux, plan §7 Phase 1 step 1.3, decisions 4.6,
 * 4.11): DoseSection.jsx mounted third per the locked §11.3 order
 * (Generic Overview → Uses → Dose → ...). DosingSection.jsx — whose only
 * remaining content (Doses + Dose Adjustments) has now fully moved into
 * DoseSection.jsx / DoseAdjustmentsBottomSheet.jsx — stays mounted (now
 * renders nothing; see its own file header), same treatment ClinicalOverview
 * got in step 1.2, until STEPS_DRUG_DETAIL.md 1.10's final retirement pass.
 *
 * Route: /drugs/:slug
 */

import { useEffect, useRef, useState }   from 'react'
import { useParams, useNavigate }        from 'react-router-dom'
import DrugHeader                        from '../components/drugs/DrugHeader'
import DrugDetailSheet                   from '../components/drugs/DrugDetailSheet'
import BottomNav                         from '../components/BottomNav'
import GenericOverviewSection            from '../components/drugs/sections/GenericOverviewSection'
import UsesSection                       from '../components/drugs/sections/UsesSection'
import DoseSection                       from '../components/drugs/sections/DoseSection'
import ClinicalOverview                  from '../components/drugs/sections/ClinicalOverview'
import DosingSection                     from '../components/drugs/sections/DosingSection'
import SafetySection                     from '../components/drugs/sections/SafetySection'
import SideEffectsSection                from '../components/drugs/sections/SideEffectsSection'
import PregnancySection                  from '../components/drugs/sections/PregnancySection'
import PrescribingSection                from '../components/drugs/sections/PrescribingSection'
import { useDrugContext }                from '../context/DrugContext'
import { useFavouritesContext }          from '../context/FavouritesContext'
import { useCategories }                 from '../hooks/useCategories'
import { useIsDark }                     from '../utils/specialtyIcon'
import { resolveToken, FALLBACK_TOKEN }  from '../utils/specialtyTokens'
import { logUsageEvent }                 from '../analytics/usageEvents'
import { ROUTES }                        from '../router'

export default function DrugDetailScreen() {
  const { slug }   = useParams()
  const navigate   = useNavigate()

  const { drugs, loading }          = useDrugContext()
  const { isDrugFavourited, toggleDrug } = useFavouritesContext()

  // Match by formulation slug first, fall back to id
  const drug = drugs.find(d => d.slug === slug || d.id === slug)

  // Siblings for BrandsList (ADR-034): every other item sharing this drug's
  // generic, across every form — not just this exact strength/form. The
  // current item is excluded since it's already shown above in the header.
  const siblings = drug
    ? drugs.filter(d => d.genericId === drug.genericId && d.id !== drug.id)
    : []

  function handleSiblingTap(item) {
    navigate(ROUTES.DRUG_DETAIL(item.slug || item.id))
  }

  // Phase 3J — log drug view for analytics once drug is resolved
  // FIX: flat drug object uses `genericName`, not `name_en` or `name`
  useEffect(() => {
    if (drug) {
      logUsageEvent('drug_view', drug.genericId ?? drug.id, drug.genericName ?? slug)
    }
  }, [drug?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Step 0.2 — measured-height/overflow-hidden root, written fresh for this
  // screen per decision 4.2's no-copy-paste rule. Measures the space left
  // below this root's own top edge and pins the whole page to exactly that
  // height, so DrugDetailSheet below can own a single independent scroll
  // box instead of the whole page scrolling.
  const rootRef = useRef(null)
  const [availableHeight, setAvailableHeight] = useState(null)

  useEffect(() => {
    function measure() {
      if (rootRef.current) {
        setAvailableHeight(window.innerHeight - rootRef.current.getBoundingClientRect().top)
      }
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])

  // Category + color resolution — moved here from DrugHeader.jsx (header/root
  // color fix) so the same resolved color can be painted on the shared page
  // root below, not just on the header's own box. DrugHeader now receives
  // both `category` and `colors` as props instead of resolving them itself.
  const isDark = useIsDark()
  const { categories } = useCategories()
  const category = categories.find(c => c.slug === drug?.category)
  const colors    = resolveToken(category?.color_token || FALLBACK_TOKEN, isDark)

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading && !drug) {
    return (
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
    )
  }

  // ── Not found ──────────────────────────────────────────────────────────────
  if (!drug) {
    return (
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
    )
  }

  // ── Detail ─────────────────────────────────────────────────────────────────
  return (
    <>
      <div
        ref={rootRef}
        style={{
          height:          availableHeight ?? '100dvh',
          overflow:        'hidden',
          display:         'flex',
          flexDirection:   'column',
          // 2026-07-25 (drug header/root color fix, session 11): reverted
          // from the category color to a neutral tone, matching the app's
          // plain, minimal visual branding.
          // 2026-07-25 (session 12): matched to DrugHeader's and
          // DrugDetailSheet's own surface tone exactly, to remove a
          // rounded-corner color mismatch — superseded next note.
          // 2026-07-25 (session 14): switched back to the plain page tone,
          // matching DrugHeader (not DrugDetailSheet). Session 12's fix
          // removed the corner mismatch but also made the header and sheet
          // identical colors with nothing but a faint shadow between them —
          // barely visible in dark mode. Header and root now share this
          // plain page tone (no mismatch: they still match each other
          // exactly), while DrugDetailSheet keeps its own separate surface
          // tone — a real color difference now does the separating.
          // `colors` is still resolved above and passed to DrugHeader for
          // its category label/icon/suffix text, unchanged.
          // 2026-07-25 (session 17, scoped to this page only): switched
          // from --color-bg to --color-hero-bg (FAFAFA light / 29323F
          // dark) — same existing token DrugHeader.jsx now uses, and root
          // must keep matching header exactly (see session 14 note above)
          // to avoid reintroducing the rounded-corner mismatch.
          backgroundColor: 'var(--color-hero-bg)',
        }}
      >
        <DrugHeader
          drug={drug}
          category={category}
          colors={colors}
          isFavourited={isDrugFavourited(drug.id)}
          onBack={() => navigate(-1)}
          onToggleFav={() => toggleDrug(drug.id)}
        />

        {/* 0.2 — DrugDetailSheet (step 0.1) is now the single scrolling
            child. GenericOverviewSection (1.1), UsesSection (1.2, decision
            4.10), and DoseSection (1.3, decisions 4.6/4.11) mount first,
            second, and third per the locked §11.3 order; the remaining old
            grouped sections stay mounted as-is until each is individually
            replaced by its own Phase 1 rebuild. paddingTop kept per
            drug_detail_moa_spacing_fix; paddingBottom kept so content still
            clears the fixed BottomNav below, same as today. */}
        <DrugDetailSheet>
          <div style={{ paddingTop: 'var(--space-5)', paddingBottom: 'var(--space-12)' }}>
            <GenericOverviewSection
              drug={drug}
              siblings={siblings}
              onSelectBrand={handleSiblingTap}
            />

            <UsesSection
              drug={drug}
              colors={colors}
              isDark={isDark}
            />

            <DoseSection drug={drug} />

            <SideEffectsSection drug={drug} />

            <ClinicalOverview drug={drug} />

            <DosingSection drug={drug} />

            <PregnancySection drug={drug} />

            <SafetySection drug={drug} />

            <PrescribingSection drug={drug} />
          </div>
        </DrugDetailSheet>
      </div>

      <BottomNav />
    </>
  )
}