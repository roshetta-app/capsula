/**
 * src/router.jsx
 * Phase 2B — Navigation & Routing Overhaul
 * Phase 3J — Added /admin/analytics route
 * Phase 3K — Added /admin/crash-logs and /admin/notifications routes
 * Phase 3L — Added /admin/audit-log route
 * Phase F11 Stage 2 — Added /admin/users route
 * Phase F13 Mini-stage 1 — Added /account route (Account tab now navigates
 *             here instead of opening AccountSheet as a popup). Placed in
 *             the same shared Layout group as Conditions/Drugs/Favourites
 *             so BottomNav stays visible and Layout's mount-once behavior
 *             (NotificationsBanner state, etc.) is unaffected.
 * Phase F13 Mini-stage 5 (Account redesign) — Added /account/edit and
 *             /account/faq. Both placed OUTSIDE the shared Layout group,
 *             next to /conditions/:slug and /drugs/:slug — same reasoning
 *             as those two: each renders its own back-arrow header and
 *             does not show BottomNav, matching the reference design's
 *             full-page navigation rather than the tab-style Layout group.
 *
 * Single source of truth for all app routes.
 * Import ROUTES for programmatic navigation (useNavigate, Link).
 * AppRoutes renders the <Routes> tree — drop it inside <BrowserRouter>.
 */

import { Routes, Route, Outlet } from 'react-router-dom'
import Layout from './components/layout'

// ─── Public screens ───────────────────────────────────────────────────────────

import ConditionsScreen      from './pages/ConditionsScreen'
import ConditionDetailScreen from './pages/ConditionDetailScreen'
import DrugsScreen           from './pages/DrugsScreen'
import DrugDetailScreen      from './pages/DrugDetailScreen'
import FavouritesScreen      from './pages/FavouritesScreen'
import AccountScreen         from './pages/AccountScreen'
import AccountEditScreen     from './pages/AccountEditScreen'
import AccountFaqScreen      from './pages/AccountFaqScreen'

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
import CategoriesManager    from './pages/admin/CategoriesManager'
import AnalyticsDashboard   from './pages/admin/AnalyticsDashboard'
import CrashLogs            from './pages/admin/CrashLogs'
import NotificationsPanel   from './pages/admin/NotificationsPanel'
import AuditLog             from './pages/admin/AuditLog'
import UsersManager         from './pages/admin/UsersManager'

// ─── Route path constants ─────────────────────────────────────────────────────

export const ROUTES = {
  // Public
  CONDITIONS:        '/conditions',
  CONDITION_DETAIL:  (slug) => `/conditions/${slug}`,
  DRUGS:             '/drugs',
  DRUGS_CATEGORY:    (slug) => `/drugs/category/${slug}`,
  DRUG_DETAIL:       (slug) => `/drugs/${slug}`,
  FAVOURITES:        '/favourites',
  ACCOUNT:           '/account',
  ACCOUNT_EDIT:      '/account/edit',
  ACCOUNT_FAQ:       '/account/faq',

  // Admin
  ADMIN_LOGIN:            '/admin/login',
  ADMIN:                  '/admin',
  ADMIN_DRUGS:            '/admin/drugs',
  ADMIN_DRUGS_NEW:        '/admin/drugs/new',
  ADMIN_DRUGS_GENERIC:    (genericId) => `/admin/drugs/generic/${genericId}`,
  ADMIN_CATEGORIES:       '/admin/categories',
  ADMIN_CONDITIONS:       '/admin/conditions',
  ADMIN_CONDITIONS_NEW:   '/admin/conditions/new',
  ADMIN_CONDITIONS_EDIT:  (id) => `/admin/conditions/${id}`,
  ADMIN_SPECIALTIES:      '/admin/specialties',
  ADMIN_ANALYTICS:        '/admin/analytics',
  ADMIN_CRASH_LOGS:       '/admin/crash-logs',
  ADMIN_NOTIFICATIONS:    '/admin/notifications',
  ADMIN_AUDIT_LOG:        '/admin/audit-log',
  ADMIN_USERS:            '/admin/users',
}

// ─── AppRoutes — rendered inside <BrowserRouter> in App.jsx ──────────────────

export default function AppRoutes() {
  return (
    <Routes>

      {/* ── Public routes ────────────────────────────────────────────────── */}

      {/* Conditions, Drugs, Favourites, and Account share one Layout instance
          that stays mounted while switching between them — this is what
          keeps NotificationsBanner (rendered inside Layout) from resetting
          its state on every tab switch. Layout suppresses its own header/
          padding for these routes internally (see HEADER_SUPPRESSED_ROUTES
          in layout.jsx), so nothing else needed to change here. */}
      <Route element={<Layout><Outlet /></Layout>}>
        <Route path="/"                    element={<ConditionsScreen />} />
        <Route path="/conditions"          element={<ConditionsScreen />} />
        <Route path="/drugs"                        element={<DrugsScreen />} />
        <Route path="/drugs/category/:categorySlug"  element={<DrugsScreen />} />
        <Route path="/favourites"          element={<FavouritesScreen />} />
        <Route path="/account"             element={<AccountScreen />} />
      </Route>

      {/* Detail screens render their own header/scroll setup and stay
          outside the shared Layout entirely — unchanged from before.
          /account/edit and /account/faq follow the same pattern (own
          back-arrow header, no BottomNav) — see file header note above. */}
      <Route path="/conditions/:slug"    element={<ConditionDetailScreen />} />
      <Route path="/drugs/:slug"                   element={<DrugDetailScreen />} />
      <Route path="/account/edit"        element={<AccountEditScreen />} />
      <Route path="/account/faq"         element={<AccountFaqScreen />} />

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
      <Route path="/admin/categories"
        element={<AuthGuard><CategoriesManager /></AuthGuard>}
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
      <Route path="/admin/users"
        element={<AuthGuard><UsersManager /></AuthGuard>}
      />

    </Routes>
  )
}
