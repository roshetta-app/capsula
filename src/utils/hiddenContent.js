/**
 * src/utils/hiddenContent.js
 * 2026-11-22 (step 14.9b-2): binds the real database and the phone's online signal to the owner-side rules
 * (hiddenRules.js). Same pattern as reportContent.js. Both calls need a signed-in person and only ever see
 * that person's own hidden things.
 */

import { supabase } from '../lib/supabase'
import { loadMyFlags, askForReview } from './hiddenRules'

const deps = () => ({
  rpc: (fn, args) => (args === undefined ? supabase.rpc(fn) : supabase.rpc(fn, args)),
  isOnline: () => !(typeof navigator !== 'undefined' && navigator.onLine === false),
})

export const loadFlags = () => loadMyFlags(deps())
export const requestReview = (kind, id) => askForReview(kind, id, deps())
