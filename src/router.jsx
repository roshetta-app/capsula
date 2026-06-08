/**
 * src/router.jsx
 * Phase 2B — Navigation & Routing Overhaul
 *
 * Single source of truth for all app routes.
 * Import ROUTES for programmatic navigation (useNavigate, Link).
 * AppRoutes renders the <Routes> tree — drop it inside <BrowserRouter>.
 */

import { Routes, Route } from 'react-router-dom'

// ─── Public screens ───────────────────────────────────────────────────────────

import ConditionsScreen      from './pages/ConditionsScreen'
import ConditionDetailScreen from './pages/ConditionDetailScreen'
import DrugsScreen           from './pages/DrugsScreen'
import DrugDetailScreen      from './pages/DrugDetailScreen'
import FavouritesScreen      from './pages/FavouritesScreen'

// ─── Admin screens ────────────────────────────────────────────────────────────

import AuthGuard       from './components/admin/AuthGuard'
import AdminLogin      from './pages/admin/AdminLogin'
import AdminDashboard  from './pages/admin/AdminDashboard'
import DrugCMS         from './pages/admin/DrugCMS'
import AddDrugFlow     from './pages/admin/AddDrugFlow'
import DrugEditor      from './pages/admin/DrugEditor'
import ConditionsCMS   from './pages/admin/ConditionsCMS'
import ConditionEditor from './components/admin/ConditionEditor'

// ─── Route path constants ─────────────────────────────────────────────────────
//
// Use these constants everywhere instead of hardcoded strings.
// Example:  navigate(ROUTES.CONDITION_DETAIL('upper-respiratory-tract-infection'))
//           navigate(ROUTES.DRUG_DETAIL('amoxicillin-500mg-capsule'))

export const ROUTES = {
  // Public
  CONDITIONS:        '/conditions',
  CONDITION_DETAIL:  (slug) => `/conditions/${slug}`,
  DRUGS:             '/drugs',
  DRUG_DETAIL:       (slug) => `/drugs/${slug}`,
  FAVOURITES:        '/favourites',

  // Admin
  ADMIN_LOGIN:          '/admin/login',
  ADMIN:                '/admin',
  ADMIN_DRUGS:          '/admin/drugs',
  ADMIN_DRUGS_NEW:      '/admin/drugs/new',
  ADMIN_DRUGS_GENERIC:  (genericId) => `/admin/drugs/generic/${genericId}`,
  ADMIN_CONDITIONS:     '/admin/conditions',
  ADMIN_CONDITIONS_NEW: '/admin/conditions/new',
  ADMIN_CONDITIONS_EDIT:(id) => `/admin/conditions/${id}`,
}

// ─── AppRoutes — rendered inside <BrowserRouter> in App.jsx ──────────────────

export default function AppRoutes() {
  return (
    <Routes>

      {/* ── Public routes ────────────────────────────────────────────────── */}

      {/* Default: redirect "/" to "/conditions" */}
      <Route path="/"                    element={<ConditionsScreen />} />
      <Route path="/conditions"          element={<ConditionsScreen />} />
      <Route path="/conditions/:slug"    element={<ConditionDetailScreen />} />

      <Route path="/drugs"               element={<DrugsScreen />} />
      <Route path="/drugs/:slug"         element={<DrugDetailScreen />} />

      <Route path="/favourites"          element={<FavouritesScreen />} />

      {/* ── Admin routes ─────────────────────────────────────────────────── */}

      <Route path="/admin/login"         element={<AdminLogin />} />

      <Route path="/admin"
        element={<AuthGuard><AdminDashboard /></AuthGuard>}
      />
      <Route path="/admin/drugs"
        element={<AuthGuard><DrugCMS /></AuthGuard>}
      />
      {/* NOTE: /new must come before /generic/:genericId so React Router
          doesn't treat "new" as a genericId */}
      <Route path="/admin/drugs/new"
        element={<AuthGuard><AddDrugFlow /></AuthGuard>}
      />
      {/* Unified drug editor — generic + all formulations + brands in one place */}
      <Route path="/admin/drugs/generic/:genericId"
        element={<AuthGuard><DrugEditor /></AuthGuard>}
      />
      <Route path="/admin/conditions"
        element={<AuthGuard><ConditionsCMS /></AuthGuard>}
      />
      <Route path="/admin/conditions/new"
        element={<AuthGuard><ConditionEditor /></AuthGuard>}
      />
      <Route path="/admin/conditions/:id"
        element={<AuthGuard><ConditionEditor /></AuthGuard>}
      />

    </Routes>
  )
}
