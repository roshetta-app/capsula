/**
 * src/utils/hiddenRules.js
 * 2026-11-22 (Public profile plan, step 14.9b-2): the owner's side of a report. When one of the person's own
 * roshettas, drug groups or their public profile was hidden after reports (or by the admin), their own page
 * says so, and they can ask for one review. The database call is handed in, so everything here is checked
 * without a database or a screen (hiddenRules.check.js). hiddenContent.js binds the real one.
 *
 * Nothing in this file keeps anything on the phone, and nothing here ever holds who reported or what they
 * wrote: the database never sends it. The notice shows a fixed sentence only.
 *
 * The database facts this relies on (Migration 4):
 *   my_flags()                 rows { kind, id, name, appeal_used, stays_hidden } for the caller's own hidden
 *                              things only; a row exists only while the thing is hidden (restoring removes it)
 *   appeal_hidden(p_kind,p_id) one appeal per hidden thing; refuses with 'appeal_unavailable' the second time
 *                              and 'not_signed_in' when signed out
 *
 * loadMyFlags(deps)                => { status: 'ok', flags } | { status: 'offline' | 'signed_out' | 'error' }
 * askForReview(kind, id, deps)     => { status: 'ok' | 'unavailable' | 'signed_out' | 'offline' | 'error' }
 *   deps  { rpc: (fn, args?) => Promise<{ data, error }>, isOnline: () => boolean, timeLimitMs? }
 */

import { withTimeLimit } from './roshettaLoad.js'

const KINDS = new Set(['roshetta', 'group', 'profile'])

export const HIDDEN_WORDS = {
  hiddenTitle: 'Hidden after a report',
  hiddenBody: {
    roshetta: 'Others cannot open its link. You can still open and edit it yourself.',
    group: 'Others cannot open its link. You can still open and edit it yourself.',
    profile: 'Others cannot open your profile or its links. Your items stay yours.',
  },
  ask: 'Ask for review',
  asking: 'Sending…',
  requestedTitle: 'Review requested',
  requestedBody: 'We review requests as soon as we can.',
  finalTitle: 'Stays hidden after review',
  finalBody: 'This decision is final.',
}

// Only well-formed rows are kept, and only the four facts the screens need (the name is dropped on purpose).
export function parseFlags(data) {
  if (!Array.isArray(data)) return []
  const out = []
  for (const row of data) {
    if (!row || typeof row !== 'object') continue
    if (!KINDS.has(row.kind)) continue
    if (typeof row.id !== 'string' || !row.id) continue
    out.push({ kind: row.kind, id: row.id, appealUsed: row.appeal_used === true, staysHidden: row.stays_hidden === true })
  }
  return out
}

export function findFlag(flags, kind, id) {
  if (!Array.isArray(flags) || !kind || !id) return null
  return flags.find(f => f.kind === kind && f.id === id) ?? null
}

// What the notice shows for one flag: its state, two lines and whether the button is offered.
export function noticeFor(kind, flag) {
  if (!flag) return null
  if (flag.staysHidden) {
    return { state: 'final', title: HIDDEN_WORDS.finalTitle, body: HIDDEN_WORDS.finalBody, canAsk: false }
  }
  if (flag.appealUsed) {
    return { state: 'requested', title: HIDDEN_WORDS.requestedTitle, body: HIDDEN_WORDS.requestedBody, canAsk: false }
  }
  return {
    state: 'hidden',
    title: HIDDEN_WORDS.hiddenTitle,
    body: HIDDEN_WORDS.hiddenBody[kind] ?? HIDDEN_WORDS.hiddenBody.roshetta,
    canAsk: true,
  }
}

function failureStatus(error, isOnline) {
  const text = String(error?.message ?? '')
  if (error?.code === 'request_timeout') return 'offline'
  if (/not_signed_in/.test(text) || error?.code === '42501') return 'signed_out'
  if (/appeal_unavailable/.test(text)) return 'unavailable'
  if (!isOnline()) return 'offline'
  return 'error'
}

export async function loadMyFlags({ rpc, isOnline, timeLimitMs }) {
  if (!isOnline()) return { status: 'offline' }
  let res
  try {
    res = await withTimeLimit(rpc('my_flags'), timeLimitMs)
  } catch {
    return { status: 'error' }
  }
  if (res?.error) {
    const status = failureStatus(res.error, isOnline)
    return { status: status === 'unavailable' ? 'error' : status }
  }
  return { status: 'ok', flags: parseFlags(res?.data) }
}

export async function askForReview(kind, id, { rpc, isOnline, timeLimitMs }) {
  const target = typeof id === 'string' ? id.trim() : ''
  if (!KINDS.has(kind) || !target) return { status: 'error' }
  if (!isOnline()) return { status: 'offline' }
  let res
  try {
    res = await withTimeLimit(rpc('appeal_hidden', { p_kind: kind, p_id: target }), timeLimitMs)
  } catch {
    return { status: 'error' }
  }
  if (res?.error) return { status: failureStatus(res.error, isOnline) }
  return { status: 'ok' }
}

// One short line per answer, shown under the notice after a try.
export function reviewResultText(status) {
  switch (status) {
    case 'ok': return 'Review requested.'
    case 'unavailable': return 'A review was already requested.'
    case 'signed_out': return 'Sign in to ask for a review.'
    case 'offline': return 'You are offline. Reconnect and try again.'
    default: return 'Could not send the request. Try again.'
  }
}
