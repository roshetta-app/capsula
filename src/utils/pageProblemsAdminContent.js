/**
 * src/utils/pageProblemsAdminContent.js
 * 2026-11-23 (Track I, step I5): binds the real database and the computer's online signal to the CMS
 * Page problems rules (pageProblemsAdmin.js). Same pattern as reportsAdminContent.js. Every call needs an
 * admin account; anyone else gets 'forbidden' from the database itself.
 */

import { supabase } from '../lib/supabase'
import { loadPageProblems, loadPageProblemCount, runPageAction } from './pageProblemsAdmin'

const deps = () => ({
  rpc: (fn, args) => (args === undefined ? supabase.rpc(fn) : supabase.rpc(fn, args)),
  isOnline: () => !(typeof navigator !== 'undefined' && navigator.onLine === false),
})

export const fetchPageProblems = () => loadPageProblems(deps())
export const fetchPageProblemCount = () => loadPageProblemCount(deps())
export const actOnPageProblem = (action, row) => runPageAction(action, row, deps())
