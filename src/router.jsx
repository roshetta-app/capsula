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
 * 14.7a (2026-11-22): the Account tab is now the Profile tab (/account shows ProfileScreen). The old
 *             Account screen is Settings at /account/settings, outside the shared Layout like /account/edit
 *             and /account/faq (own Back to Profile, no bottom bar).
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
 * Admin crash isolation (2026-09-01) — the single AppRoutes() export below
 *             used to render both the public and admin route trees inside
 *             one shared component, which App.jsx then mounted as one
 *             child of the full consumer provider stack (Theme,
 *             Favourites, AppGate, etc.). A crash in any of those
 *             consumer-only providers took down /admin/* along with
 *             everything else, blocking the admin's ability to even reach
 *             the CMS to diagnose it. AppRoutes() is now split into
 *             PublicRoutes() and AdminRoutes(), each a self-contained
 *             <Routes> tree with the exact same individual <Route>
 *             definitions as before (nothing about any single route
 *             changed) — this lets App.jsx mount them under separate
 *             provider branches with separate ErrorBoundary components.
 *             See App.jsx's header for the full provider-tree reasoning.
 *
 * Single source of truth for all app routes.
 * Import ROUTES for programmatic navigation (useNavigate, Link).
 * PublicRoutes renders the public <Routes> tree; AdminRoutes renders the
 * admin one. Both drop inside <BrowserRouter> (via App.jsx), each in its
 * own provider branch.
 */

import { Routes, Route, Outlet } from 'react-router-dom'
import Layout from './components/layout'
import PageEntrance from './components/ui/PageEntrance'
import { BackLabelTracker } from './hooks/useBackLabel'
import useCmsSurface from './hooks/useCmsSurface'

// ─── Public screens ───────────────────────────────────────────────────────────

import ConditionsScreen      from './pages/ConditionsScreen'
import ConditionDetailScreen from './pages/ConditionDetailScreen'
import DrugsScreen           from './pages/DrugsScreen'
import DrugCategoriesScreen  from './pages/DrugCategoriesScreen'
import DrugClassesScreen     from './pages/DrugClassesScreen'
import DrugGroupScreen       from './pages/DrugGroupScreen'
import DrugGroupsScreen      from './pages/DrugGroupsScreen'
import AddDrugsToGroupScreen from './pages/AddDrugsToGroupScreen'
import SharedGroupScreen     from './pages/SharedGroupScreen'
import SharedRoshettaScreen  from './pages/SharedRoshettaScreen'
import PublicProfileScreen   from './pages/PublicProfileScreen'
import RoshettaScreen        from './pages/RoshettaScreen'
import RoshettasListScreen   from './pages/RoshettasListScreen'
import NotificationsScreen    from './pages/NotificationsScreen'
import RoshettaAddDrugScreen from './pages/RoshettaAddDrugScreen'
import RoshettaEditorScreen from './pages/RoshettaEditorScreen'
import DrugDetailScreen      from './pages/DrugDetailScreen'
import GenericDetailScreen   from './pages/GenericDetailScreen'
import FavouritesScreen      from './pages/FavouritesScreen'
import AccountScreen         from './pages/AccountScreen'
import ProfileScreen         from './pages/ProfileScreen'
import AccountEditScreen     from './pages/AccountEditScreen'
import UpgradeScreen         from './pages/UpgradeScreen'
import ProRequestsManager    from './pages/admin/ProRequestsManager'
import AccountFaqScreen      from './pages/AccountFaqScreen'
import LegalScreen           from './pages/LegalScreen'
import UnknownAddressScreen  from './pages/UnknownAddressScreen'

// ─── Admin screens ────────────────────────────────────────────────────────────

import AuthGuard            from './components/admin/AuthGuard'
import AdminLogin           from './pages/admin/AdminLogin'
import AdminLayout          from './pages/admin/AdminLayout'
import AdminSummary         from './pages/admin/AdminSummary'
import DrugCMS              from './pages/admin/DrugCMS'
import AddDrugFlow          from './pages/admin/AddDrugFlow'
import DrugEditor           from './pages/admin/DrugEditor'
import ClassCMS             from './pages/admin/ClassCMS'
import ConditionsCMS        from './pages/admin/ConditionsCMS'
import ConditionEditor      from './components/admin/ConditionEditor'
import SpecialtiesManager   from './pages/admin/SpecialtiesManager'
import CategoriesManager    from './pages/admin/CategoriesManager'
import ClassKeywordsManager from './pages/admin/ClassKeywordsManager'
import AnalyticsDashboard   from './pages/admin/AnalyticsDashboard'
import CrashLogs            from './pages/admin/CrashLogs'
import NotificationsPanel   from './pages/admin/NotificationsPanel'
import AuditLog              from './pages/admin/AuditLog'
import UsersManager         from './pages/admin/UsersManager'
import ReleasesManager      from './pages/admin/ReleasesManager'
import GatesManager         from './pages/admin/GatesManager'
import HomeCardManager      from './pages/admin/HomeCardManager'
import ReportsManager       from './pages/admin/ReportsManager'
import BlockedWordsManager  from './pages/admin/BlockedWordsManager'
import HomeScreen           from './pages/HomeScreen'

// ─── Route path constants ─────────────────────────────────────────────────────

export const ROUTES = {
  // Public
  HOME:              '/',
  CONDITIONS:        '/conditions',
  CONDITION_DETAIL:  (slug) => `/conditions/${slug}`,
  DRUGS:             '/drugs',
  DRUGS_CATEGORY:    (slug) => `/drugs/category/${slug}`,
  // 2026-10-18 (Drugs groups plan, step 1.3): the Category and Class pages.
  // Two segments after /drugs so they can never clash with /drugs/:slug.
  DRUGS_BROWSE_CATEGORY: '/drugs/browse/category',
  DRUGS_BROWSE_CLASS:    '/drugs/browse/class',
  // 2026-10-19 (Drugs groups plan, step 6.2): a group's own page. Two segments
  // after /drugs, so it can never clash with /drugs/:slug.
  // 2026-10-22 (UI refresh plan, step 8.2b): the See all screen for My drug groups. Three
  // segments, like the browse pages, so it can never clash with /drugs/:slug.
  DRUGS_GROUPS:          '/drugs/browse/groups',
  DRUGS_GROUP:           (id) => `/drugs/group/${id}`,
  // 2026-10-21 (Drugs groups plan, step 12.5): the Add drugs search for one group.
  DRUGS_GROUP_ADD:       (id) => `/drugs/group/${id}/add`,
  // 2026-10-19 (Drugs groups plan, step 8.2): the public shared-group page opened
  // from a share link. No sign-in needed.
  SHARED_GROUP:          (code) => `/g/${code}`,
  SHARED_ROSHETTA:       (code) => `/r/${code}`,
  // 14.7b (2026-11-22): a public profile, opened from its username.
  PUBLIC_PROFILE:        (handle) => `/u/${encodeURIComponent(handle)}`,
  // 2026-11-14 (Roshetta plan, step 8.2): all of a person's roshettas, with search and sort.
  ROSHETTAS:             '/roshettas',
  // 2026-11-24 (step 1c): the Notifications page, opened from the bell.
  NOTIFICATIONS:         '/notifications',
  // 2026-11-14 (Roshetta plan, step 4.2a): a person's own roshetta page.
  ROSHETTA:              (id) => `/roshetta/${id}`,
  // 2026-11-14 (Roshetta plan, step 5.2a): the Add drug screen of a roshetta.
  ROSHETTA_ADD:          (id) => `/roshetta/${id}/add`,
  // 2026-11-14 (Roshetta plan, step 5.3a): the editor of a roshetta.
  ROSHETTA_EDIT:         (id) => `/roshetta/${id}/edit`,
  DRUG_DETAIL:       (slug) => `/drugs/${slug}`,
  GENERIC_DETAIL:    (slug) => `/drugs/generic/${slug}`,
  FAVOURITES:        '/favourites',
  ACCOUNT:           '/account',
  ACCOUNT_SETTINGS:  '/account/settings',
  ACCOUNT_EDIT:      '/account/edit',
  // 2026-11-24 (Stage 3 step 3): Capsula PRO plans, the I paid steps and the request status.
  ACCOUNT_UPGRADE:   '/account/upgrade',
  ACCOUNT_FAQ:       '/account/faq',
  // 14.10 (2026-11-22): the Terms of Use and the Privacy Policy, opened from the Legal card in Settings.
  ACCOUNT_TERMS:     '/account/terms',
  ACCOUNT_PRIVACY:   '/account/privacy',

  // Admin
  ADMIN_LOGIN:            '/admin/login',
  ADMIN:                  '/admin',
  ADMIN_DRUGS:            '/admin/drugs',
  ADMIN_DRUGS_NEW:        '/admin/drugs/new',
  ADMIN_DRUGS_GENERIC:    (genericId) => `/admin/drugs/generic/${genericId}`,
  ADMIN_CATEGORIES:       '/admin/categories',
  ADMIN_CLASS_KEYWORDS:   '/admin/class-keywords',
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
  ADMIN_HOME_CARD:        '/admin/home-card',
  ADMIN_REPORTS:          '/admin/reports',
  ADMIN_PRO_REQUESTS:     '/admin/pro-requests',
  ADMIN_BLOCKED_WORDS:    '/admin/blocked-words',
}

// ─── PublicRoutes — rendered inside the public provider branch in App.jsx ────

export function PublicRoutes() {
  return (
    <>
    <BackLabelTracker />
    <Routes>

      {/* Conditions, Drugs, Favourites, and Account share one Layout instance
          that stays mounted while switching between them — this is what
          keeps NotificationsBanner (rendered inside Layout) from resetting
          its state on every tab switch. Layout suppresses its own header/
          padding for these routes internally (see HEADER_SUPPRESSED_ROUTES
          in layout.jsx), so nothing else needed to change here. */}
      <Route element={<Layout><Outlet /></Layout>}>
        <Route path="/"                    element={<HomeScreen />} />
        <Route path="/conditions"          element={<ConditionsScreen />} />
        <Route path="/drugs"                        element={<DrugsScreen />} />
        <Route path="/drugs/category/:categorySlug"  element={<DrugsScreen />} />
        <Route path="/drugs/browse/category"          element={<DrugCategoriesScreen />} />
        <Route path="/drugs/browse/class"             element={<DrugClassesScreen />} />
        <Route path="/drugs/browse/groups"            element={<DrugGroupsScreen />} />
        <Route path="/drugs/group/:groupId"           element={<DrugGroupScreen />} />
        <Route path="/drugs/group/:groupId/add"       element={<AddDrugsToGroupScreen />} />
        <Route path="/roshettas"                      element={<RoshettasListScreen />} />
        <Route path="/notifications"                  element={<NotificationsScreen />} />
        <Route path="/roshetta/:id"                   element={<RoshettaScreen />} />
        <Route path="/roshetta/:id/add"               element={<RoshettaAddDrugScreen />} />
        <Route path="/roshetta/:id/edit"              element={<RoshettaEditorScreen />} />
        <Route path="/favourites"          element={<FavouritesScreen />} />
        <Route path="/account"             element={<ProfileScreen />} />
      </Route>

      {/* Detail screens render their own header/scroll setup and stay
          outside the shared Layout entirely — unchanged from before.
          /account/edit and /account/faq follow the same pattern (own
          back-arrow header, no BottomNav) — see file header note above. */}
      {/* Step 11.20: these screens sit outside Layout, so the entrance rules (utils/pageEntrance.js)
          never reached them and they snapped open. This route has no look of its own; it only
          carries the same PageEntrance that Layout uses. */}
      <Route element={<PageEntrance><Outlet /></PageEntrance>}>
        <Route path="/conditions/:slug"    element={<ConditionDetailScreen />} />
        <Route path="/drugs/:slug"                   element={<DrugDetailScreen />} />
        <Route path="/drugs/generic/:slug"           element={<GenericDetailScreen />} />
        <Route path="/g/:code"                       element={<SharedGroupScreen />} />
        <Route path="/r/:code"                       element={<SharedRoshettaScreen />} />
        <Route path="/u/:handle"                     element={<PublicProfileScreen />} />
        <Route path="/account/settings"    element={<AccountScreen />} />
        <Route path="/account/edit"        element={<AccountEditScreen />} />
        <Route path="/account/upgrade"     element={<UpgradeScreen />} />
        <Route path="/account/faq"         element={<AccountFaqScreen />} />
        <Route path="/account/terms"       element={<LegalScreen kind="terms" />} />
        <Route path="/account/privacy"     element={<LegalScreen kind="privacy" />} />

        {/* Step 12.5: no dead ends. The four words below would otherwise be read as a drug with that
            name (/drugs/:slug), so they get their own routes: each is sent to the right list. Every
            other address that matches nothing lands on the catch-all, which shows the shared "not
            available" screen with Home (and Back when a screen is behind). A known typo such as
            /favorites is sent to the real screen (utils/addressFixes.js). */}
        <Route path="/drugs/browse"        element={<UnknownAddressScreen />} />
        <Route path="/drugs/group"         element={<UnknownAddressScreen />} />
        <Route path="/drugs/category"      element={<UnknownAddressScreen />} />
        <Route path="/drugs/generic"       element={<UnknownAddressScreen />} />
        <Route path="*"                    element={<UnknownAddressScreen />} />
      </Route>

      {/* 2026-11-21: App.jsx draws this tree and AdminRoutes side by side, so the catch-all
          above also matched every /admin address and drew "This page isn't available" under
          each CMS screen. The admin pages belong to AdminRoutes: here they draw nothing. */}
      <Route path="/admin/*" element={null} />

    </Routes>
    </>
  )
}

// ─── AdminRoutes — rendered inside the admin provider branch in App.jsx ──────

export function AdminRoutes() {
  // CMS pages allow text selection, copy and zoom (the public app locks them).
  useCmsSurface()
  return (
    <Routes>

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
        <Route path="/admin/drugs/class"
          element={<ClassCMS />}
        />
        <Route path="/admin/drugs/generic/:genericId"
          element={<DrugEditor />}
        />
        <Route path="/admin/categories"
          element={<CategoriesManager />}
        />
        <Route path="/admin/class-keywords"
          element={<ClassKeywordsManager />}
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
        <Route path="/admin/home-card"
          element={<HomeCardManager />}
        />
        <Route path="/admin/reports"
          element={<ReportsManager />}
        />
        <Route path="/admin/pro-requests"
          element={<ProRequestsManager />}
        />
        <Route path="/admin/blocked-words"
          element={<BlockedWordsManager />}
        />
      </Route>

    </Routes>
  )
}
