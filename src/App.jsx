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
 * AccountScreen, AuthGuard, ProfileSetupModal). Previously useAuth() ran
 * its own separate sign-in check per component; this makes it run once,
 * app-wide, which also fixed a visible load delay on the Edit Profile
 * page (F13 Mini-stage 5 follow-up).
 *
 * Provider order (outermost → innermost):
 *   ErrorBoundary → BrowserRouter → ToastProvider → AuthProvider →
 *   ThemeProvider → ConditionProvider → DrugProvider → FavouritesProvider →
 *   PushSubscriptionProvider → OnboardingGate → AppRoutes
 *   (ThemeProvider added 2026-08-22, account-theme-sync bugfix — sits
 *   inside AuthProvider since it reads useAuth() internally, and outside
 *   everything that might read the theme.)
 *   (ProfileSetupModal is mounted as a sibling to OnboardingGate, not
 *   nested inside it — F13 Mini-stage 4, added 2026-08-21. It's not a
 *   route and not gated by the device-level onboarding flow; it checks
 *   its own signed-in-user condition internally via useAuth().)
 */

import { useEffect } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { Capacitor } from '@capacitor/core'
import { StatusBar } from '@capacitor/status-bar'
import AppRoutes from './router'
import OnboardingGate from './components/ui/OnboardingGate'
import ProfileSetupModal from './components/ProfileSetupModal'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import { ConditionProvider } from './context/ConditionContext'
import { DrugProvider } from './context/DrugContext'
import { FavouritesProvider } from './context/FavouritesContext'
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
                    <PushSubscriptionProvider>
                      <OnboardingGate>
                        <AppRoutes />
                      </OnboardingGate>
                      <ProfileSetupModal />
                    </PushSubscriptionProvider>
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

