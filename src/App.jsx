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

export default function App() {
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
