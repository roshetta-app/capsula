/**
 * src/utils/groupChanges.js
 *
 * 2026-10-20 (Drug groups plan, step 17.2): the rules for changes to a person's
 * groups that are made on the phone first and sent to the server later.
 * Plain functions only: no screen, no database, no storage. The hook
 * (useDrugGroups.js) and the sync step (17.3) use them; the saved list itself
 * lives in utils/cache.js (readGroupChanges / writeGroupChanges).
 *
 * A change is one small thing the person did (plan section 21.3):
 *   { id, type, groupId, data, at, sending? }
 *   type 'create'       data { name, description, color, createdAt }
 *   type 'update'       data { name?, description?, color? }
 *   type 'add_drug'     data { brandId }
 *   type 'remove_drug'  data { brandId }
 *   type 'delete'       data {}
 * Drugs are always single adds and removes, never a whole list, so one phone
 * can never wipe the drugs another phone added.
 *
 * The list is oldest first. 'sending: true' marks the change that is on its
 * way to the server right now (step 17.3); such a change is never merged or
 * dropped, because the server may already have it. 'failed: { reason }' marks
 * a change the server refused (step 17.3): it stays on the list, is not sent
 * again, and later changes to the same group wait behind it (step 17.4 shows
 * the person what to do with it).
 *
 * Every function returns new objects and never changes what it was given.
 */

export function newId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  // Older phones without randomUUID: a random version 4 id.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.floor(Math.random() * 16)
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })
}

export function makeChange(type, groupId, data = {}) {
  return { id: newId(), type, groupId, data, at: new Date().toISOString() }
}

// Newest first, the default order of the groups.
export function newestFirst(list) {
  return list.slice().sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0))
}

// ── Showing a change at once ─────────────────────────────────────────────────

export function applyChange(groups, change) {
  const { type, groupId, data = {} } = change
  switch (type) {
    case 'create': {
      if (groups.some(g => g.id === groupId)) return groups
      const group = {
        id: groupId,
        name: data.name,
        description: data.description ?? '',
        color: data.color ?? 'blue',
        createdAt: data.createdAt ?? change.at,
        brandIds: [],
      }
      return newestFirst([group, ...groups])
    }
    case 'update':
      return groups.map(g => (g.id === groupId ? { ...g, ...data } : g))
    case 'add_drug':
      return groups.map(g => (
        g.id === groupId && !g.brandIds.includes(data.brandId)
          ? { ...g, brandIds: [...g.brandIds, data.brandId] }
          : g
      ))
    case 'remove_drug':
      return groups.map(g => (
        g.id === groupId ? { ...g, brandIds: g.brandIds.filter(b => b !== data.brandId) } : g
      ))
    case 'delete':
      return groups.filter(g => g.id !== groupId)
    default:
      return groups
  }
}

// The groups as the person should see them: the server's (or saved) list with
// every waiting change laid on top, in order.
export function applyQueue(groups, queue) {
  return queue.reduce((list, change) => applyChange(list, change), groups)
}

// ── Adding to the list ───────────────────────────────────────────────────────

const forGroup = groupId => c => c.groupId === groupId
const isFree = c => !c.sending && !c.failed

// Puts a new change on the end of the list, tidying the list so it never holds
// work that cancels out:
//  - delete: a group made on this phone and never sent disappears without a
//    trace (everything waiting for it is dropped). Any other group gets the
//    delete added after its waiting edits.
//  - update: joins the waiting create or update of the same group (the latest
//    value of each field wins).
//  - add_drug / remove_drug: cancel each other when the same drug is added and
//    removed before sending.
export function addChange(queue, change) {
  const { type, groupId, data = {} } = change

  if (type === 'delete') {
    const mine = queue.filter(forGroup(groupId))
    const madeHereNotSent = mine.some(c => c.type === 'create') && !mine.some(c => c.sending)
    // Made on this phone and never sent: nothing to tell the server at all.
    if (madeHereNotSent) return queue.filter(c => c.groupId !== groupId)
    // Otherwise the delete goes on the end. Earlier waiting edits stay, so
    // that Undo can simply take the delete away again; they harm nothing, the
    // group is gone once the delete is sent.
    return [...queue, change]
  }

  if (type === 'update') {
    const target = queue.find(c => c.groupId === groupId && isFree(c) && (c.type === 'create' || c.type === 'update'))
    if (target) {
      return queue.map(c => (c === target ? { ...c, data: { ...c.data, ...data } } : c))
    }
    return [...queue, change]
  }

  if (type === 'add_drug') {
    const same = c => c.groupId === groupId && c.data?.brandId === data.brandId
    const cancelling = queue.find(c => same(c) && isFree(c) && c.type === 'remove_drug')
    if (cancelling) return queue.filter(c => c !== cancelling)
    if (queue.some(c => same(c) && c.type === 'add_drug')) return queue
    return [...queue, change]
  }

  if (type === 'remove_drug') {
    const same = c => c.groupId === groupId && c.data?.brandId === data.brandId
    const cancelling = queue.find(c => same(c) && isFree(c) && c.type === 'add_drug')
    if (cancelling) return queue.filter(c => c !== cancelling)
    if (queue.some(c => same(c) && c.type === 'remove_drug')) return queue
    return [...queue, change]
  }

  return [...queue, change]
}

// ── Looking at the list ──────────────────────────────────────────────────────

// Undo of a delete that has not been sent yet: takes the delete off the list.
// { queue, cancelled }. cancelled is false when there was no such delete (it
// was already sent, or the group never reached the server), and the caller then
// has to make the group again.
export function cancelDelete(queue, groupId) {
  const target = queue.find(c => c.groupId === groupId && c.type === 'delete' && isFree(c))
  if (!target) return { queue, cancelled: false }
  return { queue: queue.filter(c => c !== target), cancelled: true }
}

export function isGroupWaiting(queue, groupId) {
  return queue.some(forGroup(groupId))
}

export function waitingGroupIds(queue) {
  return new Set(queue.map(c => c.groupId))
}

// ── Sending (used by step 17.3) ──────────────────────────────────────────────

// The next change to send: the first one that is not failed, unless an earlier
// change to the same group failed (that group waits; other groups carry on).
// Nothing is returned while a change is already on its way.
export function nextToSend(queue) {
  if (queue.some(c => c.sending)) return null
  const blocked = new Set()
  for (const c of queue) {
    if (c.failed) { blocked.add(c.groupId); continue }
    if (!blocked.has(c.groupId)) return c
  }
  return null
}

export function markFailed(queue, changeId, reason) {
  return queue.map(c => {
    if (c.id !== changeId) return c
    const rest = { ...c, failed: { reason } }
    delete rest.sending
    return rest
  })
}

export function failedChanges(queue) {
  return queue.filter(c => c.failed)
}

export function markSending(queue, changeId) {
  return queue.map(c => (c.id === changeId ? { ...c, sending: true } : c))
}

export function clearSending(queue) {
  return queue.map(c => {
    if (!c.sending) return c
    const rest = { ...c }
    delete rest.sending
    return rest
  })
}

export function removeChange(queue, changeId) {
  return queue.filter(c => c.id !== changeId)
}

// Drops every waiting change for one group (a group the server no longer has,
// or one deleted on another device).
export function dropGroup(queue, groupId) {
  return queue.filter(c => c.groupId !== groupId)
}
