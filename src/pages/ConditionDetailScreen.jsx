import { useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useConditionContext } from '../context/ConditionContext'
import PrescriptionsTab from '../components/conditions/PrescriptionsTab'
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

// ─── Tab strip ────────────────────────────────────────────────────────────────

const TABS = ['Prescriptions', 'Clinical Data']

// ─── ConditionDetailScreen ────────────────────────────────────────────────────

/**
 * ConditionDetailScreen — full detail view for one condition.
 *
 * Route: /conditions/:slug
 *
 * - Reads slug from params, looks up condition from ConditionContext
 * - Header: back button, name, specialty tag, age badge
 * - Two-tab strip: Prescriptions (default) | Clinical Data
 * - Swipe gesture: touchstart/touchend delta > 50px → switch tab
 * - CSS translate transition between tabs
 * - ClinicalDataTab deferred to Session 4.3 — renders a clear stub
 */
export default function ConditionDetailScreen() {
  const { slug }      = useParams()
  const navigate      = useNavigate()
  const { conditions, loading } = useConditionContext()

  const [activeTab, setActiveTab] = useState(0)      // 0=Prescriptions, 1=Clinical Data

  // ─── Touch / swipe state ──────────────────────────────────────────────────
  const touchStartX  = useRef(null)
  const touchStartY  = useRef(null)

  function handleTouchStart(e) {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }

  function handleTouchEnd(e) {
    if (touchStartX.current === null) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    const dy = e.changedTouches[0].clientY - touchStartY.current
    // Only treat as horizontal swipe if dx dominates (avoid scroll confusion)
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) {
      if (dx < 0 && activeTab < TABS.length - 1) setActiveTab(t => t + 1) // swipe left → next
      if (dx > 0 && activeTab > 0)               setActiveTab(t => t - 1) // swipe right → prev
    }
    touchStartX.current = null
    touchStartY.current = null
  }

  // ─── Loading / not-found guards ───────────────────────────────────────────

  if (loading) {
    return (
      <div style={{
        minHeight: '100dvh',
        backgroundColor: 'var(--color-bg)',
        fontFamily: 'var(--font-body)',
        paddingBottom: 80,
      }}>
        <DetailHeader onBack={() => navigate('/')} condition={null} />
        <div style={{
          maxWidth: 680, margin: '0 auto',
          padding: 'var(--space-8) var(--space-4)',
          textAlign: 'center',
          color: 'var(--color-text-tertiary)',
          fontSize: 14,
        }}>
          Loading…
        </div>
        <BottomNav />
      </div>
    )
  }

  const condition = conditions.find(c => c.slug === slug)

  if (!condition) {
    return (
      <div style={{
        minHeight: '100dvh',
        backgroundColor: 'var(--color-bg)',
        fontFamily: 'var(--font-body)',
        paddingBottom: 80,
      }}>
        <DetailHeader onBack={() => navigate('/')} condition={null} />
        <div style={{
          maxWidth: 680, margin: '0 auto',
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
        <BottomNav />
      </div>
    )
  }

  // ─── Main render ──────────────────────────────────────────────────────────

  return (
    <div style={{
      minHeight: '100dvh',
      backgroundColor: 'var(--color-bg)',
      fontFamily: 'var(--font-body)',
      color: 'var(--color-text-primary)',
      paddingBottom: 80, // BottomNav clearance
    }}>

      {/* ── Sticky header ── */}
      <DetailHeader onBack={() => navigate(-1)} condition={condition} />

      {/* ── Tab strip ── */}
      <div style={{
        position: 'sticky',
        top: 57,            // sits just below header (57px = header height)
        zIndex: 40,
        backgroundColor: 'var(--color-surface)',
        borderBottom: '1px solid var(--color-border)',
        display: 'flex',
        maxWidth: '100%',
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

      {/* ── Swipeable content viewport ── */}
      <div
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        style={{ overflow: 'hidden' }}
      >
        {/*
          Slide container: two panels side by side.
          CSS translate moves between panel 0 and panel 1.
        */}
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
            maxWidth: 680 / 2 * 2, // let max-width apply per-panel via inner wrapper
            boxSizing: 'border-box',
          }}>
            <div style={{ maxWidth: 680, margin: '0 auto' }}>
              <PrescriptionsTab
                prescriptions={condition.prescriptions}
                patientInstructions={condition.patientInstructions}
              />
            </div>
          </div>

          {/* Panel 1 — Clinical Data (stub — built in Session 4.3) */}
          <div style={{
            width: '50%',
            flexShrink: 0,
            padding: 'var(--space-5) var(--space-4)',
            boxSizing: 'border-box',
          }}>
            <div style={{ maxWidth: 680, margin: '0 auto' }}>
              <ClinicalDataStub condition={condition} />
            </div>
          </div>

        </div>
      </div>

      <BottomNav />
    </div>
  )
}

// ─── DetailHeader ─────────────────────────────────────────────────────────────

/**
 * Sticky header shared by loading, not-found, and main render states.
 * When condition is null (loading / not found), renders a minimal back bar.
 */
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
      {/* Back row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: condition ? 'var(--space-2)' : 0 }}>
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

      {/* Condition name + badges */}
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
            {/* Specialty tag */}
            {condition.specialtyName && (
              <span style={{
                fontSize: 11,
                fontWeight: 500,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                color: 'var(--color-text-tertiary)',
                backgroundColor: 'var(--color-bg)',
                border: '1px solid var(--color-border)',
                padding: '2px 8px',
                borderRadius: 'var(--radius-full)',
              }}>
                {condition.specialtyName}
              </span>
            )}

            {/* Age badge */}
            {condition.ageGroup && (
              <span style={{
                fontSize: 11,
                fontWeight: 500,
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

// ─── ClinicalDataStub ─────────────────────────────────────────────────────────

/**
 * Placeholder for Session 4.3 — ClinicalDataTab.
 * Shows a legible preview of raw clinical data so the screen isn't blank.
 */
function ClinicalDataStub({ condition }) {
  const hasAnything =
    condition.clinicalPicture ||
    condition.historyQuestions?.length ||
    condition.examination?.length ||
    condition.investigations?.length

  if (!hasAnything) {
    return (
      <div style={{
        textAlign: 'center',
        padding: 'var(--space-12) var(--space-4)',
        color: 'var(--color-text-tertiary)',
      }}>
        <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 'var(--space-2)' }}>
          Clinical data
        </div>
        <div style={{ fontSize: 12 }}>
          Full clinical data tab coming in Session 4.3
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>

      {condition.clinicalPicture && (
        <StubSection title="Clinical Picture">
          <p dir="auto" style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: 'var(--color-text-primary)' }}>
            {condition.clinicalPicture}
          </p>
        </StubSection>
      )}

      {condition.historyQuestions?.length > 0 && (
        <StubSection title="History Questions">
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {condition.historyQuestions.map((q, i) => (
              <li key={i} dir="auto" style={{
                fontSize: 14, color: 'var(--color-text-primary)', lineHeight: 1.5,
                paddingLeft: 'var(--space-4)', position: 'relative',
              }}>
                <span style={{ position: 'absolute', left: 0, color: 'var(--color-accent)', fontWeight: 700 }}>·</span>
                {q}
              </li>
            ))}
          </ul>
        </StubSection>
      )}

      {condition.examination?.length > 0 && (
        <StubSection title="Examination">
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {condition.examination.map((item, i) => (
              <li key={i} dir="auto" style={{
                fontSize: 14, color: 'var(--color-text-primary)', lineHeight: 1.5,
                paddingLeft: 'var(--space-4)', position: 'relative',
              }}>
                <span style={{ position: 'absolute', left: 0, color: 'var(--color-accent)', fontWeight: 700 }}>·</span>
                {item}
              </li>
            ))}
          </ul>
        </StubSection>
      )}

      {condition.investigations?.length > 0 && (
        <StubSection title="Investigations">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {condition.investigations.map((inv, i) => (
              <div key={i} style={{
                backgroundColor: 'var(--color-bg)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                padding: 'var(--space-2) var(--space-3)',
              }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: inv.note ? 2 : 0 }}>
                  {inv.test}
                </div>
                {inv.note && (
                  <div dir="auto" style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>
                    {inv.note}
                  </div>
                )}
              </div>
            ))}
          </div>
        </StubSection>
      )}

      <div style={{
        fontSize: 11,
        color: 'var(--color-text-tertiary)',
        textAlign: 'center',
        padding: 'var(--space-3)',
        fontStyle: 'italic',
      }}>
        Full collapsible sections + image gallery — Session 4.3
      </div>
    </div>
  )
}

function StubSection({ title, children }) {
  return (
    <div>
      <div style={{
        fontSize: 10, fontWeight: 700,
        letterSpacing: '0.1em', textTransform: 'uppercase',
        color: 'var(--color-text-tertiary)',
        marginBottom: 'var(--space-3)',
      }}>
        {title}
      </div>
      {children}
    </div>
  )
}
