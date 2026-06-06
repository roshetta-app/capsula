import { useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { DrugProvider, useDrugContext } from './context/DrugContext'
import { ConditionProvider, useConditionContext } from './context/ConditionContext'
import Layout from './components/layout'
import DrugCard from './components/DrugCard'
import DrugDetail from './components/DrugDetail'
import ConditionCard from './components/ConditionCard'
import ConditionDetail from './components/ConditionDetail'
import ManageStock from './components/ManageStock'
import SearchBar from './components/SearchBar'
import CategoryFilter from './components/CategoryFilter'
import { useSearch } from './hooks/useSearch'
import { useFilter } from './hooks/useFilter'
import { useStock } from './hooks/useStock'
import { useConditionSearch } from './hooks/useConditionSearch'
import { DRUG_CATEGORIES } from './config/categories'
import './index.css'

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function shimmer(extra = {}) {
  return {
    backgroundColor: 'var(--color-border)',
    borderRadius: 'var(--radius-sm)',
    animation: 'shimmer 1.4s ease-in-out infinite',
    ...extra,
  }
}

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

// ─── Conditions screen ────────────────────────────────────────────────────────
// Primary screen — lives at /

function ConditionsScreen() {
  const { conditions, specialties, loading } = useConditionContext()
  const [selectedCondition, setSelectedCondition] = useState(null)
  const { query, setQuery, activeSpecialty, setActiveSpecialty, results } = useConditionSearch(conditions)

  if (selectedCondition) {
    return (
      <Layout>
        <ConditionDetail condition={selectedCondition} onBack={() => setSelectedCondition(null)} />
      </Layout>
    )
  }

  if (loading && conditions.length === 0) {
    return (
      <Layout>
        <div style={{ paddingTop: 'var(--space-5)' }}>
          <div style={shimmer({ width: '100%', height: 44, marginBottom: 'var(--space-3)', borderRadius: 'var(--radius-lg)' })} />
          <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-4)', overflow: 'hidden' }}>
            {[80, 100, 70, 90].map((w, i) => (
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
        {/* Search */}
        <SearchBar value={query} onChange={setQuery} placeholder="Search conditions…" />

        {/* Specialty filter pills */}
        {specialties.length > 0 && (
          <div style={{
            display: 'flex', gap: 'var(--space-2)',
            overflowX: 'auto', paddingBottom: 'var(--space-2)',
            marginBottom: 'var(--space-4)', scrollbarWidth: 'none',
          }}>
            {['all', ...specialties.map(s => s.id)].map(id => {
              const isActive = activeSpecialty === id
              const label = id === 'all' ? 'All' : specialties.find(s => s.id === id)?.name
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
          {results.length} condition{results.length !== 1 ? 's' : ''}
          {query && ' for "' + query + '"'}
        </div>

        {/* List */}
        {results.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 'var(--space-12) var(--space-4)', color: 'var(--color-text-tertiary)' }}>
            <div style={{ fontSize: 32, marginBottom: 'var(--space-3)', opacity: 0.4 }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
              </svg>
            </div>
            <div style={{ fontSize: 15, color: 'var(--color-text-secondary)' }}>
              No conditions found for "{query}"
            </div>
          </div>
        ) : (
          results.map(condition => (
            <ConditionCard key={condition.id} condition={condition} onTap={setSelectedCondition} />
          ))
        )}
      </div>
    </Layout>
  )
}

// ─── Drug Library screen ──────────────────────────────────────────────────────
// Lives at /drugs

function DrugLibraryScreen() {
  const { drugs, loading } = useDrugContext()
  const [selectedDrug, setSelectedDrug] = useState(null)
  const [showManageStock, setShowManageStock] = useState(false)
  const [installPrompt, setInstallPrompt] = useState(null)
  const [showInstallBanner, setShowInstallBanner] = useState(false)

  // PWA install prompt — only fires on Android Chrome
  const handleInstallPrompt = (e) => {
    e.preventDefault()
    setInstallPrompt(e)
    setShowInstallBanner(true)
  }

  // Attach/detach listener — safe even if event never fires (iOS)
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeinstallprompt', handleInstallPrompt)
  }

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

  const installBanner = showInstallBanner && (
    <div style={{
      backgroundColor: 'var(--color-accent-light)',
      border: '1px solid var(--color-accent)',
      borderRadius: 'var(--radius-md)',
      padding: 'var(--space-3) var(--space-4)',
      marginTop: 'var(--space-4)', marginBottom: 'var(--space-2)',
      display: 'flex', justifyContent: 'space-between',
      alignItems: 'center', gap: 'var(--space-3)',
    }}>
      <span style={{ fontSize: 13, color: 'var(--color-accent)', fontWeight: 500 }}>
        Install Capsula on your home screen
      </span>
      <div style={{ display: 'flex', gap: 'var(--space-2)', flexShrink: 0 }}>
        <button onClick={handleInstall} style={{
          padding: '6px 14px', borderRadius: 'var(--radius-sm)',
          fontSize: 13, fontWeight: 600, cursor: 'pointer',
          border: 'none', backgroundColor: 'var(--color-accent)',
          color: 'white', fontFamily: 'var(--font-body)',
        }}>Install</button>
        <button onClick={() => setShowInstallBanner(false)} style={{
          padding: '6px 14px', borderRadius: 'var(--radius-sm)',
          fontSize: 13, fontWeight: 500, cursor: 'pointer',
          border: '1px solid var(--color-accent)',
          backgroundColor: 'transparent', color: 'var(--color-accent)',
          fontFamily: 'var(--font-body)',
        }}>Not now</button>
      </div>
    </div>
  )

  if (showManageStock) {
    return (
      <Layout>
        <ManageStock
          drugs={drugs} stockMap={stockMap}
          onToggle={toggleStock} onSetAll={setAllStock}
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
        <CategoryFilter categories={presentCategories} active={activeCategory} onSelect={setActiveCategory} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
          <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-mono)' }}>
            {filtered.length} drug{filtered.length !== 1 ? 's' : ''}
            {query && ' for "' + query + '"'}
          </div>
          <button
            onClick={() => setShowManageStock(true)}
            style={{
              background: 'none', border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)', padding: '4px 12px',
              fontSize: 12, fontWeight: 500,
              color: 'var(--color-text-secondary)', cursor: 'pointer',
              fontFamily: 'var(--font-body)',
            }}
          >
            Manage Stock
          </button>
        </div>

        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 'var(--space-12) var(--space-4)', color: 'var(--color-text-tertiary)' }}>
            <div style={{ marginBottom: 'var(--space-3)', opacity: 0.4 }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
              </svg>
            </div>
            <div style={{ fontSize: 15, marginBottom: 'var(--space-2)', color: 'var(--color-text-secondary)' }}>
              No drugs found for "{query}"
            </div>
            <div style={{ fontSize: 13 }}>Try searching by brand name or Arabic name</div>
          </div>
        ) : (
          filtered.map(drug => (
            <DrugCard key={drug.id} drug={drug} isInStock={stockMap[drug.id]} onTap={setSelectedDrug} />
          ))
        )}
      </div>
    </Layout>
  )
}

// ─── Favourites screen (stub — implemented in Session 6.1) ────────────────────

function FavouritesScreen() {
  return (
    <Layout>
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        minHeight: '50vh', gap: 'var(--space-3)', color: 'var(--color-text-tertiary)',
      }}>
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.4 }}>
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
        <div style={{ fontSize: 14, fontWeight: 500 }}>Favourites</div>
        <div style={{ fontSize: 12 }}>Coming in Session 6</div>
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
            {/* / → Conditions (primary use case per plan Section 5.1) */}
            <Route path="/"           element={<ConditionsScreen />} />
            <Route path="/drugs"      element={<DrugLibraryScreen />} />
            <Route path="/favourites" element={<FavouritesScreen />} />
          </Routes>
        </DrugProvider>
      </ConditionProvider>
    </BrowserRouter>
  )
}
