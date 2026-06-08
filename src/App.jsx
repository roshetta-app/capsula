/**
 * src/App.jsx
 * Phase 3A addition: wrapped with ToastProvider (global toast system for CMS)
 *
 * Provider order (outermost → innermost):
 *   BrowserRouter → ToastProvider → ConditionProvider → DrugProvider → FavouritesProvider → OnboardingGate → AppRoutes
 */

import { BrowserRouter } from 'react-router-dom'
import AppRoutes from './router'
import OnboardingGate from './components/ui/OnboardingGate'
import { ConditionProvider } from './context/ConditionContext'
import { DrugProvider } from './context/DrugContext'
import { FavouritesProvider } from './context/FavouritesContext'
import { ToastProvider } from './contexts/ToastContext'

export default function App() {
  return (
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
  )
}
