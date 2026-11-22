/**
 * src/utils/profileData.js
 *
 * 2026-11-22 (public profile plan, step 14.3): the data layer for a person's OWN profile.
 * Plain functions only: the database client, the time limit, the waiting-changes store and
 * the clock are handed in, so everything here can be checked against a fake server
 * (profileData.check.js). No screen, no React.
 *
 * Two separate save paths, so neither can write the other's columns (migration 14.1):
 *   - saveDetails      direct update of the 14 allowed private columns only
 *   - savePublicCard   the checked database function save_public_profile (name, handle,
 *                      bio, avatar code, handle forwarding)
 * The two states ("details complete", "public card set up") are worked out from filled-in
 * data (profileRules.js), never from profile_setup_dismissed.
 *
 * Every function answers, never throws:
 *   { ok: true, ... }
 *   { ok: false, kind: 'retry',   code, message }  no connection / no answer / not signed in
 *                                                  right now: nothing is lost, try later
 *   { ok: false, kind: 'refused', code, message }  the rules or the database said no; `code`
 *                                                  is one of the codes in profileRules MESSAGES
 *                                                  (or 'error'), `message` is the short wording
 *
 * Offline: saveDetailsOrWait / savePublicCardOrWait keep a change that could not be sent in
 * a small per-person record (latest value per field wins) and sendWaiting sends it later,
 * details first, then the public card. A refusal is returned to the caller, never swallowed.
 *
 * Column names stay snake_case here, exactly as the database and profileRules.js use them.
 * The old camelCase helpers in lib/queries.js (fetchOwnProfile, updateOwnProfile) are left
 * alone until the Edit screen moves over (step 14.7c).
 */

import {
  cleanName, cleanBio, cleanHandle, nameIssue, bioIssue, handleIssue,
  nextProfileCard, detailsMissing, detailsProgress, publicCardSetUp,
  handleChangeDaysLeft, removedWaitDaysLeft, suggestHandles, messageForCode, MESSAGES, isAvatarCode,
} from './profileRules.js'

// ── What the app may read and write ──────────────────────────────────────────

// The 14 private columns a person may update directly (migration 14.1).
export const DETAILS_COLUMNS = [
  'full_name', 'occupation', 'occupation_other', 'student_type', 'specialty', 'country',
  'governorate', 'gender', 'phone_country_code', 'phone_number', 'profile_setup_dismissed',
  'theme_preference', 'share_name_default', 'marketing_opt_in',
]

// The keys save_public_profile reads; anything else it ignores, so we never send anything else.
export const PUBLIC_KEYS = ['name', 'handle', 'bio', 'avatar_code', 'handle_forwarding']

// One plain select of the person's own row: the details plus the public card.
export const PROFILE_SELECT = [
  'full_name', 'occupation', 'occupation_other', 'student_type', 'specialty', 'country',
  'governorate', 'gender', 'phone_country_code', 'phone_number', 'profile_setup_dismissed',
  'marketing_opt_in', 'marketing_opt_in_at',
  'handle', 'handle_changed_at', 'handle_forwarding', 'bio', 'avatar_code', 'public_removed_at',
].join(', ')

const filled = (v) => typeof v === 'string' && v.trim() !== ''

// ── Sorting a database answer ────────────────────────────────────────────────

const NETWORK_WORDS = /failed to fetch|networkerror|network request failed|load failed|fetch failed|network error/i
export const OFFLINE_MESSAGE = 'No connection. Your change will be saved when you are back online.'

// Sorts one database error into retry / refused. error: the Supabase error (or the timeout
// error); status: the HTTP status when known.
export function classifyProfileError(error, status) {
  if (!error) return { kind: 'ok' }
  const code = String(error.code ?? '')
  const text = `${error.message ?? ''} ${error.details ?? ''}`
  const message = String(error.message ?? '').trim()

  if (code === 'request_timeout') return { kind: 'retry', code: 'offline' }
  if (status === 0 || NETWORK_WORDS.test(text)) return { kind: 'retry', code: 'offline' }
  if (status === 401 || code === 'PGRST301' || /jwt/i.test(text)) return { kind: 'retry', code: 'not_signed_in' }
  if (typeof status === 'number' && status >= 500) return { kind: 'retry', code: 'offline' }
  if (message === 'not_signed_in') return { kind: 'retry', code: 'not_signed_in' }

  if (Object.prototype.hasOwnProperty.call(MESSAGES, message)) return { kind: 'refused', code: message }
  return { kind: 'refused', code: 'error' }
}

function failure(error, status) {
  const c = classifyProfileError(error, status)
  if (c.kind === 'retry') {
    return { ok: false, kind: 'retry', code: c.code, message: c.code === 'not_signed_in' ? messageForCode('not_signed_in') : OFFLINE_MESSAGE }
  }
  return { ok: false, kind: 'refused', code: c.code, message: messageForCode(c.code) }
}

function refusedLocally(code, field) {
  return { ok: false, kind: 'refused', code, field, message: messageForCode(code) }
}

// Runs one request and always resolves with { data, error, status }.
async function run(make, limit) {
  try {
    const res = await limit(make())
    return { data: res?.data ?? null, error: res?.error ?? null, status: res?.status }
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)), status: 0 }
  }
}

// ── Reading ──────────────────────────────────────────────────────────────────

// Reads the signed-in person's own row. { ok: true, profile } or a failure.
export async function fetchProfile(supabase, userId, { limit = (x) => x } = {}) {
  if (!userId) return { ok: false, kind: 'retry', code: 'not_signed_in', message: messageForCode('not_signed_in') }
  const { data, error, status } = await run(
    () => supabase.from('profiles').select(PROFILE_SELECT).eq('id', userId).single(),
    limit,
  )
  if (error) return failure(error, status)
  return { ok: true, profile: data }
}

// ── The details path ─────────────────────────────────────────────────────────

// Keeps only the 14 allowed columns; trims text; collapses spaces in the name.
// Anything else (handle, bio, avatar code, role, tier ...) is dropped here, so a details
// save can never carry a public or guarded column.
export function pickDetails(updates) {
  const out = {}
  if (!updates || typeof updates !== 'object') return out
  for (const key of DETAILS_COLUMNS) {
    if (!(key in updates)) continue
    let v = updates[key]
    if (typeof v === 'string') v = key === 'full_name' ? cleanName(v) : v.trim()
    out[key] = v
  }
  return out
}

// Local refusal for a details save. The name rules apply only once the person has a username
// (as in the database); a person without one may still save any name here.
function detailsProblem(picked, hasHandle) {
  if (hasHandle && filled(picked.full_name)) {
    const issue = nameIssue(picked.full_name)
    if (issue) return refusedLocally(`name_${issue}`, 'full_name')
  }
  return null
}

// updates: any of DETAILS_COLUMNS (others dropped). opts: { hasHandle, limit }.
// Returns { ok: true, saved } (saved = what was sent) or a failure.
export async function saveDetails(supabase, userId, updates, { hasHandle = false, limit = (x) => x } = {}) {
  if (!userId) return { ok: false, kind: 'retry', code: 'not_signed_in', message: messageForCode('not_signed_in') }
  const picked = pickDetails(updates)
  if (Object.keys(picked).length === 0) return { ok: true, saved: {} }
  const problem = detailsProblem(picked, hasHandle)
  if (problem) return problem

  const { error, status } = await run(
    () => supabase.from('profiles').update(picked).eq('id', userId),
    limit,
  )
  if (error) return failure(error, status)
  return { ok: true, saved: picked }
}

// ── The public card path ─────────────────────────────────────────────────────

// Cleans what the person typed for the public card and keeps only the five allowed keys.
// An empty avatar code means initials (null).
export function cleanPublicFields(fields) {
  const out = {}
  if (!fields || typeof fields !== 'object') return out
  if ('name' in fields) out.name = cleanName(fields.name)
  if ('handle' in fields) out.handle = cleanHandle(fields.handle)
  if ('bio' in fields) out.bio = cleanBio(fields.bio)
  if ('avatar_code' in fields) out.avatar_code = filled(fields.avatar_code) ? fields.avatar_code : null
  if ('handle_forwarding' in fields) out.handle_forwarding = Boolean(fields.handle_forwarding)
  return out
}

// The preview the Edit screen shows while typing: { ok, cleaned, problems: { name?, bio?, handle?, avatar_code? } }
// problems hold the same codes the database would answer. A blocked word and a taken username
// can only come back from the database. currentName: the name already on the profile, so a
// username can be checked against "name required".
export function previewPublic(fields, { currentName = '' } = {}) {
  const cleaned = cleanPublicFields(fields)
  const problems = {}
  if ('name' in cleaned) {
    const issue = nameIssue(cleaned.name)
    if (issue) problems.name = `name_${issue}`
    else if (!filled(cleaned.name)) problems.name = 'name_required'
  }
  if ('bio' in cleaned) {
    const issue = bioIssue(cleaned.bio)
    if (issue) problems.bio = `bio_${issue}`
  }
  if ('handle' in cleaned) {
    const issue = handleIssue(cleaned.handle)
    if (issue) problems.handle = `handle_${issue}`
    else if (!('name' in cleaned) && !filled(currentName)) problems.name = 'name_required'
    else if ('name' in cleaned && !filled(cleaned.name) && !filled(currentName)) problems.name = 'name_required'
  }
  return { ok: Object.keys(problems).length === 0, cleaned, problems }
}

// fields: any of PUBLIC_KEYS. opts: { currentName, limit }.
// Returns { ok: true, saved } (saved = the public fields the database returned) or a failure.
// A local refusal names the field: { field: 'name' | 'bio' | 'handle' }.
export async function savePublicCard(supabase, fields, { currentName = '', limit = (x) => x } = {}) {
  const { ok, cleaned, problems } = previewPublic(fields, { currentName })
  if (!ok) {
    const field = ['handle', 'name', 'bio'].find((f) => problems[f]) ?? Object.keys(problems)[0]
    return refusedLocally(problems[field], field)
  }
  if ('avatar_code' in cleaned && cleaned.avatar_code !== null && !isAvatarCode(cleaned.avatar_code)) {
    return refusedLocally('avatar_unknown', 'avatar_code')
  }
  if (Object.keys(cleaned).length === 0) return { ok: true, saved: {} }

  const { data, error, status } = await run(() => supabase.rpc('save_public_profile', { p: cleaned }), limit)
  if (error) return failure(error, status)
  return { ok: true, saved: data ?? {} }
}

// Remove public profile (migration 14.1; Migration 2 will also make public items private).
export async function removePublicCard(supabase, { limit = (x) => x } = {}) {
  const { error, status } = await run(() => supabase.rpc('remove_public_profile'), limit)
  if (error) return failure(error, status)
  return { ok: true }
}

// ── What the screens need to know ────────────────────────────────────────────

// Everything the Profile tab and the setup sheet read, worked out from the profile row.
// taken: usernames already known to be taken (the database has the last word on save).
export function setupState(profile, { taken = [] } = {}) {
  const hasName = filled(profile?.full_name)
  return {
    next: nextProfileCard(profile),            // 'details' | 'public' | null: the ONE card to show
    detailsMissing: detailsMissing(profile),
    detailsProgress: detailsProgress(profile), // { done, total } for the slim bar
    publicSetUp: publicCardSetUp(profile),
    // The setup sheet asks for the name once, only when there is none; with a name it shows
    // a line with Edit. The sign-in (Google) name is never used.
    needsName: !hasName,
    name: hasName ? String(profile.full_name).trim() : '',
    suggestions: hasName ? suggestHandles(profile.full_name, taken) : [], // Latin names only
    handleDaysLeft: handleChangeDaysLeft(profile),
    removedWaitDaysLeft: removedWaitDaysLeft(profile),
  }
}

// ── Offline: changes that wait for the connection ────────────────────────────

// A waiting record: { details: {…}, public: {…} }, latest value per field wins.
// store: { read(userId) → record|null (may be async), write(userId, record|null) }.

export function mergeWaiting(record, kind, fields) {
  const next = { details: { ...(record?.details ?? {}) }, public: { ...(record?.public ?? {}) } }
  if (kind === 'details') Object.assign(next.details, pickDetails(fields))
  else if (kind === 'public') Object.assign(next.public, cleanPublicFields(fields))
  else return record ?? null
  const empty = Object.keys(next.details).length === 0 && Object.keys(next.public).length === 0
  return empty ? null : next
}

export const hasWaiting = (record) =>
  Boolean(record) && (Object.keys(record.details ?? {}).length > 0 || Object.keys(record.public ?? {}).length > 0)

// Lays waiting values on top of the profile row so the screen shows what the person typed
// (the public name is the same field as full_name).
export function applyWaiting(profile, record) {
  if (!profile || !hasWaiting(record)) return profile
  const out = { ...profile, ...(record.details ?? {}) }
  const p = record.public ?? {}
  if ('name' in p) out.full_name = p.name
  for (const key of ['handle', 'bio', 'avatar_code', 'handle_forwarding']) if (key in p) out[key] = p[key]
  return out
}

// A small per-person store on top of localStorage (a handful of short fields: no database needed).
export function localProfileStore(storage = typeof localStorage !== 'undefined' ? localStorage : null) {
  const key = (userId) => `capsula.profileWaiting:${userId}`
  return {
    read(userId) {
      try {
        const raw = storage?.getItem(key(userId))
        return raw ? JSON.parse(raw) : null
      } catch { return null }
    },
    write(userId, record) {
      try {
        if (record) storage?.setItem(key(userId), JSON.stringify(record))
        else storage?.removeItem(key(userId))
        return true
      } catch { return false }
    },
  }
}

async function readStore(store, userId) { return (await store.read(userId)) ?? null }

// Saves now; when there is no connection the change waits. { ok: true, waiting: true } means
// "kept, will be sent"; a refusal is returned as it is and nothing is kept for it.
export async function saveDetailsOrWait(supabase, userId, updates, { store, hasHandle = false, limit } = {}) {
  const res = await saveDetails(supabase, userId, updates, { hasHandle, limit })
  if (res.ok || res.kind !== 'retry') return res
  await store.write(userId, mergeWaiting(await readStore(store, userId), 'details', updates))
  return { ok: true, waiting: true }
}

export async function savePublicCardOrWait(supabase, userId, fields, { store, currentName = '', limit } = {}) {
  const res = await savePublicCard(supabase, fields, { currentName, limit })
  if (res.ok || res.kind !== 'retry') return res
  await store.write(userId, mergeWaiting(await readStore(store, userId), 'public', fields))
  return { ok: true, waiting: true }
}

// Sends what is waiting, details first, then the public card. Stops at the first "retry"
// (nothing lost, kept for next time). A refused part is dropped from the store and returned
// in `refused` so the screen can tell the person.
// Returns { sent: ['details'|'public'], refused: [{ kind, code, message, field? }], waiting: boolean }
export async function sendWaiting(supabase, userId, { store, hasHandle = false, currentName = '', limit } = {}) {
  const result = { sent: [], refused: [], waiting: false }
  let record = await readStore(store, userId)
  if (!hasWaiting(record)) return result

  if (Object.keys(record.details ?? {}).length > 0) {
    const res = await saveDetails(supabase, userId, record.details, { hasHandle, limit })
    if (res.ok) { result.sent.push('details'); record = { ...record, details: {} } }
    else if (res.kind === 'refused') { result.refused.push({ part: 'details', ...res }); record = { ...record, details: {} } }
    else { result.waiting = true; return result }
    await store.write(userId, hasWaiting(record) ? record : null)
  }

  if (Object.keys(record.public ?? {}).length > 0) {
    const res = await savePublicCard(supabase, record.public, { currentName: record.details?.full_name || currentName, limit })
    if (res.ok) { result.sent.push('public'); record = { ...record, public: {} } }
    else if (res.kind === 'refused') { result.refused.push({ part: 'public', ...res }); record = { ...record, public: {} } }
    else { result.waiting = true; return result }
    await store.write(userId, hasWaiting(record) ? record : null)
  }
  return result
}
