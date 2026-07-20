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
 * Route: /drugs/:slug
 */

import { useEffect }                    from 'react'
import { useParams, useNavigate }        from 'react-router-dom'
import Layout                            from '../components/layout'
import DrugHeader                        from '../components/drugs/DrugHeader'
import ClinicalOverview                  from '../components/drugs/sections/ClinicalOverview'
import DosingSection                     from '../components/drugs/sections/DosingSection'
import SafetySection                     from '../components/drugs/sections/SafetySection'
import PrescribingSection                from '../components/drugs/sections/PrescribingSection'
import { useDrugContext }                from '../context/DrugContext'
import { useFavouritesContext }          from '../context/FavouritesContext'
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

        {/* 2c.1 — card wrapper removed (decisions 4.25–4.27): sections now
            sit flat on the page background, no border/shadow/box. 2c.7 —
            the four grouped sections, mounted in decision 4.25's order.
            drug_detail_moa_spacing_fix — paddingTop added here so content
            no longer touches DrugHeader directly; matches
            ConditionDetailScreen.jsx's own header-to-content gap. */}
        <div style={{ paddingTop: 'var(--space-5)' }}>
          <ClinicalOverview drug={drug} />

          <DosingSection
            drug={drug}
            siblings={siblings}
            onSelectBrand={handleSiblingTap}
          />

          <SafetySection drug={drug} />

          <PrescribingSection drug={drug} />
        </div>

      </div>
    </Layout>
  )
}
