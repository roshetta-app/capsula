/**
 * src/router.jsx
 * Phase 2B — Navigation & Routing Overhaul
 * Phase 3J — Added /admin/analytics route
 * Phase 3K — Added /admin/crash-logs and /admin/notifications routes
 * Phase 3L — Added /admin/audit-log route
 * Phase 7  — Permanent-mount tab switcher (sticky-header-permanent-mount-fix)
 *
 * Single source of truth for all app routes.
 * Import ROUTES for programmatic navigation (useNavigate, Link).
 * AppRoutes renders the <Routes> tree — drop it inside <BrowserRouter>.
 */

import { Routes, Route, useLocation } from 'react-router-dom'

// ─── Shared chrome ─────────────────────────────────────────────────────────────

import Layout             from './components/layout'
import BottomNav          from './components/BottomNav'
import OfflineBanner      from './components/ui/OfflineBanner'
import NotificationsBanner from './components/ui/NotificationsBanner'

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

/**
 * Pane style for the permanently-mounted Conditions/Drugs/Favourites trio.
 *
 * Deliberately NOT display:none for the inactive case. useStickyHeaderScroll's
 * IntersectionObserver measures the tracked header element's bounding rect —
 * display:none zeroes that rect out, which can make the observer report a
 * spurious visible/hidden state that's still wrong once the tab is shown
 * again. position:absolute + visibility:hidden keeps the pane fully laid out
 * (real, non-zero rects) while making it invisible and non-interactive.
 */
function panePosition(active) {
  return active
    ? { position: 'relative', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }
    : { position: 'absolute', inset: 0, visibility: 'hidden', pointerEvents: 'none' }
}

// ─── AppRoutes — rendered inside <BrowserRouter> in App.jsx ──────────────────

export default function AppRoutes() {
  const { pathname } = useLocation()

  const isConditionsTab  = pathname === '/' || pathname === '/conditions'
  const isDrugsTab       = pathname === '/drugs'
  const isFavouritesTab  = pathname === '/favourites'
  const isTabRoute       = isConditionsTab || isDrugsTab || isFavouritesTab

  // Conditions and Favourites render their own hero + sliding sticky header;
  // Drugs uses the shared Layout header. Passed explicitly rather than
  // derived inside Layout, since Layout no longer maps 1:1 to a single route
  // once these three stay permanently mounted side by side.
  const suppressHeader = isConditionsTab || isFavouritesTab

  return (
    <>
      <OfflineBanner />

      {/* Same permanently-mounted-but-hidden treatment as the individual
          tab panes below, applied one level up: detail/admin routes must
          not disturb the trio's mounted state, but they also shouldn't
          visually overlap it, so the whole trio is hidden (not unmounted)
          while a detail/admin route is active. */}
      <div style={panePosition(isTabRoute)}>
        <Layout suppressHeader={suppressHeader}>
          <div style={panePosition(isConditionsTab)}>
            <ConditionsScreen />
          </div>
          <div style={panePosition(isDrugsTab)}>
            <DrugsScreen />
          </div>
          <div style={panePosition(isFavouritesTab)}>
            <FavouritesScreen />
          </div>
        </Layout>
      </div>

      {/* Detail and admin screens continue to mount/unmount normally —
          only the Conditions/Drugs/Favourites trio needs to stay warm.
          Each of these still wraps itself in its own Layout instance,
          unchanged from before this task. */}
      {!isTabRoute && (
        <Routes>
          <Route path="/conditions/:slug"    element={<ConditionDetailScreen />} />
          <Route path="/drugs/:slug"         element={<DrugDetailScreen />} />

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
      )}

      <NotificationsBanner />
      <BottomNav />
    </>
  )
}
