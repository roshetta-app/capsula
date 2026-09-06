/**
 * src/components/BottomNav.jsx
 * Phase 2B — Navigation & Routing Overhaul
 * Phase 10 — Icon system overhaul: replaced custom FA SVG paths with Lucide
 *             icons (BookOpen, Pill, Heart) consistent with the rest of the app.
 *             Active = filled (fill='currentColor'), inactive = stroke only.
 *             Favourites icon now follows active-tab state only — removed
 *             hasFavourites fill logic and gold label treatment.
 * Phase 15 — Inactive tab contrast improved: color switched from
 *             text-tertiary to text-secondary so inactive tabs are clearly
 *             readable without competing with the active accent tab.
 *             Inactive strokeWidth 1.8→2.0 for consistent perceived weight
 *             at rest. Label fontWeight 400→500 for inactive tabs.
 * Phase 16 — Hidden while an on-screen keyboard is open (mobile only).
 *             Detected via a real visual-viewport height shrink against a
 *             captured baseline, NOT focus — focus alone fires identically
 *             on desktop (mouse click into a field) where no keyboard ever
 *             appears and the nav should stay put. A keyboard eats a large,
 *             unmistakable chunk of height (150px+), so a shrink past that
 *             threshold is a reliable, platform-agnostic signal without any
 *             UA/mobile sniffing.
 * Phase 17 — (Superseded by Phase 18, see below.) Forced onto its own
 *             compositing layer (transform: translateZ(0) + willChange:
 *             'transform') to isolate it from layer churn caused by
 *             ConditionDetailScreen's tab-switch transform animation.
 * Phase 18 — Phase 17's compositing isolation removed. Root-caused: the
 *             visible jump was never a layer/paint problem — it was
 *             ConditionDetailScreen forcing window.scrollTo() on every tab
 *             switch, which combined with a real document-height change to
 *             trigger the mobile browser's toolbar show/hide transition
 *             (this fixed nav is pinned to the visual viewport, exactly
 *             what that transition resizes). ConditionDetailScreen now
 *             scrolls its tab content in its own internal box instead of
 *             the window, so window.scrollY is never touched and there's
 *             nothing left for a compositing layer to isolate here.
 *             Keyboard detection also extracted to useKeyboardOpen() so
 *             ConditionDetailScreen can share the same signal.
 * Phase 19 — Tapping the tab you're already on now scrolls the screen back
 *             to top (reuses useBackToTop's scrollToTop — same animation
 *             the Back-to-Top button already uses) instead of doing
 *             nothing. Only fires when you're on that tab's own screen
 *             already (not a nested detail route under it, e.g.
 *             /conditions/:slug) — tapping Conditions from a condition's
 *             detail page still navigates back to the list as before.
 *             Also added press feedback (scale down on pointer-down) to
 *             every tab button, whether re-tapping the active tab or
 *             switching to another one — same --motion-fast/--ease-settle
 *             tokens used for press feedback elsewhere in the app.
 * Phase 20 — Added a 4th tab, Account, alongside Conditions/Drugs/
 *             Favourites (D-signin-placement: floating header/Layout
 *             option rejected because Layout's shared header is
 *             suppressed on every current route — see layout.jsx history
 *             — and this reuses the one nav element that's already
 *             visible everywhere BottomNav itself renders). Unlike the
 *             other three tabs this isn't a route — it opens AccountSheet
 *             directly instead of navigating, so it's handled outside the
 *             TABS/isActive/isExactScreen machinery those three share.
 *             Filled + accent-colored while signed in, outline + muted
 *             while signed out, so at-a-glance state doesn't require
 *             opening the sheet. Not shown on /conditions/:slug or
 *             /drugs/:slug detail pages, same as the rest of the bar —
 *             see conversation history for why a Layout/header-based
 *             placement couldn't reach those pages either.
 * Phase F13 Mini-stage 1 — Account tab now navigates to /account instead of
 *             opening AccountSheet as a popup (AccountSheet itself is
 *             unchanged — it still backs the separate auto-sign-in-nudge
 *             flow, see useSignInPrompt/D16). accountOpen state and the
 *             <AccountSheet> render removed from here; signInWithGoogle/
 *             signOut are no longer needed in this component since they
 *             were only ever passed through to the sheet. `user` is still
 *             read for the tab's signed-in/signed-out color treatment,
 *             which is unchanged from Phase 20.
 * Phase F13 Mini-stage 5 follow-up — Account tab's active (filled+accent)
 *             state now matches how the other three tabs behave: filled
 *             only while /account is the open screen, driven by
 *             location.pathname like isActive/isExactScreen already do
 *             for the TABS array. Previously it was filled+accent purely
 *             for being signed in, regardless of which tab was open,
 *             which didn't match the rest of the bar. Signed-in state is
 *             now a small dot on the icon instead, shown independently of
 *             which tab is currently active.
 * Phase 4 (Back-Button Mapping) — Tab-level back/exit behavior:
 *             - Tab taps now use navigate(path, { replace: true }) instead
 *               of a plain push, so switching between Conditions/Drugs/
 *               Favourites/Account no longer stacks one history entry per
 *               switch.
 *             - A dedicated back handler (native backButton + web/PWA
 *               placeholder-history guard, gated on a backHandlerActive
 *               flag so it turns off on admin routes / while a keyboard is
 *               open) now owns what "back" means at the tab level,
 *               independent of the underlying history depth: from any tab
 *               other than Conditions, back returns to Conditions; from
 *               Conditions itself, back shows a brief "press back again to
 *               exit" toast, and a second back press within that window
 *               exits the app (native) or lets the press through normally
 *               (web/PWA, where there's no in-app "exit").
 *             - Checks useBackClose's isAnyBackCloseOpen() first and does
 *               nothing if a sheet/popup is currently registered as open,
 *               so closing a sheet with back doesn't also trigger tab
 *               navigation or the exit prompt underneath it.
 *             - Hotfix (same session): the web/PWA guard's unmount cleanup
 *               originally called window.history.back() whenever it wasn't
 *               the guard's own placeholder that got consumed — copied
 *               from useBackClose.js, where that's correct for a sheet
 *               closing via its own X button. It was wrong here: BottomNav
 *               unmounts on completely normal forward navigation (opening
 *               any condition/drug detail screen, since Layout hides the
 *               nav bar there), and that cleanup was silently reversing
 *               that navigation the instant it happened — every screen
 *               appeared to "close instantly." Cleanup now only removes
 *               the popstate listener; it no longer touches history at
 *               all on unmount.
 *
 * Changes from previous version:
 *  - Tab 1: Conditions — BookOpen (Lucide), unified with FavouritesScreen's
 *           own Conditions tab icon
 *  - Tab 2: Drugs      — Pill (Lucide)
 *  - Tab 3: Favourites — Heart (Lucide), red identity when active
 *  - Tab 4: Account    — User (Lucide), navigates to /account (Phase F13)
 *  - Active tab: filled icon + brand color. Inactive: stroke only + muted.
 *  - Each of the 3 route tabs takes equal width; Account tab shares the
 *    same flex-basis so all four remain evenly spaced.
 *  - Safe-area bottom padding for iPhone notch.
 *  - Hidden on all /admin/* routes.
 *  - Hidden while an on-screen keyboard is open (see Phase 16 note above).
 *  - Re-tapping the active tab scrolls to top; every tap gets press feedback
 *    (see Phase 19 note above).
 *  - Tab switches replace history instead of pushing; back is handled at
 *    the tab level with its own return-to-Conditions/exit-prompt logic
 *    (see Phase 4 note above).
 */

import { useState, useEffect, useRef }  from 'react'
import { useLocation, useNavigate }     from 'react-router-dom'
import { BookOpen, Pill, Heart, User }  from 'lucide-react'
import { Capacitor }                    from '@capacitor/core'
import { App as CapacitorApp }          from '@capacitor/app'
import { useKeyboardOpen }              from '../hooks/useKeyboardOpen'
import { useBackToTop }                 from '../hooks/useBackToTop'
import { useAuth }                      from '../hooks/useAuth'
import { isAnyBackCloseOpen }           from '../hooks/useBackClose'

// How long the "press back again to exit" prompt stays valid — a second
// back press on Conditions within this window exits; after it, back shows
// the prompt again instead of exiting. Matches the common ~2s convention.
const EXIT_PROMPT_WINDOW_MS = 2000

// ─── BottomNav ────────────────────────────────────────────────────────────────

export default function BottomNav() {
  const location = useLocation()
  const navigate = useNavigate()

  const keyboardOpen = useKeyboardOpen()
  const { scrollToTop } = useBackToTop()
  const { user } = useAuth()

  // Press feedback — which tab (by path) is currently being pressed, if any.
  // Same scale-down-on-pointer-down pattern used elsewhere in the app
  // (SpecialtySelector, sticky specialty pill), just tracked per-tab here
  // since only one button in the row can be pressed at a time. Account
  // uses the same pressedPath state under a synthetic 'account' key since
  // it isn't part of the TABS array below.
  const [pressedPath, setPressedPath] = useState(null)

  // Phase 4 — "press back again to exit" toast, shown only while on the
  // Conditions tab and only within the exit window after a first back press.
  const [showExitPrompt, setShowExitPrompt] = useState(false)
  const lastBackPressRef = useRef(0)
  const exitPromptTimerRef = useRef(null)

  // Kept in sync every render so the back handler below always reads the
  // current route without re-registering its listeners on every tab switch.
  const locationRef = useRef(location)
  useEffect(() => {
    locationRef.current = location
  }, [location])

  // Phase 4's back handler should only be active on the same screens the
  // nav bar itself is shown on. BottomNav stays mounted even when it
  // renders null below (admin routes, keyboard open) rather than
  // unmounting, so the guard is gated on this flag directly instead of
  // assuming unmount will clean it up.
  const isAdminRoute = location.pathname.startsWith('/admin')
  const backHandlerActive = !isAdminRoute && !keyboardOpen

  function isActive(tabPath, pathname = location.pathname) {
    if (tabPath === '/conditions') {
      return pathname === '/' ||
             pathname === '/conditions' ||
             pathname.startsWith('/conditions/')
    }
    return pathname === tabPath ||
           pathname.startsWith(tabPath + '/')
  }

  // Distinct from isActive above: true only when the user is already on
  // that tab's own top-level screen, not a nested detail route underneath
  // it. Drives whether a tap scrolls to top (already there) or navigates
  // (still needs to land on the list first).
  function isExactScreen(tabPath) {
    if (tabPath === '/conditions') {
      return location.pathname === '/' || location.pathname === '/conditions'
    }
    return location.pathname === tabPath
  }

  function handleTabTap(path) {
    if (isExactScreen(path)) {
      scrollToTop()
    } else {
      // Phase 4 (4.1) — replace instead of push, so switching tabs doesn't
      // stack a history entry per switch. What "back" does from here on is
      // fully owned by the back handler below, not by history depth.
      navigate(path, { replace: true })
    }
  }

  // Phase 4 — tab-level back/exit handling. Registered whenever
  // backHandlerActive is true (i.e. whenever the nav bar itself is
  // showing), independent of ordinary tab switches.
  useEffect(() => {
    if (!backHandlerActive) return

    function goBack() {
      // A sheet/popup is already claiming this back press (Phase 1/3) —
      // step aside so it isn't also treated as a tab-level back.
      if (isAnyBackCloseOpen()) return true

      if (!isActive('/conditions', locationRef.current.pathname)) {
        navigate('/conditions', { replace: true })
        return true
      }

      const now = Date.now()
      if (now - lastBackPressRef.current < EXIT_PROMPT_WINDOW_MS) {
        if (Capacitor.isNativePlatform()) {
          CapacitorApp.exitApp()
        }
        // Website/PWA: there's no in-app "exit" — let this press proceed
        // as a normal back instead of re-arming the guard.
        return false
      }

      lastBackPressRef.current = now
      setShowExitPrompt(true)
      clearTimeout(exitPromptTimerRef.current)
      exitPromptTimerRef.current = setTimeout(() => setShowExitPrompt(false), EXIT_PROMPT_WINDOW_MS)
      return true
    }

    // Native back-button guard. No-ops on the website build.
    if (Capacitor.isNativePlatform()) {
      const listenerPromise = CapacitorApp.addListener('backButton', () => {
        goBack()
      })
      return () => {
        listenerPromise.then((handle) => handle.remove())
      }
    }

    // Browser back-gesture/button guard (website/PWA only).
    window.history.pushState({ capsulaBottomNavGuard: true }, '')

    function handlePopState() {
      const stayGuarded = goBack()
      if (stayGuarded) {
        window.history.pushState({ capsulaBottomNavGuard: true }, '')
      }
    }

    window.addEventListener('popstate', handlePopState)
    // Hotfix: cleanup only removes the listener. It must NOT touch history
    // (no history.back() here) — this effect's cleanup also runs on
    // completely normal forward navigation (e.g. opening a condition/drug
    // detail screen unmounts BottomNav, since Layout hides the nav bar
    // there), and calling history.back() in that case was undoing that
    // navigation immediately, which is what made every screen appear to
    // close instantly.
    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
    // goBack always reads fresh state via locationRef/lastBackPressRef, so
    // it only needs to be re-created when backHandlerActive itself flips —
    // not on every ordinary tab switch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backHandlerActive])

  // Clear any pending exit-prompt timeout on unmount.
  useEffect(() => {
    return () => clearTimeout(exitPromptTimerRef.current)
  }, [])

  // Hidden on all admin routes
  if (location.pathname.startsWith('/admin')) return null

  // Hidden while an on-screen keyboard is open — instant, no animation.
  if (keyboardOpen) return null

  const TABS = [
    // BookOpen — matches the Conditions tab icon already used inside
    // FavouritesScreen's own Conditions/Drugs tab bar, so "Conditions"
    // reads as the same icon everywhere in the app instead of House here
    // and BookOpen there.
    { path: '/conditions', label: 'Conditions', Icon: BookOpen },
    { path: '/drugs',      label: 'Drugs',      Icon: Pill  },
    // Favourites gets its own red identity color + fills when active,
    // matching the heart used elsewhere for favourited state (title badge,
    // condition-card row icon, detail-screen toggle) — Conditions/Drugs
    // keep the shared blue accent and stay outline-only. Uses the
    // dedicated var(--color-favourite) token (globals.css), not the
    // shared destructive-action var(--color-danger) — favouriting isn't
    // a warning, so it shouldn't be tied to the alarm-red used elsewhere.
    { path: '/favourites', label: 'Favourites', Icon: Heart, activeColor: 'var(--color-favourite)', fillWhenActive: true },
  ]

  const accountPressed = pressedPath === 'account'

  // Account isn't part of TABS (it's handled separately below, same as
  // before), but its active state now follows the exact same rule as the
  // other three tabs — filled + accent only while /account is the actual
  // open screen, not tied to sign-in.
  const accountActive = location.pathname === '/account'

  return (
    <>
      {/* Phase 4 — "press back again to exit" toast. Only ever shown while
          on the Conditions tab, since that's the only place goBack sets it. */}
      {showExitPrompt && isActive('/conditions') && (
        <div
          role="status"
          style={{
            position:        'fixed',
            left:            '50%',
            transform:       'translateX(-50%)',
            bottom:          'calc(60px + env(safe-area-inset-bottom) + 12px)',
            zIndex:          101,
            backgroundColor: 'var(--color-text-primary)',
            color:           'var(--color-surface)',
            padding:         '8px 16px',
            borderRadius:    'var(--radius-full)',
            fontFamily:      'var(--font-body)',
            fontSize:        13,
            fontWeight:      500,
            whiteSpace:      'nowrap',
            pointerEvents:   'none',
          }}
        >
          Press back again to exit
        </div>
      )}

      <nav style={{
        position:                'fixed',
        bottom:                  0,
        left:                    0,
        right:                   0,
        zIndex:                  100,
        backgroundColor:         'var(--color-surface)',
        borderTop:               '1px solid var(--color-border)',
        paddingBottom:           'env(safe-area-inset-bottom)',
        WebkitTapHighlightColor: 'transparent',
      }}>
        <div style={{
          maxWidth:   680,
          margin:     '0 auto',
          display:    'flex',
          alignItems: 'stretch',
          height:     60,
        }}>
          {TABS.map(({ path, label, Icon, activeColor, fillWhenActive }) => {
            const active  = isActive(path)
            const pressed = pressedPath === path
            return (
              <button
                key={path}
                onClick={() => handleTabTap(path)}
                onPointerDown={() => setPressedPath(path)}
                onPointerUp={() => setPressedPath(null)}
                onPointerLeave={() => setPressedPath(null)}
                aria-label={label}
                aria-current={active ? 'page' : undefined}
                style={{
                  flex:                    '1 1 0',
                  display:                 'flex',
                  flexDirection:           'column',
                  alignItems:              'center',
                  justifyContent:          'center',
                  gap:                     3,
                  border:                  'none',
                  background:              'none',
                  cursor:                  'pointer',
                  // Active: accent (or a tab's own activeColor override).
                  // Inactive: text-secondary (was text-tertiary — increased
                  // contrast so tabs are clearly readable at rest).
                  color:                   active ? (activeColor ?? 'var(--color-accent)') : 'var(--color-text-secondary)',
                  transform:               pressed ? 'scale(0.92)' : 'scale(1)',
                  transition:              'color 0.15s ease, transform var(--motion-fast) var(--ease-settle)',
                  fontFamily:              'var(--font-body)',
                  padding:                 '8px 0',
                  outline:                 'none',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                <Icon
                  size={22}
                  strokeWidth={active ? 2.5 : 2.0}
                  fill={active && fillWhenActive ? 'currentColor' : 'none'}
                />
                <span style={{
                  fontSize:      10,
                  fontWeight:    active ? 600 : 500,
                  letterSpacing: '0.01em',
                }}>
                  {label}
                </span>
              </button>
            )
          })}

          {/* Account — Phase 20, now a real route as of Phase F13 Mini-stage 1.
              Active state (filled + accent) now matches the other three tabs:
              it reflects whether /account is the open screen, not sign-in
              state. Signed-in state shows as a small dot on the icon instead,
              independent of whether the tab is currently active. */}
          <button
            onClick={() => navigate('/account', { replace: true })}
            onPointerDown={() => setPressedPath('account')}
            onPointerUp={() => setPressedPath(null)}
            onPointerLeave={() => setPressedPath(null)}
            aria-label="Account"
            aria-current={accountActive ? 'page' : undefined}
            style={{
              flex:                    '1 1 0',
              display:                 'flex',
              flexDirection:           'column',
              alignItems:              'center',
              justifyContent:          'center',
              gap:                     3,
              border:                  'none',
              background:              'none',
              cursor:                  'pointer',
              color:                   accountActive ? 'var(--color-accent)' : 'var(--color-text-secondary)',
              transform:               accountPressed ? 'scale(0.92)' : 'scale(1)',
              transition:              'color 0.15s ease, transform var(--motion-fast) var(--ease-settle)',
              fontFamily:              'var(--font-body)',
              padding:                 '8px 0',
              outline:                 'none',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <div style={{ position: 'relative', display: 'flex' }}>
              <User
                size={22}
                strokeWidth={accountActive ? 2.5 : 2.0}
                fill={accountActive ? 'currentColor' : 'none'}
              />
              {user && (
                <span
                  aria-hidden="true"
                  style={{
                    position:        'absolute',
                    top:             -1,
                    right:           -1,
                    width:           7,
                    height:          7,
                    borderRadius:    'var(--radius-full)',
                    backgroundColor: 'var(--color-accent)',
                    border:          '1.5px solid var(--color-surface)',
                  }}
                />
              )}
            </div>
            <span style={{
              fontSize:      10,
              fontWeight:    accountActive ? 600 : 500,
              letterSpacing: '0.01em',
            }}>
              Account
            </span>
          </button>
        </div>
      </nav>
    </>
  )
}
