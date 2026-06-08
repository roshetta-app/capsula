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
