/**
 * src/pages/DrugDetailScreen.jsx
 * Phase 2G — Drug Detail Screen (full rebuild)
 * Phase 3J — added logUsageEvent on mount for analytics
 *
 * 2026-07-20 (drug_library_ui_ux, plan §7 steps 2c.1–2c.7, decisions
 * 4.25–4.27): removed the bordered/shadowed box that used to wrap
 * everything below the header — no card anywhere on the page now, flat
 * content directly on the page background, same flat-content direction as
 * the rest of this redesign (SharedDrugCard's flat row, the flat drugs
 * list). DoseTable/BrandsList/DrugInfoSections are retired; replaced below
 * by the four grouped section components (ClinicalOverview/DosingSection/
 * SafetySection/PrescribingSection), mounted in decision 4.25's order.
 *
 * 2026-07-20 (drug_detail_moa_spacing_fix): the section group below
 * DrugHeader had no top spacing at all — content touched the header
 * directly. Wrapped the section group in its own div with
 * paddingTop: 'var(--space-5)', matching the exact top-padding value
 * ConditionDetailScreen.jsx uses on its own content wrapper directly below
 * its sticky header, instead of introducing a new one-off value. DrugHeader
 * itself is untouched.
 *
 * 2026-07-25 (drug_library_ui_ux, STEPS_DRUG_DETAIL.md step 0.2, decision
 * 4.2 + its 2026-07-25 correction): dropped the shared Layout wrapper
 * entirely, same as ConditionDetailScreen.jsx — direct consequence: the
 * offline/notification banners no longer show on this page. The root now
 * self-manages a measured-height, overflow-hidden container (written fresh
 * for this screen, not copied from ConditionDetailScreen.jsx, per 4.2's
 * no-copy-paste rule — same end mechanic only), with DrugHeader as the
 * fixed top piece and the new DrugDetailSheet (step 0.1) as the single
 * independently-scrolling child. BottomNav is now rendered directly here
 * instead of being supplied by Layout. Section children inside the sheet
 * are unchanged for now — still the same 4 grouped blocks; swapping them
 * for the 9 new standalone sections is Phase 1's job, not this step.
 *
 * 2026-07-25 (header/root color fix): the header's colored panel used to
 * stop in a straight line at its own bottom edge, while the root behind it
 * had no background of its own — so DrugDetailSheet's rounded top corners
 * revealed the plain page background in that gap instead of more of the
 * header's color. Category color was briefly resolved once here and
 * painted on this root to match the header — **superseded same session,
 * see the next note.**
 *
 * 2026-07-25 (header/root reverted to neutral, session 11): the category-
 * colored header didn't match the app's plain, minimal visual branding.
 * Root and header both now use the app's standard neutral tokens instead
 * (`--color-bg` / `--color-surface`, same values ConditionDetailScreen
 * already uses) — the earlier mismatch this fixed is a non-issue between
 * two close neutral tones, same as it already is on that screen. Category
 * `colors` is still resolved here and passed to DrugHeader, but only for
 * its category label/icon/suffix text now, not for any background.
 *
 * 2026-07-25 (drug_library_ui_ux, plan §7 Phase 1 step 1.1, decision 4.19):
 * GenericOverviewSection.jsx mounted here, first in the section order per
 * the locked mount order (§11.3) — carries the generic/combo name, Class/
 * Subclass placeholder tags, the Available Brands trigger (relocated from
 * DosingSection.jsx, decision 4.5), and Mechanism of Action. `siblings`/
 * `handleSiblingTap` (used only by the Brands trigger) moved here from
 * DosingSection accordingly. Per decision 4.19, each new Phase 1 section
 * now gets wired in here as soon as it's built, instead of all 9 landing
 * together at the old single integration step — the remaining 4 old
 * grouped sections (ClinicalOverview trimmed to Uses-only for now,
 * DosingSection, SafetySection, PrescribingSection) stay mounted
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
 * Route: /drugs/:slug
 */

import { useEffect, useRef, useState }   from 'react'
import { useParams, useNavigate }        from 'react-router-dom'
import DrugHeader                        from '../components/drugs/DrugHeader'
import DrugDetailSheet                   from '../components/drugs/DrugDetailSheet'
import BottomNav                         from '../components/BottomNav'
import GenericOverviewSection            from '../components/drugs/sections/GenericOverviewSection'
import UsesSection                       from '../components/drugs/sections/UsesSection'
import ClinicalOverview                  from '../components/drugs/sections/ClinicalOverview'
import DosingSection                     from '../components/drugs/sections/DosingSection'
import SafetySection                     from '../components/drugs/sections/SafetySection'
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
            child. GenericOverviewSection (1.1) and UsesSection (1.2, decision
            4.10) mount first and second per the locked §11.3 order; the
            remaining 3 old grouped sections stay mounted as-is until each is
            individually replaced by its own Phase 1 rebuild. paddingTop kept
            per drug_detail_moa_spacing_fix; paddingBottom kept so content
            still clears the fixed BottomNav below, same as today. */}
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

            <ClinicalOverview drug={drug} />

            <DosingSection drug={drug} />

            <SafetySection drug={drug} />

            <PrescribingSection drug={drug} />
          </div>
        </DrugDetailSheet>
      </div>

      <BottomNav />
    </>
  )
}
