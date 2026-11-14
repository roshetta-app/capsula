/**
 * src/utils/sharedRoshetta.js
 * 2026-11-14 (Roshetta plan, step 6.2a): opens a shared roshetta from its link code for
 * the public page (SharedRoshettaScreen.jsx, step 6.2b). No sign-in is needed.
 * The rules are in roshettaSharedFetch.js; this binds the real database and the phone's
 * online signal to them. Same pattern as sharedGroup.js.
 *
 * fetchSharedRoshetta(code) answers { status: 'ok', roshetta: { name, description, rows } }
 * | { status: 'unavailable' } | { status: 'offline' } | { status: 'error' }.
 */

import { supabase } from '../lib/supabase'
import { loadSharedRoshetta } from './roshettaSharedFetch'

export function fetchSharedRoshetta(code) {
  return loadSharedRoshetta(code, {
    rpc: (fn, args) => supabase.rpc(fn, args),
    isOnline: () => !(typeof navigator !== 'undefined' && navigator.onLine === false),
  })
}
