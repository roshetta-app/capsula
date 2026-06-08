/**
 * src/App.jsx
 * Phase 2J addition: wrapped AppRoutes with OnboardingGate
 *
 * OnboardingGate checks localStorage('capsula_onboarded').
 * First launch → shows OnboardingScreen (3-card swipe).
 * All subsequent launches → transparent pass-through, zero overhead.
 */

import { BrowserRouter } from 'react-router-dom'
import AppRoutes from './router'
import OnboardingGate from './components/ui/OnboardingGate'
import { ConditionProvider } from './context/ConditionContext'
import { DrugProvider } from './context/DrugContext'
import { FavouritesProvider } from './context/FavouritesContext'

export default function App() {
  return (
    <BrowserRouter basename="/capsula">
      <ConditionProvider>
        <DrugProvider>
          <FavouritesProvider>
            <OnboardingGate>
              <AppRoutes />
            </OnboardingGate>
          </FavouritesProvider>
        </DrugProvider>
      </ConditionProvider>
    </BrowserRouter>
  )
}
