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
 *
 * 2026-08-31 (onboarding-download-flow hardening, plan Phase 1, steps
 * 1.10-1.16 — see CAPSULA_DATA_TIERS_AND_ACCESS_PLAN.md for the full
 * decision trail). useDrugs.js/useConditions.js no longer auto-download
 * on a brand-new install (1.10) — they wait for start(), called from
 * here. This file provides that trigger and everything downstream of it:
 *   - 1.11: tapping Next on slide 4 (favourites) is what sends the
 *     "start now" signal — not app open.
 *   - 1.12: that Next tap checks isOnline first. Offline -> advances to
 *     slide 5 anyway, but skips straight to the Failed state below
 *     instead of ever attempting the fetch (no slow timeout to sit
 *     through for a connection that plainly isn't there).
 *   - 1.13: slide 5 has three real states instead of assuming success —
 *     Downloading (progress bar), Success (a brief confirmation, then it
 *     continues into the app on its own), and Failed (message + Retry).
 *   - 1.14: a hard ~28s time limit on an actual in-flight attempt — if
 *     nothing has finished by then, it drops into the Failed state too,
 *     same as a real error would.
 *   - 1.15: a back arrow on slides 2-4 only (not slide 1, not slide 5 —
 *     nothing to go back to once loading starts), plus a subtle fade
 *     between every slide and a fade from slide 5 into the real app on
 *     completion, instead of the previous instant cuts.
 * Retry (whatever the failure reason — offline, a real error, or a
 * timeout) always re-attempts both libraries, since there's no reliable
 * way to know from a stall alone which one actually stuck.
 */

import { useState, useRef, useEffect } from 'react'
import { useConditionContext } from '../context/ConditionContext'
import { useDrugContext } from '../context/DrugContext'
import { useOnlineStatus } from '../hooks/useOnlineStatus'

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
  // 2026-08-31 (onboarding-download-flow hardening): added for the
  // offline-block message and slide 5's Failed/Success states — standard
  // semantic red/green, matching this file's existing pattern of literal
  // light-mode hex values (see file header, forced-light-theme note).
  warning:       '#DC2626',
  success:       '#16A34A',
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

// How long the Success confirmation (checkmark + "All set!") stays on
// screen before completing onboarding, once both libraries are actually
// done. Mirrors LOADING_FLOOR_MS's role — without a hold here, a
// successful load would vanish straight into the app with no visible
// confirmation at all. (2026-08-31, onboarding-download-flow hardening.)
const SUCCESS_HOLD_MS = 900

// How long an actual in-flight attempt is allowed to run before it's
// treated as stuck and dropped into the Failed state (plan step 1.14 —
// "roughly 25-30 seconds"; picked the middle of that range). Only ever
// started once a real fetch attempt begins (see attemptId below) — never
// runs for the offline pre-check case in 1.12, since no attempt is made
// there at all.
const DOWNLOAD_TIMEOUT_MS = 28000

// How long the whole screen takes to fade out once onboarding completes,
// instead of cutting straight to the real app (plan step 1.15).
const COMPLETE_FADE_MS = 400

// How long each slide takes to fade in on arrival (plan step 1.15).
const SLIDE_FADE_MS = 220

// Shared pill-button style — used by the slide Next/Get Started button and
// slide 5's Failed-state Retry button, so the two stay visually identical
// without duplicating the same style object twice.
const PRIMARY_BUTTON_STYLE = {
  backgroundColor: COLORS.accent,
  color:           COLORS.surface,
  border:          'none',
  borderRadius:    999,
  padding:         '14px 32px',
  fontSize:        16,
  fontWeight:      600,
  fontFamily:      FONT_BODY,
  cursor:          'pointer',
}

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
// 2026-08-31 (onboarding-download-flow hardening): now also surfaces
// `failed` and exposes `start`/`retry` for both libraries together, since
// slide 4's Next tap and slide 5's Failed-state Retry button both need to
// act on whichever library is actually relevant without the rest of this
// file reaching into two separate contexts itself.
function useCombinedLibraryProgress() {
  const {
    loading: conditionsLoading,
    error:   conditionsError,
    start:   startConditions,
    retry:   retryConditions,
  } = useConditionContext()
  const {
    loading:  drugsLoading,
    progress: drugsProgress,
    error:    drugsError,
    start:    startDrugs,
    retry:    retryDrugs,
  } = useDrugContext()

  // 2026-08-31 bugfix: this used to also wait for `drugsProgress` to reset
  // to null, meaning it waited for BOTH the fast list AND the much bigger
  // background detail fetch (same ~19,700-row catalog again, just with
  // every clinical field this time) before ever letting onboarding move
  // on. That's why the bar visibly filled once for the list, snapped back
  // to the start, and filled a second time for the full data — and why
  // the whole screen sat there roughly twice as long as it needed to.
  // Original decision (plan §7/1.7) was always to wait for the fast list
  // only — `loading` flips false the moment that's ready — and let the
  // fuller detail fetch keep loading quietly in the background exactly
  // like it already does on every later app open. Restoring that here.
  const drugsDone = !drugsLoading && !drugsError

  const failed = !!drugsError || !!conditionsError

  const conditionsFraction = (conditionsLoading || conditionsError) ? 0 : 1
  // Once drugsDone is true, pin the bar at full — the background detail
  // fetch keeps calling onProgress after this point (it's a separate,
  // later stage we're no longer waiting on), and reading it live here is
  // exactly what caused the bar to jump back down mid-"All set". Checking
  // drugsDone first means those later updates are simply ignored.
  const drugsFraction = drugsError
    ? 0
    : drugsDone
      ? 1
      : (drugsProgress && drugsProgress.total > 0
          ? Math.min(1, drugsProgress.loaded / drugsProgress.total)
          : 0)

  const fraction =
    conditionsFraction * CONDITIONS_WEIGHT +
    drugsFraction * (1 - CONDITIONS_WEIGHT)

  const done = !failed && !conditionsLoading && drugsDone

  function start() {
    startDrugs()
    startConditions()
  }

  // 2026-08-31: always retries both, regardless of which (if either) has
  // a real `error` set — a stalled attempt (1.14's timeout) or an
  // offline-skipped attempt (1.12) has no per-library error to key off
  // of, so there's no reliable way to know from the failure alone which
  // one actually stuck. Re-fetching a library that already succeeded is
  // a harmless extra request, not a destructive one.
  function retry() {
    retryDrugs()
    retryConditions()
  }

  return { fraction, done, failed, start, retry }
}

// ─── OnboardingScreen ───────────────────────────────────────────────────────

export default function OnboardingScreen({ onDone }) {
  const [current, setCurrent] = useState(0)

  const { fraction, done, failed: hookFailed, start: startBoth, retry: retryBoth } = useCombinedLibraryProgress()
  const { isOnline } = useOnlineStatus()

  // 2026-08-31 (plan step 1.12): true when slide 4's Next tap found no
  // connection — no fetch is ever attempted in that case, so this is
  // tracked separately from hookFailed (a real error from an attempt
  // that actually ran). Cleared the moment a real attempt is kicked off.
  const [offlinePreCheck, setOfflinePreCheck] = useState(false)
  // 2026-08-31 (plan step 1.14): true once DOWNLOAD_TIMEOUT_MS has passed
  // on an actual in-flight attempt with nothing done. See the timeout
  // effect below.
  const [timedOut, setTimedOut] = useState(false)
  // Bumped every time a real fetch attempt begins (initial start or a
  // Retry) — the timeout effect only ever runs once this is > 0, so the
  // offline pre-check case (no attempt made) never starts a stray timer.
  const [attemptId, setAttemptId] = useState(0)

  const failed = offlinePreCheck || timedOut || hookFailed

  const failedMessage = offlinePreCheck
    ? 'Please connect to the internet and try again.'
    : timedOut
      ? 'This is taking longer than expected. Check your connection and try again.'
      : 'Something went wrong loading your library. Check your connection and try again.'

  // Always holds the latest `done` value for use inside effects/timers
  // without those effects needing `done` itself in their dependency array.
  const doneRef = useRef(done)
  doneRef.current = done

  const isLoadingSlide = SLIDES[current].isLoading
  const isLast = current === LAST_INDEX
  const isFirst = current === 0
  const isFavouritesSlide = current === 3 // slide 4 — see file header
  // Back arrow only on slides 2-4 (plan step 1.15) — never slide 1
  // (nothing before it) or slide 5 (nothing to go back to once loading
  // starts, and going back mid-download isn't a supported flow here).
  const showBackArrow = !isFirst && !isLoadingSlide

  // 2026-08-31 (plan step 1.15): fades the whole screen out before
  // actually completing, instead of cutting straight to the real app.
  const [completing, setCompleting] = useState(false)

  function complete() {
    setCompleting(true)
    setTimeout(() => {
      localStorage.setItem('capsula_onboarded', 'true')
      onDone()
    }, COMPLETE_FADE_MS)
  }

  // 2026-08-31 (plan step 1.14): once a real attempt is under way,
  // give it DOWNLOAD_TIMEOUT_MS to actually finish before treating it as
  // stuck. Re-runs (and so restarts cleanly) whenever a new attempt
  // begins, or stops immediately once the attempt actually finishes
  // (done) or fails for a real reason (hookFailed) — no point letting a
  // stale timer fire after the outcome is already known.
  useEffect(() => {
    if (!isLoadingSlide || attemptId === 0 || done || hookFailed) return
    const timer = setTimeout(() => setTimedOut(true), DOWNLOAD_TIMEOUT_MS)
    return () => clearTimeout(timer)
  }, [isLoadingSlide, attemptId, done, hookFailed])

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
  // 2026-08-31: true while the brief Success confirmation (checkmark +
  // "All set!") is showing, right before complete() fires. See the effect
  // below.
  const [showSuccess, setShowSuccess] = useState(false)
  const alreadyDoneAtEntryRef = useRef(false)

  useEffect(() => {
    if (!isLoadingSlide) {
      setFloorElapsed(false)
      setEntryFillStarted(false)
      setShowSuccess(false)
      setTimedOut(false)
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

  // 2026-08-31: once both libraries are genuinely done (and the minimum
  // floor time has passed) with no error, show the brief Success
  // confirmation instead of jumping straight into the app — then
  // complete() after SUCCESS_HOLD_MS. Never fires while `failed` is true;
  // the Failed state (rendered below) takes over instead.
  useEffect(() => {
    if (isLoadingSlide && done && floorElapsed && !failed) {
      setShowSuccess(true)
      const holdTimer = setTimeout(() => complete(), SUCCESS_HOLD_MS)
      return () => clearTimeout(holdTimer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoadingSlide, done, floorElapsed, failed])

  function next() {
    if (isLast) return

    // Slide 4 (favourites) is where the first-ever library download
    // begins — see useDrugs.js/useConditions.js's start(). Plan step
    // 1.12: offline still advances to slide 5, it just skips straight to
    // the Failed state there instead of ever attempting the fetch — no
    // slow timeout to sit through for a connection that plainly isn't
    // there.
    if (isFavouritesSlide) {
      setCurrent(c => c + 1)
      if (!isOnline) {
        setOfflinePreCheck(true)
        return
      }
      setOfflinePreCheck(false)
      setTimedOut(false)
      setAttemptId(id => id + 1)
      startBoth()
      return
    }

    setCurrent(c => c + 1)
  }

  // Plan step 1.15 — back arrow, slides 2-4 only (see showBackArrow above).
  function prev() {
    if (current > 0 && !isLoadingSlide) setCurrent(c => c - 1)
  }

  // Failed-state Retry button (plan steps 1.12-1.14) — covers all three
  // failure reasons (offline pre-check, a real error, or a timeout) the
  // same way, since retry() always re-attempts both libraries regardless
  // of which one actually stuck. If still offline, there's genuinely
  // nothing to retry yet, so this just no-ops rather than kicking off a
  // fetch that will only stall again.
  function handleRetry() {
    if (!isOnline) return
    setOfflinePreCheck(false)
    setTimedOut(false)
    setAttemptId(id => id + 1)
    retryBoth()
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

  // 2026-08-31 (plan step 1.15): fades the slide content in on arrival —
  // starts hidden, flips visible next frame so the opacity change is
  // picked up as a transition rather than an instant jump (same
  // next-frame trick as entryFillStarted above).
  const [slideVisible, setSlideVisible] = useState(false)
  useEffect(() => {
    setSlideVisible(false)
    const frame = requestAnimationFrame(() => setSlideVisible(true))
    return () => cancelAnimationFrame(frame)
  }, [current])

  return (
    <div
      style={{
        position:   'fixed',
        inset:      0,
        backgroundColor: COLORS.surface,
        fontFamily: FONT_BODY,
        userSelect: 'none',
        zIndex:     9999,
        opacity:    completing ? 0 : 1,
        transition: `opacity ${COMPLETE_FADE_MS}ms ease`,
      }}
    >
      <div
        style={{
          display:       'flex',
          flexDirection: 'column',
          height:        '100%',
          opacity:       slideVisible ? 1 : 0,
          transition:    `opacity ${SLIDE_FADE_MS}ms ease`,
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
        {showBackArrow && (
          <button
            onClick={prev}
            aria-label="Back"
            style={{
              position: 'absolute',
              top:      36,
              left:     20,
              zIndex:   2,
              background: 'none',
              border:     'none',
              padding:    8,
              cursor:     'pointer',
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path
                d="M15 5L8 12L15 19"
                stroke={heroOnBlue ? COLORS.surface : COLORS.textPrimary}
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        )}
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

        {/* ── Bottom action: Next/Get Started button on slides 1–4, or
              one of slide 5's three real states (Downloading/Success/
              Failed) on the final slide. ── */}
        {isLoadingSlide ? (
          failed ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, width: '100%', marginTop: 12 }}>
              <p style={{ fontSize: 14, color: COLORS.warning, margin: 0, textAlign: 'center', lineHeight: 1.5 }}>
                {failedMessage}
              </p>
              <button
                onClick={handleRetry}
                style={PRIMARY_BUTTON_STYLE}
                onMouseDown={e => { e.currentTarget.style.backgroundColor = COLORS.accentHover }}
                onMouseUp={e => { e.currentTarget.style.backgroundColor = COLORS.accent }}
              >
                Try Again
              </button>
            </div>
          ) : showSuccess ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, marginTop: 12 }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <circle cx="12" cy="12" r="11" stroke={COLORS.success} strokeWidth="2" />
                <path d="M7 12.5L10.2 15.5L17 8.5" stroke={COLORS.success} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span style={{ fontSize: 15, fontWeight: 600, color: COLORS.success }}>All set!</span>
            </div>
          ) : (
          ) : (
            <div style={{ width: '100%', marginTop: 12 }}>
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
              {/* 2026-08-31 bugfix: the bar previously had no readable
                  number anywhere near it — just a plain shape with no way
                  to tell how far along it actually was. */}
              <div style={{ fontSize: 13, color: COLORS.textSecondary, marginTop: 8 }}>
                {Math.round(displayFraction * 100)}%
              </div>
            </div>
          )
        ) : (
          <button
            onClick={next}
            style={{
              ...PRIMARY_BUTTON_STYLE,
              width:     current === 0 ? '100%' : 'auto',
              marginTop: 12,
            }}
            onMouseDown={e => { e.currentTarget.style.backgroundColor = COLORS.accentHover }}
            onMouseUp={e => { e.currentTarget.style.backgroundColor = COLORS.accent }}
          >
            {current === 0 ? "Let's Get Started" : 'Next'}
          </button>
        )}
      </div>
      </div>
    </div>
  )
}
