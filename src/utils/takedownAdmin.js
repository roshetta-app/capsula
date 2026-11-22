/**
 * src/utils/takedownAdmin.js
 * 2026-11-22 (Public profile plan, step 14.9c-4b): the plain rules and words for the two admin actions on a
 * person: Turn off sharing (reversible, Restore sharing undoes it) and Take username back (one way). The database
 * call is handed in, so everything here is checked without a database or a screen (takedownAdmin.check.js).
 * takedownAdminContent.js binds the real one.
 *
 * The database facts this relies on (Migration 6, takedown_actions_14_9c_4):
 *   admin_set_sharing_off(p_id, p_off)  true = every link of that person stops opening and they cannot make new
 *                                       ones; false = Restore. A repeat changes nothing and writes nothing.
 *   admin_take_handle(p_id)             the username is dead for good, items leave the profile, links keep working,
 *                                       30 day wait before a new username
 *   admin_sharing_off_ids()             the ids of the people whose sharing is off (jsonb array of ids)
 * Both actions are admin only, refuse the admin's own account and an unknown person, and are written to the Audit
 * Log by the database itself ('sharing_off', 'sharing_on', 'take_handle').
 *
 * Nothing in this file keeps anything on the phone or the computer.
 */

import { withTimeLimit } from './roshettaLoad.js'

export const TAKEDOWN_ACTIONS = ['sharing_off', 'sharing_on', 'take_handle']

export const TAKEDOWN_WORDS = {
  tag: 'Sharing off',
  sectionTitle: 'Sharing turned off',
  sectionEmpty: 'Nobody has sharing turned off.',
  sectionLine: 'Every link of these people is closed. Restore sharing brings them back exactly as they were.',
  sectionError: 'Could not load who has sharing turned off.',
}

const text = (v) => (typeof v === 'string' ? v.trim() : '')

// Only well-formed ids, once each.
export function parseSharingOffIds(data) {
  if (!Array.isArray(data)) return []
  return [...new Set(data.filter(v => typeof v === 'string' && v.trim() !== '').map(v => v.trim()))]
}

// Only name and username are kept, in the order the ids came.
export function parsePeople(ids, rows) {
  const byId = new Map()
  if (Array.isArray(rows)) {
    for (const r of rows) {
      if (r && typeof r === 'object' && typeof r.id === 'string') byId.set(r.id, { name: text(r.full_name) || null, handle: text(r.handle) || null })
    }
  }
  return ids.map(id => ({ profileId: id, name: byId.get(id)?.name ?? null, handle: byId.get(id)?.handle ?? null }))
}

function failureStatus(error, isOnline) {
  const msg = String(error?.message ?? '')
  if (error?.code === 'request_timeout') return 'offline'
  if (/not_allowed/.test(msg)) return 'own_account'
  if (/no_handle/.test(msg)) return 'no_handle'
  if (/not_found/.test(msg)) return 'gone'
  if (/forbidden/.test(msg) || error?.code === '42501') return 'forbidden'
  if (!isOnline()) return 'offline'
  return 'error'
}

// Who has sharing off. The ids are what counts; a failed name lookup only leaves the names empty.
export async function loadSharingOff({ rpc, listProfiles, isOnline, timeLimitMs }) {
  if (!isOnline()) return { status: 'offline' }
  let res
  try {
    res = await withTimeLimit(rpc('admin_sharing_off_ids'), timeLimitMs)
  } catch {
    return { status: 'error' }
  }
  if (res?.error) return { status: failureStatus(res.error, isOnline) }
  const ids = parseSharingOffIds(res?.data)
  let rows = []
  if (ids.length > 0) {
    try {
      const p = await withTimeLimit(listProfiles(ids), timeLimitMs)
      if (!p?.error) rows = p?.data
    } catch { /* the names are only a convenience */ }
  }
  return { status: 'ok', ids, people: parsePeople(ids, rows) }
}

// Which buttons a person gets. sharingOff is true, false, or null when it could not be read: then both sharing
// buttons are offered, because repeating either one is harmless (the database writes nothing the second time).
export function takedownButtons({ handle, sharingOff }) {
  const list = []
  if (sharingOff !== true) list.push({ key: 'sharing_off', label: 'Turn off sharing', danger: true })
  if (sharingOff !== false) list.push({ key: 'sharing_on', label: 'Restore sharing', danger: false })
  if (text(handle)) list.push({ key: 'take_handle', label: 'Take username back', danger: true })
  return list
}

// The question asked before an action runs.
export function confirmCopy(action, ctx = {}) {
  const who = text(ctx.name) || (text(ctx.handle) ? `@${text(ctx.handle)}` : 'this person')
  switch (action) {
    case 'sharing_off':
      return {
        title: `Turn off sharing for ${who}?`,
        message: 'Every link this person made stops opening and their profile reads as unavailable. They cannot make new links. Their account and private things are untouched. You can restore it later.',
        confirmLabel: 'Turn off sharing', confirmVariant: 'danger',
      }
    case 'sharing_on':
      return {
        title: `Restore sharing for ${who}?`,
        message: 'Their links open again exactly as they were, and they can make new links.',
        confirmLabel: 'Restore sharing', confirmVariant: 'primary',
      }
    default:
      return {
        title: `Take the username back from ${who}?`,
        message: 'This cannot be undone. The username is dead for good: nobody can claim it, this person included, and their old addresses stop working. Their items come off the profile but their links keep working (use Turn off sharing to stop those). They wait 30 days before choosing a new username.',
        confirmLabel: 'Take username back', confirmVariant: 'danger',
      }
  }
}

function callFor(action, profileId) {
  switch (action) {
    case 'sharing_off': return ['admin_set_sharing_off', { p_id: profileId, p_off: true }]
    case 'sharing_on': return ['admin_set_sharing_off', { p_id: profileId, p_off: false }]
    case 'take_handle': return ['admin_take_handle', { p_id: profileId }]
    default: return null
  }
}

export async function runTakedown(action, profileId, { rpc, isOnline, timeLimitMs }) {
  const call = callFor(action, profileId)
  if (!call || typeof profileId !== 'string' || !profileId) return { status: 'error' }
  if (!isOnline()) return { status: 'offline' }
  let res
  try {
    res = await withTimeLimit(rpc(call[0], call[1]), timeLimitMs)
  } catch {
    return { status: 'error' }
  }
  if (res?.error) return { status: failureStatus(res.error, isOnline) }
  return { status: 'ok' }
}

// One short line per answer, shown after an action.
export function resultText(status) {
  switch (status) {
    case 'ok': return 'Done.'
    case 'own_account': return 'You cannot do this to your own account.'
    case 'no_handle': return 'This person has no username to take back.'
    case 'gone': return 'That person was not found. The list is updated.'
    case 'forbidden': return 'This is for admin accounts only.'
    case 'offline': return 'You are offline. Reconnect and try again.'
    default: return 'Something went wrong. Try again.'
  }
}
