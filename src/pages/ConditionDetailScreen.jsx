import { useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useConditionContext } from '../context/ConditionContext'
import PrescriptionsTab from '../components/conditions/PrescriptionsTab'
import ClinicalDataTab from '../components/conditions/ClinicalDataTab'
import BottomNav from '../components/BottomNav'

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

  if (loading) {
    return (
      <div style={pageStyle}>
        <DetailHeader onBack={() => navigate('/')} condition={null} />
        <div style={{ maxWidth: 680, margin: '0 auto', padding: 'var(--space-8) var(--space-4)', textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: 14 }}>
          Loading…
        </div>
        <BottomNav />
      </div>
    )
  }

  const condition = conditions.find(c => c.slug === slug)

  if (!condition) {
    return (
      <div style={pageStyle}>
        <DetailHeader onBack={() => navigate('/')} condition={null} />
        <div style={{ maxWidth: 680, margin: '0 auto', padding: 'var(--space-8) var(--space-4)', textAlign: 'center' }}>
          <div style={{ fontSize: 15, color: 'var(--color-text-secondary)', marginBottom: 'var(--space-2)' }}>Condition not found</div>
          <div style={{ fontSize: 13, color: 'var(--color-text-tertiary)' }}>"{slug}" does not match any condition in the database.</div>
        </div>
        <BottomNav />
      </div>
    )
  }

  return (
    <div style={pageStyle}>
      <DetailHeader onBack={() => navigate(-1)} condition={condition} />

      {/* Tab strip — full-width background, content centred */}
      <div style={{
        position: 'sticky',
        top: 57,
        zIndex: 40,
        backgroundColor: 'var(--color-surface)',
        borderBottom: '1px solid var(--color-border)',
      }}>
        <div style={{
          maxWidth: 680,
          margin: '0 auto',
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
                  borderBottom: isActive ? '2px solid var(--color-accent)' : '2px solid transparent',
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
      </div>

      {/*
        Swipeable viewport.
        overflow:hidden clips the off-screen panel.
        The inner 200%-wide row is fine because THIS element has overflow:hidden —
        it never causes a horizontal scrollbar on the page.
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
          <div style={{ width: '50%', flexShrink: 0, boxSizing: 'border-box' }}>
            <div style={{ maxWidth: 680, margin: '0 auto', padding: 'var(--space-5) var(--space-4)', paddingBottom: 'calc(var(--space-12) + 60px)' }}>
              <PrescriptionsTab
                prescriptions={condition.prescriptions}
                patientInstructions={condition.patientInstructions}
              />
            </div>
          </div>

          {/* Panel 1 — Clinical Data */}
          <div style={{ width: '50%', flexShrink: 0, boxSizing: 'border-box' }}>
            <div style={{ maxWidth: 680, margin: '0 auto', padding: 'var(--space-5) var(--space-4)', paddingBottom: 'calc(var(--space-12) + 60px)' }}>
              <ClinicalDataTab condition={condition} />
            </div>
          </div>

        </div>
      </div>

      <BottomNav />
    </div>
  )
}

// ─── Shared page style — same bg, no box ──────────────────────────────────────

const pageStyle = {
  minHeight: '100dvh',
  backgroundColor: 'var(--color-bg)',
  fontFamily: 'var(--font-body)',
  color: 'var(--color-text-primary)',
}

// ─── DetailHeader — full-width bg, content centred ────────────────────────────

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
    }}>
      <div style={{ maxWidth: 680, margin: '0 auto', padding: 'var(--space-3) var(--space-4)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: condition ? 'var(--space-2)' : 0 }}>
          <button
            onClick={onBack}
            aria-label="Back"
            style={{
              display: 'flex', alignItems: 'center', gap: 'var(--space-1)',
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--color-accent)', fontSize: 14, fontWeight: 500,
              fontFamily: 'var(--font-body)', padding: '4px 0',
              WebkitTapHighlightColor: 'transparent', outline: 'none',
            }}
          >
            <ArrowLeft size={16} strokeWidth={2} />
            Back
          </button>
        </div>

        {condition && (
          <div>
            <h1 style={{
              fontSize: 18, fontWeight: 700,
              color: 'var(--color-text-primary)',
              margin: '0 0 var(--space-2) 0',
              lineHeight: 1.25, letterSpacing: '-0.2px',
            }}>
              {condition.name}
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
              {condition.specialtyName && (
                <span style={{
                  fontSize: 11, fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase',
                  color: 'var(--color-text-tertiary)', backgroundColor: 'var(--color-bg)',
                  border: '1px solid var(--color-border)', padding: '2px 8px', borderRadius: 'var(--radius-full)',
                }}>
                  {condition.specialtyName}
                </span>
              )}
              {condition.ageGroup && (
                <span style={{
                  fontSize: 11, fontWeight: 500,
                  backgroundColor: ageStyle.bg, color: ageStyle.color,
                  padding: '2px 8px', borderRadius: 'var(--radius-full)',
                }}>
                  {ageLabel(condition.ageGroup)}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
