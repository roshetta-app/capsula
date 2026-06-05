import { useState, useEffect } from 'react'
import Layout from './components/layout'
import DrugCard from './components/DrugCard'
import DrugDetail from './components/DrugDetail'
import SearchBar from './components/SearchBar'
import CategoryFilter from './components/CategoryFilter'
import { useSearch } from './hooks/useSearch'
import { useFilter } from './hooks/useFilter'
import { useStock } from './hooks/useStock'
import drugsData from './data/drugs.json'
import './index.css'

export default function App() {
  const [selectedDrug, setSelectedDrug] = useState(null)
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [installPrompt, setInstallPrompt] = useState(null)
  const [showInstallBanner, setShowInstallBanner] = useState(false)

  // Catch the browser's install prompt event and save it for later
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

  const { stockMap, toggleStock, resetAll } = useStock(drugsData.drugs)
  const { query, setQuery, results: searchResults } = useSearch(drugsData.drugs)
  const { activeCategory, setActiveCategory, filter } = useFilter()

  const categories = [...new Set(drugsData.drugs.map(d => d.category))]
  const filtered = filter(searchResults)

  const handleReset = () => {
    resetAll()
    setShowResetConfirm(false)
  }

  // Install banner (Android only — iOS uses Share → Add to Home Screen)
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
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
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
            fontSize: 13,
            fontWeight: 500,
            cursor: 'pointer',
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

  // Reset confirmation banner
  const resetBanner = showResetConfirm && (
    <div style={{
      backgroundColor: '#FEF3C7',
      border: '1px solid #FCD34D',
      borderRadius: 'var(--radius-md)',
      padding: 'var(--space-4)',
      marginTop: 'var(--space-4)',
      marginBottom: 'var(--space-2)',
      display: 'flex',
      justifyContent: 'space-between',alignItems: 'center',
      gap: 'var(--space-3)',
    }}>
      <span style={{ fontSize: 13, color: '#92400E', fontWeight: 500 }}>
        Reset all drugs to In Stock?
      </span>
      <div style={{ display: 'flex', gap: 'var(--space-2)', flexShrink: 0 }}>
        <button
          onClick={handleReset}
          style={{
            padding: '6px 14px',
            borderRadius: 'var(--radius-sm)',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            border: 'none',
            backgroundColor: '#92400E',
            color: 'white',
            fontFamily: 'var(--font-body)',
          }}
        >
          Reset
        </button>
        <button
          onClick={() => setShowResetConfirm(false)}
          style={{
            padding: '6px 14px',
            borderRadius: 'var(--radius-sm)',
            fontSize: 13,
            fontWeight: 500,
            cursor: 'pointer',
            border: '1px solid #D97706',
            backgroundColor: 'transparent',
            color: '#92400E',
            fontFamily: 'var(--font-body)',
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  )

  if (selectedDrug) {
    return (
      <Layout onResetClick={() => setShowResetConfirm(true)}>
        {installBanner}
        {resetBanner}
        <DrugDetail
          drug={selectedDrug}
          isInStock={stockMap[selectedDrug.id]}
          onBack={() => setSelectedDrug(null)}
          onToggleStock={(val) => toggleStock(selectedDrug.id, val)}
        />
      </Layout>
    )
  }

  return (
    <Layout onResetClick={() => setShowResetConfirm(true)}>
      {installBanner}
      {resetBanner}
      <div style={{ paddingTop: 'var(--space-5)' }}>
        <SearchBar value={query} onChange={setQuery} />
        <CategoryFilter
          categories={categories}
          active={activeCategory}
          onSelect={setActiveCategory}
        />
        <div style={{
          fontSize: 12,
          color: 'var(--color-text-tertiary)',
          marginBottom: 'var(--space-3)',
          fontFamily: 'var(--font-mono)',
        }}>
          {filtered.length} drug{filtered.length !== 1 ? 's' : ''}
          {query && ' for "' + query + '"'}
        </div>
        {filtered.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: 'var(--space-12) var(--space-4)',
            color: 'var(--color-text-tertiary)',
          }}>
            <div style={{ fontSize: 32, marginBottom: 'var(--space-3)' }}>⌕</div>
            <div style={{
              fontSize: 15,
              marginBottom: 'var(--space-2)',
              color: 'var(--color-text-secondary)',
            }}>
              No drugs found for "{query}"
            </div>
            <div style={{ fontSize: 13 }}>
              Try searching by brand name or Arabic name
            </div>
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
import { useState } from 'react'
import StockManager from './components/StockManager'

// Your drugs data — add inStock field to each
const INITIAL_DRUGS = [
  { id: 1, name: 'Amoxicillin 500mg',  category: 'Antibiotic',    inStock: true,  defaultStock: true  },
  { id: 2, name: 'Paracetamol 1g',     category: 'Analgesic',     inStock: true,  defaultStock: true  },
  { id: 3, name: 'Ibuprofen 400mg',    category: 'NSAID',         inStock: false, defaultStock: false },
  // ...add all your real drugs here
]

export default function App() {
  const [drugs, setDrugs] = useState(INITIAL_DRUGS)

  return (
    <div className="max-w-xl mx-auto p-6">
      <h1 className="text-xl font-medium text-gray-800 mb-6">Stock manager</h1>
      <StockManager drugs={drugs} onUpdate={setDrugs} />
    </div>
  )
}
