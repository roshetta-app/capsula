/**
 * src/pages/DrugDetailScreen.jsx
 * Phase 2B — Navigation & Routing Overhaul
 *
 * NEW screen. Route: /drugs/:slug
 *
 * Phase 2B creates this file as a functional stub that:
 *   1. Resolves the drug from context using the slug param
 *   2. Shows DrugDetail (existing component) with full back-navigation
 *   3. Stock toggle works as before (localStorage via useStock)
 *
 * The full redesign of the drug detail UI is Phase 2G.
 * This stub exists purely to make the route work end-to-end in 2B.
 */

import { useParams, useNavigate } from 'react-router-dom'
import Layout      from '../components/layout'
import DrugDetail  from '../components/DrugDetail'
import { useDrugContext } from '../context/DrugContext'
import { useStock }       from '../hooks/useStock'

export default function DrugDetailScreen() {
  const { slug }   = useParams()
  const navigate   = useNavigate()
  const { drugs, loading } = useDrugContext()
  const { stockMap, toggleStock } = useStock(drugs)

  // Match by formulation slug first, fall back to id (supports both)
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
              marginTop:       'var(--space-2)',
              padding:         '8px 20px',
              borderRadius:    'var(--radius-sm)',
              border:          '1px solid var(--color-border)',
              background:      'none',
              fontSize:        13,
              fontWeight:      500,
              color:           'var(--color-text-secondary)',
              cursor:          'pointer',
              fontFamily:      'var(--font-body)',
            }}
          >
            ← Back to Drugs
          </button>
        </div>
      </Layout>
    )
  }

  // ── Drug detail ────────────────────────────────────────────────────────────
  return (
    <Layout>
      <DrugDetail
        drug={drug}
        isInStock={stockMap[drug.id]}
        onBack={() => navigate(-1)}
        onToggleStock={(val) => toggleStock(drug.id, val)}
      />
    </Layout>
  )
}
