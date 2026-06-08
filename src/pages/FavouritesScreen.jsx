/**
 * src/pages/FavouritesScreen.jsx
 * Phase 2H — Favourites Screen rebuild
 *
 * Changes from stub:
 *  - Symmetric pill tabs: equal width, centered, Star icon, count badge
 *  - Empty state: Star icon (not Bookmark)
 *  - Drug card onTap → navigate to /drugs/:slug (FIX — was dead () => {})
 *  - Removing a favourite shows a brief snackbar: "Removed from favourites"
 *  - Snackbar is triggered by wrapping toggleDrug / toggleCondition
 */

import { useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Star } from 'lucide-react'
import Layout from '../components/layout'
import ConditionCard from '../components/ConditionCard'
import DrugCard from '../components/DrugCard'
import { useConditionContext } from '../context/ConditionContext'
import { useDrugContext } from '../context/DrugContext'
import { useFavouritesContext } from '../context/FavouritesContext'
import { useStock } from '../hooks/useStock'

// ─── Snackbar ─────────────────────────────────────────────────────────────────

function Snackbar({ visible, message }) {
  return (
    <div
      aria-live="polite"
      style={{
        position:        'fixed',
        bottom:          80,           // above bottom nav
        left:            '50%',
        transform:       `translateX(-50%) translateY(${visible ? 0 : 12}px)`,
        opacity:         visible ? 1 : 0,
        transition:      'opacity 0.2s ease, transform 0.2s ease',
        backgroundColor: 'var(--color-text-primary)',
        color:           'var(--color-bg)',
        fontSize:        13,
        fontWeight:      500,
        padding:         '8px 18px',
        borderRadius:    'var(--radius-full)',
        boxShadow:       'var(--shadow-elevated)',
        whiteSpace:      'nowrap',
        pointerEvents:   'none',
        zIndex:          9999,
      }}
    >
      {message}
    </div>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ label }) {
  return (
    <div style={{
      display:        'flex',
      flexDirection:  'column',
      alignItems:     'center',
      justifyContent: 'center',
      padding:        'var(--space-12) var(--space-4)',
      gap:            'var(--space-3)',
      color:          'var(--color-text-tertiary)',
    }}>
      <Star size={36} style={{ opacity: 0.25 }} />
      <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text-secondary)' }}>
        No saved {label} yet
      </div>
      <div style={{ fontSize: 13, textAlign: 'center' }}>
        Tap the star on any {label === 'conditions' ? 'condition' : 'drug'} to save it here
      </div>
    </div>
  )
}

// ─── FavouritesScreen ─────────────────────────────────────────────────────────

export default function FavouritesScreen() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('conditions')

  // Snackbar state
  const [snackVisible, setSnackVisible] = useState(false)
  const snackTimer = useRef(null)

  function showSnack() {
    if (snackTimer.current) clearTimeout(snackTimer.current)
    setSnackVisible(true)
    snackTimer.current = setTimeout(() => setSnackVisible(false), 2000)
  }

  const { favourites, toggleDrug, toggleCondition } = useFavouritesContext()
  const { conditions } = useConditionContext()
  const { drugs }      = useDrugContext()
  const { stockMap }   = useStock(drugs)

  // Look up full objects from context
  const savedConditions = favourites.conditions
    .map(id => conditions.find(c => c.id === id))
    .filter(Boolean)

  const savedDrugs = favourites.drugs
    .map(id => drugs.find(d => d.id === id))
    .filter(Boolean)

  // Wrappers that also trigger the snackbar (called on remove = already favourited)
  const handleRemoveDrug = useCallback((id) => {
    toggleDrug(id)
    showSnack()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toggleDrug])

  const handleRemoveCondition = useCallback((id) => {
    toggleCondition(id)
    showSnack()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toggleCondition])

  const tabs = [
    { key: 'conditions', label: 'Conditions', count: savedConditions.length },
    { key: 'drugs',      label: 'Drugs',      count: savedDrugs.length      },
  ]

  return (
    <Layout>
      <div style={{ paddingTop: 'var(--space-5)' }}>

        {/* Page heading */}
        <h1 style={{
          fontSize:      20,
          fontWeight:    700,
          color:         'var(--color-text-primary)',
          margin:        '0 0 var(--space-4)',
          letterSpacing: '-0.3px',
        }}>
          Favourites
        </h1>

        {/* Symmetric pill tabs — equal width, centered, star icon */}
        <div style={{
          display:       'grid',
          gridTemplateColumns: '1fr 1fr',
          gap:           'var(--space-2)',
          marginBottom:  'var(--space-4)',
        }}>
          {tabs.map(tab => {
            const isActive = activeTab === tab.key
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  display:         'flex',
                  alignItems:      'center',
                  justifyContent:  'center',
                  gap:             'var(--space-2)',
                  padding:         '8px 0',
                  borderRadius:    'var(--radius-full)',
                  fontSize:        13,
                  fontWeight:      isActive ? 600 : 400,
                  fontFamily:      'var(--font-body)',
                  cursor:          'pointer',
                  transition:      'all 0.15s ease',
                  border:          isActive
                    ? '1.5px solid var(--color-accent)'
                    : '1.5px solid var(--color-border)',
                  backgroundColor: isActive
                    ? 'var(--color-accent)'
                    : 'var(--color-surface)',
                  color:           isActive
                    ? '#ffffff'
                    : 'var(--color-text-secondary)',
                }}
              >
                <Star
                  size={13}
                  fill={isActive ? '#ffffff' : 'none'}
                  strokeWidth={isActive ? 0 : 1.5}
                  color={isActive ? '#ffffff' : 'var(--color-text-tertiary)'}
                />
                {tab.label}
                {tab.count > 0 && (
                  <span style={{
                    fontSize:        11,
                    fontWeight:      600,
                    backgroundColor: isActive
                      ? 'rgba(255,255,255,0.25)'
                      : 'var(--color-accent-light)',
                    color:           isActive ? '#ffffff' : 'var(--color-accent)',
                    borderRadius:    'var(--radius-full)',
                    padding:         '1px 6px',
                    lineHeight:      1.5,
                  }}>
                    {tab.count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* ── Conditions tab ── */}
        {activeTab === 'conditions' && (
          savedConditions.length === 0
            ? <EmptyState label="conditions" />
            : savedConditions.map(condition => (
                <ConditionCard
                  key={condition.id}
                  condition={condition}
                  onTap={() => handleRemoveCondition(condition.id)}
                />
              ))
        )}

        {/* ── Drugs tab ── */}
        {activeTab === 'drugs' && (
          savedDrugs.length === 0
            ? <EmptyState label="drugs" />
            : savedDrugs.map(drug => (
                <DrugCard
                  key={drug.id}
                  drug={drug}
                  isInStock={stockMap[drug.id] ?? drug.inStock}
                  onTap={() => navigate(`/drugs/${drug.slug}`)}
                />
              ))
        )}

      </div>

      <Snackbar visible={snackVisible} message="Removed from favourites" />
    </Layout>
  )
}
