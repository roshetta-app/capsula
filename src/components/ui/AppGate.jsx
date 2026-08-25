/**
 * src/components/ui/AppGate.jsx
 * App Gate System Phase 1 Step 4d.
 *
 * Reads the current gate from AppGateContext and renders one of two
 * surfaces:
 *   - A gate with dismissible: false (Force Update always is; other types
 *     can be too, for "we're down for maintenance right now") — a
 *     full-screen, non-dismissible block that sits above everything else,
 *     the same way OnboardingGate.jsx blocks the app before onboarding.
 *   - Everything else (maintenance / critical_announcement / promo marked
 *     dismissible) — a dismissible sheet, built on the exact same portal/
 *     animation/token pattern as InfoSheet.jsx, with a Dismiss button that
 *     calls dismiss(gate.id) so it won't resurface on this device.
 *
 * Both surfaces show an optional image, the gate's title/message, and an
 * optional CTA button (ctaLabel/ctaUrl) opened via @capacitor/browser
 * (already a dependency) so it opens in the device's real browser / app
 * store instead of inside the app's own WebView, falling back to a plain
 * window.open on the website build.
 *
 * Not rendered anywhere yet — Step 4e mounts <AppGateProvider> and drops
 * <AppGate /> into App.jsx, which is what actually goes live.
 */

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Browser } from '@capacitor/browser'
import { useAppGateContext } from '../../context/AppGateContext'

function openCta(url) {
  if (!url) return
  Browser.open({ url }).catch(() => {
    window.open(url, '_blank', 'noopener,noreferrer')
  })
}

function GateImage({ url, alt }) {
  if (!url) return null
  return (
    <img
      src={url}
      alt={alt || ''}
      style={{
        width:        '100%',
        maxHeight:    180,
        objectFit:    'cover',
        borderRadius: 'var(--radius-md)',
        marginBottom: 'var(--space-4)',
      }}
    />
  )
}

function GateCta({ label, url }) {
  if (!label || !url) return null
  return (
    <button
      onClick={() => openCta(url)}
      style={{
        width:           '100%',
        padding:         'var(--space-3) var(--space-4)',
        borderRadius:    'var(--radius-sm)',
        border:          'none',
        backgroundColor: 'var(--color-accent)',
        color:           '#fff',
        fontSize:        15,
        fontWeight:      600,
        fontFamily:      'var(--font-body)',
        cursor:          'pointer',
        marginBottom:    'var(--space-2)',
      }}
    >
      {label}
    </button>
  )
}

// ─── Full-screen block (Force Update / any non-dismissible gate) ──────────────

function AppGateBlock({ gate }) {
  return (
    <div style={{
      position:        'fixed',
      inset:           0,
      zIndex:          2000,
      backgroundColor: 'var(--color-bg)',
      display:         'flex',
      flexDirection:   'column',
      alignItems:      'center',
      justifyContent:  'center',
      padding:         'var(--space-6) var(--space-5)',
      textAlign:       'center',
    }}>
      <div style={{ width: '100%', maxWidth: 360 }}>
        <GateImage url={gate.imageUrl} alt={gate.title} />

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

        <GateCta label={gate.ctaLabel || 'Update Now'} url={gate.ctaUrl} />
      </div>
    </div>
  )
}

// ─── Dismissible sheet (maintenance / critical_announcement / promo) ──────────
// Same portal/animation/token pattern as InfoSheet.jsx — this is a single
// gate becoming visible rather than an isOpen prop toggling, so the
// mount/unmount timing is simplified accordingly, but the visual shape
// (overlay, dialog card, fade + scale entrance, Escape-to-close) matches.

function AppGateSheet({ gate, onDismiss }) {
  const overlayRef = useRef(null)
  const [shouldRender, setShouldRender] = useState(true)
  const [animateIn,    setAnimateIn]    = useState(false)

  useEffect(() => {
    requestAnimationFrame(() => setAnimateIn(true))
  }, [])

  function close() {
    setAnimateIn(false)
    setTimeout(() => {
      setShouldRender(false)
      onDismiss()
    }, 220)
  }

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') close() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!shouldRender) return null

  return createPortal(
    <div
      ref={overlayRef}
      onClick={e => { if (e.target === overlayRef.current) close() }}
      style={{
        position:        'fixed',
        inset:           0,
        zIndex:          1000,
        backgroundColor: 'rgba(0,0,0,0.45)',
        display:         'flex',
        alignItems:      'center',
        justifyContent:  'center',
        padding:         'var(--space-4)',
        opacity:         animateIn ? 1 : 0,
        transition:      'opacity var(--motion-base) var(--ease-reveal)',
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={gate.title}
        style={{
          width:           '100%',
          maxWidth:        360,
          backgroundColor: 'var(--color-surface)',
          borderRadius:    'var(--radius-lg)',
          boxShadow:       '0 24px 64px rgba(0,0,0,0.18)',
          padding:         'var(--space-5)',
          fontFamily:      'var(--font-body)',
          opacity:         animateIn ? 1 : 0,
          transform:       animateIn ? 'scale(1)' : 'scale(0.96)',
          transition:      'opacity var(--motion-base) var(--ease-reveal), transform var(--motion-base) var(--ease-settle)',
        }}
      >
        <GateImage url={gate.imageUrl} alt={gate.title} />

        {gate.title && (
          <div style={{
            fontSize:     16,
            fontWeight:   700,
            color:        'var(--color-text-primary)',
            marginBottom: 'var(--space-4)',
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

        <GateCta label={gate.ctaLabel} url={gate.ctaUrl} />

        <button
          onClick={close}
          style={{
            width:           '100%',
            padding:         'var(--space-2) var(--space-4)',
            borderRadius:    'var(--radius-sm)',
            border:          gate.ctaLabel && gate.ctaUrl ? '1px solid var(--color-border)' : 'none',
            backgroundColor: gate.ctaLabel && gate.ctaUrl ? 'transparent' : 'var(--color-accent)',
            color:           gate.ctaLabel && gate.ctaUrl ? 'var(--color-text-secondary)' : '#fff',
            fontSize:        14,
            fontWeight:      600,
            fontFamily:      'var(--font-body)',
            cursor:          'pointer',
          }}
        >
          Dismiss
        </button>
      </div>
    </div>,
    document.body
  )
}

// ─── AppGate — top-level export ────────────────────────────────────────────────

export default function AppGate() {
  const { gate, dismiss } = useAppGateContext()

  if (!gate) return null

  if (!gate.dismissible) {
    return <AppGateBlock gate={gate} />
  }

  return <AppGateSheet gate={gate} onDismiss={() => dismiss(gate.id)} />
}
