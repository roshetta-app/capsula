/**
 * src/screens/OnboardingScreen.jsx
 * Onboarding redesign (2026-08-30) — see CAPSULA_DATA_TIERS_AND_ACCESS_PLAN.md,
 * Phase 1, steps 1.6–1.9 for the full decision trail.
 *
 * Shown only on first launch (localStorage key: capsula_onboarded absent).
 * 5 fixed slides, Next-button only — no swipe, no skip button, no dot-jump —
 * every slide must be moved through in order:
 *   1. Welcome            — photo hero, no body text, "Lets Get Started"
 *   2. Your Medical Library, All in One Place
 *   3. Know Your Drugs
 *   4. Keep What Matters Close
 *   5. Setting up your library — the TRUE last step, not a banner shown
 *      after onboarding. Has no Next button: a combined progress bar
 *      (weighted split — see below) tracks both libraries loading, and
 *      the screen auto-completes once both are actually done — held for
 *      a minimum LOADING_FLOOR_MS so this slide is never skipped past in
 *      under a frame when the data was already loaded before the user
 *      ever reached it.
 *
 * Removed from the previous version, on purpose:
 *   - The notifications-permission slide — a separate in-app banner now
 *     owns that ask, so it no longer needs a place in onboarding.
 *   - The install-prompt slide — installing the app is now promoted from
 *     the website instead, a separate initiative outside this component.
 *   - The Skip button — no slide can be bypassed.
 *   - Swipe navigation — Next button only, both directions removed.
 *
 * Logo: uses the app's real shared mark (public/logo.svg — the same asset
 * layout.jsx's header uses) instead of a hand-drawn stand-in, so this
 * screen never shows a second, slightly-different version of the logo.
 * Rendered white on the blue slides (2–5) via a CSS filter — no second
 * image asset needed — and unmodified on slide 1's white card.
 *
 * Forced light theme, deliberately: this never reads `.dark` or any
 * dark-mode-overridden CSS variable — every color below is a literal
 * light-mode hex value, matching the finalized decision that onboarding
 * never applies dark mode regardless of device/app theme.
 *
 * On completion: sets capsula_onboarded = true, calls onDone() to unmount.
 */

import { useState, useRef, useEffect } from 'react'
import { useConditionContext } from '../context/ConditionContext'
import { useDrugContext } from '../context/DrugContext'

import welcomeHero from '../assets/onboarding/onboarding-1-welcome-hero.jpg'
import libraryIllustration from '../assets/onboarding/onboarding-2-library-illustration.png'
import drugsIllustration from '../assets/onboarding/onboarding-3-drugs-illustration.png'
import favouritesIllustration from '../assets/onboarding/onboarding-4-favourites-illustration.png'
import loadingIllustration from '../assets/onboarding/onboarding-5-loading-illustration.png'

// ─── Design tokens (light-mode values only — see file header) ─────────────────
const COLORS = {
  accent:        '#2563EB', // --color-accent
  accentHover:   '#1D4ED8', // --color-accent-hover
  heroBlue:      '#2563EB', // slide 2–5 background
  surface:       '#FFFFFF', // --color-surface
  textPrimary:   '#1A1916', // --color-ink / --color-text-primary
  textSecondary: '#6B7280', // --color-text-secondary
  dotInactive:   '#D1D5DB',
}
const FONT_BODY = '"IBM Plex Sans", "IBM Plex Sans Arabic", sans-serif'

// Same height on every slide — was 55% (slides 2–5) vs 57% (slide 1), which
// put the white card's rounded top at a slightly different point depending
// on the slide.
const HERO_HEIGHT = '56%'

// ─── Slide data ─────────────────────────────────────────────────────────────
const SLIDES = [
  {
    id: 'welcome',
    image: welcomeHero,
    imageIsPhoto: true,
    headline: 'Welcome to',
    brand: true, // renders the CAPSULA logo under the headline
  },
  {
    id: 'library',
    image: libraryIllustration,
    headline: 'Your Medical Library, All in One Place',
    body: 'Access a growing library of clinical information, conditions, treatments, and more — whenever you need it.',
  },
  {
    id: 'drugs',
    image: drugsIllustration,
    headline: 'Know Your Drugs',
    body: 'Quickly find essential drug information, doses, indications, contraindications, and more.',
  },
  {
    id: 'favourites',
    image: favouritesIllustration,
    headline: 'Keep What Matters Close',
    body: 'Save your most-used drugs, conditions, and references to your favourites for quick access.',
  },
  {
    id: 'loading',
    image: loadingIllustration,
    headline: 'Setting up your library',
    body: 'This only needs to happen once …',
    isLoading: true,
  },
]

const LAST_INDEX = SLIDES.length - 1

// How much of the combined bar belongs to conditions (binary: 0 or fully
// filled the instant it's done) vs. drugs (real loaded/total fraction).
// See CAPSULA_DATA_TIERS_AND_ACCESS_PLAN.md §6/§8 Phase 1 for why weighted
// split was chosen over a two-phase bar.
const CONDITIONS_WEIGHT = 0.15

// Minimum time slide 5 stays visible before it's allowed to auto-complete,
// regardless of how far along loading already is. Without this, if both
// libraries finished loading before the user ever reached slide 5 (common,
// since loading starts the instant the app opens), the slide would appear
// and disappear in under a frame.
const LOADING_FLOOR_MS = 1200

// ─── Shared app logo — same asset layout.jsx's header uses (public/logo.svg),
// rendered white via a CSS filter on the blue hero slides so no second,
// light-on-dark image asset is needed. ─────────────────────────────────────
function CapsulaLogo({ light, height = 28 }) {
  return (
    <img
      src={`${import.meta.env.BASE_URL}logo.svg`}
      alt="Capsula"
      className="capsula-logo"
      style={{
        display: 'block',
        height,
        width:   'auto',
        filter:  light ? 'brightness(0) invert(1)' : 'none',
      }}
    />
  )
}

// ─── Combined progress ──────────────────────────────────────────────────────
function useCombinedLibraryProgress() {
  const { loading: conditionsLoading } = useConditionContext()
  const { loading: drugsLoading, progress: drugsProgress } = useDrugContext()

  // Drugs is only truly finished (light list + full detail) once loading
  // is false AND progress has been reset to null — loading alone flips
  // false as soon as the fast list arrives, while the fuller detail fetch
  // keeps reporting progress in the background after that. Onboarding
  // should wait for the whole thing, not just the fast list.
  const drugsDone = !drugsLoading && drugsProgress === null

  const conditionsFraction = conditionsLoading ? 0 : 1
  const drugsFraction = drugsProgress && drugsProgress.total > 0
    ? Math.min(1, drugsProgress.loaded / drugsProgress.total)
    : (drugsDone ? 1 : 0)

  const fraction =
    conditionsFraction * CONDITIONS_WEIGHT +
    drugsFraction * (1 - CONDITIONS_WEIGHT)

  const done = !conditionsLoading && drugsDone

  return { fraction, done }
}

// ─── OnboardingScreen ───────────────────────────────────────────────────────

export default function OnboardingScreen({ onDone }) {
  const [current, setCurrent] = useState(0)

  const { fraction, done } = useCombinedLibraryProgress()
  // Always holds the latest `done` value for use inside effects/timers
  // without those effects needing `done` itself in their dependency array.
  const doneRef = useRef(done)
  doneRef.current = done

  const isLoadingSlide = SLIDES[current].isLoading
  const isLast = current === LAST_INDEX

  function complete() {
    localStorage.setItem('capsula_onboarded', 'true')
    onDone()
  }

  // ── Preload every slide image on mount ─────────────────────────────────
  // A statically-imported image is only actually fetched by the browser
  // once an <img> referencing it mounts. Without preloading, reaching a
  // new slide kicked off that fetch right then — which is what let the
  // previous slide's image visibly hang around while the new one loaded.
  // Warming the cache for all 5 up front means every slide's image is
  // already decoded and ready the moment it's reached.
  useEffect(() => {
    SLIDES.forEach(s => {
      const preload = new Image()
      preload.src = s.image
    })
  }, [])

  // ── Minimum display time for the final (loading) slide ─────────────────
  // floorElapsed only flips true after LOADING_FLOOR_MS spent on this
  // slide, however far along loading already is; completion (below) waits
  // on both floorElapsed AND done. alreadyDoneAtEntryRef captures whether
  // the data was already fully loaded the moment this slide was reached —
  // used only to decide how the bar animates (see displayFraction below),
  // never to skip or shorten the floor itself.
  const [floorElapsed, setFloorElapsed] = useState(false)
  const [entryFillStarted, setEntryFillStarted] = useState(false)
  const alreadyDoneAtEntryRef = useRef(false)

  useEffect(() => {
    if (!isLoadingSlide) {
      setFloorElapsed(false)
      setEntryFillStarted(false)
      return
    }
    alreadyDoneAtEntryRef.current = doneRef.current
    setEntryFillStarted(false)
    const floorTimer = setTimeout(() => setFloorElapsed(true), LOADING_FLOOR_MS)
    // Flips on the next frame (not synchronously) so the width change
    // below is picked up as a CSS transition instead of an instant jump.
    const fillFrame = requestAnimationFrame(() => setEntryFillStarted(true))
    return () => {
      clearTimeout(floorTimer)
      cancelAnimationFrame(fillFrame)
    }
  }, [isLoadingSlide])

  useEffect(() => {
    if (isLoadingSlide && done && floorElapsed) {
      complete()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoadingSlide, done, floorElapsed])

  function next() {
    if (!isLast) setCurrent(c => c + 1)
    // No manual action on the final slide — completion is automatic (see
    // the effects above), matching "downloads stay fully automatic, no
    // manual tap to start" from the plan's existing decision.
  }

  // Real progress while genuinely still loading — unchanged from before.
  // If the data was already done the instant this slide was reached, show
  // a smooth synthetic fill to 100% over LOADING_FLOOR_MS instead (driven
  // by the CSS transition below), so the bar never appears to skip ahead
  // of what the floor timer allows.
  const displayFraction = isLoadingSlide
    ? (alreadyDoneAtEntryRef.current ? (entryFillStarted ? 1 : 0) : fraction)
    : 0

  const slide = SLIDES[current]
  const heroOnBlue = current !== 0 // slide 1 is a plain photo, 2–5 sit on the blue hero

  return (
    <div
      style={{
        position:   'fixed',
        inset:      0,
        display:    'flex',
        flexDirection: 'column',
        backgroundColor: COLORS.surface,
        fontFamily: FONT_BODY,
        userSelect: 'none',
        zIndex:     9999,
      }}
    >
      {/* ── Hero area (photo on slide 1, blue-bg illustration on 2–5) ── */}
      <div
        style={{
          position:        'relative',
          flex:            '0 0 auto',
          height:          HERO_HEIGHT,
          backgroundColor: heroOnBlue ? COLORS.heroBlue : COLORS.surface,
          display:         'flex',
          flexDirection:   'column',
          alignItems:      'center',
          justifyContent:  heroOnBlue ? 'flex-start' : 'stretch',
          overflow:        'hidden',
        }}
      >
        {heroOnBlue && (
          <div style={{ paddingTop: 40, paddingBottom: 8 }}>
            <CapsulaLogo light height={26} />
          </div>
        )}
        <img
          src={slide.image}
          alt=""
          style={{
            width:     heroOnBlue ? '78%' : '100%',
            height:    heroOnBlue ? 'auto' : '100%',
            maxHeight: heroOnBlue ? '80%' : undefined,
            objectFit: heroOnBlue ? 'contain' : 'cover',
            flex:      heroOnBlue ? undefined : 1,
            // 'auto 0' (top/bottom auto, left/right 0) centers the image
            // vertically in the leftover space below the logo — it used
            // to be 'auto 0 0' (bottom pinned to 0), which pushed the
            // image down against the card instead of centering it.
            margin:    heroOnBlue ? 'auto 0' : 0,
          }}
        />
      </div>

      {/* ── Card area ── */}
      <div
        style={{
          flex:            1,
          display:         'flex',
          flexDirection:   'column',
          alignItems:      'center',
          backgroundColor: COLORS.surface,
          borderTopLeftRadius:  28,
          borderTopRightRadius: 28,
          marginTop:       -20,
          padding:         '20px 32px 40px',
          position:        'relative',
          zIndex:          1,
          boxShadow:       '0 -4px 20px rgba(0,0,0,0.04)',
        }}
      >
        {/* Dots — visual progress indicator only, not interactive: no
            slide can be skipped or jumped to out of order. */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
          {SLIDES.map((_, i) => (
            <div
              key={i}
              style={{
                width:           i === current ? 20 : 6,
                height:          6,
                borderRadius:    3,
                backgroundColor: i === current ? COLORS.accent : COLORS.dotInactive,
                transition:      'all 0.25s ease',
              }}
            />
          ))}
        </div>

        <div style={{ textAlign: 'center', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          {slide.brand ? (
            <div>
              <div style={{ fontSize: 20, color: COLORS.textSecondary, marginBottom: 6 }}>
                {slide.headline}
              </div>
              <CapsulaLogo height={32} />
            </div>
          ) : (
            <h2
              style={{
                fontSize:      24,
                fontWeight:    700,
                color:         COLORS.accent,
                margin:        '0 0 12px',
                lineHeight:    1.25,
              }}
            >
              {slide.headline}
            </h2>
          )}

          {slide.body && (
            <p
              style={{
                fontSize:   15,
                color:      COLORS.textSecondary,
                lineHeight: 1.6,
                margin:     0,
              }}
            >
              {slide.body}
            </p>
          )}
        </div>

        {/* ── Bottom action: Next/Get Started button, or the combined
              progress bar on the final slide (no button there — the
              download is automatic and the screen advances itself). ── */}
        {isLoadingSlide ? (
          <div
            role="progressbar"
            aria-valuenow={Math.round(displayFraction * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
            style={{
              width:           '100%',
              height:          14,
              borderRadius:    999,
              border:          `2px solid ${COLORS.accent}`,
              backgroundColor: COLORS.surface,
              overflow:        'hidden',
              marginTop:       12,
            }}
          >
            <div
              style={{
                width:           `${Math.max(6, displayFraction * 100)}%`,
                height:          '100%',
                borderRadius:    999,
                backgroundColor: COLORS.accent,
                // Slower, deliberate fill when the data was already done
                // on arrival (matches LOADING_FLOOR_MS); the normal quick
                // transition otherwise, same as before.
                transition:      alreadyDoneAtEntryRef.current
                  ? `width ${LOADING_FLOOR_MS}ms ease`
                  : 'width 0.3s ease',
              }}
            />
          </div>
        ) : (
          <button
            onClick={next}
            style={{
              backgroundColor: COLORS.accent,
              color:           COLORS.surface,
              border:          'none',
              borderRadius:    999,
              padding:         '14px 32px',
              fontSize:        16,
              fontWeight:      600,
              fontFamily:      FONT_BODY,
              cursor:          'pointer',
              width:           current === 0 ? '100%' : 'auto',
              marginTop:       12,
            }}
            onMouseDown={e => { e.currentTarget.style.backgroundColor = COLORS.accentHover }}
            onMouseUp={e => { e.currentTarget.style.backgroundColor = COLORS.accent }}
          >
            {current === 0 ? "Let's Get Started" : 'Next'}
          </button>
        )}
      </div>
    </div>
  )
}
