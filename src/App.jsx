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
 * Provider order (outermost → innermost):
 *   ErrorBoundary → BrowserRouter → ToastProvider → ConditionProvider → DrugProvider → FavouritesProvider → PushSubscriptionProvider → OnboardingGate → AppRoutes
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
import { ConditionProvider } from './context/ConditionContext'
import { DrugProvider } from './context/DrugContext'
import { FavouritesProvider } from './context/FavouritesContext'
import { PushSubscriptionProvider } from './context/PushSubscriptionContext'
import { ToastProvider } from './context/ToastContext'
import ErrorBoundary from './components/ErrorBoundary'
import { useDarkMode } from './hooks/useDarkMode'
import { useVisualViewport } from './hooks/useVisualViewport'

const ROUTER_BASENAME = import.meta.env.MODE === 'capacitor' ? '' : '/capsula'

export default function App() {
  useDarkMode() // applies/removes .dark on <html> based on OS preference

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
        </ToastProvider>
      </BrowserRouter>
    </ErrorBoundary>
  )
}
