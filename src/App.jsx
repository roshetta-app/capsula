import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { DrugProvider, useDrugContext } from './context/DrugContext'
import { ConditionProvider } from './context/ConditionContext'
import Layout from './components/layout'
import DrugCard from './components/DrugCard'
import DrugDetail from './components/DrugDetail'
import ManageStock from './components/ManageStock'
import SearchBar from './components/SearchBar'
import CategoryFilter from './components/CategoryFilter'
import { useSearch } from './hooks/useSearch'
import { useFilter } from './hooks/useFilter'
import { useStock } from './hooks/useStock'
import { DRUG_CATEGORIES } from './config/categories'
import './index.css'

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div style={{
      backgroundColor: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-lg)',
      padding: 'var(--space-3) var(--space-4)',
      marginBottom: 'var(--space-2)',
      boxShadow: 'var(--shadow-card)',
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

function shimmer(extra = {}) {
  return {
    backgroundColor: 'var(--color-border)',
    borderRadius: 'var(--radius-sm)',
    animation: 'shimmer 1.4s ease-in-out infinite',
    ...extra,
  }
}

// Inject shimmer keyframes once
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

// ─── Drug Library screen (uses DrugContext) ───────────────────────────────────

function DrugLibraryScreen() {
  const { drugs, loading } = useDrugContext()
  const [selectedDrug, setSelectedDrug] = useState(null)
  const [showManageStock, setShowManageStock] = useState(false)
  const [installPrompt, setInstallPrompt] = useState(null)
  const [showInstallBanner, setShowInstallBanner] = useState(false)

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault()
      setInstallPrompt(e)
      setShowInstallBanner(true)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
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

  // Categories derived from config (mapped values), filtered to what's actually in the data
  const presentCategories = DRUG_CATEGORIES
    .filter(c => drugs.some(d => d.category === c.value))
    .map(c => c.value)

  const filtered = filter(searchResults).slice().sort((a, b) => {
    const aIn = stockMap[a.id] ? 0 : 1
    const bIn = stockMap[b.id] ? 0 : 1
    if (aIn !== bIn) return aIn - bIn
    return a.genericName.localeCompare(b.genericName)
  })

  // Install banner (Android only)
  const installBanner = showInstallBanner && (
    <div style={{
      backgroundColor: 'var(--color-accent-light)',
      border: '1px solid var(--color-accent)',
      borderRadius: 'var(--radius-md)',
      padding: 'var(--space-3) var(--space-4)',
      marginTop: 'var(--space-4)',
      marginBottom: 'var(--space-2)',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 'var(--space-3)',
    }}>
      <span style={{ fontSize: 13, color: 'var(--color-accent)', fontWeight: 500 }}>
        Install Capsula on your home screen
      </span>
      <div style={{ display: 'flex', gap: 'var(--space-2)', flexShrink: 0 }}>
        <button
          onClick={handleInstall}
          style={{
            padding: '6px 14px',
            borderRadius: 'var(--radius-sm)',
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
            border: 'none',
            backgroundColor: 'var(--color-accent)',
            color: 'white',
            fontFamily: 'var(--font-body)',
          }}
        >
          Install
        </button>
        <button
          onClick={() => setShowInstallBanner(false)}
          style={{
            padding: '6px 14px',
            borderRadius: 'var(--radius-sm)',
            fontSize: 13, fontWeight: 500, cursor: 'pointer',
            border: '1px solid var(--color-accent)',
            backgroundColor: 'transparent',
            color: 'var(--color-accent)',
            fontFamily: 'var(--font-body)',
          }}
        >
          Not now
        </button>
      </div>
    </div>
  )

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

  if (selectedDrug) {
    return (
      <Layout>
        <DrugDetail
          drug={selectedDrug}
          isInStock={stockMap[selectedDrug.id]}
          onBack={() => setSelectedDrug(null)}
          onToggleStock={(val) => toggleStock(selectedDrug.id, val)}
        />
      </Layout>
    )
  }

  // Cold start — no data yet
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

  return (
    <Layout>
      <div style={{ paddingTop: 'var(--space-5)' }}>
        {installBanner}
        <SearchBar value={query} onChange={setQuery} />
        <CategoryFilter
          categories={presentCategories}
          active={activeCategory}
          onSelect={setActiveCategory}
        />

        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 'var(--space-3)',
        }}>
          <div style={{
            fontSize: 12,
            color: 'var(--color-text-tertiary)',
            fontFamily: 'var(--font-mono)',
          }}>
            {filtered.length} drug{filtered.length !== 1 ? 's' : ''}
            {query && ' for "' + query + '"'}
          </div>
          <button
            onClick={() => setShowManageStock(true)}
            style={{
              background: 'none',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
              padding: '4px 12px',
              fontSize: 12, fontWeight: 500,
              color: 'var(--color-text-secondary)',
              cursor: 'pointer',
              fontFamily: 'var(--font-body)',
            }}
          >
            Manage Stock
          </button>
        </div>

        {filtered.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: 'var(--space-12) var(--space-4)',
            color: 'var(--color-text-tertiary)',
          }}>
            <div style={{ fontSize: 32, marginBottom: 'var(--space-3)' }}>⌕</div>
            <div style={{ fontSize: 15, marginBottom: 'var(--space-2)', color: 'var(--color-text-secondary)' }}>
              No drugs found for "{query}"
            </div>
            <div style={{ fontSize: 13 }}>Try searching by brand name or Arabic name</div>
          </div>
        ) : (
          filtered.map(drug => (
            <DrugCard
              key={drug.id}
              drug={drug}
              isInStock={stockMap[drug.id]}
              onTap={setSelectedDrug}
            />
          ))
        )}
      </div>
    </Layout>
  )
}

// ─── Stub screens (replaced in later sessions) ───────────────────────────────

function ConditionsScreen() {
  return (
    <Layout>
      <div style={{ padding: 'var(--space-5) var(--space-4)', color: 'var(--color-text-secondary)', fontSize: 14 }}>
        Conditions — coming in Session 3
      </div>
    </Layout>
  )
}

function FavouritesScreen() {
  return (
    <Layout>
      <div style={{ padding: 'var(--space-5) var(--space-4)', color: 'var(--color-text-secondary)', fontSize: 14 }}>
        Favourites — coming in Session 6
      </div>
    </Layout>
  )
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <BrowserRouter basename="/capsula">
      <ConditionProvider>
        <DrugProvider>
          <Routes>
            <Route path="/"           element={<DrugLibraryScreen />} />
            <Route path="/conditions" element={<ConditionsScreen />} />
            <Route path="/favourites" element={<FavouritesScreen />} />
          </Routes>
        </DrugProvider>
      </ConditionProvider>
    </BrowserRouter>
  )
}
