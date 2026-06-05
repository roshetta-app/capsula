import { useState, useEffect } from 'react'
import Layout from './components/layout'
import DrugCard from './components/DrugCard'
import DrugDetail from './components/DrugDetail'
import ManageStock from './components/ManageStock'
import SearchBar from './components/SearchBar'
import CategoryFilter from './components/CategoryFilter'
import { useSearch } from './hooks/useSearch'
import { useFilter } from './hooks/useFilter'
import { useStock } from './hooks/useStock'
import drugsData from './data/drugs.json'
import './index.css'

export default function App() {
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

  const { stockMap, toggleStock, setAllStock } = useStock(drugsData.drugs)
  const { query, setQuery, results: searchResults } = useSearch(drugsData.drugs)
  const { activeCategory, setActiveCategory, filter } = useFilter()

  const categories = [...new Set(drugsData.drugs.map(d => d.category))]

  // Filter first, then sort: in-stock alphabetically, then out-of-stock alphabetically
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

  // Manage Stock view
  if (showManageStock) {
    return (
      <Layout>
        <ManageStock
          drugs={drugsData.drugs}
          stockMap={stockMap}
          onToggle={toggleStock}
          onSetAll={setAllStock}
          onBack={() => setShowManageStock(false)}
        />
      </Layout>
    )
  }

  // Drug detail view
  if (selectedDrug) {
    return (
      <Layout>
        {installBanner}
        <DrugDetail
          drug={selectedDrug}
          isInStock={stockMap[selectedDrug.id]}
          onBack={() => setSelectedDrug(null)}
          onToggleStock={(val) => toggleStock(selectedDrug.id, val)}
        />
      </Layout>
    )
  }

  // Main list view
  return (
    <Layout>
      {installBanner}
      <div style={{ paddingTop: 'var(--space-5)' }}>
        <SearchBar value={query} onChange={setQuery} />
        <CategoryFilter
          categories={categories}
          active={activeCategory}
          onSelect={setActiveCategory}
        />

        {/* Drug count + Manage Stock inline */}
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
              fontSize: 12,
              fontWeight: 500,
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
