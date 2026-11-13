/**
 * src/utils/roshettaEdit.js
 *
 * 2026-11-13 (Roshetta plan, step 2.4b): what happens when the person creates,
 * saves or deletes a roshetta. Plain functions only (no screen, no database):
 * the hook (hooks/useRoshettas.js) passes the real saving in.
 *
 * Everything is local first: the change shows at once, is saved on the phone
 * on the waiting list (roshettaChanges.js), and is sent when online
 * (roshettaSync.js). Limits and read only come in step 2.4c.
 *
 * prepareCreate / prepareSave / prepareDelete check the input and make the
 * change. They answer { ok: true, ... } or { ok: false, reason }:
 *   'invalid'  a name, description or row does not pass the size rules (detail says which)
 *   'missing'  the roshetta is not in the list
 *
 * commitChange puts a change on the list and on screen, then saves the list
 * on the phone. If the phone cannot save it, everything goes back.
 */

import { applyChange, addChange, makeChange, newId } from './roshettaChanges.js'
import { checkName, checkDescription, checkRows } from './roshettaRows.js'

// The text fields, trimmed and checked. Returns { ok: true, fields } or { ok: false, reason, detail }.
function cleanFields({ name, description, rows }) {
  const n = checkName(name)
  if (!n.ok) return { ok: false, reason: 'invalid', detail: `name_${n.reason}` }
  const text = description === undefined || description === null ? '' : description
  const d = checkDescription(text)
  if (!d.ok) return { ok: false, reason: 'invalid', detail: `description_${d.reason}` }
  const r = checkRows(rows)
  if (!r.ok) return { ok: false, reason: 'invalid', detail: r.reasons[0] }
  return { ok: true, fields: { name: name.trim(), description: text.trim(), rows } }
}

// New roshetta. The id is made here, so it can be changed again before it
// reaches the server, and sending it twice makes only one roshetta.
export function prepareCreate({ name, description = '', rows = [] } = {}, { makeId = newId, now = () => new Date().toISOString() } = {}) {
  const clean = cleanFields({ name, description, rows })
  if (!clean.ok) return clean
  const id = makeId()
  return { ok: true, id, change: makeChange('create', id, { ...clean.fields, createdAt: now() }) }
}

// Saves the WHOLE roshetta. A field that is left out keeps its current value.
export function prepareSave(list, id, changes = {}) {
  const current = list.find(r => r.id === id)
  if (!current) return { ok: false, reason: 'missing' }
  const clean = cleanFields({
    name: changes.name !== undefined ? changes.name : current.name,
    description: changes.description !== undefined ? changes.description : current.description,
    rows: changes.rows !== undefined ? changes.rows : current.rows,
  })
  if (!clean.ok) return clean
  return { ok: true, change: makeChange('save', id, clean.fields) }
}

// Delete. Gives back the roshetta and where it was (for the message and the screen).
export function prepareDelete(list, id) {
  const index = list.findIndex(r => r.id === id)
  if (index < 0) return { ok: false, reason: 'missing' }
  return { ok: true, roshetta: list[index], index, change: makeChange('delete', id) }
}

// Puts one change on the waiting list and on screen, then saves the list on the phone.
//   holder   { queue, list }  the hook's current state; changed in place at once, so a
//            second change made straight after builds on the first
//   persist  async () => true when the phone saved the list (read from holder.queue)
//   show     (list) => void   puts the list on screen
// Returns true when saved. When not, the list and the screen go back to what they
// were (unless a newer change or a send has already moved the list on).
export async function commitChange(holder, change, { persist, show }) {
  const prevQueue = holder.queue
  const prevList = holder.list
  const nextQueue = addChange(prevQueue, change)
  const nextList = applyChange(prevList, change)
  holder.queue = nextQueue
  holder.list = nextList
  show(nextList)
  const saved = await persist()
  if (saved) return true
  if (holder.queue === nextQueue) {
    holder.queue = prevQueue
    holder.list = prevList
    show(prevList)
  }
  return false
}
