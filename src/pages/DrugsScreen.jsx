/**
 * src/pages/DrugsScreen.jsx
 * Phase 2B — Navigation & Routing Overhaul
 *
 * Extracted from App.jsx's inline DrugLibraryScreen.
 * Drug card taps now navigate to /drugs/:slug (new route from 2B)
 * instead of using local state to show DrugDetail.
 *
 * The DrugDetail overlay pattern is removed. Drug detail lives at its
 * own route: /drugs/:slug  →  DrugDetailScreen.jsx
 *
 * NOTE: The install banner (PWA prompt) is preserved here and will move
 * to a dedicated PWA component in Phase 2K.
 */

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout          from '../components/layout'
import SearchBar       from '../components/SearchBar'
import CategoryFilter  from '../components/CategoryFilter'
import DrugCard        from '../components/DrugCard'
import ManageStock     from '../components/ManageStock'
import { useDrugContext }  from '../context/DrugContext'
import { useSearch }       from '../hooks/useSearch'
import { useFilter }       from '../hooks/useFilter'
import { useStock }        from '../hooks/useStock'
import { DRUG_CATEGORIES } from '../config/categories'
import { ROUTES }          from '../router'

// ─── Shimmer skeleton helpers ─────────────────────────────────────────────────

function shimmer(extra = {}) {
  return {
    backgroundColor: 'var(--color-border)',
    borderRadius:    'var(--radius-sm)',
    animation:       'shimmer 1.4s ease-in-out infinite',
    ...extra,
  }
}

// Inject the shimmer keyframe once (idempotent)
if (typeof document !== 'undefined' && !document.getElementById('shimmer-style')) {
  const style = document.createElement('style')
  style.id = 'shimmer-style'
  style.textContent = `
    @keyframes shimmer {
      0%   { opacity: 1; }
      50%  { opacity: 0.4; }
      100% { opacity: 1; }
    }
  `
  document.head.appendChild(style)
}

function SkeletonCard() {
  return (
    <div style={{
      backgroundColor: 'var(--color-surface)',
      border:          '1px solid var(--color-border)',
      borderRadius:    'var(--radius-lg)',
      padding:         'var(--space-3) var(--space-4)',
      marginBottom:    'var(--space-2)',
      boxShadow:       'var(--shadow-card)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
        <div style={shimmer({ width: 80, height: 18, borderRadius: 'var(--radius-full)' })} />
        <div style={shimmer({ width: 8, height: 8, borderRadius: '50%' })} />
      </div>
      <div style={shimmer({ width: '60%', height: 18, marginBottom: 'var(--space-1)' })} />
      <div style={shimmer({ width: '40%', height: 14 })} />
    </div>
  )
}

// ─── PWA install banner ───────────────────────────────────────────────────────

function InstallBanner({ onInstall, onDismiss }) {
  return (
    <div style={{
      backgroundColor: 'var(--color-accent-light)',
      border:          '1px solid var(--color-accent)',
      borderRadius:    'var(--radius-md)',
      padding:         'var(--space-3) var(--space-4)',
      marginTop:       'var(--space-4)',
      marginBottom:    'var(--space-2)',
      display:         'flex',
      justifyContent:  'space-between',
      alignItems:      'center',
      gap:             'var(--space-3)',
    }}>
      <span style={{ fontSize: 13, color: 'var(--color-accent)', fontWeight: 500 }}>
        Install Capsula on your home screen
      </span>
      <div style={{ display: 'flex', gap: 'var(--space-2)', flexShrink: 0 }}>
        <button onClick={onInstall} style={{
          padding:         '6px 14px',
          borderRadius:    'var(--radius-sm)',
          fontSize:        13,
          fontWeight:      600,
          cursor:          'pointer',
          border:          'none',
          backgroundColor: 'var(--color-accent)',
          color:           'white',
          fontFamily:      'var(--font-body)',
        }}>
          Install
        </button>
        <button onClick={onDismiss} style={{
          padding:         '6px 14px',
          borderRadius:    'var(--radius-sm)',
          fontSize:        13,
          fontWeight:      500,
          cursor:          'pointer',
          border:          '1px solid var(--color-accent)',
          backgroundColor: 'transparent',
          color:           'var(--color-accent)',
          fontFamily:      'var(--font-body)',
        }}>
          Not now
        </button>
      </div>
    </div>
  )
}

// ─── DrugsScreen ─────────────────────────────────────────────────────────────

export default function DrugsScreen() {
  const navigate           = useNavigate()
  const { drugs, loading } = useDrugContext()
  const [showManageStock, setShowManageStock] = useState(false)
  const [installPrompt,   setInstallPrompt]   = useState(null)
  const [showInstallBanner, setShowInstallBanner] = useState(false)

  // PWA install prompt — attach once
  useEffect(() => {
    function handleBeforeInstall(e) {
      e.preventDefault()
      setInstallPrompt(e)
      setShowInstallBanner(true)
    }
    window.addEventListener('beforeinstallprompt', handleBeforeInstall)
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
  }, [])

  const handleInstall = () => {
    if (!installPrompt) return
    installPrompt.prompt()
    installPrompt.userChoice.then(() => {
      setInstallPrompt(null)
      setShowInstallBanner(false)
    })
  }

  const { stockMap, toggleStock, setAllStock } = useStock(drugs)
  const { query, setQuery, results: searchResults } = useSearch(drugs)
  const { activeCategory, setActiveCategory, filter } = useFilter()

  const presentCategories = DRUG_CATEGORIES
    .filter(c => drugs.some(d => d.category === c.value))
    .map(c => c.value)

  const filtered = filter(searchResults).slice().sort((a, b) => {
    const aIn = stockMap[a.id] ? 0 : 1
    const bIn = stockMap[b.id] ? 0 : 1
    if (aIn !== bIn) return aIn - bIn
    return a.genericName.localeCompare(b.genericName)
  })

  // ── Navigate to drug detail screen (new in Phase 2B) ──────────────────────
  // Drug cards now navigate to /drugs/:slug instead of showing an overlay.
  // The slug is on drug.slug (added in Phase 1B formulations migration).
  // Fallback to drug.id if slug is not yet populated.
  function handleDrugTap(drug) {
    const identifier = drug.slug || drug.id
    navigate(ROUTES.DRUG_DETAIL(identifier))
  }

  // ── Manage Stock view ─────────────────────────────────────────────────────
  if (showManageStock) {
    return (
      <Layout>
        <ManageStock
          drugs={drugs}
          stockMap={stockMap}
          onToggle={toggleStock}
          onSetAll={setAllStock}
          onBack={() => setShowManageStock(false)}
        />
      </Layout>
    )
  }

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (loading && drugs.length === 0) {
    return (
      <Layout>
        <div style={{ paddingTop: 'var(--space-5)' }}>
          <div style={shimmer({ width: '100%', height: 44, marginBottom: 'var(--space-3)', borderRadius: 'var(--radius-lg)' })} />
          <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-4)', overflow: 'hidden' }}>
            {[80, 90, 70, 100, 75].map((w, i) => (
              <div key={i} style={shimmer({ width: w, height: 32, borderRadius: 'var(--radius-full)', flexShrink: 0 })} />
            ))}
          </div>
          {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
        </div>
      </Layout>
    )
  }

  // ── Main view ─────────────────────────────────────────────────────────────
  return (
    <Layout>
      <div style={{ paddingTop: 'var(--space-5)' }}>

        {showInstallBanner && (
          <InstallBanner
            onInstall={handleInstall}
            onDismiss={() => setShowInstallBanner(false)}
          />
        )}

        <SearchBar value={query} onChange={setQuery} />

        <CategoryFilter
          categories={presentCategories}
          active={activeCategory}
          onSelect={setActiveCategory}
        />

        {/* Result count + manage stock */}
        <div style={{
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'space-between',
          marginBottom:   'var(--space-3)',
        }}>
          <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-mono)' }}>
            {filtered.length} drug{filtered.length !== 1 ? 's' : ''}
            {query && ` for "${query}"`}
          </div>
          <button
            onClick={() => setShowManageStock(true)}
            style={{
              background:   'none',
              border:       '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
              padding:      '4px 12px',
              fontSize:     12,
              fontWeight:   500,
              color:        'var(--color-text-secondary)',
              cursor:       'pointer',
              fontFamily:   'var(--font-body)',
            }}
          >
            Manage Stock
          </button>
        </div>

        {/* Drug list */}
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 'var(--space-12) var(--space-4)', color: 'var(--color-text-tertiary)' }}>
            <div style={{ marginBottom: 'var(--space-3)', opacity: 0.4 }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
            </div>
            <div style={{ fontSize: 15, marginBottom: 'var(--space-2)', color: 'var(--color-text-secondary)' }}>
              No drugs found{query ? ` for "${query}"` : ''}
            </div>
            <div style={{ fontSize: 13 }}>Try searching by brand name or Arabic name</div>
          </div>
        ) : (
          filtered.map(drug => (
            <DrugCard
              key={drug.id}
              drug={drug}
              isInStock={stockMap[drug.id]}
              onTap={handleDrugTap}
            />
          ))
        )}

      </div>
    </Layout>
  )
}
