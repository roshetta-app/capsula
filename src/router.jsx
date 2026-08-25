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
 * Admin CMS sidebar redesign (D1/D2) — All 11 admin screens now nest under
 *             one shared <AuthGuard><AdminLayout/></AuthGuard> group,
 *             mirroring the same pathless-layout-route pattern already used
 *             above for Conditions/Drugs/Favourites/Account. AdminDashboard
 *             is retired as a route; /admin now renders AdminSummary as the
 *             group's index content. Each individual admin route no longer
 *             wraps its own AuthGuard.
 * App Gate System Phase 1 Step 2c — Added /admin/releases route
 *             (ReleasesManager.jsx), inside the same AdminLayout group.
 * App Gate System Phase 1 Step 3c — Added /admin/messages route
 *             (GatesManager.jsx), inside the same AdminLayout group.
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
import AdminLayout          from './pages/admin/AdminLayout'
import AdminSummary         from './pages/admin/AdminSummary'
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
import AuditLog              from './pages/admin/AuditLog'
import UsersManager         from './pages/admin/UsersManager'
import ReleasesManager      from './pages/admin/ReleasesManager'
import GatesManager         from './pages/admin/GatesManager'

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
  ADMIN_RELEASES:         '/admin/releases',
  ADMIN_MESSAGES:         '/admin/messages',
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

      {/* All 11 admin screens share one AdminLayout instance (sidebar +
          content pane), gated once by AuthGuard here instead of each
          screen wrapping its own — same pathless-layout-route pattern as
          the public Layout group above. /admin itself renders AdminSummary
          as the shell's landing content (D3). */}
      <Route element={<AuthGuard><AdminLayout /></AuthGuard>}>
        <Route path="/admin"
          element={<AdminSummary />}
        />
        <Route path="/admin/drugs"
          element={<DrugCMS />}
        />
        <Route path="/admin/drugs/new"
          element={<AddDrugFlow />}
        />
        <Route path="/admin/drugs/generic/:genericId"
          element={<DrugEditor />}
        />
        <Route path="/admin/categories"
          element={<CategoriesManager />}
        />
        <Route path="/admin/conditions"
          element={<ConditionsCMS />}
        />
        <Route path="/admin/conditions/new"
          element={<ConditionEditor />}
        />
        <Route path="/admin/conditions/:id"
          element={<ConditionEditor />}
        />
        <Route path="/admin/specialties"
          element={<SpecialtiesManager />}
        />
        <Route path="/admin/analytics"
          element={<AnalyticsDashboard />}
        />
        <Route path="/admin/crash-logs"
          element={<CrashLogs />}
        />
        <Route path="/admin/notifications"
          element={<NotificationsPanel />}
        />
        <Route path="/admin/audit-log"
          element={<AuditLog />}
        />
        <Route path="/admin/users"
          element={<UsersManager />}
        />
        <Route path="/admin/releases"
          element={<ReleasesManager />}
        />
        <Route path="/admin/messages"
          element={<GatesManager />}
        />
      </Route>

    </Routes>
  )
}
