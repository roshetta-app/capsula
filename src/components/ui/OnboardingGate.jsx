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
import { useLocation } from 'react-router-dom'
import OnboardingScreen from '../../screens/OnboardingScreen'

// 2026-10-19 (Drug groups plan, step 8.2): a shared group link (/g/<code>) is a
// public page. Someone who only wants to look at the group does not get the
// welcome screen, and nothing is downloaded for them (the drug library starts
// from the welcome screen's last slide). The welcome screen appears when they
// go on into the app (Open Capsula, or opening a drug).
function isPublicSharedPage(pathname) {
  return pathname.startsWith('/g/')
}

export default function OnboardingGate({ children }) {
  const { pathname } = useLocation()
  const [done, setDone] = useState(
    () => localStorage.getItem('capsula_onboarded') === 'true'
  )

  if (!done && !isPublicSharedPage(pathname)) {
    return <OnboardingScreen onDone={() => setDone(true)} />
  }

  return children
}
