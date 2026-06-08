/**
 * src/App.jsx
 * Phase 2B — Navigation & Routing Overhaul
 *
 * App is now a thin shell:
 *   - Providers wrap everything
 *   - useDarkMode() wires up system dark-mode class
 *   - AppRoutes (from router.jsx) owns all route definitions
 *
 * DrugLibraryScreen has been extracted to src/pages/DrugsScreen.jsx
 * DrugDetailScreen lives at src/pages/DrugDetailScreen.jsx (new in 2B)
 */

import { BrowserRouter } from 'react-router-dom'
import { DrugProvider }       from './context/DrugContext'
import { ConditionProvider }  from './context/ConditionContext'
import { FavouritesProvider } from './context/FavouritesContext'
import { useDarkMode }        from './hooks/useDarkMode'
import AppRoutes              from './router'

// ─── Inner shell (needs router context for useDarkMode + routes) ──────────────

function AppShell() {
  useDarkMode()
  return <AppRoutes />
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <BrowserRouter basename="/capsula">
      <FavouritesProvider>
        <ConditionProvider>
          <DrugProvider>
            <AppShell />
          </DrugProvider>
        </ConditionProvider>
      </FavouritesProvider>
    </BrowserRouter>
  )
}
