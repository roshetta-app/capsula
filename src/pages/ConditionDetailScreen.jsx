import { useState, useRef, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useConditionContext } from '../context/ConditionContext'
import { useFavouritesContext } from '../context/FavouritesContext'
import { useRecentlyViewed } from '../hooks/useRecentlyViewed'
import PrescriptionsTab from '../components/conditions/PrescriptionsTab'
import ClinicalDataTab from '../components/conditions/ClinicalDataTab'
import BottomNav from '../components/BottomNav'
import ShareCard from '../components/ui/ShareCard'
import { shareConditionPrescription } from '../utils/sharing'
import { logUsageEvent } from '../analytics/usageEvents'

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

// ─── Tab icon SVGs (inline — no icon lib needed) ──────────────────────────────

/** Pill icon for Treatment tab */
function IconPill({ color }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.5 20H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v7.5" />
      <circle cx="17" cy="17" r="5" />
      <path d="m14.5 19.5 5-5" />
    </svg>
  )
}

/** Stethoscope icon for Clinical tab */
function IconStethoscope({ color }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3" />
      <path d="M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4" />
      <circle cx="20" cy="10" r="2" />
    </svg>
  )
}

const TABS = [
  { label: 'Treatment', renderIcon: (color) => <IconPill color={color} /> },
  { label: 'Clinical',  renderIcon: (color) => <IconStethoscope color={color} /> },
]

export default function ConditionDetailScreen() {
  const { slug }    = useParams()
  const navigate    = useNavigate()
  const { conditions, loading } = useConditionContext()
  const { isConditionFavourited, toggleCondition } = useFavouritesContext()
  const { addRecentlyViewed } = useRecentlyViewed()

  const [activeTab, setActiveTab] = useState(0)
  const touchStartX  = useRef(null)
  const touchStartY  = useRef(null)
  const shareCardRef = useRef(null)

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

  const condition = conditions.find(c => c.slug === slug)
  const isFav = condition ? isConditionFavourited(condition.id) : false

  useEffect(() => {
    if (condition) {
      addRecentlyViewed({ id: condition.id, name: condition.name, slug: condition.slug })
      logUsageEvent('condition_view', condition.id, condition.name)
    }
  }, [condition?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  function buildSharePrescription() {
    const rx = condition?.prescriptions?.[0]
    if (!rx) return null
    return {
      label: rx.label,
      drugs: (rx.drugs ?? []).map(d => ({
        brandName:     d.primaryBrand ?? d.brandName ?? d.name ?? '',
        concentration: d.concentration ?? '',
        form:          d.form ?? '',
        dose:          d.dose_override ?? d.instruction ?? '',
        note:          d.drug_note ?? '',
      })),
    }
  }

  function handleShare() {
    shareConditionPrescription(condition, buildSharePrescription(), shareCardRef)
  }

  if (loading) {
    return (
      <div style={pageStyle}>
        <DetailHeader onBack={() => navigate('/')} condition={null} activeTab={activeTab} setActiveTab={setActiveTab} />
        <div style={{ maxWidth: 680, margin: '0 auto', padding: 'var(--space-8) var(--space-4)', textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: 14 }}>
          Loading…
        </div>
        <BottomNav />
      </div>
    )
  }

  if (!condition) {
    return (
      <div style={pageStyle}>
        <DetailHeader onBack={() => navigate('/')} condition={null} activeTab={activeTab} setActiveTab={setActiveTab} />
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
      {/* ─── Header + Tab strip — one combined sticky block, one border at bottom */}
      <DetailHeader
        onBack={() => navigate(-1)}
        condition={condition}
        isFav={isFav}
        onFavToggle={() => toggleCondition(condition.id)}
        onShare={handleShare}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Hidden ShareCard */}
      <div style={{ position: 'fixed', top: -9999, left: -9999, zIndex: -1, pointerEvents: 'none' }}>
        <ShareCard
          ref={shareCardRef}
          condition={{ name: condition.name, specialtyName: condition.specialtyName }}
          prescription={buildSharePrescription()}
        />
      </div>

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
                blocks={condition.blocks ?? []}
                conditionId={condition.id}
              />
            </div>
          </div>

          {/* Panel 1 — Clinical Data */}
          <div style={{ width: '50%', flexShrink: 0, boxSizing: 'border-box' }}>
            <div style={{ maxWidth: 680, margin: '0 auto', padding: 'var(--space-5) var(--space-4)', paddingBottom: 'calc(var(--space-12) + 60px)' }}>
              <ClinicalDataTab blocks={condition.blocks ?? []} />
            </div>
          </div>

        </div>
      </div>

      <BottomNav />
    </div>
  )
}

// ─── Shared page style ────────────────────────────────────────────────────────

const pageStyle = {
  minHeight: '100dvh',
  backgroundColor: 'var(--color-bg)',
  fontFamily: 'var(--font-body)',
  color: 'var(--color-text-primary)',
}

// ─── DetailHeader — includes tab strip, one sticky block, one bottom border ───

function DetailHeader({ onBack, condition, isFav, onFavToggle, onShare, activeTab, setActiveTab }) {
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
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '10px var(--space-4) 0' }}>

        {/* Top row: back + actions */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: condition ? 6 : 'var(--space-2)' }}>
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

          {condition && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <button
                onClick={onShare}
                aria-label="Share prescription"
                style={{
                  background: 'none', border: 'none', cursor: 'pointer', padding: 4,
                  color: 'var(--color-text-tertiary)',
                  WebkitTapHighlightColor: 'transparent', outline: 'none',
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24"
                  fill="none" stroke="currentColor" strokeWidth="2"
                  strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                  <polyline points="16 6 12 2 8 6" />
                  <line x1="12" y1="2" x2="12" y2="15" />
                </svg>
              </button>

              <button
                onClick={onFavToggle}
                aria-label={isFav ? 'Remove from favourites' : 'Add to favourites'}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer', padding: 4,
                  color: isFav ? '#F59E0B' : 'var(--color-text-tertiary)',
                  transition: 'color 0.15s ease',
                  WebkitTapHighlightColor: 'transparent', outline: 'none',
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24"
                  fill={isFav ? 'currentColor' : 'none'}
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                </svg>
              </button>
            </div>
          )}
        </div>

        {/* Condition title + tags */}
        {condition && (
          <div style={{ marginBottom: 6 }}>
            <h1 style={{
              fontSize: 18, fontWeight: 700,
              color: 'var(--color-text-primary)',
              margin: '0 0 5px 0',
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

        {/* ─── Tab strip — inside header, icon inline before label, underline below */}
        <div style={{ display: 'flex', marginTop: 'var(--space-2)' }}>
          {TABS.map(({ label, renderIcon }, i) => {
            const isActive = activeTab === i
            const color = isActive ? 'var(--color-accent)' : 'var(--color-text-tertiary)'
            return (
              <div key={label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <button
                  onClick={() => setActiveTab(i)}
                  style={{
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    paddingTop: 6,
                    paddingBottom: 8,
                    paddingLeft: 'var(--space-2)',
                    paddingRight: 'var(--space-2)',
                    border: 'none',
                    background: 'none',
                    cursor: 'pointer',
                    transition: 'color 0.15s ease',
                    WebkitTapHighlightColor: 'transparent',
                    outline: 'none',
                    color,
                  }}
                >
                  {renderIcon(color)}
                  <span style={{
                    fontSize: 14,
                    fontWeight: isActive ? 600 : 400,
                    color,
                  }}>
                    {label}
                  </span>
                </button>
                {/* Underline — sibling below the button row, centered */}
                <span style={{
                  display: 'block',
                  height: 2,
                  width: 32,
                  borderRadius: 1,
                  backgroundColor: isActive ? 'var(--color-accent)' : 'transparent',
                  transition: 'background-color 0.15s ease',
                }} />
              </div>
            )
          })}
        </div>

      </div>
    </header>
  )
}
