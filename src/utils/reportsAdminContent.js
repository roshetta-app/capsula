/**
 * src/utils/reportsAdminContent.js
 * 2026-11-22 (step 14.9c-1): binds the real database and the computer's online signal to the CMS Reports
 * rules (reportsAdmin.js). Same pattern as reportContent.js. Every call needs an admin account; anyone
 * else gets 'forbidden' from the database itself. 14.9c-2 adds fetchPreview (admin_report_preview).
 */

import { callRpc } from '../lib/serverCalls'
import { loadReports, loadReportCount, runAction, loadPreview } from './reportsAdmin'

const deps = () => ({
  rpc: callRpc,
  isOnline: () => !(typeof navigator !== 'undefined' && navigator.onLine === false),
})

export const fetchReports = () => loadReports(deps())
export const fetchReportCount = () => loadReportCount(deps())
export const actOnReport = (action, row) => runAction(action, row, deps())
export const fetchPreview = (row) => loadPreview(row, deps())
