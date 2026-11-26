/**
 * src/utils/pageProblemsAdminContent.js
 * 2026-11-23 (Track I, step I5): binds the real database and the computer's online signal to the CMS
 * Page problems rules (pageProblemsAdmin.js). Same pattern as reportsAdminContent.js. Every call needs an
 * admin account; anyone else gets 'forbidden' from the database itself.
 */

import { callRpc } from '../lib/serverCalls'
import { loadPageProblems, loadPageProblemCount, runPageAction } from './pageProblemsAdmin'

const deps = () => ({
  rpc: callRpc,
  isOnline: () => !(typeof navigator !== 'undefined' && navigator.onLine === false),
})

export const fetchPageProblems = () => loadPageProblems(deps())
export const fetchPageProblemCount = () => loadPageProblemCount(deps())
export const actOnPageProblem = (action, row) => runPageAction(action, row, deps())
