/**
 * src/utils/addToProfile.js
 * 2026-11-22 (Public profile plan, step 14.5c): the plain rules and words of the Add to profile picker:
 * which private items to offer, which of them must stay private, the newest-50 cap with the true total,
 * making a batch public one item at a time, and the one line that says how it went. No screen in here.
 *
 * An item is private when it has no share row. An item with a share row already has a link (an old link
 * is moved onto the profile with Make public in its share sheet), so it is not offered here.
 * An item whose name or description holds a web address or phone number stays private and is listed with
 * the reason; the database refuses it too (item_web, item_phone), so the app's check is only a preview.
 */

import { webOrPhoneIssue } from './profileRules.js'
import { COPY_NOTICE, ITEM_TEXT_MESSAGE, isItemRefusal } from './publicShare.js'

export const PICKER_TITLE = 'Add to profile'
export const PICKER_INTRO = 'Pick what to show on your public profile.'
export const PICKER_COPY_NOTICE = COPY_NOTICE
export const STAYS_PRIVATE_REASON = 'Remove the web address or phone number'
export const LIST_CAP = 50
const TIMEOUT_CODE = 'request_timeout'

const stamp = (item) => {
  const t = Number(new Date(item?.updatedAt ?? item?.createdAt ?? 0))
  return Number.isFinite(t) ? t : 0
}

// Reads which ids already have a share row. The database only lets the owner read share rows, so the
// answer holds the person's own items only. { ok: true, ids: Set } or { ok: false, reason }.
export async function readSharedIds(client, table, idColumn, limit = x => x) {
  const { data, error } = await limit(client.from(table).select(idColumn))
  if (error) return { ok: false, reason: error.code === TIMEOUT_CODE ? 'offline' : 'error' }
  return { ok: true, ids: new Set((Array.isArray(data) ? data : []).map(r => r?.[idColumn]).filter(Boolean)) }
}

// The offer for one tab. items: { id, name, description, updatedAt?, createdAt? }[]. sharedIds: Set.
// Newest first (a tie keeps the order it came in), at most LIST_CAP shown, total is the true count of
// private items. `ok` can be ticked; `blocked` stay private and are listed with the reason.
export function candidateList(items, sharedIds) {
  const shared = sharedIds instanceof Set ? sharedIds : new Set(sharedIds ?? [])
  const privateItems = (Array.isArray(items) ? items : [])
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => item?.id && !shared.has(item.id))
    .sort((a, b) => stamp(b.item) - stamp(a.item) || a.index - b.index)
    .map(({ item }) => item)
  const shown = privateItems.slice(0, LIST_CAP)
  const ok = []
  const blocked = []
  for (const item of shown) {
    const issue = webOrPhoneIssue(item.name) || webOrPhoneIssue(item.description)
    if (issue) blocked.push({ ...item, issue })
    else ok.push(item)
  }
  return { ok, blocked, total: privateItems.length }
}

export const capLine = (shownCount, total) => (total > LIST_CAP ? `Showing the newest ${shownCount} of ${total}` : null)

// Ticks. picked: { roshettas: string[], groups: string[] } (never changed in place).
export function togglePick(picked, kind, id) {
  const key = kind === 'groups' ? 'groups' : 'roshettas'
  const list = picked?.[key] ?? []
  const next = list.includes(id) ? list.filter(x => x !== id) : [...list, id]
  return { roshettas: picked?.roshettas ?? [], groups: picked?.groups ?? [], [key]: next }
}
export const pickedCount = (picked) => (picked?.roshettas?.length ?? 0) + (picked?.groups?.length ?? 0)

// Makes the ids public one at a time with makeOne(id) => { ok, reason? }.
//   made     done
//   stayed   the database refused the name or description (web address or phone number)
//   unsent   not on the server yet (made offline) or deleted elsewhere: skipped, the others go on
//   stopped  the first other problem (offline, read only, anything else) ends the batch at once, so one
//            lost connection is not repeated for every item; left counts the ones not made public
export async function runBatch(ids, makeOne) {
  const result = { made: [], stayed: [], unsent: [], stopped: null, left: 0 }
  const list = Array.isArray(ids) ? ids : []
  for (let i = 0; i < list.length; i++) {
    let res
    try { res = await makeOne(list[i]) } catch { res = { ok: false, reason: 'error' } }
    if (res?.ok) result.made.push(list[i])
    else if (isItemRefusal(res?.reason)) result.stayed.push(list[i])
    else if (res?.reason === 'not_sent' || res?.reason === 'missing') result.unsent.push(list[i])
    else {
      result.stopped = res?.reason || 'error'
      result.left = list.length - i
      break
    }
  }
  return result
}

// Two batches (roshettas, then groups) as one. A batch that was never run is left out by the caller.
export function mergeBatches(a, b) {
  return {
    made: [...a.made, ...b.made],
    stayed: [...a.stayed, ...b.stayed],
    unsent: [...a.unsent, ...b.unsent],
    stopped: a.stopped || b.stopped,
    left: a.left + b.left,
  }
}

const items = (n) => `${n} ${n === 1 ? 'item' : 'items'}`

// The one line about how it went. allDone is true when everything picked is now on the profile.
export function batchSummary(result) {
  const parts = []
  const made = result.made.length
  if (made > 0) parts.push(`${items(made)} ${made === 1 ? 'is' : 'are'} now on your profile.`)
  if (result.stayed.length > 0) parts.push(`${result.stayed.length} stayed private. ${ITEM_TEXT_MESSAGE}`)
  if (result.unsent.length > 0) {
    const n = result.unsent.length
    parts.push(`${n} ${n === 1 ? "isn't" : "aren't"} saved online yet. Try again once ${n === 1 ? 'it is' : 'they are'} sent.`)
  }
  if (result.stopped === 'offline') parts.push(`No connection. ${items(result.left)} not made public.`)
  else if (result.stopped === 'read_only') parts.push('This account is read only, so nothing more could be changed.')
  else if (result.stopped) parts.push(`Something went wrong. ${items(result.left)} not made public. Try again.`)
  return {
    text: parts.join(' '),
    allDone: made > 0 && result.stayed.length === 0 && result.unsent.length === 0 && !result.stopped,
  }
}
