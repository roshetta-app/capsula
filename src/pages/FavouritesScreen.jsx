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
 *
 * Phase 2I — bug fix: condition card onTap was wired to remove-from-favourites
 *  instead of navigating (row tap silently un-favourited the condition and
 *  never opened it). ConditionCard's onTap is a single full-row tap target
 *  meant purely for navigation — mirrors DrugCard's onTap below.
 *  - Condition card onTap → navigate to /conditions/:slug (FIX)
 *  - Trailing star control added per row so removal is still possible
 *    from this screen.
 *
 * Phase 2J — polish pass on the 2I star row:
 *  - Removing a favourite now confirms first via ConfirmSheet (the
 *    consumer-facing confirm dialog — see src/components/ui/ConfirmSheet.jsx;
 *    NOT admin/ConfirmModal.jsx, which is CMS-only) instead of removing
 *    immediately on tap. toggleCondition is called from the sheet's
 *    onConfirm, which is also where the snackbar now fires.
 *
 * Phase 2K — the 2J star was rendered as a sibling before ConditionCard's
 *  outer div, which placed it before the specialty icon bubble too (wrong —
 *  it should sit right before the chevron) and top-aligned it instead of
 *  centering it on the row. Fixed by moving the star into ConditionCard's
 *  `trailing` slot (see ConditionCard Phase 16), which renders it
 *  immediately before the chevron and centers both together on the row's
 *  full height between the two divider lines.
 *
 * Phase 2L — header redesign to match ConditionsScreen's hero + sticky
 *  header pattern:
 *  - Plain "Favourites" <h1> replaced with a hero block (logo + heading),
 *    matching ConditionsScreen's BrandRow spacing/logo sizing. No tagline,
 *    no dark-mode toggle — this screen has neither in its existing in-page
 *    content, unlike Conditions.
 *  - Tab row now sits just below the hero and is tracked via a ref.
 *  - New StickyFavouritesHeader: a fixed, slide-down panel (logo row +
 *    the same two tabs) that appears once the hero scrolls out of view.
 *    Visual shell (position/zIndex/shadow/border-radius/transition) copied
 *    from ConditionsScreen's StickyLogoHeader; specialty-pill/search-icon/
 *    color-token logic from that component is NOT included — Favourites has
 *    no equivalent controls. Tab content is rendered via a shared renderTabs
 *    helper so the in-page and sticky tab rows never diverge.
 *  - This is a local, duplicated shell — not extracted into a shared
 *    component with ConditionsScreen (explicit decision: two occurrences
 *    don't yet justify the abstraction; avoids touching a working screen).
 *  - IntersectionObserver watches the hero ref (heroRef) the same way
 *    ConditionsScreen watches brandRowRef.
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Star } from 'lucide-react'
import Layout from '../components/layout'
import ConditionCard from '../components/ConditionCard'
import DrugCard from '../components/DrugCard'
import ConfirmSheet from '../components/ui/ConfirmSheet'
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

// ─── Row star button ────────────────────────────────────────────────────────
// Local (not InlineStarButton) so it can open a confirm step instead of
// toggling immediately on tap. Rendered into ConditionCard's trailing slot,
// so it sits right before the chevron and shares its vertical centering.

function RowStarButton({ onPress }) {
  function handleTap(e) {
    e.stopPropagation()
    onPress()
  }

  return (
    <button
      onClick={handleTap}
      aria-label="Remove from favourites"
      style={{
        background:              'none',
        border:                  'none',
        cursor:                  'pointer',
        padding:                 '14px 8px',   // 44px tap height
        display:                 'flex',
        alignItems:              'center',
        justifyContent:          'center',
        flexShrink:              0,
        WebkitTapHighlightColor: 'transparent',
        outline:                 'none',
        color:                   '#F59E0B',
      }}
    >
      <Star size={16} fill="#F59E0B" strokeWidth={1.8} />
    </button>
  )
}

// ─── Pill tabs ────────────────────────────────────────────────────────────────
// Shared between the in-page tab row and the sticky header's copy, so the two
// never visually diverge. Pure render function of (tabs, activeTab, onSelect).

function renderTabs(tabs, activeTab, onSelect) {
  return (
    <div style={{
      display:              'grid',
      gridTemplateColumns:  '1fr 1fr',
      gap:                  'var(--space-2)',
    }}>
      {tabs.map(tab => {
        const isActive = activeTab === tab.key
        return (
          <button
            key={tab.key}
            onClick={() => onSelect(tab.key)}
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
  )
}

// ─── Hero: logo + heading ───────────────────────────────────────────────────
// Matches ConditionsScreen's BrandRow spacing/logo sizing, minus the
// tagline and dark-mode toggle (this screen has neither today).

function FavouritesHero({ heroRef }) {
  return (
    <div ref={heroRef} style={{
      paddingTop:    'var(--space-5)',
      paddingBottom: 'calc(var(--space-3) - 4px)',
    }}>
      <div style={{
        display:      'flex',
        alignItems:   'center',
        gap:          'var(--space-2)',
        marginBottom: 8,
      }}>
        <img
          src="/capsula/logo.svg"
          alt="Capsula"
          className="capsula-logo"
          style={{ display: 'block', height: 30, width: 'auto' }}
        />
      </div>

      <h1 style={{
        fontSize:      20,
        fontWeight:    700,
        color:         'var(--color-text-primary)',
        margin:        0,
        letterSpacing: '-0.3px',
      }}>
        Favourites
      </h1>
    </div>
  )
}

// ─── Sliding sticky header ──────────────────────────────────────────────────
// Appears once FavouritesHero's logo scrolls out of view. Visual shell
// (position/zIndex/shadow/border-radius/transition) matches ConditionsScreen's
// StickyLogoHeader; content below the logo row is this screen's own tabs
// instead of a specialty pill + search icon.

function StickyFavouritesHeader({ visible, tabs, activeTab, onSelectTab }) {
  return (
    <div
      aria-hidden="true"
      style={{
        position:                'fixed',
        top:                     0,
        left:                    0,
        right:                   0,
        zIndex:                  50,
        backgroundColor:         'var(--color-surface)',
        borderBottomLeftRadius:  18,
        borderBottomRightRadius: 18,
        boxShadow:               '0 4px 12px rgba(0, 0, 0, 0.06)',
        transform:               visible ? 'translateY(0)' : 'translateY(-100%)',
        transition:              'transform 0.25s ease',
        pointerEvents:           visible ? 'auto' : 'none',
      }}
    >
      <div style={{ width: '100%', maxWidth: 680, margin: '0 auto' }}>

        {/* Logo row */}
        <div style={{
          display:    'flex',
          alignItems: 'center',
          padding:    '16px var(--space-6) 0',
        }}>
          <img
            src="/capsula/logo.svg"
            alt="Capsula"
            className="capsula-logo"
            style={{ display: 'block', height: 27, width: 'auto', flexShrink: 0 }}
          />
        </div>

        {/* Tabs — same content as the in-page row, kept in sync via renderTabs */}
        <div style={{
          marginTop: 10,
          padding:   '0 var(--space-6) 14px',
        }}>
          {renderTabs(tabs, activeTab, onSelectTab)}
        </div>

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

  // Wrapper that also triggers the snackbar (called on remove = already favourited)
  const handleRemoveDrug = useCallback((id) => {
    toggleDrug(id)
    showSnack()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toggleDrug])

  // Condition removal confirms first — see ConfirmSheet below.
  const [confirmingCondition, setConfirmingCondition] = useState(null)

  function handleConfirmRemoveCondition() {
    if (!confirmingCondition) return
    toggleCondition(confirmingCondition.id)
    showSnack()
  }

  const tabs = [
    { key: 'conditions', label: 'Conditions', count: savedConditions.length },
    { key: 'drugs',      label: 'Drugs',      count: savedDrugs.length      },
  ]

  // ── Sliding sticky header: visible once the hero logo leaves viewport ──────
  // Same IntersectionObserver approach as ConditionsScreen's brandRowRef watch.
  const [showStickyHeader, setShowStickyHeader] = useState(false)
  const heroRef = useRef(null)

  useEffect(() => {
    const el = heroRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        setShowStickyHeader(!entry.isIntersecting)
      },
      { threshold: 0, rootMargin: '-1px 0px 0px 0px' }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <Layout>

      {/* Sliding sticky header — appears once FavouritesHero scrolls out of view */}
      <StickyFavouritesHeader
        visible={showStickyHeader}
        tabs={tabs}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
      />

      <div>

        <FavouritesHero heroRef={heroRef} />

        {/* Symmetric pill tabs — equal width, centered, star icon */}
        <div style={{ marginBottom: 'var(--space-4)' }}>
          {renderTabs(tabs, activeTab, setActiveTab)}
        </div>

        {/* ── Conditions tab ── */}
        {activeTab === 'conditions' && (
          savedConditions.length === 0
            ? <EmptyState label="conditions" />
            : savedConditions.map((condition, i) => (
                <ConditionCard
                  key={condition.id}
                  condition={condition}
                  isLast={i === savedConditions.length - 1}
                  onTap={() => navigate(`/conditions/${condition.slug}`)}
                  trailing={
                    <RowStarButton
                      onPress={() => setConfirmingCondition(condition)}
                    />
                  }
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

      <ConfirmSheet
        isOpen={!!confirmingCondition}
        onClose={() => setConfirmingCondition(null)}
        onConfirm={handleConfirmRemoveCondition}
        title="Remove from favourites?"
        message={confirmingCondition ? `"${confirmingCondition.name}" will be removed from your favourites.` : ''}
        confirmLabel="Remove"
        destructive
      />

      <Snackbar visible={snackVisible} message="Removed from favourites" />
    </Layout>
  )
}
