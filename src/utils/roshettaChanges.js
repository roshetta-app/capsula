/**
 * src/utils/roshettaChanges.js
 *
 * 2026-11-13 (Roshetta plan, step 2.3a): the rules for changes to a person's
 * roshettas that are made on the phone first and sent to the server later.
 * Plain functions only: no screen, no database, no storage. The hook
 * (useRoshettas.js) and the sync step (roshettaSync.js) use them; the saved
 * list itself lives in utils/cache.js (readRoshettaChanges / writeRoshettaChanges).
 * Copied from the groups pattern (groupChanges.js), not shared with it.
 *
 * A change is one small thing the person did:
 *   { id, type, roshettaId, data, at, sending? }
 *   type 'create'  data { name, description, rows, createdAt }
 *   type 'save'    data { name, description, rows }   the WHOLE roshetta
 *   type 'delete'  data {}
 * A roshetta is one document, so a save always carries all of it, and a later
 * save simply replaces an earlier one that has not been sent yet (plan
 * assumption G: two phones editing offline, the last save to reach the server
 * wins).
 *
 * The list is oldest first. 'sending: true' marks the change that is on its
 * way to the server right now: such a change is never merged or dropped,
 * because the server may already have it. 'failed: { reason }' marks a change
 * the server refused: it stays on the list and is not merged into either.
 * Both marks are set and cleared by the sync step (roshettaSync.js).
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

export function makeChange(type, roshettaId, data = {}) {
  return { id: newId(), type, roshettaId, data, at: new Date().toISOString() }
}

// Newest changed first, the order of the My roshettas area.
export function newestChangedFirst(list) {
  return list.slice().sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : a.updatedAt > b.updatedAt ? -1 : 0))
}

// ── Showing a change at once ─────────────────────────────────────────────────

export function applyChange(roshettas, change) {
  const { type, roshettaId, data = {} } = change
  switch (type) {
    case 'create': {
      if (roshettas.some(r => r.id === roshettaId)) return roshettas
      const roshetta = {
        id: roshettaId,
        name: data.name,
        description: data.description ?? '',
        rows: data.rows ?? [],
        createdAt: data.createdAt ?? change.at,
        updatedAt: change.at,
      }
      return newestChangedFirst([roshetta, ...roshettas])
    }
    case 'save': {
      if (!roshettas.some(r => r.id === roshettaId)) return roshettas
      return newestChangedFirst(roshettas.map(r => (
        r.id === roshettaId
          ? { ...r, name: data.name, description: data.description ?? '', rows: data.rows ?? [], updatedAt: change.at }
          : r
      )))
    }
    case 'delete':
      return roshettas.filter(r => r.id !== roshettaId)
    default:
      return roshettas
  }
}

// The roshettas as the person should see them: the server's (or saved) list
// with every waiting change laid on top, in order.
export function applyQueue(roshettas, queue) {
  return queue.reduce((list, change) => applyChange(list, change), roshettas)
}

// ── Adding to the list ───────────────────────────────────────────────────────

const forRoshetta = roshettaId => c => c.roshettaId === roshettaId
const isFree = c => !c.sending && !c.failed

// Puts a new change on the end of the list, tidying the list so it never holds
// work that cancels out:
//  - save: joins a waiting create (the create then carries the latest content),
//    or replaces an earlier waiting save of the same roshetta. A change that is
//    on its way, or that failed, is never touched: the save goes after it. A
//    save for a roshetta that is waiting to be deleted is ignored.
//  - delete: a roshetta made on this phone and never sent disappears without a
//    trace (everything waiting for it is dropped). Any other roshetta loses its
//    waiting saves (they are pointless now, and a failed one would hold the
//    delete back) and gets the delete added after whatever is on its way.
//    A second delete of the same roshetta is not added.
export function addChange(queue, change) {
  const { type, roshettaId, data = {} } = change

  if (type === 'delete') {
    const mine = queue.filter(forRoshetta(roshettaId))
    if (mine.some(c => c.type === 'delete')) return queue
    const madeHereNotSent = mine.some(c => c.type === 'create') && !mine.some(c => c.sending)
    // Made on this phone and never sent: nothing to tell the server at all.
    if (madeHereNotSent) return queue.filter(c => c.roshettaId !== roshettaId)
    const kept = queue.filter(c => c.roshettaId !== roshettaId || c.sending || c.type !== 'save')
    return [...kept, change]
  }

  if (type === 'save') {
    if (queue.some(c => c.roshettaId === roshettaId && c.type === 'delete')) return queue
    let target = null
    for (const c of queue) {
      if (c.roshettaId === roshettaId && isFree(c) && (c.type === 'create' || c.type === 'save')) target = c
    }
    if (!target) return [...queue, change]
    if (target.type === 'create') {
      return queue.map(c => (c === target ? { ...c, data: { ...c.data, ...data } } : c))
    }
    return queue.map(c => (c === target ? { ...c, data: { ...data } } : c))
  }

  return [...queue, change]
}

// ── Sending (used by roshettaSync.js, step 2.3b) ─────────────────────────────

// The next change to send: the first one that is not failed, unless an earlier
// change to the same roshetta failed (that roshetta waits; others carry on).
// Nothing is returned while a change is already on its way.
export function nextToSend(queue) {
  if (queue.some(c => c.sending)) return null
  const blocked = new Set()
  for (const c of queue) {
    if (c.failed) { blocked.add(c.roshettaId); continue }
    if (!blocked.has(c.roshettaId)) return c
  }
  return null
}

export function markSending(queue, changeId) {
  return queue.map(c => (c.id === changeId ? { ...c, sending: true } : c))
}

// Takes the 'sending' mark off every change. Used when sending stops without an
// answer, and when the app is reopened (a mark left from a closed app is stale).
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

export function markFailed(queue, changeId, reason) {
  return queue.map(c => {
    if (c.id !== changeId) return c
    const rest = { ...c, failed: { reason } }
    delete rest.sending
    return rest
  })
}

// Retry: takes the failed mark off every failed change so the next sync sends them again.
export function retryFailed(queue) {
  return queue.map(c => {
    if (!c.failed) return c
    const rest = { ...c }
    delete rest.failed
    return rest
  })
}

// Discard: removes the failed changes. When a roshetta's create failed, the
// roshetta never reached the server, so everything waiting for it goes too.
export function discardFailed(queue) {
  const lost = new Set(queue.filter(c => c.failed && c.type === 'create').map(c => c.roshettaId))
  return queue.filter(c => !c.failed && !lost.has(c.roshettaId))
}

// Drops every waiting change for one roshetta (one the server no longer has,
// or one that could not be made).
export function dropRoshetta(queue, roshettaId) {
  return queue.filter(c => c.roshettaId !== roshettaId)
}

// What the screens need to know about the list: how many changes are waiting
// to be sent, how many the server refused (failed), which roshettas have
// something waiting (the small mark on a roshetta), and the failed changes
// themselves, oldest first, for the "could not be saved" sheet.
export function summarizeQueue(queue) {
  const failedList = queue.filter(c => c.failed)
  return {
    failed: failedList.length,
    waiting: queue.length - failedList.length,
    ids: Array.from(new Set(queue.map(c => c.roshettaId))),
    failedList,
  }
}

// True when two summaries say the same thing, so a screen can keep the old
// object and not redraw for nothing.
export function sameSummary(a, b) {
  return a.failed === b.failed
    && a.waiting === b.waiting
    && a.ids.length === b.ids.length && a.ids.every(id => b.ids.includes(id))
    && a.failedList.length === b.failedList.length && a.failedList.every((c, i) => c.id === b.failedList[i].id)
}
