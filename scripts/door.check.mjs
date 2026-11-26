// S11 guard: areas already moved behind their data module must not call the server directly again.
// Add a file to MOVED when its direct Supabase calls have been moved. node --test scripts/door.check.mjs
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const MOVED = [
  'src/pages/admin/ProRequestsManager.jsx',  // 2026-11-26, now uses src/lib/proQueries.js
  'src/pages/admin/ProSettingsManager.jsx',  // 2026-11-26, now uses src/lib/proQueries.js
  'src/pages/admin/LaunchSwitchesManager.jsx', // 2026-11-26, now uses src/lib/switchQueries.js
  'src/components/SignInReturnNotice.jsx',     // 2026-11-26, now uses src/lib/switchQueries.js
  'src/hooks/useDrugs.js',                     // 2026-11-26, now uses src/lib/catalogData.js
  'src/hooks/useFavourites.js',                // 2026-11-26, now uses src/lib/favouriteQueries.js
  'src/hooks/useFavouriteClasses.js',          // 2026-11-26, now uses src/lib/favouriteQueries.js
  'src/hooks/useNotifications.js',             // 2026-11-26, now uses src/lib/notificationQueries.js
  'src/analytics/searchGaps.js',  // 2026-11-26, S11 bunch
  'src/analytics/usageEvents.js',  // 2026-11-26, S11 bunch
  'src/components/admin/DrugSearchField.jsx',  // 2026-11-26, S11 bunch
  'src/components/admin/blocks/FreeTextPostEditor.jsx',  // 2026-11-26, S11 bunch
  'src/components/drugs/CheckPriceButton.jsx',  // 2026-11-26, S11 bunch
  'src/components/drugs/DrugMediaStrip.jsx',  // 2026-11-26, S11 bunch
  'src/context/OnlineStatusContext.jsx',  // 2026-11-26, S11 bunch
  'src/context/ThemeContext.jsx',  // 2026-11-26, S11 bunch
  'src/hooks/useAppGate.js',  // 2026-11-26, S11 bunch
  'src/hooks/useCategories.js',  // 2026-11-26, S11 bunch
  'src/hooks/useClassKeywords.js',  // 2026-11-26, S11 bunch
  'src/hooks/useConditions.js',  // 2026-11-26, S11 bunch
  'src/hooks/useHomeFeatured.js',  // 2026-11-26, S11 bunch
  'src/hooks/useNotesPrefetch.js',  // 2026-11-26, S11 bunch
  'src/hooks/usePublicProfile.js',  // 2026-11-26, S11 bunch
  'src/hooks/useRoshettas.js',  // 2026-11-26, S11 bunch
  'src/pages/AccountEditScreen.jsx',  // 2026-11-26, S11 bunch
  'src/pages/ProfileScreen.jsx',  // 2026-11-26, S11 bunch
  'src/pages/admin/AuditLog.jsx',  // 2026-11-26, S11 bunch
  'src/pages/admin/BusinessNumbers.jsx',  // 2026-11-26, S11 bunch
  'src/pages/admin/ConditionsCMS.jsx',  // 2026-11-26, S11 bunch
  'src/pages/admin/CrashLogs.jsx',  // 2026-11-26, S11 bunch
  'src/pages/admin/NotificationsPanel.jsx',  // 2026-11-26, S11 bunch
  'src/utils/auditLogger.js',  // 2026-11-26, S11 bunch
  'src/utils/blockedWordsAdminContent.js',  // 2026-11-26, S11 bunch
  'src/utils/crashLogger.js',  // 2026-11-26, S11 bunch
  'src/utils/flatDrugCache.js',  // 2026-11-26, S11 bunch
  'src/utils/hiddenContent.js',  // 2026-11-26, S11 bunch
  'src/utils/itemStarsContent.js',  // 2026-11-26, S11 bunch
  'src/utils/libraryReportContent.js',  // 2026-11-26, S11 bunch
  'src/utils/ownerViewsContent.js',  // 2026-11-26, S11 bunch
  'src/utils/pageProblemsAdminContent.js',  // 2026-11-26, S11 bunch
  'src/utils/publicProfile.js',  // 2026-11-26, S11 bunch
  'src/utils/reportContent.js',  // 2026-11-26, S11 bunch
  'src/utils/reportsAdminContent.js',  // 2026-11-26, S11 bunch
  'src/utils/sharedGroup.js',  // 2026-11-26, S11 bunch
  'src/utils/sharedRoshetta.js',  // 2026-11-26, S11 bunch
  'src/utils/takedownAdminContent.js',  // 2026-11-26, S11 bunch
  'src/utils/viewCountContent.js',  // 2026-11-26, S11 bunch
  'src/hooks/useSearchHistory.js',  // 2026-11-26, S11 batch 2, now uses src/lib/userDataQueries.js
  'src/hooks/useRecentlyViewed.js',  // 2026-11-26, S11 batch 2, now uses src/lib/userDataQueries.js
  'src/hooks/useNotes.js',  // 2026-11-26, S11 batch 2, now uses src/lib/userDataQueries.js
  'src/hooks/usePushSubscription.js',  // 2026-11-26, S11 batch 2, now uses src/lib/userDataQueries.js
  'src/pages/admin/AdminSummary.jsx',  // 2026-11-26, S11 batch 2, now uses src/lib/userDataQueries.js
  'src/pages/admin/DrugEditor.jsx',  // 2026-11-26, S11 batch 2, now uses src/lib/userDataQueries.js
]

for (const file of MOVED) {
  test(`${file} does not import the Supabase client`, () => {
    const text = readFileSync(file, 'utf8')
    assert.doesNotMatch(text, /from\s+['"][./]*\/lib\/supabase['"]/)
    assert.doesNotMatch(text, /supabase\.(from|rpc|auth|storage|functions)\b/)
  })
}
