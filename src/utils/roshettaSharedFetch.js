/**
 * src/utils/roshettaSharedFetch.js
 * 2026-11-14 (Roshetta plan, step 6.2a): the plain rules for opening a shared roshetta
 * from its link code, taking the database call in so they can be checked without a
 * database. sharedRoshetta.js binds the real database to loadSharedRoshetta.
 *
 * Reads only through the database function get_shared_roshetta(p_code), which anyone
 * (signed in or not) may call and which returns { name, description, rows, specialty } and
 * never a user id. The tables themselves are closed to the public.
 *
 * 2026-11-21 (Phase L, step 13.5): it also returns created_at, owner_name (only when the owner
 * chose to show their name on this link, or their account setting says so; otherwise empty) and,
 * only when the signed-in viewer is the owner, is_owner and own_id (the roshetta's own id). The
 * answer depends on who is asking, so the page asks again after a sign-in. readCredit (shareCredit.js)
 * picks exactly those four things; nothing else the database might add is passed on.
 *
 * loadSharedRoshetta(code, deps) answers one of:
 *   { status: 'ok', roshetta: { name, description, rows, specialtyId, specialty, ownerName, createdAt, isOwner, ownId } }
 *   { status: 'unavailable' }  wrong, short, stopped or deleted-roshetta link
 *                              (all the same answer, so nothing is revealed)
 *   { status: 'offline' }      the phone has no connection (or the database stayed silent)
 *   { status: 'error' }        the database could not be reached or failed
 *
 * Only the two row types a roshetta can hold ('drug' and 'plain_text') are kept. The
 * database already refuses anything else; this is a second guard on a public page, since
 * the sheet viewer would draw a 'free_text' row as raw HTML.
 */

import { ROSHETTA_ROW_TYPES } from './roshettaRows.js'
import { withTimeLimit } from './roshettaLoad.js'
import { specialtyFromShared } from './roshettaSpecialty.js'
import { readCredit } from './shareCredit.js'

// The database refuses codes shorter than this; no need to ask it.
export const MIN_CODE_LENGTH = 32

const KEPT_TYPES = new Set([ROSHETTA_ROW_TYPES.DRUG, ROSHETTA_ROW_TYPES.PLAIN_TEXT])

// Name, description, rows, the specialty and the credit (owner name, created day, owner flag) only;
// nothing else the database might ever add is passed on.
// 2026-11-16 (Phase I step 10.8): specialtyId is the specialty's own (public library) id, kept so
// Save a copy can give the copy the same specialty (null when none); specialty is the same thing in
// the picker's shape, for the header (null when none or not a proper specialty, so the default blue
// is shown).
export function mapSharedRoshetta(data) {
  const rows = Array.isArray(data.rows)
    ? data.rows.filter(r => r && typeof r === 'object' && KEPT_TYPES.has(r.row_type))
    : []
  const sp = data.specialty
  const specialtyId = sp && typeof sp === 'object' && !Array.isArray(sp) && typeof sp.id === 'string' && sp.id ? sp.id : null
  return {
    name: data.name,
    description: data.description ?? '',
    rows,
    specialtyId,
    specialty: specialtyFromShared(sp),
    ...readCredit(data),   // ownerName, createdAt, isOwner, ownId
  }
}

// deps: { rpc: (fn, args) => Promise<{ data, error }>, isOnline: () => boolean, timeLimitMs? }
export async function loadSharedRoshetta(code, { rpc, isOnline, timeLimitMs }) {
  const clean = typeof code === 'string' ? code.trim() : ''
  if (clean.length < MIN_CODE_LENGTH) return { status: 'unavailable' }
  if (!isOnline()) return { status: 'offline' }

  // No answer within the time limit counts as offline, so a Wi-Fi with no internet shows
  // the offline message with Try again, not a page that waits forever.
  let res
  try {
    res = await withTimeLimit(rpc('get_shared_roshetta', { p_code: clean }), timeLimitMs)
  } catch {
    return { status: 'error' }
  }
  if (res?.error) {
    if (res.error.code === 'request_timeout') return { status: 'offline' }
    if (!isOnline()) return { status: 'offline' }
    return { status: 'error' }
  }

  const data = res?.data
  if (!data || typeof data !== 'object' || Array.isArray(data) || typeof data.name !== 'string') {
    return { status: 'unavailable' }
  }
  return { status: 'ok', roshetta: mapSharedRoshetta(data) }
}
