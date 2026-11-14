/**
 * src/utils/roshettaSaveCopy.js
 * 2026-11-14 (Roshetta plan, step 6.2c): the plain rules behind "Save a copy" on the shared
 * roshetta page (SharedRoshettaScreen.jsx), so they can be checked without a screen.
 *
 * The copy is a NEW roshetta of the viewer's own: same name, description and rows, not
 * linked to the shared one, nothing about the owner. It goes through the hook's
 * createRoshetta, so it is saved on the phone first and sent when online.
 */

// What the copy is made from. Only name, description and rows are taken.
export function copyFields(roshetta) {
  return {
    name: roshetta.name,
    description: roshetta.description || '',
    rows: Array.isArray(roshetta.rows) ? roshetta.rows : [],
  }
}

// The request a signed-out person leaves behind while signing in. It rides on the groups
// sign-in prompt ('groups' type), with an id the sign-in sheet recognises by its prefix.
export const SAVE_SIGN_IN_PREFIX = 'rsave:'
export function saveSignInId(code) { return `${SAVE_SIGN_IN_PREFIX}${code}` }
export function isRoshettaSaveRequest(pending, code) {
  return !!pending && pending.type === 'groups' && pending.id === saveSignInId(code)
}

export const SAVE_NOT_LOADED_MESSAGE = 'Your roshettas are still loading. Try again in a moment.'
export const SAVE_ERROR_MESSAGE = "Couldn't save this roshetta. Try again."
export const SAVE_READ_ONLY_MESSAGE = 'Your roshettas are read only. Delete one or upgrade to save more.'

// What the page does with the hook's answer to createRoshetta:
//   { kind: 'saved', roshetta }       show Saved with View
//   { kind: 'sheet', sheet }          open the limit sheet ('roshettas' | 'drugs'); the bar stays as it was
//   { kind: 'sheet', sheet: 'readonly' } open the read only sheet
//   { kind: 'sign_in' }               a guest answer: the sign-in sheet is the page's job, nothing is shown
//   { kind: 'notice', message }       one line in the bar, Save still there to try again
export function saveCopyAnswer(answer) {
  if (answer && answer.ok) return { kind: 'saved', roshetta: answer.roshetta || null }
  const reason = answer && answer.reason
  if (reason === 'limit') return { kind: 'sheet', sheet: 'roshettas' }
  if (reason === 'drug_limit') return { kind: 'sheet', sheet: 'drugs' }
  if (reason === 'read_only') return { kind: 'sheet', sheet: 'readonly' }
  if (reason === 'guest') return { kind: 'sign_in' }
  if (reason === 'not_loaded') return { kind: 'notice', message: SAVE_NOT_LOADED_MESSAGE }
  return { kind: 'notice', message: SAVE_ERROR_MESSAGE }
}

// The bar is shown for a roshetta that really shows, with something in it to copy.
export function showSaveBar(state) {
  return state === 'ready'
}
