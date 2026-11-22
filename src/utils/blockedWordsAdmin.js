/**
 * src/utils/blockedWordsAdmin.js
 * 2026-11-22 (Public profile plan, step 14.9c-3): the plain rules and words for the CMS Blocked words screen
 * (/admin/blocked-words): the list of words that may not appear in a public name or username, and the people
 * already flagged because their name or username contains a word. The database calls are handed in, so
 * everything here is checked without a database or a screen (blockedWordsAdmin.check.js).
 * blockedWordsAdminContent.js binds the real ones.
 *
 * The database facts this relies on (Migration 1, nothing new is needed):
 *   blocked_words        admin only (row rules); adding or changing a word keeps its flat form up to date
 *                        and flags every person whose name or username contains it; renames nobody
 *   profile_name_flags   admin only; one row per person and word; deleting a word removes its flags
 *   profile_name_blocked a new or edited name containing a listed word is refused for everyone, live
 * Matching ignores capitals, spaces, dots, dashes, accents and Arabic letter variants, and also matches
 * inside longer words, so a short word flags more people.
 *
 * Adding or removing a word and clearing a person's flags are written to the Audit Log from the app
 * (logAudit, fire and forget: a broken audit line never turns a done change into a failure).
 * Nothing in this file keeps anything on the phone or the computer.
 */

import { withTimeLimit } from './roshettaLoad.js'

export const WORD_MAX = 40
const WORD_MIN = 2

export const BLOCKED_WORDS_WORDS = {
  title: 'Blocked words',
  wordsHeading: 'Blocked words',
  flagsHeading: 'Flagged profiles',
  addLabel: 'Add a word',
  addButton: 'Add',
  addHelp: 'A new word is checked against every existing name and username: profiles containing it are flagged below, nobody is renamed. It also matches inside longer words, so keep it specific.',
  wordsEmpty: 'No blocked words yet.',
  flagsEmpty: 'No flagged profiles',
  flagsEmptyLine: 'People whose name or username contains a blocked word appear here.',
  loadError: 'Could not load the blocked words.',
  forbidden: 'This screen is for admin accounts only.',
  offline: 'You are offline. Reconnect and try again.',
}

const text = (v) => (typeof v === 'string' ? v.trim() : '')
const ts = (v) => { const n = Date.parse(v); return Number.isFinite(n) ? n : 0 }

// Only well-formed rows, newest first as the database sends them.
export function parseWords(data) {
  if (!Array.isArray(data)) return []
  const out = []
  for (const r of data) {
    if (!r || typeof r !== 'object') continue
    if (!Number.isInteger(r.id)) continue
    const word = text(r.word)
    if (!word) continue
    out.push({ id: r.id, word })
  }
  return out
}

// One entry per flagged person with the words that matched them; only name, handle and words are kept
// (nothing else the database might send about the person), newest flag first.
export function parseFlags(data, words) {
  if (!Array.isArray(data)) return []
  const byId = new Map((Array.isArray(words) ? words : []).map((w, i) => [w.id, { word: w.word, order: i }]))
  const people = new Map()
  for (const r of data) {
    if (!r || typeof r !== 'object') continue
    if (typeof r.profile_id !== 'string' || !r.profile_id) continue
    if (!Number.isInteger(r.word_id)) continue
    const p = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles
    let e = people.get(r.profile_id)
    if (!e) {
      e = {
        profileId: r.profile_id,
        name: text(p?.full_name) || null,
        handle: text(p?.handle) || null,
        wordKeys: new Map(),
        latest: 0,
      }
      people.set(r.profile_id, e)
    }
    const w = byId.get(r.word_id)
    if (w) e.wordKeys.set(r.word_id, w)
    e.latest = Math.max(e.latest, ts(r.created_at))
  }
  return [...people.values()]
    .sort((a, b) => b.latest - a.latest)
    .map(e => ({
      profileId: e.profileId,
      name: e.name,
      handle: e.handle,
      words: [...e.wordKeys.values()].sort((a, b) => a.order - b.order).map(w => w.word),
    }))
}

// What the person typed, checked before the database is asked. The database also flattens the word and
// refuses one with fewer than two letters left ('blocked_word_too_short'); that answer is handled below.
export function checkNewWord(raw) {
  const word = text(raw)
  if (!word) return { ok: false, reason: 'empty' }
  const length = [...word].length
  if (length < WORD_MIN) return { ok: false, reason: 'short' }
  if (length > WORD_MAX) return { ok: false, reason: 'long' }
  return { ok: true, word }
}

function failureStatus(error, isOnline) {
  const msg = String(error?.message ?? '')
  if (error?.code === 'request_timeout') return 'offline'
  if (error?.code === '42501' || /row-level security|permission denied|forbidden/i.test(msg)) return 'forbidden'
  if (!isOnline()) return 'offline'
  return 'error'
}

async function audit(deps, ...args) {
  try { await deps.audit(...args) } catch { /* a broken audit line never blocks a change that is done */ }
}

export async function loadBlockedWords(deps) {
  const { listWords, listFlags, isOnline, timeLimitMs } = deps
  if (!isOnline()) return { status: 'offline' }
  const [w, f] = await Promise.all([
    withTimeLimit(listWords(), timeLimitMs),
    withTimeLimit(listFlags(), timeLimitMs),
  ])
  const bad = w?.error ? w : f?.error ? f : null
  if (bad) return { status: failureStatus(bad.error, isOnline) }
  const words = parseWords(w?.data)
  return { status: 'ok', words, flags: parseFlags(f?.data, words) }
}

export async function addBlockedWord(raw, deps) {
  const { addWord, isOnline, timeLimitMs } = deps
  const checked = checkNewWord(raw)
  if (!checked.ok) return { status: checked.reason }
  if (!isOnline()) return { status: 'offline' }
  const res = await withTimeLimit(addWord(checked.word), timeLimitMs)
  if (res?.error) {
    const e = res.error
    const msg = String(e.message ?? '')
    if (e.code === '23505' || /duplicate key|unique/i.test(msg)) return { status: 'duplicate' }
    if (/blocked_word_too_short/.test(msg)) return { status: 'short' }
    return { status: failureStatus(e, isOnline) }
  }
  const row = res?.data
  if (!row || !Number.isInteger(row.id)) return { status: 'error' }
  await audit(deps, 'create', 'blocked_words', String(row.id), text(row.word) || checked.word)
  return { status: 'ok' }
}

export async function removeBlockedWord(word, deps) {
  const { removeWord, isOnline, timeLimitMs } = deps
  if (!word || !Number.isInteger(word.id)) return { status: 'error' }
  if (!isOnline()) return { status: 'offline' }
  const res = await withTimeLimit(removeWord(word.id), timeLimitMs)
  if (res?.error) return { status: failureStatus(res.error, isOnline) }
  if (!Array.isArray(res?.data) || res.data.length === 0) return { status: 'gone' }
  await audit(deps, 'delete', 'blocked_words', String(word.id), text(word.word) || null)
  return { status: 'ok' }
}

// Clears the flags on one person. The word stays blocked and the person keeps their name and username.
export async function dismissFlags(flag, deps) {
  const { dismissFlags: clear, isOnline, timeLimitMs } = deps
  if (!flag || typeof flag.profileId !== 'string' || !flag.profileId) return { status: 'error' }
  if (!isOnline()) return { status: 'offline' }
  const res = await withTimeLimit(clear(flag.profileId), timeLimitMs)
  if (res?.error) return { status: failureStatus(res.error, isOnline) }
  if (!Array.isArray(res?.data) || res.data.length === 0) return { status: 'gone' }
  await audit(deps, 'dismiss', 'profile_name_flags', flag.profileId, text(flag.name) || null)
  return { status: 'ok' }
}

export function confirmCopy(action, ctx = {}) {
  if (action === 'remove') {
    return {
      title: `Remove \u201c${text(ctx.word)}\u201d?`,
      message: 'Nobody is renamed. Profiles flagged only because of this word lose their flags, and people can use the word in a name again.',
      confirmLabel: 'Remove',
      confirmVariant: 'danger',
    }
  }
  const who = text(ctx.name) || 'this profile'
  return {
    title: `Clear the flags on ${who}?`,
    message: 'The flags leave this list and nothing changes for them. The words stay blocked for new names.',
    confirmLabel: 'Clear flags',
    confirmVariant: 'primary',
  }
}

// One short line per answer, shown after an action.
export function resultText(status) {
  switch (status) {
    case 'ok': return 'Done.'
    case 'duplicate': return 'That word is already blocked.'
    case 'short': return 'Use a word with at least two letters.'
    case 'long': return `Use a word of ${WORD_MAX} letters or fewer.`
    case 'empty': return 'Type a word first.'
    case 'forbidden': return BLOCKED_WORDS_WORDS.forbidden
    case 'offline': return BLOCKED_WORDS_WORDS.offline
    case 'gone': return 'That was already changed. The list is updated.'
    default: return 'Something went wrong. Try again.'
  }
}
