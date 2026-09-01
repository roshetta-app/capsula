/**
 * src/components/ui/AppGate.jsx
 * App Gate System Phase 1 Step 4d.
 * Phase 2 redesign (this session) — see plan §10.6 for the approved
 * mockup this implements.
 * Phase 4 addition (plan: CAPSULA_DATA_TIERS_AND_ACCESS_PLAN.md, §Phase 4)
 * — added the offline block, see its own comment below.
 * Phase 4 follow-up — the offline block now fades in/out instead of
 * snapping instantly, matching AppGateSheet's existing fade pattern
 * below rather than inventing a new one. See OfflineBlock and the
 * mount/unmount effect in AppGate() for details.
 *
 * Reads the current gate from AppGateContext and renders one of two
 * surfaces, chosen by gate.dismissible:
 *
 *   - dismissible: false (Force Update always is; the other three types
 *     can be too, for "we're down for maintenance right now") →
 *     AppGateBlock — full-bleed, covers the entire screen, no way to
 *     close it except the underlying condition resolving (an admin
 *     switching it off, or — for Force Update specifically — the person
 *     actually updating).
 *   - dismissible: true (the default for maintenance / critical_
 *     announcement / promo) → AppGateSheet — a card anchored to the
 *     bottom of the screen, with the app visible and dimmed behind it,
 *     an explicit X (permanent, per-device dismiss), and a separate
 *     "Maybe Later" text action (session-only — see useAppGate.js for
 *     why these are two genuinely different mechanisms, not two labels
 *     on the same one).
 *
 * Both surfaces share a type-based color/icon treatment (TYPE_STYLE
 * below) — a tinted band with either the admin-supplied image or a
 * generic icon tile, never both. This replaced the old plain-card/
 * InfoSheet-pattern look; Kmar approved the mockup this implements
 * (2026-08-25) rather than continuing to copy InfoSheet.jsx's shape,
 * which was always meant as a starting point, not a permanent fit for
 * something this visually prominent.
 *
 * Backdrop-tap-to-dismiss was REMOVED this session — too easy to trigger
 * by accident (e.g. mid-scroll), and an accidental permanent dismiss is
 * indistinguishable from an intentional one. Escape still closes
 * (permanent dismiss) since it's keyboard-only and carries none of that
 * accidental-trigger risk.
 *
 * CTA button (ctaLabel/ctaUrl) still opens via @capacitor/browser,
 * falling back to window.open on the website build — unchanged from
 * Phase 1. Now also logs a gate_cta_click analytics event on tap (Phase
 * 2, plan §10.5) — this is the one event useAppGate.js can't log itself,
 * since a button press is only ever visible here, at the component level.
 *
 * Admin-route exemption (bugfix, prior session) — AppGate checks the
 * current path via useLocation() and renders nothing at all on any
 * /admin route, so a non-dismissible gate can never lock an admin out of
 * the CMS screen needed to turn it back off.
 */

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLocation } from 'react-router-dom'
import { X, Wrench, AlertTriangle, Megaphone, RefreshCw, WifiOff, Sparkles, ChevronRight } from 'lucide-react'
import { Browser } from '@capacitor/browser'
import BottomNav from '../BottomNav'
import { useAppGateContext } from '../../context/AppGateContext'
import { useOnlineStatus } from '../../hooks/useOnlineStatus'
import { useIsPro } from '../../hooks/useIsPro'
import { useDrugContext } from '../../context/DrugContext'
import { useConditionContext } from '../../context/ConditionContext'
import { logUsageEvent } from '../../analytics/usageEvents'

// Type-based color + icon, plan §10.6. Force Update and (hard) Maintenance
// lean into the serious tones since they're the two that can block
// outright; Promo leans into the friendly accent blue.
const TYPE_STYLE = {
  maintenance: {
    bandBg: 'var(--color-warning-light)',
    tileFg: 'var(--color-warning)',
    Icon:   Wrench,
  },
  critical_announcement: {
    bandBg: 'var(--color-danger-light)',
    tileFg: 'var(--color-danger)',
    Icon:   AlertTriangle,
  },
  promo: {
    bandBg: 'var(--color-accent-light)',
    tileFg: 'var(--color-accent)',
    Icon:   Megaphone,
  },
  force_update: {
    bandBg: 'var(--color-danger-light)',
    tileFg: 'var(--color-danger)',
    Icon:   RefreshCw,
  },
}

function openCta(gate) {
  if (!gate.ctaUrl) return
  logUsageEvent('gate_cta_click', gate.id, gate.title)
  Browser.open({ url: gate.ctaUrl }).catch(() => {
    window.open(gate.ctaUrl, '_blank', 'noopener,noreferrer')
  })
}

// Tinted band: shows the admin's own image if one was set, otherwise a
// generic icon tile in the type's color — never both, the image already
// carries enough visual interest on its own.
function GateBand({ gate, tall }) {
  const style = TYPE_STYLE[gate.type] ?? TYPE_STYLE.promo
  const Icon  = style.Icon

  return (
    <div style={{
      position:        'relative',
      backgroundColor: style.bandBg,
      backgroundImage: gate.imageUrl ? `url(${gate.imageUrl})` : 'none',
      backgroundSize:  'cover',
      backgroundPosition: 'center',
      height:          tall ? 220 : 140,
      display:         'flex',
      alignItems:      'center',
      justifyContent:  'center',
      flexShrink:      0,
    }}>
      {!gate.imageUrl && (
        <div style={{
          width:           64,
          height:          64,
          borderRadius:    'var(--radius-lg)',
          backgroundColor: 'var(--color-surface)',
          display:         'flex',
          alignItems:      'center',
          justifyContent:  'center',
        }}>
          <Icon size={30} color={style.tileFg} strokeWidth={1.75} aria-hidden="true" />
        </div>
      )}
    </div>
  )
}

function GateCta({ gate, fallbackLabel }) {
  const label = gate.ctaLabel || fallbackLabel
  if (!label || !gate.ctaUrl) return null
  return (
    <button
      onClick={() => openCta(gate)}
      style={{
        width:           '100%',
        padding:         'var(--space-3) var(--space-4)',
        borderRadius:    'var(--radius-full)',
        border:          'none',
        backgroundColor: (TYPE_STYLE[gate.type] ?? TYPE_STYLE.promo).tileFg,
        color:           '#fff',
        fontSize:        15,
        fontWeight:      600,
        fontFamily:      'var(--font-body)',
        cursor:          'pointer',
      }}
    >
      {label}
    </button>
  )
}

// ─── Full-bleed block (Force Update / any non-dismissible gate) ───────────────

function AppGateBlock({ gate }) {
  return (
    <div style={{
      position:        'fixed',
      inset:           0,
      zIndex:          2000,
      backgroundColor: 'var(--color-surface)',
      display:         'flex',
      flexDirection:   'column',
    }}>
      <GateBand gate={gate} tall />

      <div style={{
        flex:           1,
        display:        'flex',
        flexDirection:  'column',
        alignItems:     'center',
        justifyContent: 'center',
        padding:        'var(--space-6) var(--space-5)',
        textAlign:      'center',
      }}>
        <div style={{ width: '100%', maxWidth: 340 }}>
          <div style={{
            fontSize:     20,
            fontWeight:   700,
            color:        'var(--color-text-primary)',
            fontFamily:   'var(--font-body)',
            marginBottom: 'var(--space-3)',
          }}>
            {gate.title}
          </div>

          <div style={{
            fontSize:     14,
            lineHeight:   1.55,
            color:        'var(--color-text-secondary)',
            fontFamily:   'var(--font-body)',
            marginBottom: 'var(--space-5)',
          }}>
            {gate.message}
          </div>

          <GateCta gate={gate} fallbackLabel={gate.type === 'force_update' ? 'Update now' : null} />
        </div>
      </div>
    </div>
  )
}

// ─── Offline block (plan: CAPSULA_DATA_TIERS_AND_ACCESS_PLAN.md, §Phase 4) ────
// A free account, offline, with a library already cached. Deliberately NOT
// styled like AppGateBlock's tinted, alarm-style band above — this isn't an
// error or an admin-authored message, it's a normal, expected state, so it
// stays quiet: a plain neutral icon, no colored band.
//
// Two-layer structure (revised this session after the first pass read as
// one dense, "bulky" paragraph): a short status line, then a visually
// separate bordered card for the Pro benefit — the same "here's what
// upgrading gets you" callout shape apps commonly use, rather than
// cramming the upsell into the same sentence as the status message. The
// card reuses the accent-blue + Sparkles combination ProComingSoonSheet.jsx
// already established elsewhere in the app as "this represents Pro."
//
// Icon note: explicit display:'block' + margin:'0 auto' below, NOT relying
// on the container's text-align — this project's Tailwind preflight resets
// all <svg> to display:block, which silently breaks text-align centering
// for icon-only elements like this one.
//
// `visible` prop drives the fade — see AppGate()'s mount/unmount effect
// below. This component stays a stateless full-bleed panel; the parent
// keeps it mounted a little past offlineBlockActive turning false so the
// opacity transition has time to finish before it's actually removed.
// pointer-events is tied to the same flag so a mid-fade-out block can't
// still swallow taps meant for the real app becoming visible underneath it.
function OfflineBlock({ visible }) {
  return (
    <div style={{
      position:        'fixed',
      inset:           0,
      zIndex:          2000,
      backgroundColor: 'var(--color-surface)',
      display:         'flex',
      flexDirection:   'column',
      alignItems:      'center',
      justifyContent:  'center',
      padding:         'var(--space-6) var(--space-5)',
      textAlign:       'center',
      opacity:         visible ? 1 : 0,
      pointerEvents:   visible ? 'auto' : 'none',
      transition:      'opacity var(--motion-screen) var(--ease-reveal)',
    }}>
      <div style={{ width: '100%', maxWidth: 320 }}>
        {/* Neutral circle behind the icon, var(--color-surface-muted) —
            not accent/danger/warning, since being offline is a normal,
            expected state, not an alert. Matches the reference mockup. */}
        <div style={{
          width:           96,
          height:          96,
          borderRadius:    'var(--radius-full)',
          backgroundColor: 'var(--color-surface-muted)',
          display:         'flex',
          alignItems:      'center',
          justifyContent:  'center',
          margin:          '0 auto var(--space-5)',
        }}>
          <WifiOff
            size={40}
            color="var(--color-text-secondary)"
            strokeWidth={1.5}
            aria-hidden="true"
          />
        </div>

        <div style={{
          fontSize:     20,
          fontWeight:   700,
          color:        'var(--color-text-primary)',
          fontFamily:   'var(--font-body)',
          marginBottom: 'var(--space-2)',
        }}>
          You&apos;re offline
        </div>

        <div style={{
          fontSize:     14,
          lineHeight:   1.5,
          color:        'var(--color-text-secondary)',
          fontFamily:   'var(--font-body)',
          marginBottom: 'var(--space-5)',
        }}>
          Connect to the internet to continue browsing Capsula.
        </div>

        {/* Visual only — no upsell sheet exists yet to open, so the
            chevron is a decorative affordance, not a real link. No
            onClick, no cursor/hover change, no button semantics. */}
        <div style={{
          display:         'flex',
          alignItems:      'center',
          gap:             12,
          textAlign:       'left',
          backgroundColor: 'var(--color-accent-light)',
          borderRadius:    'var(--radius-lg)',
          padding:         'var(--space-3) var(--space-4)',
        }}>
          <div style={{
            width:           36,
            height:          36,
            flexShrink:      0,
            borderRadius:    'var(--radius-md)',
            backgroundColor: 'var(--color-surface)',
            display:         'flex',
            alignItems:      'center',
            justifyContent:  'center',
          }}>
            <Sparkles size={16} color="var(--color-accent)" aria-hidden="true" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{
              fontSize:     14,
              fontWeight:   600,
              color:        'var(--color-text-primary)',
              fontFamily:   'var(--font-body)',
              marginBottom: 2,
            }}>
              Want to use Capsula offline?
            </div>
            <div style={{
              fontSize:   13,
              lineHeight: 1.4,
              color:      'var(--color-text-secondary)',
              fontFamily: 'var(--font-body)',
            }}>
              Upgrade to Pro for offline access.
            </div>
          </div>
          <ChevronRight
            size={18}
            color="var(--color-accent)"
            strokeWidth={2}
            aria-hidden="true"
            style={{ flexShrink: 0 }}
          />
        </div>
      </div>

      {/* Real BottomNav, rendered a second time here — dimmed and inert,
          not a lookalike. Because it's the actual component, it already
          shows the correct highlighted tab via its own useLocation() call,
          with zero extra tracking code needed here. pointer-events: none
          stops taps from doing anything (a free user can't use it as a
          side door into cached Drugs/Conditions/Favourites); opacity
          signals "present but not active" instead of looking broken. The
          real nav underneath (Layout always renders one) stays fully
          covered by this block's own opaque background, so nothing
          double-renders visually — only this dimmed copy is seen. */}
      <div style={{ opacity: 0.45, pointerEvents: 'none' }}>
        <BottomNav />
      </div>
    </div>
  )
}

// ─── Bottom sheet (dismissible maintenance / critical_announcement / promo) ───
// Portal + fade/scale entrance kept from the InfoSheet.jsx-derived Phase 1
// pattern; layout itself is the new bottom-anchored card from the Phase 2
// mockup. Backdrop click intentionally does NOT close this — see file
// header. Escape still does (permanent dismiss, same as the X).

function AppGateSheet({ gate, onDismiss, onMaybeLater }) {
  const [shouldRender, setShouldRender] = useState(true)
  const [animateIn,    setAnimateIn]    = useState(false)

  useEffect(() => {
    requestAnimationFrame(() => setAnimateIn(true))
  }, [])

  function closeThen(action) {
    setAnimateIn(false)
    setTimeout(() => {
      setShouldRender(false)
      action()
    }, 220)
  }

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') closeThen(onDismiss) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!shouldRender) return null

  return createPortal(
    <div style={{
      position:        'fixed',
      inset:           0,
      zIndex:          1000,
      backgroundColor: 'rgba(0,0,0,0.45)',
      display:         'flex',
      alignItems:      'flex-end',
      justifyContent:  'center',
      opacity:         animateIn ? 1 : 0,
      transition:      'opacity var(--motion-base) var(--ease-reveal)',
    }}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={gate.title}
        style={{
          width:           '100%',
          maxWidth:        420,
          backgroundColor: 'var(--color-surface)',
          borderTopLeftRadius:  'var(--radius-xl)',
          borderTopRightRadius: 'var(--radius-xl)',
          overflow:        'hidden',
          boxShadow:       '0 -8px 32px rgba(0,0,0,0.12)',
          fontFamily:      'var(--font-body)',
          opacity:         animateIn ? 1 : 0,
          transform:       animateIn ? 'translateY(0)' : 'translateY(24px)',
          transition:      'opacity var(--motion-screen) var(--ease-reveal), transform var(--motion-screen) var(--ease-settle)',
        }}
      >
        <div style={{ position: 'relative' }}>
          <GateBand gate={gate} />
          <button
            onClick={() => closeThen(onDismiss)}
            aria-label="Dismiss"
            style={{
              position:        'absolute',
              top:             'var(--space-3)',
              right:           'var(--space-3)',
              width:           32,
              height:          32,
              borderRadius:    'var(--radius-full)',
              border:          'none',
              backgroundColor: 'rgba(255,255,255,0.75)',
              display:         'flex',
              alignItems:      'center',
              justifyContent:  'center',
              cursor:          'pointer',
            }}
          >
            <X size={18} color="var(--color-text-primary)" aria-hidden="true" />
          </button>
        </div>

        <div style={{ padding: 'var(--space-5)' }}>
          {gate.title && (
            <div style={{
              fontSize:     16,
              fontWeight:   700,
              color:        'var(--color-text-primary)',
              marginBottom: 'var(--space-2)',
            }}>
              {gate.title}
            </div>
          )}

          <div style={{
            fontSize:     14,
            lineHeight:   1.55,
            color:        'var(--color-text-secondary)',
            marginBottom: 'var(--space-5)',
          }}>
            {gate.message}
          </div>

          <div style={{ marginBottom: 'var(--space-2)' }}>
            <GateCta gate={gate} />
          </div>

          <button
            onClick={() => closeThen(onMaybeLater)}
            style={{
              width:      '100%',
              padding:    'var(--space-2) var(--space-4)',
              border:     'none',
              background: 'none',
              color:      'var(--color-text-secondary)',
              fontSize:   14,
              fontWeight: 500,
              fontFamily: 'var(--font-body)',
              cursor:     'pointer',
            }}
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

// ─── AppGate — top-level export ────────────────────────────────────────────────

export default function AppGate() {
  const { gate, dismiss, maybeLater } = useAppGateContext()
  const location = useLocation()

  // Phase 4 (plan §4.1/§4.3): a free account, offline, with a library
  // already cached, sees the offline block below instead of anything
  // database-driven. Computed live on every render from Phase 2's real
  // connectivity check, Phase 3's shared Pro check, and whatever's
  // already loaded into Drug/ConditionContext — no explicit refresh()
  // needed for this to clear itself the instant a real connection
  // returns (§4.4), since it's just recalculated on the next render.
  const { isOnline } = useOnlineStatus()
  const isPro = useIsPro()
  const { drugs, loading: drugsLoading } = useDrugContext()
  const { conditions, loading: conditionsLoading } = useConditionContext()
  const hasCachedLibrary = !drugsLoading && drugs.length > 0 && !conditionsLoading && conditions.length > 0
  const offlineBlockActive = hasCachedLibrary && !isOnline && !isPro

  // Fade mount/unmount for the offline block, mirroring AppGateSheet's
  // shouldRender/animateIn pattern above rather than a plain conditional
  // render — see the header comment and OfflineBlock's own comment.
  // Kept as two flags because they turn on/off at different moments:
  // showOfflineBlock controls whether the component is in the tree at
  // all (stays true a little past offlineBlockActive going false, so the
  // fade-out has something to animate), offlineBlockVisible controls the
  // opacity itself (flips immediately with offlineBlockActive).
  const [showOfflineBlock,    setShowOfflineBlock]    = useState(offlineBlockActive)
  const [offlineBlockVisible, setOfflineBlockVisible] = useState(offlineBlockActive)

  useEffect(() => {
    if (offlineBlockActive) {
      // Reconnected-then-disconnected-again case: mount immediately and
      // let the very next frame trigger the opacity transition, same
      // requestAnimationFrame timing AppGateSheet uses for its own
      // fade-in, so the block doesn't just pop straight to opacity 1.
      setShowOfflineBlock(true)
      const raf = requestAnimationFrame(() => setOfflineBlockVisible(true))
      return () => cancelAnimationFrame(raf)
    }

    // Connection came back: start the fade immediately, then remove the
    // block from the tree once the opacity transition has had time to
    // finish. 220ms matches AppGateSheet's own closeThen() timeout
    // elsewhere in this file, so every gate-style surface in the app
    // exits on the same beat.
    setOfflineBlockVisible(false)
    const timeout = setTimeout(() => setShowOfflineBlock(false), 220)
    return () => clearTimeout(timeout)
  }, [offlineBlockActive])

  // Admins must always be able to reach the CMS to turn a gate off, even a
  // non-dismissible one — the App Gate system is for the app's regular
  // users, not the admin panel itself. Also exempts the offline block
  // below, same reasoning.
  const onAdminRoute = location.pathname.startsWith('/admin')

  // Locks the page's own scroll for as long as a gate — or the offline
  // block — is showing, on top of the dimmed backdrop — without this,
  // someone could still scroll the real app underneath the message even
  // though tapping it does nothing, which defeats the point of a "must
  // focus on this" surface. Never engages on /admin, matching the
  // exemption above. Keyed off offlineBlockActive (not showOfflineBlock)
  // so the real app becomes scrollable again the instant connectivity
  // returns, rather than waiting out the fade — the block's own
  // pointer-events:none during the fade already stops it from
  // intercepting taps, so there's nothing gained by keeping scroll
  // locked any longer than that.
  useEffect(() => {
    if ((!gate && !offlineBlockActive) || onAdminRoute) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previousOverflow }
  }, [gate, offlineBlockActive, onAdminRoute])

  // Same "must focus on this" surfaces as the scroll-lock above — the
  // offline block, or any non-dismissible gate — also need to swallow
  // back navigation, not just taps. Without this, the hardware/gesture
  // back button (Android) or a browser back gesture could still change
  // the route underneath an opaque, "inert" overlay — invisibly swapping
  // which screen (and which highlighted BottomNav tab) is waiting once
  // the block eventually clears, which is exactly the kind of surprise
  // this surface is supposed to prevent.
  //
  // History trap, not a backButton listener: pushing one extra history
  // entry pointing at the CURRENT url, then re-pushing the current url
  // again on every popstate, means a back press always has something to
  // "consume" without the URL — or the route under it — ever actually
  // changing. This covers a real browser back button, a trackpad/edge
  // swipe on the website build, AND Android's hardware back gesture,
  // since Capacitor's default (unhandled) back-button behavior is just
  // "call the WebView's own history back if it can," which is the exact
  // same history.back() this traps — so there's no need to also touch
  // @capacitor/app's separate, version-flaky backButton listener here.
  const isFullyBlocked = offlineBlockActive || (gate && !gate.dismissible)

  useEffect(() => {
    if (!isFullyBlocked || onAdminRoute) return

    function trapBack() {
      window.history.pushState(null, '', window.location.href)
    }

    window.history.pushState(null, '', window.location.href)
    window.addEventListener('popstate', trapBack)
    return () => window.removeEventListener('popstate', trapBack)
  }, [isFullyBlocked, onAdminRoute])

  if (onAdminRoute) return null

  // Phase 4: takes priority over a database-driven gate (confirmed this
  // session) — if the device is genuinely unreachable, a possibly-stale
  // maintenance/promo message fetched before going offline matters less
  // than telling the person plainly that they're offline right now.
  // Uses showOfflineBlock (not offlineBlockActive) so the block stays
  // mounted through its own fade-out — see the effect above.
  if (showOfflineBlock) return <OfflineBlock visible={offlineBlockVisible} />

  if (!gate) return null

  if (!gate.dismissible) {
    return <AppGateBlock gate={gate} />
  }

  return (
    <AppGateSheet
      gate={gate}
      onDismiss={() => dismiss(gate.id, gate.title)}
      onMaybeLater={() => maybeLater(gate.id, gate.title)}
    />
  )
}
