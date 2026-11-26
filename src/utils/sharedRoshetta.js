/**
 * src/utils/sharedRoshetta.js
 * 2026-11-14 (Roshetta plan, step 6.2a): opens a shared roshetta from its link code for
 * the public page (SharedRoshettaScreen.jsx, step 6.2b). No sign-in is needed.
 * The rules are in roshettaSharedFetch.js; this binds the real database and the phone's
 * online signal to them. Same pattern as sharedGroup.js.
 *
 * fetchSharedRoshetta(code) answers { status: 'ok', roshetta: { name, description, rows, specialtyId,
 * specialty, ownerName, createdAt, isOwner, ownId } } | { status: 'unavailable' } | { status: 'offline' }
 * | { status: 'error' }.
 *
 * 2026-11-21 (Phase L, step 13.5): the answer depends on who is asking (only the owner is told
 * isOwner and ownId), because the database call carries the signed-in person's session. The page
 * asks again after a sign-in.
 */

import { callRpc } from '../lib/serverCalls'
import { loadSharedRoshetta } from './roshettaSharedFetch'

export function fetchSharedRoshetta(code) {
  return loadSharedRoshetta(code, {
    rpc: callRpc,
    isOnline: () => !(typeof navigator !== 'undefined' && navigator.onLine === false),
  })
}
