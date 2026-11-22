/**
 * src/utils/publicProfileFetch.js
 * 2026-11-22 (Public profile plan, step 14.6): the plain rules for opening a public profile from its
 * username and for asking whether a username is free. The database call is handed in, so everything
 * here is checked without a database. publicProfile.js binds the real one.
 *
 * Nothing in this file keeps anything on the phone: no local storage, no session storage, no database
 * of the browser, no cache. Every open asks the database again, so a stopped link or a changed username
 * is never shown from an old copy. (The service worker already ignores other websites' requests, so it
 * never keeps these answers either.)
 *
 * loadPublicProfile(handle, deps) answers one of:
 *   { status: 'ok', profile: { handle, name, bio, avatarCode, redirected, isOwner,
 *       roshettas: { total, items: { name, drugCount, createdAt, code }[] },
 *       groups:    { total, items: { name, drugCount, createdAt, code, color }[] } } }
 *   { status: 'not_found' }   no such profile, an old username with forwarding off, a removed one, or a
 *                             badly written one: all the same answer, so nothing is revealed
 *   { status: 'hidden' }      hidden after a report (14.9): the page says "Not available"; the owner never gets this
 *   { status: 'too_many' }    too many failed tries from this connection; wait a few minutes
 *   { status: 'offline' }     the phone has no connection (or the database stayed silent)
 *   { status: 'error' }       the database could not be reached or failed
 *
 * checkHandleAvailable(handle, deps) answers one of:
 *   { status: 'available' } | { status: 'taken' }   (taken also covers reserved, blocked, badly written)
 *   { status: 'too_many' }   about 30 checks a minute per account
 *   { status: 'signed_out' } | { status: 'offline' } | { status: 'error' }
 *
 * deps: { rpc: (fn, args) => Promise<{ data, error }>, isOnline: () => boolean, timeLimitMs? }
 */

import { withTimeLimit } from './roshettaLoad.js'

const clean = (v) => (typeof v === 'string' ? v : '')
const count = (v) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Math.floor(Number(v)) : 0)

function mapItems(list, withColor) {
  return (Array.isArray(list) ? list : [])
    .filter(i => i && typeof i === 'object' && typeof i.name === 'string' && typeof i.share_code === 'string' && i.share_code)
    .map(i => ({
      name: i.name,
      drugCount: count(i.drug_count),
      createdAt: typeof i.created_at === 'string' ? i.created_at : null,
      code: i.share_code,
      ...(withColor ? { color: typeof i.color === 'string' ? i.color : null } : {}),
    }))
}

// Only the fields a public profile shows are kept; a user id (which the database never sends) or any
// future field is not passed on.
export function mapPublicProfile(data) {
  const section = (s, withColor) => ({
    total: count(s?.total),
    items: mapItems(s?.items, withColor),
  })
  return {
    handle: clean(data.handle),
    name: clean(data.name),
    bio: clean(data.bio),
    avatarCode: typeof data.avatar_code === 'string' && data.avatar_code ? data.avatar_code : null,
    redirected: data.redirected === true,
    isOwner: data.is_owner === true,
    hidden: data.hidden === true,   // only ever sent to the owner of a hidden profile
    roshettas: section(data.roshettas, false),
    groups: section(data.groups, true),
  }
}

export async function loadPublicProfile(handle, { rpc, isOnline, timeLimitMs }) {
  const h = typeof handle === 'string' ? handle.trim() : ''
  if (!h) return { status: 'not_found' }
  if (!isOnline()) return { status: 'offline' }
  let res
  try {
    res = await withTimeLimit(rpc('get_public_profile', { p_handle: h }), timeLimitMs)
  } catch {
    return { status: 'error' }
  }
  if (res?.error) {
    if (res.error.code === 'request_timeout') return { status: 'offline' }
    if (!isOnline()) return { status: 'offline' }
    return { status: 'error' }
  }
  const data = res?.data
  if (!data || typeof data !== 'object' || Array.isArray(data)) return { status: 'error' }
  if (data.status === 'too_many') return { status: 'too_many' }
  if (data.status === 'hidden') return { status: 'hidden' }
  if (data.status === 'ok' && typeof data.handle === 'string') return { status: 'ok', profile: mapPublicProfile(data) }
  return { status: 'not_found' }
}

export async function checkHandleAvailable(handle, { rpc, isOnline, timeLimitMs }) {
  const h = typeof handle === 'string' ? handle.trim() : ''
  if (!h) return { status: 'taken' }
  if (!isOnline()) return { status: 'offline' }
  let res
  try {
    res = await withTimeLimit(rpc('handle_available', { p_handle: h }), timeLimitMs)
  } catch {
    return { status: 'error' }
  }
  if (res?.error) {
    const text = String(res.error.message ?? '')
    if (res.error.code === 'request_timeout') return { status: 'offline' }
    if (/too_many/.test(text)) return { status: 'too_many' }
    if (/not_signed_in/.test(text) || res.error.code === '42501') return { status: 'signed_out' }
    if (!isOnline()) return { status: 'offline' }
    return { status: 'error' }
  }
  const status = res?.data?.status
  if (status === 'available' || status === 'taken') return { status }
  return { status: 'error' }
}
