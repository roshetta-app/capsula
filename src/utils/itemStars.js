/**
 * src/utils/itemStars.js
 * 2026-11-23 (Track H, step H7): the Star button on a shared roshetta and a shared drug group.
 * A signed-in person (not the owner) stars or un-stars an item through its public link. The number of stars is
 * public; WHO starred is never sent to the app (the database holds the list and nobody can read it).
 * The database call is handed in, so everything here is checked without a database or a screen (itemStars.check.js).
 *
 * The database facts this relies on (Migration 10, stars_h7):
 *   star_item(p_kind, p_code, p_on)  { status: 'ok', starred, stars } | { status: 'not_found' | 'own_item' | 'capped' | 'not_signed_in' }
 *   the shared roshetta / group answer, and each profile card, may carry stars (a number); the shared answer also
 *   carries starred (true only for the person asking). An answer WITHOUT stars (the database not changed yet)
 *   shows no star at all: not knowing is not zero.
 *
 * Nothing here keeps anything on the phone. A guest who taps the star signs in first; the tap is finished by itself
 * afterwards (the same waiting request the Save a copy button uses, with its own id).
 */

import { withTimeLimit } from './roshettaLoad.js'
import { formatCount, starsLine } from './ownerViews.js'

export { starsLine }

const KINDS = new Set(['roshetta', 'group'])
export const STAR_SIGN_IN_PREFIX = 'rstar:'

export const STAR_WORDS = {
  starLabel: 'Star this',
  unstarLabel: 'Starred. Tap to remove',
  capped: 'You have starred a lot today. Try again tomorrow.',
  offline: 'You are offline. Try again when you are back online.',
  error: "Couldn't update the star. Try again.",
  unavailable: 'This link is no longer available.',
}

export function starSignInId(code) { return `${STAR_SIGN_IN_PREFIX}${code}` }
export function isStarRequest(pending, code) {
  return !!pending && pending.type === 'groups' && pending.id === starSignInId(code)
}

// A whole number of stars, or null when the answer has none (never negative).
export function wholeStars(value) {
  const n = typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value
  if (typeof n !== 'number' || !Number.isFinite(n) || n < 0) return null
  return Math.floor(n)
}

// From a shared answer: { stars: number | null, starred: boolean }. starred is true only when the answer says so.
export function readStars(raw) {
  const r = raw && typeof raw === 'object' ? raw : {}
  const stars = wholeStars(r.stars)
  return { stars, starred: stars !== null && r.starred === true }
}

// "13" for the button and the card; nothing at zero or when not known.
export function starCountText(stars) {
  const n = wholeStars(stars)
  return n === null || n === 0 ? '' : formatCount(n)
}

// What the screen shows at once after a tap, before the database answers.
export function afterTap(current, on) {
  const stars = wholeStars(current?.stars) ?? 0
  const was = current?.starred === true
  if (on === was) return { stars, starred: was }
  return { stars: on ? stars + 1 : Math.max(0, stars - 1), starred: on }
}

export function starNotice(status) {
  if (status === 'capped') return STAR_WORDS.capped
  if (status === 'offline') return STAR_WORDS.offline
  if (status === 'unavailable') return STAR_WORDS.unavailable
  return STAR_WORDS.error
}

function failureStatus(error, isOnline) {
  const text = String(error?.message ?? '')
  if (error?.code === 'request_timeout') return 'offline'
  if (/not_signed_in/.test(text) || error?.code === '42501') return 'signed_out'
  if (!isOnline()) return 'offline'
  return 'error'
}

// => { status: 'ok', starred, stars } | { status: 'signed_out' | 'unavailable' | 'own' | 'capped' | 'offline' | 'error' }
//   deps  { rpc: (fn, args) => Promise<{ data, error }>, isOnline: () => boolean, timeLimitMs? }
export async function sendStar(kind, code, on, { rpc, isOnline, timeLimitMs }) {
  const target = typeof code === 'string' ? code.trim() : ''
  if (!KINDS.has(kind) || !target || typeof on !== 'boolean') return { status: 'error' }
  if (!isOnline()) return { status: 'offline' }
  let res
  try {
    res = await withTimeLimit(rpc('star_item', { p_kind: kind, p_code: target, p_on: on }), timeLimitMs)
  } catch {
    return { status: 'error' }
  }
  if (res?.error) return { status: failureStatus(res.error, isOnline) }
  const d = res?.data
  if (d?.status === 'not_signed_in') return { status: 'signed_out' }
  if (d?.status === 'not_found') return { status: 'unavailable' }
  if (d?.status === 'own_item') return { status: 'own' }
  if (d?.status === 'capped') return { status: 'capped' }
  const stars = wholeStars(d?.stars)
  if (d?.status === 'ok' && stars !== null && typeof d.starred === 'boolean') return { status: 'ok', starred: d.starred, stars }
  return { status: 'error' }
}
