/**
 * src/App.jsx
 * Phase 3A addition: wrapped with ToastProvider (global toast system for CMS)
 * Phase 3K addition: wrapped with ErrorBoundary (global crash logger)
 *
 * Provider order (outermost → innermost):
 *   ErrorBoundary → BrowserRouter → ToastProvider → ConditionProvider → DrugProvider → FavouritesProvider → OnboardingGate → AppRoutes
 */

import { BrowserRouter } from 'react-router-dom'
import AppRoutes from './router'
import OnboardingGate from './components/ui/OnboardingGate'
import { ConditionProvider } from './context/ConditionContext'
import { DrugProvider } from './context/DrugContext'
import { FavouritesProvider } from './context/FavouritesContext'
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

  return (
    <ErrorBoundary>
      <BrowserRouter basename="/capsula">
        <ToastProvider>
          <ConditionProvider>
            <DrugProvider>
              <FavouritesProvider>
                <OnboardingGate>
                  <AppRoutes />
                </OnboardingGate>
              </FavouritesProvider>
            </DrugProvider>
          </ConditionProvider>
        </ToastProvider>
      </BrowserRouter>
    </ErrorBoundary>
  )
}
