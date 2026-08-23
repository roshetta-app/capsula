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
 * Provider order (outermost → innermost):
 *   ErrorBoundary → BrowserRouter → ToastProvider → AuthProvider →
 *   ThemeProvider → ConditionProvider → DrugProvider → FavouritesProvider →
 *   NotesActivityProvider → PushSubscriptionProvider → OnboardingGate →
 *   AppRoutes
 *   (ThemeProvider added 2026-08-22, account-theme-sync bugfix — sits
 *   inside AuthProvider since it reads useAuth() internally, and outside
 *   everything that might read the theme.)
 *   (ProfileSetupRedirect and SignInNudge are both mounted as siblings of
 *   OnboardingGate, not nested inside it — same spot ProfileSetupModal
 *   used to sit (F13 Mini-stage 4, 2026-08-21). Neither is a route and
 *   neither is gated by the device-level onboarding flow; both read their
 *   own conditions internally via context.)
 */

import { useEffect } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { Capacitor } from '@capacitor/core'
import { StatusBar } from '@capacitor/status-bar'
import AppRoutes from './router'
import OnboardingGate from './components/ui/OnboardingGate'
import ProfileSetupRedirect from './components/ProfileSetupRedirect'
import SignInNudge from './components/SignInNudge'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import { ConditionProvider } from './context/ConditionContext'
import { DrugProvider } from './context/DrugContext'
import { FavouritesProvider } from './context/FavouritesContext'
import { NotesActivityProvider } from './context/NotesActivityContext'
import { PushSubscriptionProvider } from './context/PushSubscriptionContext'
import { ToastProvider } from './context/ToastContext'
import ErrorBoundary from './components/ErrorBoundary'
import { useVisualViewport } from './hooks/useVisualViewport'

const ROUTER_BASENAME = import.meta.env.MODE === 'capacitor' ? '' : '/capsula'

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

  return (
    <ErrorBoundary>
      <BrowserRouter basename={ROUTER_BASENAME}>
        <ToastProvider>
          <AuthProvider>
            <ThemeProvider>
              <ConditionProvider>
                <DrugProvider>
                  <FavouritesProvider>
                    <NotesActivityProvider>
                      <PushSubscriptionProvider>
                        <OnboardingGate>
                          <AppRoutes />
                        </OnboardingGate>
                        <ProfileSetupRedirect />
                        <SignInNudge />
                      </PushSubscriptionProvider>
                    </NotesActivityProvider>
                  </FavouritesProvider>
                </DrugProvider>
              </ConditionProvider>
            </ThemeProvider>
          </AuthProvider>
        </ToastProvider>
      </BrowserRouter>
    </ErrorBoundary>
  )
}
