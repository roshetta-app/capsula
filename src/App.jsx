/**
 * src/App.jsx
 * Phase 3A addition: wrapped with ToastProvider (global toast system for CMS)
 * Phase 3K addition: wrapped with ErrorBoundary (global crash logger)
 * Phase F6 Stage 1: BrowserRouter's basename now matches vite.config.js's
 * base — '/capsula' for the GitHub Pages build, no prefix for the
 * Capacitor build (which loads from its own local root, not a subpath).
 * import.meta.env.MODE is set by the same --mode capacitor flag that
 * controls vite.config.js's base, so the two can never drift apart.
 *
 * Phase F6 Stage 1 (boot-test follow-up): added a native-only status bar
 * setup. On Android, the app was drawing its own content underneath the
 * phone's status bar (clock/battery row) instead of below it — a standard
 * Capacitor thing, not a bug in the page code. Capacitor.isNativePlatform()
 * guards this so nothing changes for the website build; the StatusBar
 * plugin no-ops harmlessly outside a native app anyway.
 *
 * Auth-shared-context fix — added AuthProvider, right after ToastProvider
 * (signInWithGoogle's error path calls useToast internally) and above
 * everything that reads sign-in state (FavouritesProvider, BottomNav,
 * AccountScreen, AuthGuard, ProfileSetupRedirect). Previously useAuth() ran
 * its own separate sign-in check per component; this makes it run once,
 * app-wide, which also fixed a visible load delay on the Edit Profile
 * page (F13 Mini-stage 5 follow-up).
 *
 * Sign-in nudge fix (this session) — added NotesActivityProvider, inside
 * FavouritesProvider (no dependency between the two, just grouped with
 * its sibling), and mounted SignInNudge alongside ProfileSetupRedirect.
 * SignInNudge is the actual fix: AccountSheet and useSignInPrompt both
 * already existed but nothing ever rendered them together, so the D12/D16
 * "prompt after first favourite" nudge never fired. This also extends the
 * trigger to a signed-out user's first personal note, not just their
 * first favourite (see NotesActivityContext.jsx).
 *
 * App Gate System Phase 1 Step 4c — added AppGateResumeListener below,
 * which re-checks for a Force Update / message every time the app resumes
 * from the background (so a device doesn't have to be fully relaunched to
 * pick up something just switched on in the CMS), with a cooldown so a
 * quick app-switcher flick can't trigger a refetch on every single resume.
 *
 * App Gate System Step 4e — AppGateProvider and AppGate are now mounted.
 * AppGate is rendered as a SIBLING of OnboardingGate, not a wrapper around
 * it — unlike OnboardingGate, AppGate takes no children prop; it draws its
 * own full-screen, fixed-position overlay (zIndex 2000) when a gate is
 * active and renders nothing at all otherwise. Passing OnboardingGate/
 * AppRoutes to it as children was tried first and produced a permanent
 * blank screen (children were silently discarded on every load, gate or
 * no gate) — fixed same-session once caught. Sitting as a sibling still
 * achieves the plan's intent (a maintenance/force-update block can cover
 * the screen before onboarding even shows) since AppGate's overlay simply
 * paints on top of everything below it when active. AppGateResumeListener
 * is rendered inside AppGateProvider so it can reach useAppGateContext();
 * this is the step that goes live for everyone.
 *
 * Provider order (outermost → innermost):
 *   ErrorBoundary → BrowserRouter → ToastProvider → AuthProvider →
 *   OnlineStatusProvider → ThemeProvider → ConditionProvider →
 *   DrugProvider → FavouritesProvider → NotesActivityProvider →
 *   PushSubscriptionProvider → AppGateProvider →
 *   [AppGateResumeListener, AppGate, OnboardingGate → AppRoutes,
 *   ProfileSetupRedirect, SignInNudge] (all five as siblings inside
 *   AppGateProvider — AppGate does not wrap OnboardingGate, see note above)
 *   (OnlineStatusProvider added 2026-08-31, Pro-offline-lift bugfix — was a
 *   plain hook (useOnlineStatus.js) called independently by both
 *   OfflineBanner.jsx and AppGate.jsx, so each ran its own separate
 *   reachability check with no coordination, which is what made the
 *   offline block's own lift-back-online timing look inconsistent against
 *   the banner's. Needs to cover both AppGate below and OfflineBanner,
 *   mounted much deeper inside AppRoutes → Layout.)
 *   (OnlineStatusProvider moved 2026-09-01, crash fix — the
 *   offline-profile-account fix gave ThemeContext.jsx its own
 *   useOnlineStatus() call (for retry-on-reconnect theme sync), but
 *   ThemeProvider sat ABOVE OnlineStatusProvider in this tree at the
 *   time, so ThemeProvider crashed on every single mount, on every
 *   route, app-wide ("useOnlineStatus must be used inside
 *   <OnlineStatusProvider>"). OnlineStatusProvider has no dependency on
 *   anything above it in the tree — just Supabase — so it's moved here,
 *   directly inside AuthProvider and outside ThemeProvider, instead of
 *   its old spot inside PushSubscriptionProvider. Still fully covers
 *   AppGate and OfflineBanner as before, plus ThemeContext now.)
 *   (ThemeProvider added 2026-08-22, account-theme-sync bugfix — sits
 *   inside AuthProvider since it reads useAuth() internally, and outside
 *   everything that might read the theme.)
 *   (ProfileSetupRedirect and SignInNudge are both mounted as siblings of
 *   OnboardingGate, not nested inside it — same spot ProfileSetupModal
 *   used to sit (F13 Mini-stage 4, 2026-08-21). Neither is a route and
 *   neither is gated by the device-level onboarding flow; both read their
 *   own conditions internally via context.)
 *   (AppGateProvider + AppGate sit outside OnboardingGate entirely, Step
 *   4e — so a maintenance/force-update block can show before onboarding
 *   even does. ProfileSetupRedirect and SignInNudge stay siblings of
 *   OnboardingGate, both now nested inside AppGateProvider along with it —
 *   neither reads AppGateContext, they're just grouped with the rest of
 *   the app-shell-level components at this depth.)
 */

import { useEffect, useRef } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { Capacitor } from '@capacitor/core'
import { StatusBar } from '@capacitor/status-bar'
import { App as CapacitorApp } from '@capacitor/app'
import AppRoutes from './router'
import OnboardingGate from './components/ui/OnboardingGate'
import AppGate from './components/ui/AppGate'
import ProfileSetupRedirect from './components/ProfileSetupRedirect'
import SignInNudge from './components/SignInNudge'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import { ConditionProvider } from './context/ConditionContext'
import { DrugProvider } from './context/DrugContext'
import { FavouritesProvider } from './context/FavouritesContext'
import { NotesActivityProvider } from './context/NotesActivityContext'
import { PushSubscriptionProvider } from './context/PushSubscriptionContext'
import { OnlineStatusProvider } from './context/OnlineStatusContext'
import { AppGateProvider, useAppGateContext } from './context/AppGateContext'
import { ToastProvider } from './context/ToastContext'
import ErrorBoundary from './components/ErrorBoundary'
import { useVisualViewport } from './hooks/useVisualViewport'
import { initDeviceSessionTracking } from './analytics/deviceSession'

const ROUTER_BASENAME = import.meta.env.MODE === 'capacitor' ? '' : '/capsula'

// How long to wait after a check before a resume is allowed to trigger
// another one — a quick app-switcher flick backgrounds/foregrounds Capsula
// repeatedly within seconds, and there's no reason to refetch on every
// single one of those.
const APP_GATE_RESUME_COOLDOWN_MS = 5 * 60 * 1000 // 5 minutes

// App Gate System Phase 1 Step 4c. Renders nothing — just re-runs
// AppGateContext's refresh() on app resume, with the cooldown above. Reads
// useAppGateContext(), so it can only ever be mounted inside
// AppGateProvider — Step 4e is what actually places <AppGateResumeListener />
// inside that provider in the tree below.
function AppGateResumeListener() {
  const { refresh } = useAppGateContext()
  const lastCheckedRef = useRef(Date.now())

  useEffect(() => {
    const listenerPromise = CapacitorApp.addListener('resume', () => {
      const now = Date.now()
      if (now - lastCheckedRef.current < APP_GATE_RESUME_COOLDOWN_MS) return
      lastCheckedRef.current = now
      refresh()
    })

    return () => {
      listenerPromise.then(handle => handle.remove())
    }
  }, [refresh])

  return null
}

// account-theme-sync bugfix (2026-08-22): the previous fix for App.jsx
// calling useDarkMode() outside AuthProvider's subtree (a ThemeInit
// component, rendered as AuthProvider's child) is now superseded —
// useDarkMode itself moved to a real shared Context (ThemeProvider,
// below), the correct fix for a deeper bug that one only partly
// addressed: every separate call site of the old plain-hook version held
// its own unsynced copy of the theme. ThemeProvider needs to sit inside
// AuthProvider (it reads useAuth() internally) and outside/around
// everything that might read the theme (Account screen, Conditions
// screen, both deep inside AppRoutes) — see the provider tree below.
export default function App() {
  // Keeps --viewport-height on :root in sync with the real, live visual
  // viewport height. Called once here so every screen and every shared
  // element (body, Layout) can use that single trustworthy number instead
  // of the browser's own 100dvh estimate, which can briefly disagree with
  // it during scroll/address-bar transitions.
  useVisualViewport()

  // Native-only: tells Android not to draw the app's content behind the
  // status bar. Runs once on mount; no-op on the website build.
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      StatusBar.setOverlaysWebView({ overlay: false })
    }
  }, [])

  // F10 Stage 2, Batch C — registers the app-open/background/resume
  // session-tracking listener once, app-wide. Works on both native and
  // web (Capacitor's appStateChange event falls back to the browser's
  // visibilitychange on web), unlike the status bar effect above.
  useEffect(() => {
    initDeviceSessionTracking()
  }, [])

  return (
    <ErrorBoundary>
      <BrowserRouter basename={ROUTER_BASENAME}>
        <ToastProvider>
          <AuthProvider>
            <OnlineStatusProvider>
              <ThemeProvider>
                <ConditionProvider>
                  <DrugProvider>
                    <FavouritesProvider>
                      <NotesActivityProvider>
                        <PushSubscriptionProvider>
                          <AppGateProvider>
                            <AppGateResumeListener />
                            <AppGate />
                            <OnboardingGate>
                              <AppRoutes />
                            </OnboardingGate>
                            <ProfileSetupRedirect />
                            <SignInNudge />
                          </AppGateProvider>
                        </PushSubscriptionProvider>
                      </NotesActivityProvider>
                    </FavouritesProvider>
                  </DrugProvider>
                </ConditionProvider>
              </ThemeProvider>
            </OnlineStatusProvider>
          </AuthProvider>
        </ToastProvider>
      </BrowserRouter>
    </ErrorBoundary>
  )
}
