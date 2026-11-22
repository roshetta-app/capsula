/**
 * src/utils/takedownAdminContent.js
 * 2026-11-22 (step 14.9c-4b): binds the real database and the computer's online signal to the takedown rules
 * (takedownAdmin.js). Same pattern as reportsAdminContent.js. Every call needs an admin account; anyone else gets
 * 'forbidden' from the database itself.
 */

import { supabase } from '../lib/supabase'
import { loadSharingOff, runTakedown } from './takedownAdmin'

const deps = () => ({
  rpc: (fn, args) => (args === undefined ? supabase.rpc(fn) : supabase.rpc(fn, args)),
  listProfiles: (ids) => supabase.from('profiles').select('id, full_name, handle').in('id', ids),
  isOnline: () => !(typeof navigator !== 'undefined' && navigator.onLine === false),
})

export const fetchSharingOff = () => loadSharingOff(deps())
export const runTakedownAction = (action, profileId) => runTakedown(action, profileId, deps())
