import { useState, useRef, useEffect, useLayoutEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Share2 } from 'lucide-react'
import { useConditionContext } from '../context/ConditionContext'
import { useFavouritesContext } from '../context/FavouritesContext'
import { useRecentlyViewed } from '../hooks/useRecentlyViewed'
import { useKeyboardOpen } from '../hooks/useKeyboardOpen'
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

  const [activeTab, setActiveTab] = useState(0)
  const touchStartX  = useRef(null)
  const touchStartY  = useRef(null)
  const shareCardRef = useRef(null)
  const tabDirection  = useRef(1) // +1 = forward (slide from right), -1 = backward (slide from left)

  // Tracks whether the user has actually switched tabs at least once (tap
  // or swipe). Stays false through the very first render — mount and page
  // refresh — so the slide animation never plays on load, only once a real
  // switch has happened.
  const hasSwitchedRef = useRef(false)

  // Per-tab scroll memory — since only the active tab's content exists in
  // the box at a time, its scroll position has to be saved per tab
  // manually on switch, or returning to a tab always lands at the top.
  // Phase 18: retargeted from window.scrollY to the tab box's own
  // scrollTop (see scrollBoxRef below) — see that section for why.
  const scrollPositions = useRef({ 0: 0, 1: 0 })

  // The box that actually scrolls for this screen (see rootRef/rootStyle
  // below for why this replaced window-level scrolling).
  const scrollBoxRef = useRef(null)

  // Measures its own distance from the top of the viewport so rootStyle's
  // height can be computed correctly regardless of what renders above this
  // screen (Layout's header is suppressed here, but OfflineBanner /
  // NotificationsBanner can still add height above it).
  const rootRef = useRef(null)
  const [availableHeight, setAvailableHeight] = useState(null)

  // Shared with BottomNav.jsx — same signal, used here to drop the
  // bottom-nav clearance padding while BottomNav is hidden (Phase 16),
  // instead of leaving that space reserved and empty.
  const keyboardOpen = useKeyboardOpen()

  // Switches tabs while preserving each tab's scroll position: saves where
  // you are on the tab you're leaving, then restores wherever you'd left
  // off on the tab you're arriving on (see the useLayoutEffect below).
  // Also records the direction of travel so the incoming tab's slide
  // animation comes from the correct side, for both tap and swipe.
  function switchTab(index) {
    if (index === activeTab) return
    tabDirection.current = index > activeTab ? 1 : -1
    hasSwitchedRef.current = true
    if (scrollBoxRef.current) {
      scrollPositions.current[activeTab] = scrollBoxRef.current.scrollTop
    }
    setActiveTab(index)
  }

  // Runs after the new tab's content is committed to the DOM but before the
  // browser paints, so the jump to the saved position isn't visible as a
  // flash of "scrolled to top" first. Sets scrollTop on the internal box
  // only — never window.scrollY — so this can't trigger the mobile
  // browser's toolbar transition the way it used to (see BottomNav.jsx
  // Phase 18 for the full root-cause note).
  useLayoutEffect(() => {
    if (scrollBoxRef.current) {
      scrollBoxRef.current.scrollTop = scrollPositions.current[activeTab] ?? 0
    }
  }, [activeTab])

  // Sizes the root to exactly the space available below wherever this
  // screen actually starts in the viewport, then never lets the root
  // itself scroll (see rootStyle) — only the tab box inside it does.
  // That's what makes tab switches structurally unable to move
  // window.scrollY or change document height at all, rather than just
  // making it less likely.
  //
  // Known limitation: if something above this screen (e.g. OfflineBanner)
  // mounts or unmounts without a resize event firing, the measurement goes
  // stale until the next resize/keyboard-open. Not worth a
  // MutationObserver unless that's actually reported as visible.
  useLayoutEffect(() => {
    function measure() {
      if (!rootRef.current) return
      const vv = window.visualViewport
      const viewportHeight = vv?.height ?? window.innerHeight
      const top = rootRef.current.getBoundingClientRect().top
      setAvailableHeight(Math.max(viewportHeight - top, 0))
    }

    measure()
    const vv = window.visualViewport
    window.addEventListener('resize', measure)
    vv?.addEventListener('resize', measure)
    return () => {
      window.removeEventListener('resize', measure)
      vv?.removeEventListener('resize', measure)
    }
  }, [])

  function handleTouchStart(e) {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }

  function handleTouchEnd(e) {
    if (touchStartX.current === null) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    const dy = e.changedTouches[0].clientY - touchStartY.current
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) {
      if (dx < 0 && activeTab < TABS.length - 1) switchTab(activeTab + 1)
      if (dx > 0 && activeTab > 0)               switchTab(activeTab - 1)
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
      <div style={simplePageStyle}>
        <DetailHeader onBack={() => navigate('/')} condition={null} activeTab={activeTab} setActiveTab={switchTab} />
        <div style={{ maxWidth: 680, margin: '0 auto', padding: 'var(--space-8) var(--space-6)', textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: 14 }}>
          Loading…
        </div>
        <BottomNav />
      </div>
    )
  }

  if (!condition) {
    return (
      <div style={simplePageStyle}>
        <DetailHeader onBack={() => navigate('/')} condition={null} activeTab={activeTab} setActiveTab={switchTab} />
        <div style={{ maxWidth: 680, margin: '0 auto', padding: 'var(--space-8) var(--space-6)', textAlign: 'center' }}>
          <div style={{ fontSize: 15, color: 'var(--color-text-secondary)', marginBottom: 'var(--space-2)' }}>Condition not found</div>
          <div style={{ fontSize: 13, color: 'var(--color-text-tertiary)' }}>"{slug}" does not match any condition in the database.</div>
        </div>
        <BottomNav />
      </div>
    )
  }

  return (
    <div
      ref={rootRef}
      style={{
        ...rootStyle,
        height: availableHeight != null ? availableHeight : '100svh',
      }}
    >
      {/* ─── Header + Tab strip — one combined sticky block, one border at bottom */}
      <DetailHeader
        onBack={() => navigate(-1)}
        condition={condition}
        isFav={isFav}
        onFavToggle={() => toggleCondition(condition.id)}
        onShare={handleShare}
        activeTab={activeTab}
        setActiveTab={switchTab}
      />

      {/* Hidden ShareCard */}
      <div style={{ position: 'fixed', top: -9999, left: -9999, zIndex: -1, pointerEvents: 'none' }}>
        <ShareCard
          ref={shareCardRef}
          condition={{ name: condition.name, specialtyName: condition.specialtyName }}
          prescription={buildSharePrescription()}
        />
      </div>

      {/* Local keyframes for the tab-switch transition — kept scoped to this
          file rather than added to globals.css, since this is the only
          screen that needs it. Direction-aware slide+fade (iOS-style
          push-transition curve) replaces the earlier flat opacity fade. */}
      <style>{`
        @keyframes conditionTabSlideFromRight {
          from { opacity: 0; transform: translateX(16px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes conditionTabSlideFromLeft {
          from { opacity: 0; transform: translateX(-16px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>

      {/* Only the active tab's content is ever mounted. This box — not the
          window — is what actually scrolls: rootStyle gives the root an
          explicit height and overflow: hidden, this wrapper is flex: 1
          with overflow-y: auto, so it's the one place scrolling can happen
          on this screen. touchAction: 'pan-y' keeps native vertical
          scrolling working while still letting our own touch handlers see
          horizontal swipes for tab switching. */}
      <div
        ref={scrollBoxRef}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        style={{
          touchAction: 'pan-y',
          flex: 1,
          minHeight: 0, // required so this flex child can actually shrink and scroll instead of pushing the root taller
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        <div
          key={activeTab}
          style={{
            maxWidth: 680,
            margin: '0 auto',
            padding: 'var(--space-5) var(--space-6)',
            // Only reserve clearance for BottomNav while it's actually
            // rendered. Previously this was a fixed calc() regardless of
            // BottomNav's visibility, which left dead white space below
            // the last block (e.g. the disclaimer footer) whenever the
            // keyboard opened and BottomNav unmounted (Phase 16).
            paddingBottom: keyboardOpen
              ? 'var(--space-4)'
              : 'calc(60px + env(safe-area-inset-bottom) + var(--space-4))',
            // Only animate on a real tab switch (tap or swipe), never on
            // mount/refresh — hasSwitchedRef stays false through the first
            // render. Direction picks which side the incoming tab slides in from.
            animation: hasSwitchedRef.current
              ? `${tabDirection.current === 1 ? 'conditionTabSlideFromRight' : 'conditionTabSlideFromLeft'} 0.3s cubic-bezier(0.25, 0.1, 0.25, 1)`
              : 'none',
          }}
        >
          {activeTab === 0 ? (
            <PrescriptionsTab
              blocks={condition.blocks ?? []}
              conditionId={condition.id}
            />
          ) : (
            <ClinicalDataTab blocks={condition.blocks ?? []} />
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  )
}

// ─── Shared page styles ─────────────────────────────────────────────────────

// Used only by the loading/not-found states above — those have no tabs, so
// they keep the simple page-scrolling behavior; there's nothing there that
// can trigger the bug this file fixes.
const simplePageStyle = {
  minHeight: '100svh',
  display: 'flex',
  flexDirection: 'column',
  backgroundColor: 'var(--color-bg)',
  fontFamily: 'var(--font-body)',
  color: 'var(--color-text-primary)',
}

// Used by the real tab view. height is set dynamically per-render (see
// availableHeight above) — overflow: hidden means this root itself never
// scrolls, so window.scrollY can never move on this screen.
const rootStyle = {
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
