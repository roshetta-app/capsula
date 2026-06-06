import { useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useConditionContext } from '../context/ConditionContext'
import Layout from '../components/layout'
import PrescriptionsTab from '../components/conditions/PrescriptionsTab'

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
 * ConditionDetailScreen — full condition detail with two-tab layout.
 *
 * Reads :slug from route params, finds the condition from ConditionContext.
 * Tab 0 — Prescriptions (default)
 * Tab 1 — Clinical Data (stub — implemented in Session 4.3)
 *
 * Swipe: touch start/end horizontal delta > 50px triggers tab switch.
 */
export default function ConditionDetailScreen() {
  const { slug }              = useParams()
  const navigate              = useNavigate()
  const { conditions, loading } = useConditionContext()

  const [activeTab, setActiveTab]   = useState(0)
  const touchStartX                 = useRef(null)

  // ─── Find condition ──────────────────────────────────────────────────────

  const condition = conditions.find(c => c.slug === slug)

  // Loading state — data not in cache yet
  if (loading && !condition) {
    return (
      <Layout>
        <div style={{ paddingTop: 'var(--space-5)' }}>
          <div style={{
            height: 20, width: 80,
            backgroundColor: 'var(--color-border)',
            borderRadius: 'var(--radius-sm)',
            marginBottom: 'var(--space-5)',
            animation: 'shimmer 1.4s ease-in-out infinite',
          }} />
          <div style={{
            height: 28, width: '70%',
            backgroundColor: 'var(--color-border)',
            borderRadius: 'var(--radius-sm)',
            marginBottom: 'var(--space-3)',
            animation: 'shimmer 1.4s ease-in-out infinite',
          }} />
        </div>
      </Layout>
    )
  }

  // Not found
  if (!condition) {
    return (
      <Layout>
        <div style={{ paddingTop: 'var(--space-5)' }}>
          <button
            onClick={() => navigate('/')}
            style={{
              display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--color-accent)', fontSize: 14,
              fontFamily: 'var(--font-body)', fontWeight: 500,
              padding: '0 0 var(--space-5)',
            }}
          >
            <ArrowLeft size={16} />
            Back
          </button>
          <div style={{
            textAlign: 'center', padding: 'var(--space-12) var(--space-4)',
            color: 'var(--color-text-tertiary)',
          }}>
            <div style={{ fontSize: 15, fontWeight: 500 }}>Condition not found</div>
            <div style={{ fontSize: 13, marginTop: 'var(--space-2)' }}>
              It may have been removed or the link is incorrect.
            </div>
          </div>
        </div>
      </Layout>
    )
  }

  const ageStyle = AGE_STYLES[condition.ageGroup] ?? { bg: '#F3F4F6', color: '#374151' }

  // ─── Swipe handlers ───────────────────────────────────────────────────────

  function handleTouchStart(e) {
    touchStartX.current = e.touches[0].clientX
  }

  function handleTouchEnd(e) {
    if (touchStartX.current === null) return
    const delta = e.changedTouches[0].clientX - touchStartX.current
    touchStartX.current = null
    if (Math.abs(delta) < 50) return
    if (delta < 0 && activeTab < TABS.length - 1) setActiveTab(t => t + 1)
    if (delta > 0 && activeTab > 0)               setActiveTab(t => t - 1)
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <Layout>
      <div style={{ paddingTop: 'var(--space-4)' }}>

        {/* Back button */}
        <button
          onClick={() => navigate('/')}
          style={{
            display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--color-accent)', fontSize: 14,
            fontFamily: 'var(--font-body)', fontWeight: 500,
            padding: '0 0 var(--space-4)',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          <ArrowLeft size={16} />
          Back
        </button>

        {/* Header */}
        <div style={{ marginBottom: 'var(--space-5)' }}>
          {/* Specialty tag + age badge row */}
          <div style={{
            display: 'flex', alignItems: 'center',
            gap: 'var(--space-2)', marginBottom: 'var(--space-3)',
            flexWrap: 'wrap',
          }}>
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
                backgroundColor: ageStyle.bg, color: ageStyle.color,
                padding: '2px 8px',
                borderRadius: 'var(--radius-full)',
              }}>
                {ageLabel(condition.ageGroup)}
              </span>
            )}
          </div>

          {/* Condition name */}
          <h1 style={{
            fontSize: 22, fontWeight: 700,
            color: 'var(--color-text-primary)',
            lineHeight: 1.25, margin: 0,
            letterSpacing: '-0.3px',
          }}>
            {condition.name}
          </h1>
        </div>

        {/* Tab strip */}
        <div style={{
          display: 'flex',
          borderBottom: '2px solid var(--color-border)',
          marginBottom: 'var(--space-5)',
          gap: 0,
        }}>
          {TABS.map((tab, i) => {
            const isActive = activeTab === i
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(i)}
                style={{
                  flex: 1,
                  padding: 'var(--space-3) var(--space-2)',
                  background: 'none',
                  border: 'none',
                  borderBottom: isActive
                    ? '2px solid var(--color-accent)'
                    : '2px solid transparent',
                  marginBottom: -2,
                  cursor: 'pointer',
                  fontSize: 14,
                  fontWeight: isActive ? 600 : 400,
                  fontFamily: 'var(--font-body)',
                  color: isActive ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                  transition: 'color 0.15s ease, border-color 0.15s ease',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                {tab}
              </button>
            )
          })}
        </div>

        {/* Tab content — swipeable */}
        <div
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {activeTab === 0 && (
            <PrescriptionsTab
              prescriptions={condition.prescriptions}
              patientInstructions={condition.patientInstructions}
            />
          )}

          {activeTab === 1 && (
            <ClinicalDataStub condition={condition} />
          )}
        </div>

      </div>
    </Layout>
  )
}

// ─── Clinical Data stub ───────────────────────────────────────────────────────
// Full implementation in Session 4.3.
// Shows enough real data to be useful now (clinical picture + raw lists).

function ClinicalDataStub({ condition }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>

      {condition.clinicalPicture && (
        <Section title="Clinical Picture">
          <p dir="auto" style={{
            fontSize: 14, color: 'var(--color-text-primary)',
            lineHeight: 1.7, margin: 0,
          }}>
            {condition.clinicalPicture}
          </p>
        </Section>
      )}

      {condition.historyQuestions?.length > 0 && (
        <Section title="History Questions">
          <BulletList items={condition.historyQuestions} />
        </Section>
      )}

      {condition.examination?.length > 0 && (
        <Section title="Examination">
          <BulletList items={condition.examination} />
        </Section>
      )}

      {condition.investigations?.length > 0 && (
        <Section title="Investigations">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {condition.investigations.map((inv, i) => (
              <div key={i}>
                <div style={{
                  fontSize: 14, fontWeight: 600,
                  color: 'var(--color-text-primary)',
                  marginBottom: 2,
                }}>
                  {inv.test}
                </div>
                {inv.note && (
                  <div style={{
                    fontSize: 13,
                    color: 'var(--color-text-secondary)',
                    lineHeight: 1.5,
                  }}>
                    {inv.note}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      <div style={{
        textAlign: 'center',
        padding: 'var(--space-4)',
        color: 'var(--color-text-tertiary)',
        fontSize: 12,
        backgroundColor: 'var(--color-bg)',
        borderRadius: 'var(--radius-md)',
        border: '1px dashed var(--color-border)',
      }}>
        Collapsible sections + image gallery coming in Session 4.3
      </div>
    </div>
  )
}

function Section({ title, children }) {
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
      <div style={{
        height: 1,
        backgroundColor: 'var(--color-border-subtle)',
        marginTop: 'var(--space-5)',
      }} />
    </div>
  )
}

function BulletList({ items }) {
  return (
    <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
      {items.map((item, i) => (
        <li key={i} dir="auto" style={{
          fontSize: 14,
          color: 'var(--color-text-primary)',
          lineHeight: 1.6,
          paddingLeft: 'var(--space-4)',
          position: 'relative',
          marginBottom: 'var(--space-2)',
        }}>
          <span style={{
            position: 'absolute', left: 0,
            color: 'var(--color-accent)', fontWeight: 700,
          }}>·</span>
          {item}
        </li>
      ))}
    </ul>
  )
}
