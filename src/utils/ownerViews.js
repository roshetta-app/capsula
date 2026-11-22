/**
 * src/utils/ownerViews.js
 * 2026-11-23 (Track H, step H4): the owner's own view numbers. On the person's own roshetta page, drug group
 * page and Profile tab, a small box says how many unique views their public link has had (total, and the last
 * 7 days). Only the owner ever reads these: the database answers a stranger or a guest with nothing.
 * The database call is handed in, so everything here is checked without a database or a screen
 * (ownerViews.check.js). ownerViewsContent.js binds the real one.
 *
 * Nothing in this file keeps anything on the phone. The numbers live in the page's memory only and are asked
 * again every time the page shows.
 *
 * 2026-11-23 (Track H, step H6): an item's answer may also carry saved, the number of OTHER people who hold a
 * copy made from the item's current link (Migration 9). Only a number: never who. An answer without it (the
 * database not changed yet, or the profile total) simply shows no "Saved by" line.
 *
 * The database facts this relies on (Migration 8, view_counts_h2):
 *   owner_item_views(p_kind, p_id)  { status: 'ok', total, last7 } for the caller's own roshetta or group;
 *                                   { status: 'not_found' } for anything else (stranger, unknown id, bad kind);
 *                                   { status: 'not_signed_in' } for a guest
 *   owner_profile_views()           { status: 'ok', total, last7 } summed over the caller's own items
 *                                   (items made private since keep their history); { status: 'not_signed_in' }
 *
 * loadItemViews(kind, id, deps)  => { status: 'ok', total, last7 } | { status: 'offline' | 'signed_out' | 'error' }
 * loadProfileViews(deps)         => the same
 *   deps  { rpc: (fn, args?) => Promise<{ data, error }>, isOnline: () => boolean, timeLimitMs? }
 */

import { withTimeLimit } from './roshettaLoad.js'

const ITEM_KINDS = new Set(['roshetta', 'group'])

export const VIEW_WORDS = {
  noViews: 'No views yet',
  noViewsLine: 'Views are counted when someone opens your link.',
  last7: 'in the last 7 days',
  approximate: 'approximate',
  savedOne: 'Saved by 1 person',
  savedMany: 'people',
  profileTotalLabel: 'Unique views',
  profileLast7Label: 'Last 7 days',
  profileNote: 'Approximate. Only you see these numbers.',
}

// A count the screen can trust: a whole number, never negative. Anything else is not a number we show.
function wholeCount(value) {
  const n = typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value
  if (typeof n !== 'number' || !Number.isFinite(n) || n < 0) return null
  return Math.floor(n)
}

// Thousands separated with a comma, the same on every phone (no locale, so no Arabic digits by surprise).
export function formatCount(n) {
  const whole = wholeCount(n)
  if (whole === null) return '0'
  return String(whole).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

// The database answer as { total, last7 } (plus saved when the answer has a real count of copies), or null when
// it is not an ok answer with two real counts. The last 7 days can never be more than the total, so a larger
// figure is cut down to it.
export function parseViews(data) {
  if (!data || typeof data !== 'object' || data.status !== 'ok') return null
  const total = wholeCount(data.total)
  const last7 = wholeCount(data.last7)
  if (total === null || last7 === null) return null
  const out = { total, last7: Math.min(last7, total) }
  const saved = wholeCount(data.saved)
  if (saved !== null) out.saved = saved
  return out
}

// "Saved by 3 people"; nothing when nobody has saved a copy or the number is not known.
export function savedLine(saved) {
  const n = wholeCount(saved)
  if (n === null || n === 0) return null
  return n === 1 ? VIEW_WORDS.savedOne : `Saved by ${formatCount(n)} ${VIEW_WORDS.savedMany}`
}

// What the item box says. A new link (no views at all) reads "No views yet" and one short line.
export function itemViewsLines(views) {
  if (!views) return null
  const saved = savedLine(views.saved)
  let lines
  if (views.total === 0) {
    lines = { empty: true, title: VIEW_WORDS.noViews, sub: VIEW_WORDS.noViewsLine }
  } else {
    const noun = views.total === 1 ? 'unique view' : 'unique views'
    lines = {
      empty: false,
      title: `${formatCount(views.total)} ${noun}`,
      sub: `${formatCount(views.last7)} ${VIEW_WORDS.last7} · ${VIEW_WORDS.approximate}`,
    }
  }
  // A third line only when someone has saved a copy; the key is left out otherwise.
  return saved ? { ...lines, saved } : lines
}

// The two tiles on the Profile tab.
export function profileTiles(views) {
  if (!views) return null
  return [
    { label: VIEW_WORDS.profileTotalLabel, value: formatCount(views.total) },
    { label: VIEW_WORDS.profileLast7Label, value: formatCount(views.last7) },
  ]
}

function failureStatus(error, isOnline) {
  const text = String(error?.message ?? '')
  if (error?.code === 'request_timeout') return 'offline'
  if (/not_signed_in/.test(text) || error?.code === '42501') return 'signed_out'
  if (!isOnline()) return 'offline'
  return 'error'
}

async function run(call, { isOnline, timeLimitMs }) {
  if (!isOnline()) return { status: 'offline' }
  let res
  try {
    res = await withTimeLimit(call(), timeLimitMs)
  } catch {
    return { status: 'error' }
  }
  if (res?.error) return { status: failureStatus(res.error, isOnline) }
  if (res?.data?.status === 'not_signed_in') return { status: 'signed_out' }
  const views = parseViews(res?.data)
  // 'not_found' (not the owner's item, or already gone) and anything unreadable show nothing: an error, not a zero.
  return views ? { status: 'ok', ...views } : { status: 'error' }
}

export async function loadItemViews(kind, id, deps) {
  const target = typeof id === 'string' ? id.trim() : ''
  if (!ITEM_KINDS.has(kind) || !target) return { status: 'error' }
  return run(() => deps.rpc('owner_item_views', { p_kind: kind, p_id: target }), deps)
}

export async function loadProfileViews(deps) {
  return run(() => deps.rpc('owner_profile_views'), deps)
}
