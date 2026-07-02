import { useState, useRef, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Share2 } from 'lucide-react'
import { useConditionContext } from '../context/ConditionContext'
import { useFavouritesContext } from '../context/FavouritesContext'
import { useRecentlyViewed } from '../hooks/useRecentlyViewed'
import { useVisualViewport } from '../hooks/useVisualViewport'
import PrescriptionsTab from '../components/conditions/PrescriptionsTab'
import ClinicalDataTab from '../components/conditions/ClinicalDataTab'
import BottomNav from '../components/BottomNav'
import ShareCard from '../components/ui/ShareCard'
import { shareConditionPrescription } from '../utils/sharing'
import { logUsageEvent } from '../analytics/usageEvents'
import { SpecialtyIcon, useIsDark } from '../utils/specialtyIcon'
import { resolveToken, FALLBACK_TOKEN } from '../utils/specialtyTokens'

// ─── Tab icon SVGs ────────────────────────────────────────────────────────────

/**
 * Writing hand icon — replaces the Rx glyph on the Treatment tab.
 * Implies active clinical authoring / prescribing rather than a typographic symbol.
 */
function IconWritingHand({ color }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  )
}

/** Stethoscope icon for Clinical tab — unchanged */
function IconStethoscope({ color }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3" />
      <path d="M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4" />
      <circle cx="20" cy="10" r="2" />
    </svg>
  )
}

const TABS = [
  { label: 'Treatment', renderIcon: (color) => <IconWritingHand color={color} /> },
  { label: 'Clinical',  renderIcon: (color) => <IconStethoscope color={color} /> },
]

export default function ConditionDetailScreen() {
  const { slug }    = useParams()
  const navigate    = useNavigate()
  const { conditions, loading } = useConditionContext()
  const { isConditionFavourited, toggleCondition } = useFavouritesContext()
  const { addRecentlyViewed } = useRecentlyViewed()

  // Refresh-safe viewport height — 100dvh alone can be measured against a
  // not-yet-settled viewport on first paint (e.g. right after a hard
  // reload/PWA cold launch), before the OS/browser has reported its final
  // safe usable area. This hook re-measures via visualViewport and writes
  // the corrected value to --viewport-height, which pageStyle below reads.
  useVisualViewport()

  const [activeTab, setActiveTab] = useState(0)
  const touchStartX  = useRef(null)
  const touchStartY  = useRef(null)
  const shareCardRef = useRef(null)
  const prescriptionsPanelRef = useRef(null)
  const clinicalPanelRef      = useRef(null)

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

  // Only contain overscroll right at the bottom edge of a panel — leaving
  // the top edge on the browser's default ('auto') so pull-to-reload from
  // the top of the tab content keeps working. Toggled dynamically rather
  // than set statically, since overscroll-behavior applies to both edges
  // of an axis and can't otherwise distinguish "leak up past the bottom"
  // (unwanted) from "leak down past the top" (wanted, for refresh).
  function evaluatePanelOverscroll(el) {
    if (!el) return
    // A panel with too little content to scroll (e.g. an empty tab) never
    // fires a scroll event, so relying on onScroll alone leaves it
    // permanently unguarded. scrollHeight <= clientHeight here means
    // "nothing to scroll" — treat that the same as "at the bottom."
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 2
    el.style.overscrollBehaviorY = atBottom ? 'contain' : 'auto'
  }

  function handlePanelScroll(e) {
    // Throttled to once per rendered frame — onScroll can fire far more
    // often than the screen repaints, and evaluatePanelOverscroll reads
    // layout (scrollHeight/scrollTop/clientHeight) and writes a style back,
    // which is unnecessary work to repeat more often than a frame actually
    // needs it. rafPending guards against queuing more than one callback
    // per panel per frame.
    const el = e.currentTarget
    if (el._overscrollRafPending) return
    el._overscrollRafPending = true
    requestAnimationFrame(() => {
      el._overscrollRafPending = false
      evaluatePanelOverscroll(el)
    })
  }

  const condition = conditions.find(c => c.slug === slug)

  // Re-evaluate on mount and whenever the loaded condition or content
  // changes — covers panels that start out too short to ever scroll,
  // which would otherwise never trigger the onScroll-based check above.
  useEffect(() => {
    evaluatePanelOverscroll(prescriptionsPanelRef.current)
    evaluatePanelOverscroll(clinicalPanelRef.current)
  }, [condition?.id])

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
        <div style={{ maxWidth: 680, margin: '0 auto', padding: 'var(--space-8) var(--space-6)', textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: 14 }}>
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
        <div style={{ maxWidth: 680, margin: '0 auto', padding: 'var(--space-8) var(--space-6)', textAlign: 'center' }}>
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
        style={{ flex: 1, minHeight: 0, overflow: 'hidden', position: 'relative' }}
      >
        <div style={{
          display: 'flex',
          width: '200%',
          height: '100%',
          transform: `translateX(${activeTab === 0 ? '0%' : '-50%'})`,
          transition: 'transform 0.28s cubic-bezier(0.4, 0, 0.2, 1)',
        }}>

          {/* Panel 0 — Prescriptions. Each panel owns its own vertical scroll
              (overflowY: auto) instead of sharing the page's document scroll —
              otherwise the page's scroll height was driven by whichever tab
              had more content, letting the shorter tab scroll into blank
              space that belonged to the other, hidden tab. */}
          <div ref={prescriptionsPanelRef} onScroll={handlePanelScroll} style={{ width: '50%', height: '100%', flexShrink: 0, boxSizing: 'border-box', overflowY: 'auto', WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}>
            <div style={{
              maxWidth: 680,
              margin: '0 auto',
              padding: 'var(--space-5) var(--space-6)',
              paddingBottom: 'calc(60px + env(safe-area-inset-bottom) + var(--space-4))',
            }}>
              <PrescriptionsTab
                blocks={condition.blocks ?? []}
                conditionId={condition.id}
              />
            </div>
          </div>

          {/* Panel 1 — Clinical Data */}
          <div ref={clinicalPanelRef} onScroll={handlePanelScroll} style={{ width: '50%', height: '100%', flexShrink: 0, boxSizing: 'border-box', overflowY: 'auto', WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}>
            <div style={{
              maxWidth: 680,
              margin: '0 auto',
              padding: 'var(--space-5) var(--space-6)',
              paddingBottom: 'calc(60px + env(safe-area-inset-bottom) + var(--space-4))',
            }}>
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
  height: 'var(--viewport-height, 100dvh)',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  backgroundColor: 'var(--color-bg)',
  fontFamily: 'var(--font-body)',
  color: 'var(--color-text-primary)',
}

// ─── DetailHeader ─────────────────────────────────────────────────────────────

function DetailHeader({ onBack, condition, isFav, onFavToggle, onShare, activeTab, setActiveTab }) {
  const isDark = useIsDark()

  const tokenKey  = condition?.specialtyColorToken ?? FALLBACK_TOKEN
  const iconType  = condition?.specialtyIconType   ?? 'lucide'
  const iconValue = iconType === 'custom'
    ? (condition?.specialtyIconUrl  ?? '')
    : (condition?.specialtyIcon     ?? 'Stethoscope')
  const colors    = resolveToken(tokenKey, isDark)

  return (
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 50,
      backgroundColor: 'var(--color-surface)',
      borderRadius: '0 0 18px 18px',
      boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
      // Header has no scroll content of its own — without this, a touch
      // starting here has nothing local to consume it and the browser
      // treats it as a page drag (including triggering pull-to-reload).
      touchAction: 'none',
    }}>
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '12px var(--space-6) 0' }}>

        {/* Top row: Back button + specialty icon/label now share a single
            row (previously two stacked rows) — removes a full row of
            vertical space from the sticky header. Share + favourite
            icons stay pinned to the right edge of this same row. */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: condition ? 8 : 'var(--space-2)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', minWidth: 0 }}>
            <button
              onClick={onBack}
              aria-label="Back"
              style={{
                display: 'flex', alignItems: 'center', gap: 'var(--space-1)',
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--color-accent)', fontSize: 14, fontWeight: 500,
                fontFamily: 'var(--font-body)', padding: '4px 0',
                WebkitTapHighlightColor: 'transparent', outline: 'none',
                flexShrink: 0,
              }}
            >
              <ArrowLeft size={16} strokeWidth={2} />
              Back
            </button>

            {condition && condition.specialtyName && (
              <>
                {/* Dot divider — separates Back from the specialty group
                    without a line/dash competing visually with either
                    side. Muted to the same tone as the specialty group. */}
                <span
                  aria-hidden="true"
                  style={{
                    width: 3,
                    height: 3,
                    borderRadius: '50%',
                    backgroundColor: 'var(--color-text-tertiary)',
                    opacity: 0.6,
                    flexShrink: 0,
                  }}
                />

                {/* Specialty icon + label — sized down one point and muted
                    (opacity) relative to Back, so Back reads as the clear
                    primary action and this reads as secondary metadata. */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 0, opacity: 0.75 }}>
                  <SpecialtyIcon
                    iconType={iconType}
                    iconValue={iconValue}
                    size={11}
                    color={colors.fg}
                  />
                  <span style={{
                    fontSize: 12,
                    fontWeight: 400,
                    letterSpacing: '0.03em',
                    color: 'var(--color-text-secondary)',
                    lineHeight: 1,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}>
                    {condition.specialtyName}
                  </span>
                </div>
              </>
            )}
          </div>

          {condition && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
              <button
                onClick={onShare}
                aria-label="Share prescription"
                style={{
                  background: 'none', border: 'none', cursor: 'pointer', padding: 2,
                  color: 'var(--color-text-tertiary)',
                  WebkitTapHighlightColor: 'transparent', outline: 'none',
                }}
              >
                <Share2 size={20} strokeWidth={2} />
              </button>

              <button
                onClick={onFavToggle}
                aria-label={isFav ? 'Remove from favourites' : 'Add to favourites'}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer', padding: 2,
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

        {/* Condition title */}
        {condition && (
          <h1 style={{
            fontSize: 22,
            fontWeight: 600,
            color: 'var(--color-text-primary)',
            margin: '0 0 10px 0',
            lineHeight: 1.2,
            letterSpacing: '-0.4px',
          }}>
            {condition.name}
          </h1>
        )}

        {/* ─── Tab strip ─────────────────────────────────────────────────────── */}
        <div style={{ display: 'flex' }}>
          {TABS.map(({ label, renderIcon }, i) => {
            const isActive = activeTab === i
            // Inactive tab contrast — text-secondary (was text-tertiary), matching
            // the BottomNav Phase 15 fix: inactive tabs must stay clearly readable
            // without competing with the active accent tab.
            const color = isActive ? 'var(--color-accent)' : 'var(--color-text-secondary)'
            return (
              <div
                key={label}
                style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}
              >
                <button
                  onClick={() => setActiveTab(i)}
                  style={{
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    paddingTop: 7,
                    paddingBottom: 7,
                    paddingLeft: 'var(--space-2)',
                    paddingRight: 'var(--space-2)',
                    width: '100%',
                    justifyContent: 'center',
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
                    fontSize: 13,
                    fontWeight: isActive ? 600 : 500,
                    color,
                  }}>
                    {label}
                  </span>
                </button>
                {/* Underline — full width of the tab cell, flush edge-to-edge */}
                <span style={{
                  display: 'block',
                  height: 1.5,
                  width: '100%',
                  borderRadius: '1px 1px 0 0',
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
