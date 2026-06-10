/**
 * src/router.jsx
 * Phase 2B — Navigation & Routing Overhaul
 * Phase 3J — Added /admin/analytics route
 * Phase 3K — Added /admin/crash-logs and /admin/notifications routes
 * Phase 3L — Added /admin/audit-log route
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

import AuthGuard            from './components/admin/AuthGuard'
import AdminLogin           from './pages/admin/AdminLogin'
import AdminDashboard       from './pages/admin/AdminDashboard'
import DrugCMS              from './pages/admin/DrugCMS'
import AddDrugFlow          from './pages/admin/AddDrugFlow'
import DrugEditor           from './pages/admin/DrugEditor'
import ConditionsCMS        from './pages/admin/ConditionsCMS'
import ConditionEditor      from './components/admin/ConditionEditor'
import SpecialtiesManager   from './pages/admin/SpecialtiesManager'
import AnalyticsDashboard   from './pages/admin/AnalyticsDashboard'
import CrashLogs            from './pages/admin/CrashLogs'
import NotificationsPanel   from './pages/admin/NotificationsPanel'
import AuditLog             from './pages/admin/AuditLog'

// ─── Route path constants ─────────────────────────────────────────────────────

export const ROUTES = {
  // Public
  CONDITIONS:        '/conditions',
  CONDITION_DETAIL:  (slug) => `/conditions/${slug}`,
  DRUGS:             '/drugs',
  DRUG_DETAIL:       (slug) => `/drugs/${slug}`,
  FAVOURITES:        '/favourites',

  // Admin
  ADMIN_LOGIN:            '/admin/login',
  ADMIN:                  '/admin',
  ADMIN_DRUGS:            '/admin/drugs',
  ADMIN_DRUGS_NEW:        '/admin/drugs/new',
  ADMIN_DRUGS_GENERIC:    (genericId) => `/admin/drugs/generic/${genericId}`,
  ADMIN_CONDITIONS:       '/admin/conditions',
  ADMIN_CONDITIONS_NEW:   '/admin/conditions/new',
  ADMIN_CONDITIONS_EDIT:  (id) => `/admin/conditions/${id}`,
  ADMIN_SPECIALTIES:      '/admin/specialties',
  ADMIN_ANALYTICS:        '/admin/analytics',
  ADMIN_CRASH_LOGS:       '/admin/crash-logs',
  ADMIN_NOTIFICATIONS:    '/admin/notifications',
  ADMIN_AUDIT_LOG:        '/admin/audit-log',
}

// ─── AppRoutes — rendered inside <BrowserRouter> in App.jsx ──────────────────

export default function AppRoutes() {
  return (
    <Routes>

      {/* ── Public routes ────────────────────────────────────────────────── */}

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
      <Route path="/admin/drugs/new"
        element={<AuthGuard><AddDrugFlow /></AuthGuard>}
      />
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
      <Route path="/admin/specialties"
        element={<AuthGuard><SpecialtiesManager /></AuthGuard>}
      />
      <Route path="/admin/analytics"
        element={<AuthGuard><AnalyticsDashboard /></AuthGuard>}
      />
      <Route path="/admin/crash-logs"
        element={<AuthGuard><CrashLogs /></AuthGuard>}
      />
      <Route path="/admin/notifications"
        element={<AuthGuard><NotificationsPanel /></AuthGuard>}
      />
      <Route path="/admin/audit-log"
        element={<AuthGuard><AuditLog /></AuthGuard>}
      />

    </Routes>
  )
}
