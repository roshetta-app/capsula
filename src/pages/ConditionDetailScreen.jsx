import { useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useConditionContext } from '../context/ConditionContext'
import PrescriptionsTab from '../components/conditions/PrescriptionsTab'
import ClinicalDataTab from '../components/conditions/ClinicalDataTab'
import BottomNav from '../components/BottomNav'

// ─── Age badge ────────────────────────────────────────────────────────────────

const AGE_STYLES = {
  adult:     { bg: '#DBEAFE', color: '#1E40AF' },
  pediatric: { bg: '#D1FAE5', color: '#065F46' },
  both:      { bg: '#EDE9FE', color: '#5B21B6' },
}

function ageLabel(group) {
  if (group === 'pediatric') return 'Pediatric'
  if (group === 'both')      return 'All ages'
  return 'Adult'
}

const TABS = ['Prescriptions', 'Clinical Data']

const MAX_W = 680

/**
 * ConditionDetailScreen — /conditions/:slug
 *
 * Responsive fix: the whole screen is wrapped in the same 680px centred
 * column as Layout. The swipeable slide container is now scoped inside
 * that column so the 200% trick doesn't bleed to 2800px on a wide monitor.
 *
 * On desktop the swipe gesture still works; the user can also click tabs.
 */
export default function ConditionDetailScreen() {
  const { slug }    = useParams()
  const navigate    = useNavigate()
  const { conditions, loading } = useConditionContext()

  const [activeTab, setActiveTab] = useState(0)

  const touchStartX = useRef(null)
  const touchStartY = useRef(null)

  function handleTouchStart(e) {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }

  function handleTouchEnd(e) {
    if (touchStartX.current === null) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    const dy = e.changedTouches[0].clientY - touchStartY.current
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) {
      if (dx < 0 && activeTab < TABS.length - 1) setActiveTab(t => t + 1)
      if (dx > 0 && activeTab > 0)               setActiveTab(t => t - 1)
    }
    touchStartX.current = null
    touchStartY.current = null
  }

  // ─── Loading ──────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <Shell>
        <DetailHeader onBack={() => navigate('/')} condition={null} />
        <div style={{
          padding: 'var(--space-8) var(--space-4)',
          textAlign: 'center',
          color: 'var(--color-text-tertiary)',
          fontSize: 14,
        }}>
          Loading…
        </div>
      </Shell>
    )
  }

  const condition = conditions.find(c => c.slug === slug)

  // ─── Not found ────────────────────────────────────────────────────────────

  if (!condition) {
    return (
      <Shell>
        <DetailHeader onBack={() => navigate('/')} condition={null} />
        <div style={{
          padding: 'var(--space-8) var(--space-4)',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 15, color: 'var(--color-text-secondary)', marginBottom: 'var(--space-2)' }}>
            Condition not found
          </div>
          <div style={{ fontSize: 13, color: 'var(--color-text-tertiary)' }}>
            "{slug}" does not match any condition in the database.
          </div>
        </div>
      </Shell>
    )
  }

  // ─── Main render ──────────────────────────────────────────────────────────

  return (
    <Shell>
      {/* Sticky header */}
      <DetailHeader onBack={() => navigate(-1)} condition={condition} />

      {/* Tab strip — sticky below header */}
      <div style={{
        position: 'sticky',
        top: 57,
        zIndex: 40,
        backgroundColor: 'var(--color-surface)',
        borderBottom: '1px solid var(--color-border)',
        display: 'flex',
      }}>
        {TABS.map((label, i) => {
          const isActive = activeTab === i
          return (
            <button
              key={label}
              onClick={() => setActiveTab(i)}
              style={{
                flex: 1,
                padding: 'var(--space-3) var(--space-4)',
                fontSize: 14,
                fontWeight: isActive ? 600 : 400,
                fontFamily: 'var(--font-body)',
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                color: isActive ? 'var(--color-accent)' : 'var(--color-text-tertiary)',
                borderBottom: isActive
                  ? '2px solid var(--color-accent)'
                  : '2px solid transparent',
                transition: 'color 0.15s ease, border-color 0.15s ease',
                WebkitTapHighlightColor: 'transparent',
                outline: 'none',
              }}
            >
              {label}
            </button>
          )
        })}
      </div>

      {/*
        Swipeable content viewport.
        KEY FIX: overflow:hidden is on THIS element, which is already
        constrained to 680px by the Shell column. So the 200% inner
        width = 1360px max, not 2×viewport.
      */}
      <div
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        style={{ overflow: 'hidden' }}
      >
        <div style={{
          display: 'flex',
          width: '200%',
          transform: `translateX(${activeTab === 0 ? '0%' : '-50%'})`,
          transition: 'transform 0.28s cubic-bezier(0.4, 0, 0.2, 1)',
        }}>
          {/* Panel 0 — Prescriptions */}
          <div style={{
            width: '50%',
            flexShrink: 0,
            padding: 'var(--space-5) var(--space-4)',
            boxSizing: 'border-box',
          }}>
            <PrescriptionsTab
              prescriptions={condition.prescriptions}
              patientInstructions={condition.patientInstructions}
            />
          </div>

          {/* Panel 1 — Clinical Data */}
          <div style={{
            width: '50%',
            flexShrink: 0,
            padding: 'var(--space-5) var(--space-4)',
            boxSizing: 'border-box',
          }}>
            <ClinicalDataTab condition={condition} />
          </div>
        </div>
      </div>
    </Shell>
  )
}

// ─── Shell — centred 680px column matching Layout ─────────────────────────────

function Shell({ children }) {
  return (
    <div style={{
      minHeight: '100dvh',
      backgroundColor: 'var(--color-bg-outer)',
      fontFamily: 'var(--font-body)',
      color: 'var(--color-text-primary)',
    }}>
      <div style={{
        maxWidth: MAX_W,
        margin: '0 auto',
        minHeight: '100dvh',
        backgroundColor: 'var(--color-bg)',
        boxShadow: '0 0 0 1px var(--color-border)',
        display: 'flex',
        flexDirection: 'column',
        paddingBottom: 60, // BottomNav clearance
      }}>
        {children}
        <BottomNav />
      </div>
    </div>
  )
}

// ─── DetailHeader ─────────────────────────────────────────────────────────────

function DetailHeader({ onBack, condition }) {
  const ageStyle = condition
    ? (AGE_STYLES[condition.ageGroup] ?? { bg: '#F3F4F6', color: '#374151' })
    : null

  return (
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 50,
      backgroundColor: 'var(--color-surface)',
      borderBottom: '1px solid var(--color-border)',
      padding: 'var(--space-3) var(--space-4)',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
        marginBottom: condition ? 'var(--space-2)' : 0,
      }}>
        <button
          onClick={onBack}
          aria-label="Back"
          style={{
            display: 'flex', alignItems: 'center', gap: 'var(--space-1)',
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--color-accent)', fontSize: 14, fontWeight: 500,
            fontFamily: 'var(--font-body)',
            padding: '4px 0',
            WebkitTapHighlightColor: 'transparent',
            outline: 'none',
          }}
        >
          <ArrowLeft size={16} strokeWidth={2} />
          Back
        </button>
      </div>

      {condition && (
        <div>
          <h1 style={{
            fontSize: 18,
            fontWeight: 700,
            color: 'var(--color-text-primary)',
            margin: '0 0 var(--space-2) 0',
            lineHeight: 1.25,
            letterSpacing: '-0.2px',
          }}>
            {condition.name}
          </h1>

          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
            {condition.specialtyName && (
              <span style={{
                fontSize: 11, fontWeight: 500,
                letterSpacing: '0.04em', textTransform: 'uppercase',
                color: 'var(--color-text-tertiary)',
                backgroundColor: 'var(--color-bg)',
                border: '1px solid var(--color-border)',
                padding: '2px 8px',
                borderRadius: 'var(--radius-full)',
              }}>
                {condition.specialtyName}
              </span>
            )}
            {condition.ageGroup && (
              <span style={{
                fontSize: 11, fontWeight: 500,
                backgroundColor: ageStyle.bg,
                color: ageStyle.color,
                padding: '2px 8px',
                borderRadius: 'var(--radius-full)',
              }}>
                {ageLabel(condition.ageGroup)}
              </span>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
