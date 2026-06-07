import { useState } from 'react'
import { Bookmark } from 'lucide-react'
import Layout from '../components/layout'
import ConditionCard from '../components/ConditionCard'
import DrugCard from '../components/DrugCard'
import { useConditionContext } from '../context/ConditionContext'
import { useDrugContext } from '../context/DrugContext'
import { useFavouritesContext } from '../context/FavouritesContext'
import { useStock } from '../hooks/useStock'

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ label }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 'var(--space-12) var(--space-4)',
      gap: 'var(--space-3)',
      color: 'var(--color-text-tertiary)',
    }}>
      <Bookmark size={36} style={{ opacity: 0.3 }} />
      <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text-secondary)' }}>
        No saved {label} yet
      </div>
      <div style={{ fontSize: 13 }}>
        Tap the bookmark icon on any {label === 'conditions' ? 'condition' : 'drug'} to save it here
      </div>
    </div>
  )
}

// ─── FavouritesScreen ─────────────────────────────────────────────────────────

export default function FavouritesScreen() {
  const [activeTab, setActiveTab] = useState('conditions')
  const { favourites } = useFavouritesContext()
  const { conditions } = useConditionContext()
  const { drugs } = useDrugContext()
  const { stockMap } = useStock(drugs)

  // Look up full objects from context by id
  const savedConditions = favourites.conditions
    .map(id => conditions.find(c => c.id === id))
    .filter(Boolean)

  const savedDrugs = favourites.drugs
    .map(id => drugs.find(d => d.id === id))
    .filter(Boolean)

  const tabs = [
    { key: 'conditions', label: 'Conditions', count: savedConditions.length },
    { key: 'drugs',      label: 'Drugs',      count: savedDrugs.length },
  ]

  return (
    <Layout>
      <div style={{ paddingTop: 'var(--space-5)' }}>

        {/* Page heading */}
        <h1 style={{
          fontSize: 20,
          fontWeight: 700,
          color: 'var(--color-text-primary)',
          margin: '0 0 var(--space-4)',
          letterSpacing: '-0.3px',
        }}>
          Favourites
        </h1>

        {/* Pill tabs */}
        <div style={{
          display: 'flex',
          gap: 'var(--space-2)',
          marginBottom: 'var(--space-4)',
        }}>
          {tabs.map(tab => {
            const isActive = activeTab === tab.key
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  padding: '7px 18px',
                  borderRadius: 'var(--radius-full)',
                  fontSize: 13,
                  fontWeight: isActive ? 600 : 400,
                  fontFamily: 'var(--font-body)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  border: isActive
                    ? '1.5px solid var(--color-accent)'
                    : '1.5px solid var(--color-border)',
                  backgroundColor: isActive
                    ? 'var(--color-accent)'
                    : 'var(--color-surface)',
                  color: isActive
                    ? '#ffffff'
                    : 'var(--color-text-secondary)',
                }}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span style={{
                    marginLeft: 6,
                    fontSize: 11,
                    fontWeight: 600,
                    backgroundColor: isActive ? 'rgba(255,255,255,0.25)' : 'var(--color-accent-light)',
                    color: isActive ? '#ffffff' : 'var(--color-accent)',
                    borderRadius: 'var(--radius-full)',
                    padding: '1px 6px',
                  }}>
                    {tab.count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Tab content */}
        {activeTab === 'conditions' && (
          savedConditions.length === 0
            ? <EmptyState label="conditions" />
            : savedConditions.map(condition => (
                <ConditionCard key={condition.id} condition={condition} />
              ))
        )}

        {activeTab === 'drugs' && (
          savedDrugs.length === 0
            ? <EmptyState label="drugs" />
            : savedDrugs.map(drug => (
                <DrugCard
                  key={drug.id}
                  drug={drug}
                  isInStock={stockMap[drug.id] ?? drug.inStock}
                  onTap={() => {}}
                />
              ))
        )}

      </div>
    </Layout>
  )
}
