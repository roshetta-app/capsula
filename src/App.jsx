/**
 * src/App.jsx
 * Phase 3A addition: wrapped with ToastProvider (global toast system for CMS)
 * Phase 3K addition: wrapped with ErrorBoundary (global crash logger)
 * sticky-header-permanent-mount-fix: wrapped with RecentlyViewedProvider so
 * ConditionsScreen and ConditionDetailScreen share one live recently-viewed
 * list instead of each reading their own private copy.
 *
 * Provider order (outermost → innermost):
 *   ErrorBoundary → BrowserRouter → ToastProvider → ConditionProvider → DrugProvider → FavouritesProvider → RecentlyViewedProvider → OnboardingGate → AppRoutes
 */

import { useEffect } from 'react'
import { BrowserRouter } from 'react-router-dom'
import AppRoutes from './router'
import OnboardingGate from './components/ui/OnboardingGate'
import { ConditionProvider } from './context/ConditionContext'
import { DrugProvider } from './context/DrugContext'
import { FavouritesProvider } from './context/FavouritesContext'
import { RecentlyViewedProvider } from './context/RecentlyViewedContext'
import { ToastProvider } from './context/ToastContext'
import ErrorBoundary from './components/ErrorBoundary'
import { useDarkMode } from './hooks/useDarkMode'
import { useVisualViewport } from './hooks/useVisualViewport'

export default function App() {
  useDarkMode() // applies/removes .dark on <html> based on OS preference

  // Keeps --viewport-height on :root in sync with the real, live visual
  // viewport height. Called once here so every screen and every shared
  // element (body, Layout) can use that single trustworthy number instead
  // of the browser's own 100dvh estimate, which can briefly disagree with
  // it during scroll/address-bar transitions.
  useVisualViewport()

  // Turns off the browser's own automatic "remember where I scrolled to"
  // behavior on back/forward navigation. Each screen now remembers and
  // restores its own scroll position itself (see useStickyHeaderScroll) —
  // leaving the browser's version switched on as well meant two separate
  // things could both try to move the scroll position at slightly
  // different times, which is what caused the sticky header to
  // occasionally slide down again on its own after returning to a screen.
  useEffect(() => {
    history.scrollRestoration = 'manual'
  }, [])

  return (
    <ErrorBoundary>
      <BrowserRouter basename="/capsula">
        <ToastProvider>
          <ConditionProvider>
            <DrugProvider>
              <FavouritesProvider>
                <RecentlyViewedProvider>
                  <OnboardingGate>
                    <AppRoutes />
                  </OnboardingGate>
                </RecentlyViewedProvider>
              </FavouritesProvider>
            </DrugProvider>
          </ConditionProvider>
        </ToastProvider>
      </BrowserRouter>
    </ErrorBoundary>
  )
}
