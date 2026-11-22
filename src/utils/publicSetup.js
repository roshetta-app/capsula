/**
 * src/utils/publicSetup.js
 *
 * 2026-11-22 (public profile plan, step 14.5b): the plain rules behind the setup sheet that
 * opens at the first share, the first Add to profile and the first Profile tab. No React, no
 * database, no network: the sheet hands in the profile row and what the person typed, this file
 * says what to ask, what to preview and what to send (checked in publicSetup.check.js).
 *
 * What the sheet asks (B.3a, "ask when it is needed, once, skippable"):
 *   - name:     one line with Edit when a name exists; a field only when it is empty or the name
 *               already breaks a rule. The sign-in (Google) name is never used.
 *   - username: suggested from a Latin name only; an Arabic name gets an example, no suggestion.
 *   - avatar:   a ready-made design, or initials (the default).
 *   - bio:      optional, 160 characters.
 * The name is the ONE public name (profiles.full_name); it travels through save_public_profile
 * like the rest of the public card, never through the details save.
 */

import { previewPublic, setupState } from './profileData.js'
import {
  cleanName, cleanBio, cleanHandle, nameIssue, suggestHandles, isAvatarCode, messageForCode,
} from './profileRules.js'

export const SETUP_TITLE = 'Set up your public profile'
export const SETUP_INTRO = 'This is how people see you when you make something public.'
export const NAME_HELP = 'Shown on your public profile. A nickname is fine.'
export const HANDLE_HELP = 'English letters, numbers and hyphens, 3 to 30 characters.'
export const BIO_HELP = 'Optional. Up to 160 characters.'
export const BIO_MAX = 160
export const NAME_MAX = 40
export const HANDLE_MAX = 30
export const WAITING_MESSAGE = 'No connection. What you typed is kept on this phone. Try again when you are back online.'
export const SIGN_IN_MESSAGE = 'Sign in first.'

const filled = (v) => typeof v === 'string' && v.trim() !== ''

// The username as it will be sent: typing help applied, spaces at the ends gone, no hyphen at either end.
const handleOf = (form) => cleanHandle(String(form?.handle ?? '').trim()).replace(/^-+|-+$/g, '')

// The starting form for one opening of the sheet, from the profile row (details plus public card,
// waiting changes already laid on top by the caller).
//   done:      the public card already exists (a username is there): the sheet has nothing to ask
//   waitDays:  days left of the 30-day pause after Remove public profile (0 = none)
//   editName:  show the name as a field (empty name, or a name that breaks a rule and must be asked again)
export function startForm(profile, { taken = [] } = {}) {
  const state = setupState(profile, { taken })
  const name = state.name
  const editName = state.needsName || nameIssue(cleanName(name)) !== null
  return {
    done: state.publicSetUp,
    waitDays: state.removedWaitDaysLeft,
    editName,
    name,
    handle: state.publicSetUp ? String(profile.handle).trim() : '',
    bio: typeof profile?.bio === 'string' ? profile.bio : '',
    avatarCode: isAvatarCode(profile?.avatar_code) ? profile.avatar_code : null,
  }
}

// What goes to save_public_profile. The bio is left out when empty (nothing to clear on a first
// setup); the avatar is always sent (null means initials).
export function buildFields(form) {
  const out = {
    name: cleanName(form?.name),
    handle: handleOf(form),
    avatar_code: isAvatarCode(form?.avatarCode) ? form.avatarCode : null,
  }
  const bio = cleanBio(form?.bio)
  if (bio) out.bio = bio
  return out
}

// The wording the sheet shows under each field while typing. A field that is still empty shows
// nothing (the button just stays off): only a filled field can be wrong. A blocked word and a
// taken username can only come back from the database, never from here.
export function formProblems(form) {
  const fields = buildFields(form)
  const { problems } = previewPublic(fields, { currentName: fields.name })
  const out = {}
  if (filled(fields.name) && problems.name) out.name = messageForCode(problems.name)
  if (filled(fields.handle) && problems.handle) out.handle = messageForCode(problems.handle)
  if (filled(fields.bio) && problems.bio) out.bio = messageForCode(problems.bio)
  return out
}

// The button is on only when the name and the username are there and nothing is wrong.
export function canSubmit(form) {
  const fields = buildFields(form)
  return filled(fields.name) && filled(fields.handle) && previewPublic(fields, { currentName: fields.name }).ok
}

// Suggestions follow the name as it is now (so a name edited in the sheet changes them), skip
// usernames already known to be taken, and are never shown when the field already holds one.
export function visibleSuggestions(form, taken = []) {
  const current = handleOf(form)
  return suggestHandles(cleanName(form?.name), taken).filter((h) => h !== current)
}

// Which part of the sheet a refusal belongs under: 'name' | 'handle' | 'bio' | 'avatar' | 'general'.
export function fieldForRefusal(res) {
  const code = String(res?.code ?? '')
  if (res?.field === 'avatar_code' || code === 'avatar_unknown') return 'avatar'
  if (res?.field === 'name' || code.startsWith('name_')) return 'name'
  if (res?.field === 'bio' || code.startsWith('bio_')) return 'bio'
  if (res?.field === 'handle' || code.startsWith('handle_') || code === 'removed_wait') return 'handle'
  return 'general'
}

// A name the database refused must be shown as a field, so the person can change it.
export const refusalOpensName = (res) => fieldForRefusal(res) === 'name'

// A username the database said is taken is remembered, so the suggestions move on.
export const takenHandle = (res, form) =>
  String(res?.code ?? '') === 'handle_taken' ? handleOf(form) : null

// What the share sheets need once the card is saved: the username and the one name.
export function savedCard(saved, form) {
  const fields = buildFields(form)
  return {
    handle: filled(saved?.handle) ? String(saved.handle).trim() : fields.handle,
    name: filled(saved?.name) ? String(saved.name).trim() : fields.name,
    avatarCode: 'avatar_code' in (saved ?? {}) ? (isAvatarCode(saved.avatar_code) ? saved.avatar_code : null) : fields.avatar_code,
  }
}
