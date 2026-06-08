/**
 * src/screens/OnboardingScreen.jsx
 * Phase 2J — Onboarding
 *
 * Shown only on first launch (localStorage key: capsula_onboarded absent).
 * 3 swipeable cards. Dot indicators. Skip top-right. Next/Get Started bottom-right.
 * Always light theme — no dark mode override.
 * On completion: sets capsula_onboarded = true, calls onDone() to unmount.
 */

import { useState, useRef } from 'react'

// ─── Slide data ───────────────────────────────────────────────────────────────

const SLIDES = [
  {
    icon: (
      <svg width="64" height="64" viewBox="0 0 24 24" fill="none"
        stroke="#1E40AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-4" />
        <path d="M9 3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2H9V3z" />
        <line x1="9" y1="12" x2="15" y2="12" />
        <line x1="9" y1="16" x2="13" y2="16" />
      </svg>
    ),
    headline: 'Drug Library',
    body: 'Egyptian market drugs with doses, brands, and clinical information.',
  },
  {
    icon: (
      <svg width="64" height="64" viewBox="0 0 24 24" fill="none"
        stroke="#1E40AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3" />
        <path d="M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4" />
        <circle cx="20" cy="10" r="2" />
      </svg>
    ),
    headline: 'Clinical Conditions',
    body: 'Prescriptions and clinical reference for GP practice.',
  },
  {
    icon: (
      <svg width="64" height="64" viewBox="0 0 24 24" fill="none"
        stroke="#1E40AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ),
    headline: 'Your Personal Reference',
    body: 'Save favourites, add notes, manage your stock.',
  },
]

// ─── OnboardingScreen ─────────────────────────────────────────────────────────

export default function OnboardingScreen({ onDone }) {
  const [current, setCurrent]   = useState(0)
  const touchStartX             = useRef(null)

  function complete() {
    localStorage.setItem('capsula_onboarded', 'true')
    onDone()
  }

  function next() {
    if (current < SLIDES.length - 1) setCurrent(c => c + 1)
    else complete()
  }

  function handleTouchStart(e) {
    touchStartX.current = e.touches[0].clientX
  }

  function handleTouchEnd(e) {
    if (touchStartX.current === null) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    if (Math.abs(dx) > 50) {
      if (dx < 0 && current < SLIDES.length - 1) setCurrent(c => c + 1)
      if (dx > 0 && current > 0)                 setCurrent(c => c - 1)
    }
    touchStartX.current = null
  }

  const slide = SLIDES[current]
  const isLast = current === SLIDES.length - 1

  return (
    /* Force light theme regardless of device setting */
    <div
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      style={{
        position:        'fixed',
        inset:           0,
        backgroundColor: '#FFFFFF',
        display:         'flex',
        flexDirection:   'column',
        fontFamily:      "'DM Sans', sans-serif",
        userSelect:      'none',
        zIndex:          9999,
      }}
    >

      {/* ── Skip button ── */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '16px 20px 0' }}>
        <button
          onClick={complete}
          style={{
            background:  'none',
            border:      'none',
            cursor:      'pointer',
            fontSize:    14,
            fontWeight:  500,
            color:       '#6B7280',
            fontFamily:  "'DM Sans', sans-serif",
            padding:     '4px 0',
          }}
        >
          Skip
        </button>
      </div>

      {/* ── Slide area ── */}
      <div style={{
        flex:           1,
        display:        'flex',
        flexDirection:  'column',
        alignItems:     'center',
        justifyContent: 'center',
        padding:        '0 40px',
        gap:            28,
        overflow:       'hidden',
      }}>
        {/* Icon circle */}
        <div style={{
          width:           120,
          height:          120,
          borderRadius:    '50%',
          backgroundColor: '#DBEAFE',
          display:         'flex',
          alignItems:      'center',
          justifyContent:  'center',
          flexShrink:      0,
        }}>
          {slide.icon}
        </div>

        {/* Text */}
        <div style={{ textAlign: 'center' }}>
          <h2 style={{
            fontSize:      26,
            fontWeight:    700,
            color:         '#111827',
            margin:        '0 0 12px',
            letterSpacing: '-0.4px',
            lineHeight:    1.2,
          }}>
            {slide.headline}
          </h2>
          <p style={{
            fontSize:   15,
            color:      '#6B7280',
            lineHeight: 1.6,
            margin:     0,
          }}>
            {slide.body}
          </p>
        </div>
      </div>

      {/* ── Dot indicators ── */}
      <div style={{
        display:        'flex',
        justifyContent: 'center',
        gap:            8,
        paddingBottom:  24,
      }}>
        {SLIDES.map((_, i) => (
          <div
            key={i}
            onClick={() => setCurrent(i)}
            style={{
              width:           i === current ? 20 : 8,
              height:          8,
              borderRadius:    4,
              backgroundColor: i === current ? '#1E40AF' : '#D1D5DB',
              transition:      'all 0.25s ease',
              cursor:          'pointer',
            }}
          />
        ))}
      </div>

      {/* ── Bottom action ── */}
      <div style={{ padding: '0 24px 40px', display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={next}
          style={{
            backgroundColor: '#1E40AF',
            color:           '#FFFFFF',
            border:          'none',
            borderRadius:    999,
            padding:         '12px 28px',
            fontSize:        15,
            fontWeight:      600,
            fontFamily:      "'DM Sans', sans-serif",
            cursor:          'pointer',
            display:         'flex',
            alignItems:      'center',
            gap:             8,
          }}
        >
          {isLast ? 'Get Started' : 'Next'}
          {!isLast && (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          )}
        </button>
      </div>

    </div>
  )
}
