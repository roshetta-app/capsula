/**
 * src/utils/reportRules.js
 * 2026-11-22 (Public profile plan, step 14.9b): the plain rules and words for reporting a shared roshetta,
 * a shared drug group or a public profile. The database call is handed in, so everything here is checked
 * without a database or a screen (reportRules.check.js). reportContent.js binds the real one.
 *
 * Nothing in this file keeps anything on the phone.
 *
 * sendReport(kind, ref, reason, deps) answers one of:
 *   { status: 'ok' }            sent
 *   { status: 'already' }       this person already reported it
 *   { status: 'signed_out' }    not signed in
 *   { status: 'own' }           it is the person's own item or profile
 *   { status: 'cap' }           10 reports in a day already
 *   { status: 'gone' }          the link or profile no longer exists
 *   { status: 'offline' } | { status: 'error' }
 *
 *   kind    'roshetta' | 'group' | 'profile'
 *   ref     the share code (roshetta, group) or the username (profile)
 *   deps    { rpc: (fn, args) => Promise<{ data, error }>, isOnline: () => boolean, timeLimitMs? }
 */

import { withTimeLimit } from './roshettaLoad.js'

// Same list the database accepts. Medical first: it is the one that matters most.
export const REPORT_REASONS = [
  { key: 'medical', label: 'Wrong or dangerous medical content' },
  { key: 'impersonation', label: 'Pretending to be someone else' },
  { key: 'spam', label: 'Spam or advertising' },
  { key: 'inappropriate', label: 'Offensive or inappropriate' },
  { key: 'other', label: 'Something else' },
]

export const REPORT_WORDS = {
  link: 'Report',
  title: 'Report this',
  intro: 'What is wrong? We review reports as soon as we can. The person is not told who reported.',
  send: 'Send report',
  sending: 'Sending…',
  signIn: 'Sign in to send a report.',
  signInButton: 'Sign in',
  done: 'Done',
}

const KINDS = new Set(['roshetta', 'group', 'profile'])

export function isReason(key) {
  return REPORT_REASONS.some(r => r.key === key)
}

export function sheetTitle(kind) {
  if (kind === 'profile') return 'Report this profile'
  if (kind === 'group') return 'Report this drug group'
  return 'Report this roshetta'
}

// One short line per answer.
export function resultText(status) {
  switch (status) {
    case 'ok': return 'Thanks. Your report was sent.'
    case 'already': return 'You already reported this. Thanks.'
    case 'own': return 'This is yours, so it cannot be reported.'
    case 'cap': return 'You have sent many reports today. Try again tomorrow.'
    case 'gone': return 'This is no longer available.'
    case 'signed_out': return 'Sign in to send a report.'
    case 'offline': return 'You are offline. Reconnect and try again.'
    default: return 'Could not send the report. Try again.'
  }
}

// Sent, already sent and gone all end the sheet; the rest let the person try again.
export function endsSheet(status) {
  return status === 'ok' || status === 'already' || status === 'gone' || status === 'own'
}

export async function sendReport(kind, ref, reason, { rpc, isOnline, timeLimitMs }) {
  const r = typeof ref === 'string' ? ref.trim() : ''
  if (!KINDS.has(kind) || !r || !isReason(reason)) return { status: 'error' }
  if (!isOnline()) return { status: 'offline' }
  let res
  try {
    res = await withTimeLimit(rpc('report_shared', { p_kind: kind, p_ref: r, p_reason: reason }), timeLimitMs)
  } catch {
    return { status: 'error' }
  }
  if (res?.error) {
    const text = String(res.error.message ?? '')
    if (res.error.code === 'request_timeout') return { status: 'offline' }
    if (/not_signed_in/.test(text) || res.error.code === '42501') return { status: 'signed_out' }
    if (/report_own/.test(text)) return { status: 'own' }
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
