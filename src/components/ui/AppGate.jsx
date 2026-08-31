/**
 * src/components/ui/AppGate.jsx
 * App Gate System Phase 1 Step 4d.
 * Phase 2 redesign (this session) — see plan §10.6 for the approved
 * mockup this implements.
 * Phase 4 addition (plan: CAPSULA_DATA_TIERS_AND_ACCESS_PLAN.md, §Phase 4)
 * — added the offline block, see its own comment below.
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
import { X, Wrench, AlertTriangle, Megaphone, RefreshCw, WifiOff, Sparkles } from 'lucide-react'
import { Browser } from '@capacitor/browser'
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
// stays quiet: a plain neutral icon, no colored band. The one spot of color
// is a small Pro pill at the bottom, using the same accent-blue + Sparkles
// combination ProComingSoonSheet.jsx already established elsewhere in the
// app as "this represents Pro" — approved mockup, this session.
function OfflineBlock() {
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
    }}>
      <div style={{ width: '100%', maxWidth: 340 }}>
        <WifiOff
          size={56}
          color="var(--color-text-secondary)"
          strokeWidth={1.5}
          aria-hidden="true"
          style={{ marginBottom: 'var(--space-5)' }}
        />

        <div style={{
          fontSize:     20,
          fontWeight:   700,
          color:        'var(--color-text-primary)',
          fontFamily:   'var(--font-body)',
          marginBottom: 'var(--space-3)',
        }}>
          You&apos;re offline
        </div>

        <div style={{
          fontSize:     14,
          lineHeight:   1.55,
          color:        'var(--color-text-secondary)',
          fontFamily:   'var(--font-body)',
          marginBottom: 'var(--space-5)',
        }}>
          Reconnect to keep browsing, or go Pro to keep using what you&apos;ve already saved — even offline.
        </div>

        <div style={{
          display:         'inline-flex',
          alignItems:      'center',
          gap:             6,
          backgroundColor: 'var(--color-accent-light)',
          color:           '#0C4A6E',
          fontSize:        12,
          fontWeight:      500,
          fontFamily:      'var(--font-body)',
          padding:         '5px 12px',
          borderRadius:    'var(--radius-full)',
        }}>
          <Sparkles size={13} aria-hidden="true" />
          Pro keeps working offline
        </div>
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
  // exemption above.
  useEffect(() => {
    if ((!gate && !offlineBlockActive) || onAdminRoute) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previousOverflow }
  }, [gate, offlineBlockActive, onAdminRoute])

  if (onAdminRoute) return null

  // Phase 4: takes priority over a database-driven gate (confirmed this
  // session) — if the device is genuinely unreachable, a possibly-stale
  // maintenance/promo message fetched before going offline matters less
  // than telling the person plainly that they're offline right now.
  if (offlineBlockActive) return <OfflineBlock />

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
