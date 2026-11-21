/**
 * src/utils/roshettaShare.js
 * 2026-11-14 (Roshetta plan, step 6.1b): the database calls for a roshetta's share
 * link, in plain code that takes the database in (so it can be checked with a fake).
 * The hook (useRoshettas.js) adds the guards (signed in, online, read only, not sent
 * yet) and passes the real database and the time limit.
 *
 * Table roshetta_shares: roshetta_id (one live code per roshetta), share_code (the
 * database makes it), show_name, created_at. Stop sharing = delete the row; sharing again makes
 * a new code.
 *
 * 2026-11-21 (Phase L, step 13.5): show_name is the owner's choice for this link (true = the page
 * says "Created by <name>", false = anonymous, empty = follow the account setting), the same as
 * for groups. readShareCode returns it as showName, createShare can set it at insert, and
 * setShareName changes it later.
 *
 * Every function resolves { ok: true, ... } or { ok: false, reason }:
 *   offline   the request timed out (a Wi-Fi with no internet counts as offline)
 *   refused   the row rule said no (the roshetta is not on the server, or was deleted
 *             on another device, or the account is read only)
 *   error     anything else
 */

const TIMEOUT_CODE = 'request_timeout'
const TABLE = 'roshetta_shares'

// Postgres 42501 = refused by a row rule.
export function shareErrorReason(error) {
  if (error?.code === TIMEOUT_CODE) return 'offline'
  if (error?.code === '42501' || /row-level security/i.test(String(error?.message ?? ''))) return 'refused'
  return 'error'
}

// The live share code of this roshetta, or null when it is not shared. showName: true or false when
// the owner chose for this link, null when it follows the account setting (or there is no link).
export async function readShareCode(client, roshettaId, limit = x => x) {
  const { data, error } = await limit(client
    .from(TABLE)
    .select('share_code, show_name')
    .eq('roshetta_id', roshettaId)
    .maybeSingle())
  if (error) return { ok: false, reason: error.code === TIMEOUT_CODE ? 'offline' : 'error' }
  return { ok: true, code: data?.share_code ?? null, showName: typeof data?.show_name === 'boolean' ? data.show_name : null }
}

// Makes the link. created: true only when a new code was made now (an existing live
// code, from another phone or a double tap, comes back with created: false). showName (true or
// false) is the owner's choice for this link; anything else leaves it empty, so the account
// setting decides.
export async function createShare(client, roshettaId, limit = x => x, showName) {
  const { data, error } = await limit(client
    .from(TABLE)
    .insert(typeof showName === 'boolean' ? { roshetta_id: roshettaId, show_name: showName } : { roshetta_id: roshettaId })
    .select('share_code')
    .single())
  if (!error && data?.share_code) return { ok: true, code: data.share_code, created: true }
  if (error?.code === '23505') {
    const existing = await readShareCode(client, roshettaId, limit)
    if (existing.ok && existing.code) return { ok: true, code: existing.code, created: false }
    return { ok: false, reason: existing.ok ? 'error' : existing.reason }
  }
  return { ok: false, reason: error ? shareErrorReason(error) : 'error' }
}

// Stops sharing: the old link stops working at once.
export async function removeShare(client, roshettaId, limit = x => x) {
  const { error } = await limit(client.from(TABLE).delete().eq('roshetta_id', roshettaId))
  if (error) return { ok: false, reason: error.code === TIMEOUT_CODE ? 'offline' : 'error' }
  return { ok: true }
}

// The owner's choice for this link (true = show my name, false = anonymous). The database only lets
// the owner change it; a change that touched no row (not the owner, a read only account, or the link
// was stopped on another phone) comes back as 'refused'.
export async function setShareName(client, roshettaId, show, limit = x => x) {
  const { data, error } = await limit(client
    .from(TABLE)
    .update({ show_name: !!show })
    .eq('roshetta_id', roshettaId)
    .select('roshetta_id'))
  if (error) return { ok: false, reason: shareErrorReason(error) }
  if (!Array.isArray(data) || data.length === 0) return { ok: false, reason: 'refused' }
  return { ok: true }
}
