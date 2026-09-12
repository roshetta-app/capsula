/**
 * src/screens/OnboardingScreen.jsx
 * Onboarding redesign (2026-08-30) — see CAPSULA_DATA_TIERS_AND_ACCESS_PLAN.md,
 * Phase 1, steps 1.6–1.9 for the full decision trail.
 *
 * Shown only on first launch (localStorage key: capsula_onboarded absent).
 * 4 fixed onboarding slides, Next-button only — no swipe, no skip button, no
 * dot-jump — every slide must be moved through in order:
 *   1. Welcome            — photo hero, no body text, "Lets Get Started"
 *   2. Your Medical Library, All in One Place
 *   3. Know Your Drugs
 *   4. Keep What Matters Close
 *
 * 2026-09-12 (onboarding-redesign-refine): library setup is explicitly NOT
 * a 5th slide any more — it's a separate process that begins the instant
 * Next is tapped on slide 4, tracked by its own `setupStarted` flag rather
 * than by advancing `current` past the last real slide. `current` now only
 * ever ranges over the 4 onboarding slides; the dot pagination is derived
 * from it directly and disappears the moment setup begins, since there is
 * nothing left to paginate. Setup itself has four states, rendered in the
 * same card area the slides use: Preparing (shown until either library's
 * first real signal comes back), Downloading (the combined bar plus a
 * per-category breakdown — Medical library / Drug library / Images &
 * references — each showing real page counts, never fabricated numbers),
 * Error (redesigned problem-first, with a short troubleshooting list, a
 * Retry button, and a Back to onboarding button that returns to slide 4),
 * and Success ("All set!" plus a completed-categories checklist, then an
 * "Opening Capsula…" caption before the existing auto-complete fires — no
 * Continue button anywhere). The underlying download/error/retry/complete
 * machinery below (LOADING_FLOOR_MS, SUCCESS_HOLD_MS, DOWNLOAD_TIMEOUT_MS,
 * the reconnect/stall effects, complete()) is unchanged — this only adds a
 * `setupStarted` flag alongside `current` and changes what gets rendered
 * for the Preparing/Downloading/Error/Success moments.
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
 *
 * 2026-08-31 (onboarding-download-resilience): two further hardening
 * changes, on top of 1.10-1.18 above.
 *   - DOWNLOAD_TIMEOUT_MS's timer now resets every time real progress
 *     happens (see the timeout effect below), instead of running once as
 *     a flat clock from the start of the attempt. It now only fires on a
 *     genuine stall — nothing progressing for the full window — so a
 *     slow-but-working connection is no longer wrongly treated the same
 *     as a stuck one.
 *   - While the Failed state is showing, the screen now watches for the
 *     connection coming back and resumes the download on its own — no
 *     tap needed (see the reconnect effect below). Relies on
 *     useOnlineStatus already confirming a real, reachable connection
 *     (not just the device's own claim) before reporting back online.
 *   - A single dropped page/request during either library's download now
 *     quietly retries a few times before giving up, instead of taking
 *     down the whole attempt over one blip — see src/lib/queries.js's
 *     matching change. This file needed no change for that part: a
 *     retried-and-recovered page never surfaces as a failure up here at
 *     all.
 *
 * 2026-09-01 (onboarding-offline-retry fix): the 28s stall timeout above
 * was the ONLY thing that ever noticed a connection dying mid-download —
 * so a genuinely dropped connection could take up to 28s to show Failed,
 * even though the real cause (no connection) was knowable almost
 * immediately. useOnlineStatus now re-verifies the real connection
 * continuously, every ~10s, instead of only after the device's own
 * on/off signal fires (see OnlineStatusContext.jsx's header). This file
 * now reacts the instant that check reports the connection is genuinely
 * gone while a download is actually in progress, dropping straight into
 * the Failed state instead of waiting out the stall timer — see the new
 * effect below, the mirror image of the existing reconnect effect. The
 * 28s stall timer stays in place as a backstop for the different case of
 * a connection that reports fine but is just very slow.
 *
 * 2026-09-12 (Phase 13 — Onboarding back handling): hardware/browser back
 * now mirrors the on-screen back arrow exactly, via useBackClose — reusing
 * showBackArrow as-is as the guard, rather than a separate condition, so
 * hardware back and the visible arrow can never drift out of sync. Active
 * on slides 2-4 only: a back press there steps back one slide, same as
 * tapping the arrow. On slide 1, showBackArrow is false, so the hook is
 * inactive and back falls through to its normal platform behavior (exits
 * the app / leaves the site) — the only slide that does. On slide 5,
 * showBackArrow is also false (loading), matching the existing "going
 * back mid-download isn't a supported flow" behavior of the arrow itself.
 *
 * 2026-09-12 (onboarding minor fixes): HERO_HEIGHT is now '38%' on every
 * slide, not just once setup begins — the setupStarted ternary on the hero
 * area's height is gone, so slides 1-4 now use the same taller card/sheet
 * that slide 5's setup states already had. Slides 2-4's PNG illustrations
 * now get a fixed height (46%) instead of 'auto' capped at a maxHeight, so
 * all three render at the same size regardless of each file's own aspect
 * ratio, instead of each auto-sizing to a different height.
 */

import { useState, useRef, useEffect } from 'react'
import { useConditionContext } from '../context/ConditionContext'
import { useDrugContext } from '../context/DrugContext'
import { useOnlineStatus } from '../hooks/useOnlineStatus'
import { useBackClose } from '../hooks/useBackClose'

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
const HERO_HEIGHT = '38%'

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
    body: 'Find the clinical information you need, organized for quick reference.',
  },
  {
    id: 'drugs',
    image: drugsIllustration,
    headline: 'Know Your Drugs',
    body: 'Quickly find doses, indications, contraindications, interactions, and essential drug information.',
  },
  {
    id: 'favourites',
    image: favouritesIllustration,
    headline: 'Keep What Matters Close',
    body: 'Save frequently used drugs and conditions to your favourites for instant access.',
  },
]

// Index of the last real onboarding slide (Favourites) — tapping Next here
// begins library setup instead of advancing to another slide. See
// `setupStarted` below; setup is a separate process, not a 5th slide.
const LAST_INDEX = SLIDES.length - 1

// How much of the combined bar belongs to conditions (binary: 0 or fully
// filled the instant it's done) vs. drugs (real loaded/total fraction).
// See CAPSULA_DATA_TIERS_AND_ACCESS_PLAN.md §6/§8 Phase 1 for why weighted
// split was chosen over a two-phase bar.
const CONDITIONS_WEIGHT = 0.15

// 2026-09-01 (Image System Refinement Plan, Part A): the combined bar's
// third weighted component, alongside conditions and drugs — gallery-photo
// download progress, reported by useConditions.js's photosLoading/
// photosProgress. Real loaded/total fraction, same treatment as drugs'
// weight below. No plan-specified split for three components yet, so this
// is a starting judgment call (drugs keeps the remainder,
// 1 - CONDITIONS_WEIGHT - PHOTOS_WEIGHT); easy to retune later.
const PHOTOS_WEIGHT = 0.15

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

// 2026-09-12 (onboarding-redesign-refine): plain-text secondary action,
// used by the Error state's "Back to onboarding" button — deliberately
// much lower-emphasis than PRIMARY_BUTTON_STYLE's filled pill, since Retry
// is the expected/primary action there.
const SECONDARY_BUTTON_STYLE = {
  backgroundColor: 'transparent',
  color:           COLORS.textSecondary,
  border:          'none',
  padding:         '8px 12px',
  fontSize:        14,
  fontWeight:      500,
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
    // 2026-09-12 (onboarding-progress-parity): conditions now reports real
    // page-by-page progress the same shape drugs' `progress` always has
    // (see useConditions.js) — replaces the old binary "0 until done, then
    // 1" treatment below with the same real-fraction logic drugs uses.
    progress: conditionsProgress,
    start:   startConditions,
    retry:   retryConditions,
    // 2026-09-01 (Image System Refinement Plan, Part A): gallery-photo
    // download progress, folded into this hook's combined fraction below
    // as a third weighted component.
    photosLoading,
    photosProgress,
  } = useConditionContext()
  const {
    loading:  drugsLoading,
    progress: drugsProgress,
    error:    drugsError,
    start:    startDrugs,
    retry:    retryDrugs,
  } = useDrugContext()

  // 2026-08-31 (second pass, plan Phase 1 addendum 1.18): useDrugs.js's
  // cold-start fetch is now a single, complete download rather than a fast
  // list followed by a bigger background detail fetch — 'loading' and
  // 'progress' both belong to that one download now, so 'drugsDone' simply
  // reflects whether it has finished. (An earlier version of this comment
  // described a two-stage bugfix specific to the old fast-list/full-detail
  // split; that split no longer exists, so there's nothing left here for
  // this hook to reconcile between two stages.)
  const drugsDone = !drugsLoading && !drugsError
  const conditionsDone = !conditionsLoading && !conditionsError

  // 2026-09-01 (Image System Refinement Plan, Part A): a failed individual
  // photo download is non-fatal (plan §4) and never surfaces as an error
  // here — useConditions.js already logs it and still counts it toward
  // photosProgress, so this only tracks whether the sync step itself has
  // finished running, not whether every photo in it succeeded.
  const photosDone = !photosLoading

  const failed = !!drugsError || !!conditionsError

  // 2026-09-12 (onboarding-progress-parity): same real loaded/total
  // treatment drugsFraction below already uses — conditions' paging was
  // always real, it just wasn't reported until now (see useConditions.js).
  const conditionsFraction = conditionsError
    ? 0
    : conditionsDone
      ? 1
      : (conditionsProgress && conditionsProgress.total > 0
          ? Math.min(1, conditionsProgress.loaded / conditionsProgress.total)
          : 0)
  // Once drugsDone is true, pin the bar at full. 'loading' and 'progress'
  // now resolve together at the end of the single cold-start download (see
  // useDrugs.js's fetchColdStart), so this is a plain safety net rather
  // than a fix for a live bug — nothing sets 'progress' again after
  // 'loading' flips false for this to guard against anymore.
  const drugsFraction = drugsError
    ? 0
    : drugsDone
      ? 1
      : (drugsProgress && drugsProgress.total > 0
          ? Math.min(1, drugsProgress.loaded / drugsProgress.total)
          : 0)
  // Same real loaded/total treatment as drugs above — see photosDone's
  // comment for why a per-photo failure never zeroes this out the way a
  // real drugsError does.
  const photosFraction = photosDone
    ? 1
    : (photosProgress && photosProgress.total > 0
        ? Math.min(1, photosProgress.loaded / photosProgress.total)
        : 0)

  const fraction =
    conditionsFraction * CONDITIONS_WEIGHT +
    photosFraction * PHOTOS_WEIGHT +
    drugsFraction * (1 - CONDITIONS_WEIGHT - PHOTOS_WEIGHT)

  const done = !failed && conditionsDone && drugsDone && photosDone

  // 2026-09-12 (onboarding-redesign-refine): true the moment either
  // library's first real signal has actually come back (its own page-count
  // query has landed) — used to tell the Preparing state apart from
  // Downloading. Before this, nothing has actually started moving yet:
  // the connection check and the very first request round-trip are still
  // in flight. Also true once done/failed, so a device that finishes (or
  // fails) unusually fast never gets stuck showing Preparing.
  const hasRealProgress = !!drugsProgress || !!conditionsProgress || done || failed

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

  // 2026-09-12 (onboarding-redesign-refine): per-category breakdown for
  // the Downloading state's three rows (Medical library / Drug library /
  // Images & references). Each entry carries the real { loaded, total }
  // this category's own hook reports (or null if it hasn't started yet),
  // plus done/failed — the UI never invents a number that isn't here.
  const categories = {
    conditions: { progress: conditionsProgress, done: conditionsDone, failed: !!conditionsError },
    drugs:      { progress: drugsProgress,      done: drugsDone,      failed: !!drugsError },
    photos:     { progress: photosProgress,     done: photosDone,     failed: false },
  }

  return { fraction, done, failed, start, retry, hasRealProgress, categories }
}

// One row of the Downloading state's per-category breakdown. `dotColor`
// mirrors the pending/downloading/completed states called for in the
// brief — hollow gray (pending), filled accent (downloading), filled
// green (completed) — without needing a separate icon asset.
//
// 2026-09-12 (spinner-not-counts): the right-hand side no longer shows a
// raw "X of Y" number — replaced with a plain spinning ring while a
// category is actively downloading, and nothing extra once it's done (the
// checkmark on the left already says so) or while it's still pending.
function CategoryRow({ name, category }) {
  const state = category.done ? 'done' : (category.progress ? 'active' : 'pending')
  const dotColor = state === 'done' ? COLORS.success : state === 'active' ? COLORS.accent : COLORS.dotInactive
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0' }}>
      <div style={{ width: 18, height: 18, flex: '0 0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {state === 'done' ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <circle cx="12" cy="12" r="11" stroke={COLORS.success} strokeWidth="2" />
            <path d="M7 12.5L10.2 15.5L17 8.5" stroke={COLORS.success} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : (
          <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: dotColor }} />
        )}
      </div>
      <div style={{ flex: 1, textAlign: 'left', fontSize: 14, color: COLORS.textPrimary }}>{name}</div>
      {state === 'active' && (
        <div
          className="capsula-onboarding-spinner"
          style={{
            width: 16, height: 16, borderRadius: '50%',
            border: `2px solid ${COLORS.dotInactive}`,
            borderTopColor: COLORS.accent,
          }}
          aria-label="Downloading"
        />
      )}
    </div>
  )
}

// One row of the Preparing state's checklist — 'done' (filled green
// check), or 'pending' (hollow gray circle). There's no in-between state
// tracked for these two items on purpose: Preparing only ever shows
// Downloading/Installing as still ahead of it (see file header).
function PreparingRow({ label, done }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0' }}>
      {done ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <circle cx="12" cy="12" r="11" stroke={COLORS.success} strokeWidth="2" />
          <path d="M7 12.5L10.2 15.5L17 8.5" stroke={COLORS.success} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : (
        <div style={{ width: 16, height: 16, borderRadius: '50%', border: `2px solid ${COLORS.dotInactive}` }} />
      )}
      <span style={{ fontSize: 14, color: done ? COLORS.textPrimary : COLORS.textSecondary }}>{label}</span>
    </div>
  )
}

// ─── OnboardingScreen ───────────────────────────────────────────────────────

export default function OnboardingScreen({ onDone }) {
  const [current, setCurrent] = useState(0)

  // 2026-09-12 (onboarding-redesign-refine): true once Next has been
  // tapped on the last onboarding slide (Favourites) — library setup is a
  // separate process from here on, not a 5th slide. See file header.
  const [setupStarted, setSetupStarted] = useState(false)

  const {
    fraction, done, failed: hookFailed, start: startBoth, retry: retryBoth,
    hasRealProgress, categories,
  } = useCombinedLibraryProgress()
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

  const isLast = current === LAST_INDEX
  const isFirst = current === 0
  // Slide 4 (Favourites) is the last real slide and the one whose Next tap
  // begins library setup — same index isLast already checks, kept as its
  // own name for clarity at each call site below.
  const isFavouritesSlide = isLast
  // Back arrow only on slides 2-4 (plan step 1.15) — never slide 1
  // (nothing before it) or during setup (nothing to go back to once
  // loading starts, and going back mid-download isn't a supported flow —
  // the Error state's own "Back to onboarding" button is the one
  // supported way back, see handleBackToOnboarding below).
  const showBackArrow = !isFirst && !setupStarted

  // 2026-09-12 (Phase 13 — Onboarding back handling): hardware/browser
  // back mirrors the on-screen back arrow exactly — reuses showBackArrow
  // itself as the guard (not a separate condition) so the two can never
  // drift out of sync. Inactive on slide 1 (showBackArrow is false there),
  // so a back press falls through to the platform's normal behavior and
  // exits — the only slide where that happens. Also inactive on slide 5
  // for the same reason the arrow is hidden there.
  useBackClose(showBackArrow, prev)

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

  // 2026-08-31 (plan step 1.14; stall-only fix same day, onboarding-
  // download-resilience): once a real attempt is under way, give it
  // DOWNLOAD_TIMEOUT_MS with no progress before treating it as stuck.
  // 'fraction' is in the dependency list specifically so this timer
  // restarts every time real progress lands, not just once per attempt —
  // it now only fires after a genuine stall (nothing moving for the full
  // window), instead of a flat clock that could interrupt a slow-but-
  // working download. Also restarts cleanly whenever a new attempt
  // begins, and stops immediately once the attempt actually finishes
  // (done) or fails for a real reason (hookFailed) — no point letting a
  // stale timer fire after the outcome is already known.
  useEffect(() => {
    if (!setupStarted || attemptId === 0 || done || hookFailed) return
    const timer = setTimeout(() => setTimedOut(true), DOWNLOAD_TIMEOUT_MS)
    return () => clearTimeout(timer)
  }, [setupStarted, attemptId, done, hookFailed, fraction])

  // ── Preload every slide image, plus the setup illustration, on mount ───
  // A statically-imported image is only actually fetched by the browser
  // once an <img> referencing it mounts. Without preloading, reaching a
  // new slide kicked off that fetch right then — which is what let the
  // previous slide's image visibly hang around while the new one loaded.
  // Warming the cache for all of them up front means every slide's image,
  // and the Preparing/Downloading illustration, are already decoded and
  // ready the moment each is reached.
  useEffect(() => {
    SLIDES.forEach(s => {
      const preload = new Image()
      preload.src = s.image
    })
    const setupPreload = new Image()
    setupPreload.src = loadingIllustration
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
    if (!setupStarted) {
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
  }, [setupStarted])

  // 2026-08-31: once both libraries are genuinely done (and the minimum
  // floor time has passed) with no error, show the brief Success
  // confirmation instead of jumping straight into the app — then
  // complete() after SUCCESS_HOLD_MS. Never fires while `failed` is true;
  // the Failed state (rendered below) takes over instead.
  useEffect(() => {
    if (setupStarted && done && floorElapsed && !failed) {
      setShowSuccess(true)
      const holdTimer = setTimeout(() => complete(), SUCCESS_HOLD_MS)
      return () => clearTimeout(holdTimer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setupStarted, done, floorElapsed, failed])

  function next() {
    if (setupStarted) return // no Next button renders once setup begins

    // Slide 4 (Favourites) is where the first-ever library download
    // begins — see useDrugs.js/useConditions.js's start(). 2026-09-12:
    // this now flips setupStarted instead of advancing `current` past the
    // last slide — setup is its own process, not a 5th slide (see file
    // header). Plan step 1.12: offline still enters setup, it just skips
    // straight to the Error state there instead of ever attempting the
    // fetch — no slow timeout to sit through for a connection that
    // plainly isn't there.
    if (isFavouritesSlide) {
      setSetupStarted(true)
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
    if (current > 0 && !setupStarted) setCurrent(c => c - 1)
  }

  // 2026-09-12 (onboarding-redesign-refine): the Error state's "Back to
  // onboarding" button. Genuinely returns to the onboarding flow at the
  // last slide before setup began (Favourites), rather than resetting to
  // slide 1 — the "appropriate point" the brief calls for. Doesn't stop or
  // reset any already-started download: useDrugs.js/useConditions.js's
  // start() is a no-op once startedRef is set, so tapping Next again here
  // simply re-enters setup and picks up whatever's already in flight (or
  // already finished) rather than restarting it.
  function handleBackToOnboarding() {
    setSetupStarted(false)
    setOfflinePreCheck(false)
    setTimedOut(false)
    setCurrent(LAST_INDEX)
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

  // 2026-08-31 (onboarding-download-resilience): while the Failed state is
  // showing, resume automatically the moment a real connection is
  // confirmed back, instead of waiting for a manual Retry tap.
  // useOnlineStatus already verifies actual reachability (not just the
  // device's own claim) before reporting isOnline true, so this only
  // fires on a genuine, usable reconnect. Tracks the previous isOnline
  // value so this only reacts to the false→true edge — being online
  // already shouldn't retrigger this on every unrelated re-render.
  const wasOnlineRef = useRef(isOnline)
  useEffect(() => {
    const cameBackOnline = !wasOnlineRef.current && isOnline
    wasOnlineRef.current = isOnline
    if (cameBackOnline && setupStarted && failed) {
      handleRetry()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline])

  // 2026-09-01 (onboarding-offline-retry fix): mirror image of the
  // reconnect effect above — the moment a real, in-flight attempt's
  // connection is confirmed genuinely gone (not just slow), drop straight
  // into the Failed state instead of waiting out the full stall timeout.
  // isOnline now gets re-verified continuously (every ~10s, not just on
  // the device's own on/off signal — see OnlineStatusContext.jsx), so this
  // fires within one of those cycles instead of only after a long stall.
  // Guarded to a real in-flight attempt (attemptId > 0, not yet done or
  // hookFailed) so it never fires for the separate pre-check case in
  // next()/1.12, which already handles offline before an attempt even
  // starts.
  useEffect(() => {
    if (!isOnline && setupStarted && attemptId > 0 && !done && !hookFailed) {
      setOfflinePreCheck(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline, setupStarted, attemptId, done, hookFailed])

  // Real progress while genuinely still loading — unchanged from before.
  // If the data was already done the instant this slide was reached, show
  // a smooth synthetic fill to 100% over LOADING_FLOOR_MS instead (driven
  // by the CSS transition below), so the bar never appears to skip ahead
  // of what the floor timer allows.
  const displayFraction = setupStarted
    ? (alreadyDoneAtEntryRef.current ? (entryFillStarted ? 1 : 0) : fraction)
    : 0

  // 2026-09-12 (onboarding-redesign-refine): Preparing is shown from the
  // instant setup begins until either library's first real signal comes
  // back (hasRealProgress) — see useCombinedLibraryProgress's comment.
  // Once failed/showSuccess/hasRealProgress, this is moot (those states
  // take over below), so it only actually matters for the brief window
  // right after Next is tapped.
  const showPreparing = setupStarted && !failed && !showSuccess && !hasRealProgress

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
      {/* 2026-09-12: single small stylesheet for the Downloading state's
          per-category spinner (CategoryRow above) — inline styles alone
          can't express a CSS keyframe animation. */}
      <style>{'@keyframes capsula-onboarding-spin { to { transform: rotate(360deg); } } .capsula-onboarding-spinner { animation: capsula-onboarding-spin 0.8s linear infinite; }'}</style>
      <div
        style={{
          display:       'flex',
          flexDirection: 'column',
          height:        '100%',
          opacity:       slideVisible ? 1 : 0,
          transition:    `opacity ${SLIDE_FADE_MS}ms ease`,
        }}
      >
      {/* ── Hero area (photo on slide 1, blue-bg illustration on 2–5) ──
          2026-09-12: shrunk further once setup begins — the Preparing/
          Downloading/Error/Success illustrations are already much smaller
          than a slide illustration, so giving the card more height here is
          a free win, not a visual cost. Combined with the card's own
          scroll fallback below, this is the fix for the Downloading
          state's content overflowing with no way to reach what's cut off. */}
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
        {setupStarted ? (
          failed ? (
            // 2026-09-12: error illustration deliberately small/subordinate
            // (brief §14) — the problem and the fix matter more here than
            // a picture, unlike slides 2-4 where the illustration is the
            // point.
            <svg width="56" height="56" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style={{ margin: 'auto 0' }}>
              <circle cx="12" cy="12" r="11" stroke={COLORS.surface} strokeWidth="2" opacity="0.9" />
              <path d="M12 7V13" stroke={COLORS.surface} strokeWidth="2.2" strokeLinecap="round" />
              <circle cx="12" cy="16.5" r="1.2" fill={COLORS.surface} />
            </svg>
          ) : showSuccess ? (
            // Bigger, celebratory checkmark for the Success moment.
            <svg width="72" height="72" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style={{ margin: 'auto 0' }}>
              <circle cx="12" cy="12" r="11" stroke={COLORS.surface} strokeWidth="2" />
              <path d="M7 12.5L10.2 15.5L17 8.5" stroke={COLORS.surface} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : (
            // Preparing / Downloading — same download/library illustration
            // used before, but noticeably smaller than a slide illustration
            // (brief §10: "smaller and less dominant than the onboarding
            // illustrations").
            <img
              src={loadingIllustration}
              alt=""
              style={{ width: '34%', height: 'auto', maxHeight: '38%', objectFit: 'contain', margin: 'auto 0' }}
            />
          )
        ) : (
          <img
            src={slide.image}
            alt=""
            style={{
              // 2026-09-12 (onboarding-redesign-refine): slides 2-4's
              // illustrations reduced roughly 15-25% from their previous
              // 56%/58% sizing (brief §7) so the headline/body/button carry
              // more visual weight; slide 1's full-bleed photo (heroOnBlue
              // false) is untouched, per brief — it's the brand-welcome
              // moment and can stay prominent.
              width:     heroOnBlue ? '42%' : '100%',
              height:    heroOnBlue ? '46%' : '100%',
              objectFit: heroOnBlue ? 'contain' : 'cover',
              flex:      heroOnBlue ? undefined : 1,
              // 'auto 0' (top/bottom auto, left/right 0) centers the image
              // vertically in the leftover space below the logo — it used
              // to be 'auto 0 0' (bottom pinned to 0), which pushed the
              // image down against the card instead of centering it.
              margin:    heroOnBlue ? 'auto 0' : 0,
            }}
          />
        )}
      </div>

      {/* ── Card area — 2026-09-12: scrolls internally if its content runs
            taller than the available space (e.g. the Downloading state's
            title + bar + 3-row breakdown on a shorter phone), instead of
            silently clipping content with no way to reach it. Standard,
            sturdier fix than resizing the sheet to fit today's content —
            it keeps working regardless of message length or screen size. ── */}
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
          overflowY:       'auto',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {/* Dots — visual progress indicator only, not interactive: no
            slide can be skipped or jumped to out of order. 2026-09-12:
            disappear completely once setup begins (brief §8) — there are
            only ever 4 positions, one per real onboarding slide, and
            nothing left to paginate once setup takes over the card. */}
        {!setupStarted && (
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
        )}

        {setupStarted && (
          <div style={{ height: 20, marginBottom: 20 }} />
        )}

        <div style={{ textAlign: 'center', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          {setupStarted ? (
            <>
              <h2 style={{ fontSize: 24, fontWeight: 700, color: failed ? COLORS.warning : COLORS.accent, margin: '0 0 12px', lineHeight: 1.25 }}>
                {failed
                  ? "Couldn't finish downloading"
                  : showSuccess
                    ? 'All set!'
                    : showPreparing
                      ? 'Preparing your library'
                      : 'Downloading your library'}
              </h2>
              <p style={{ fontSize: 15, color: COLORS.textSecondary, lineHeight: 1.6, margin: 0 }}>
                {failed
                  ? failedMessage
                  : showSuccess
                    ? 'Your offline library is ready. You can now use Capsula without an internet connection.'
                    : showPreparing
                      ? 'Getting everything ready for offline access.'
                      : 'Your medical reference is being saved so you can use Capsula without an internet connection.'}
              </p>
            </>
          ) : slide.brand ? (
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

          {!setupStarted && slide.body && (
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
              one of setup's four real states (Preparing/Downloading/
              Error/Success) once setup has begun. ── */}
        {setupStarted ? (
          failed ? (
            // 2026-09-12: redesigned problem-first — the message and the
            // fixes come before anything decorative (brief §14). Retry
            // stays the primary action; "Back to onboarding" is a genuine,
            // low-emphasis secondary that returns to slide 4 without
            // restarting whatever's already downloaded (see
            // handleBackToOnboarding above).
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 14, width: '100%', marginTop: 4 }}>
              <div style={{ backgroundColor: '#FEF2F2', borderRadius: 14, padding: '14px 16px', textAlign: 'left' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.warning, marginBottom: 8 }}>
                  Try these fixes
                </div>
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: COLORS.textSecondary, lineHeight: 1.7 }}>
                  <li>Check your internet connection</li>
                  <li>Make sure you have enough storage</li>
                  <li>Try again in a moment</li>
                </ul>
              </div>
              <button
                onClick={handleRetry}
                style={PRIMARY_BUTTON_STYLE}
                onMouseDown={e => { e.currentTarget.style.backgroundColor = COLORS.accentHover }}
                onMouseUp={e => { e.currentTarget.style.backgroundColor = COLORS.accent }}
              >
                Retry
              </button>
              <button onClick={handleBackToOnboarding} style={SECONDARY_BUTTON_STYLE}>
                Back to onboarding
              </button>
            </div>
          ) : showSuccess ? (
            // 2026-09-12: checkmark now lives in the hero area above; this
            // is the completed-categories checklist plus the brief
            // "Opening Capsula…" status right before complete() fires —
            // deliberately no Continue button anywhere (brief §17).
            <div style={{ width: '100%', marginTop: 4 }}>
              <div style={{ border: `1px solid ${COLORS.dotInactive}`, borderRadius: 14, padding: '4px 16px' }}>
                <CategoryRow name="Medical library" category={categories.conditions} />
                <CategoryRow name="Drug library" category={categories.drugs} />
                <CategoryRow name="Images & references" category={categories.photos} />
              </div>
              <div style={{ fontSize: 13, color: COLORS.textSecondary, marginTop: 12 }}>
                Opening Capsula…
              </div>
            </div>
          ) : showPreparing ? (
            // 2026-09-12: shown from the instant Next is tapped until
            // either library's first real signal comes back (brief §10) —
            // Downloading/Installing are always shown as still ahead of
            // this moment, never marked done here.
            <div style={{ width: '100%', marginTop: 4, textAlign: 'left' }}>
              <PreparingRow label="Checking connection" done />
              <PreparingRow label="Preparing library" done />
              <PreparingRow label="Downloading" done={false} />
              <PreparingRow label="Installing" done={false} />
            </div>
          ) : (
            // Downloading — overall percentage (unchanged mechanism from
            // before) plus the real per-category breakdown (brief §11-12).
            // 2026-09-12: numbers only, no unit word ("batch"/"page")
            // attached — see categoryStatusLabel's comment.
            <div style={{ width: '100%', marginTop: 4 }}>
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
              <div style={{ fontSize: 13, color: COLORS.textSecondary, marginTop: 8, marginBottom: 12 }}>
                {Math.round(displayFraction * 100)}%
              </div>
              <div style={{ border: `1px solid ${COLORS.dotInactive}`, borderRadius: 14, padding: '4px 16px', textAlign: 'left' }}>
                <CategoryRow name="Medical library" category={categories.conditions} />
                <CategoryRow name="Drug library" category={categories.drugs} />
                <CategoryRow name="Images & references" category={categories.photos} />
              </div>
            </div>
          )
        ) : (
          <button
            onClick={next}
            style={{
              ...PRIMARY_BUTTON_STYLE,
              // 2026-09-12: Next is now always full-width, matching the
              // Welcome slide's "Let's Get Started" button — previously
              // only slide 1 was full-width, the rest were auto-sized.
              width:     '100%',
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
