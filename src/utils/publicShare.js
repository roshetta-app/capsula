/**
 * src/utils/publicShare.js
 * 2026-11-22 (Public profile plan, step 14.5a): the plain rules and words of the Private / Public
 * choice in both share sheets. No database and no screen in here, so it can be checked on its own.
 *
 * A share row is in one of three modes:
 *   private  no share row (no link)
 *   public   a share row with on_profile true (a link, on the owner's profile, name always shown)
 *   old      a share row with on_profile false (a link made before the profile existed: it keeps
 *            working exactly as before until the owner taps Make public)
 */

export const COPY_NOTICE = 'Anyone with the link can save and change their own copy.'
export const MAKE_PRIVATE_MESSAGE = 'The link stops working for new visits at once. Someone who already opened it may still see what they loaded, and anyone who saved a copy keeps their copy.'
export const SETUP_FIRST = 'Set up your public profile first.'
export const ITEM_TEXT_MESSAGE = 'Remove the web address or phone number from the name or description first.'

export function shareMode(code, onProfile) {
  if (!code) return 'private'
  return onProfile === true ? 'public' : 'old'
}

// The database refuses a web address or phone number in the name or description of an item that is
// public (or becoming public) with the message item_web or item_phone.
export function itemRefusalReason(error) {
  const text = String(error?.message ?? '')
  if (/item_web/.test(text)) return 'item_web'
  if (/item_phone/.test(text)) return 'item_phone'
  return null
}

export const isItemRefusal = (reason) => reason === 'item_web' || reason === 'item_phone'

// The words under a refused Make public. Any other reason has no special words here.
export const refusalText = (reason) => (isItemRefusal(reason) ? ITEM_TEXT_MESSAGE : null)

// May the person make something public right now? Only with a username (the public card is set up).
// `hasHandle` is null when it could not be read: then the answer is no.
export const canMakePublic = (hasHandle) => hasHandle === true
