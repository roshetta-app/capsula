/**
 * src/utils/roshettaLimits.js
 *
 * 2026-11-13 (Roshetta plan, step 2.4c): the limit and read-only rules for a
 * person's roshettas. Plain functions only (no screen, no database). The
 * numbers are the four in constants/features.js and match the database, which
 * is the real guard; these rules let the app say no at the tap, and say it
 * plainly, instead of saving a change the server would refuse.
 *
 *   Free: 3 roshettas, 10 drugs in one.   Pro: 100 roshettas, 30 drugs in one.
 *
 * Read only (plan assumption J), the same rule as the database function:
 * a lapsed account (not Pro) that is over the free limits, meaning more than
 * 3 roshettas or any roshetta with more than 10 drugs. A read only account can
 * change nothing except delete.
 *
 * Answers at the tap, { ok: false, reason }:
 *   'read_only'   the account is read only
 *   'limit'       the roshetta list is full (the limit sheet, kind 'roshettas')
 *   'drug_limit'  too many drugs in one roshetta (the limit sheet, kind 'drugs')
 */

import {
  ROSHETTAS_CAP_FREE,
  ROSHETTA_DRUGS_CAP_FREE,
  ROSHETTAS_CAP_PRO,
  ROSHETTA_DRUGS_CAP_PRO,
} from '../constants/features.js'
import { countDrugs } from './roshettaRows.js'
import { describeEvents } from './roshettaSync.js'

export const roshettaCap = isPro => (isPro ? ROSHETTAS_CAP_PRO : ROSHETTAS_CAP_FREE)
export const roshettaDrugCap = isPro => (isPro ? ROSHETTA_DRUGS_CAP_PRO : ROSHETTA_DRUGS_CAP_FREE)

// Same rule as the database function (plan section 7).
export function isReadOnly(list, isPro) {
  if (isPro) return false
  return list.length > ROSHETTAS_CAP_FREE || list.some(r => countDrugs(r.rows) > ROSHETTA_DRUGS_CAP_FREE)
}

export function canCreate(list, isPro) {
  return !isReadOnly(list, isPro) && list.length < roshettaCap(isPro)
}

// Checked first, before anything else about the change: 'read_only' | 'limit' | null.
// action: 'create' | 'save' | 'delete'. Delete is always allowed.
export function tapRefusal(action, list, isPro) {
  if (action === 'delete') return null
  if (isReadOnly(list, isPro)) return 'read_only'
  if (action === 'create' && list.length >= roshettaCap(isPro)) return 'limit'
  return null
}

// Checked on the rows about to be saved: 'drug_limit' | null.
export function rowsRefusal(rows, isPro) {
  return countDrugs(rows) > roshettaDrugCap(isPro) ? 'drug_limit' : null
}

// Which sheet, if any, the events of a send should open, and the names of the
// roshettas that were not saved (for the sheet to list). The roshetta limit
// (also what a lapsed account gets for a create) wins over the drug limit,
// which wins over read only.
//   -> null | { kind: 'roshettas' | 'drugs' | 'readonly', names: string[] }
export function sheetForEvents(events = []) {
  const pick = (k) => events.filter(e => e.kind === k)
  const named = (list) => Array.from(new Set(list.map(e => e.name).filter(Boolean)))
  const full = pick('roshetta_limit')
  if (full.length > 0) return { kind: 'roshettas', names: named(full) }
  const big = pick('drug_limit')
  if (big.length > 0) return { kind: 'drugs', names: named(big) }
  if (pick('read_only').length > 0) return { kind: 'readonly', names: [] }
  return null
}

// What the person is told after a send run (the numbers and events runSync gives).
// A refusal for a limit or read only opens the sheet, which then carries the names
// of what was not saved, so the plain-words message for those events is left out
// (it would be said twice). Everything else is still told in words.
//   -> { sheet, messages, severe, success }
//      success: true when the only news is that changes made while offline went through
//      (wasOffline). A change made online and sent at once is not news: no note (2026-11-14 fix:
//      the note used to show after every online autosave and read as if the phone were offline).
//      wasOffline defaults to true so a caller that does not track it keeps the old answer.
const SHEET_KINDS = ['roshetta_limit', 'drug_limit', 'read_only']
export function afterRun({ events = [], failed = 0, sent = 0 } = {}, { wasOffline = true } = {}) {
  const sheet = sheetForEvents(events)
  const told = sheet ? events.filter(e => !SHEET_KINDS.includes(e.kind)) : events
  const { messages, severe } = describeEvents(told, failed)
  return { sheet, messages, severe, success: wasOffline && sent > 0 && messages.length === 0 && !sheet }
}
