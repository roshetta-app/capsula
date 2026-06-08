/**
 * src/components/ui/OnboardingGate.jsx
 * Phase 2J — Onboarding gate
 *
 * Wraps the entire app (mounted once in App.jsx / router root).
 * Checks localStorage for 'capsula_onboarded'.
 * If absent: renders OnboardingScreen (full-screen overlay).
 * If present: renders children transparently — zero overhead.
 *
 * Usage in App.jsx:
 *   import OnboardingGate from './components/ui/OnboardingGate'
 *   ...
 *   <OnboardingGate>
 *     <AppRoutes />
 *   </OnboardingGate>
 */

import { useState } from 'react'
import OnboardingScreen from '../../screens/OnboardingScreen'

export default function OnboardingGate({ children }) {
  const [done, setDone] = useState(
    () => localStorage.getItem('capsula_onboarded') === 'true'
  )

  if (!done) {
    return <OnboardingScreen onDone={() => setDone(true)} />
  }

  return children
}
