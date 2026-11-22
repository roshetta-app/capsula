/**
 * src/utils/libraryReportRules.js
 * 2026-11-22 (Track I, step I3): the plain rules and words for reporting a problem on one of Capsula's
 * own pages: a Topic, a brand drug page or a generic drug page. Mirrors reportRules.js, but this is a
 * different job: a library report never hides anything and only ever reaches the admin. The database
 * call is handed in, so everything here is checked without a database or a screen
 * (libraryReportRules.check.js). Nothing in this file keeps anything on the phone.
 *
 * sendLibraryReport(kind, slug, reason, note, deps) answers one of:
 *   { status: 'ok' }            sent
 *   { status: 'already' }       this person already has an open report on this page
 *   { status: 'signed_out' }    not signed in
 *   { status: 'cap' }           10 reports in a day already (shared with the other report kinds)
 *   { status: 'gone' }          the page is no longer available online
 *   { status: 'offline' } | { status: 'error' }
 *
 *   kind    'topic' | 'brand' | 'generic'
 *   slug    the page's own slug (topic slug, brand slug, generic slug)
 *   reason  one key of LIBRARY_REASONS
 *   note    optional plain text, cleaned here (trimmed, cut at 300 letters, blank becomes nothing)
 *   deps    { rpc: (fn, args) => Promise<{ data, error }>, isOnline: () => boolean, timeLimitMs? }
 */

import { withTimeLimit } from './roshettaLoad.js'

// Same list the database accepts for the three page kinds. Dose first: it is the one that matters most.
export const LIBRARY_REASONS = [
  { key: 'wrong_dose', label: 'Wrong dose or strength' },
  { key: 'wrong_info', label: 'Other wrong information' },
  { key: 'missing', label: 'Something is missing' },
  { key: 'typo', label: 'Typing or wording mistake' },
  { key: 'broken', label: 'Something is broken on this page' },
  { key: 'other', label: 'Something else' },
]

// The reasons that sort to the top of the admin screen (red edge). Same rule as the database (has_dose).
export const URGENT_REASONS = ['wrong_dose']

export const NOTE_MAX = 300

export const LIBRARY_REPORT_WORDS = {
  link: 'Report a problem',
  intro: 'What is wrong on this page? We review reports as soon as we can.',
  noteLabel: 'Tell us more (optional)',
  notePlaceholder: 'What is wrong, and what should it say?',
  send: 'Send report',
  sending: 'Sending…',
  signIn: 'Sign in to send a report.',
  signInButton: 'Sign in',
  done: 'Done',
}

const KINDS = new Set(['topic', 'brand', 'generic'])

export function isLibraryKind(kind) {
  return KINDS.has(kind)
}

export function isLibraryReason(key) {
  return LIBRARY_REASONS.some(r => r.key === key)
}

export function isUrgentReason(key) {
  return URGENT_REASONS.includes(key)
}

// Urgent reasons first, then the list's own order. Used when a screen shows several reasons together.
export function sortReasons(keys) {
  const list = Array.isArray(keys) ? keys.filter(isLibraryReason) : []
  const rank = k => LIBRARY_REASONS.findIndex(r => r.key === k)
  return [...new Set(list)].sort((a, b) => (isUrgentReason(b) - isUrgentReason(a)) || (rank(a) - rank(b)))
}

export function reasonLabel(key) {
  return LIBRARY_REASONS.find(r => r.key === key)?.label ?? ''
}

export function sheetTitle(kind) {
  if (kind === 'topic') return 'Report a problem with this topic'
  if (kind === 'generic') return 'Report a problem with this drug'
  return 'Report a problem with this brand'
}

// Plain text only, stored as typed. Trim, cut at 300 letters (counted as letters, not as code units, like the
// database), and a blank note is nothing. Links and tags stay as plain characters; nothing is removed or changed.
export function cleanNote(text) {
  if (typeof text !== 'string') return null
  const t = text.trim()
  if (!t) return null
  const letters = Array.from(t)
  return letters.length > NOTE_MAX ? letters.slice(0, NOTE_MAX).join('') : t
}

// For the counter under the note box: how many letters are used, and how many are left (never below zero).
export function noteCounter(text) {
  const used = typeof text === 'string' ? Array.from(text).length : 0
  return { used, left: Math.max(0, NOTE_MAX - used), max: NOTE_MAX }
}

// One short line per answer.
export function resultText(status) {
  switch (status) {
    case 'ok': return 'Thanks. Your report was sent.'
    case 'already': return 'You already reported this. Thanks.'
    case 'cap': return 'You have sent many reports today. Try again tomorrow.'
    case 'gone': return 'This page is no longer available.'
    case 'signed_out': return 'Sign in to send a report.'
    case 'offline': return 'You are offline. Reconnect and try again.'
    default: return 'Could not send the report. Try again.'
  }
}

// Sent, already sent and gone all end the sheet; the rest let the person try again.
export function endsSheet(status) {
  return status === 'ok' || status === 'already' || status === 'gone'
}

export async function sendLibraryReport(kind, slug, reason, note, { rpc, isOnline, timeLimitMs }) {
  const s = typeof slug === 'string' ? slug.trim() : ''
  if (!KINDS.has(kind) || !s || !isLibraryReason(reason)) return { status: 'error' }
  if (!isOnline()) return { status: 'offline' }
  let res
  try {
    res = await withTimeLimit(
      rpc('report_library', { p_kind: kind, p_slug: s, p_reason: reason, p_note: cleanNote(note) }),
      timeLimitMs,
    )
  } catch {
    return { status: 'error' }
  }
  if (res?.error) {
    const text = String(res.error.message ?? '')
    if (res.error.code === 'request_timeout') return { status: 'offline' }
    if (/not_signed_in/.test(text) || res.error.code === '42501') return { status: 'signed_out' }
    if (/report_cap/.test(text)) return { status: 'cap' }
    if (/report_not_found/.test(text)) return { status: 'gone' }
    if (!isOnline()) return { status: 'offline' }
    return { status: 'error' }
  }
  const d = res?.data
  if (d === 'ok') return { status: 'ok' }
  if (d === 'already') return { status: 'already' }
  return { status: 'error' }
}
