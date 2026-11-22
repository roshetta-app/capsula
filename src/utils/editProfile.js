/**
 * src/utils/editProfile.js
 * 2026-11-22 (public profile plan, step 14.7c-1): the rules of the one Edit screen, as plain functions
 * (no React, no database), so they can be checked on their own (editProfile.check.js).
 *
 * The screen has two groups and two separate saves (B.3a):
 *   - Your details   occupation, specialty, country, gender, phone ... saved with saveDetails
 *   - Shown on your public profile   name, username, avatar, bio, old addresses keep working
 *       with a username: saved with save_public_profile (changed fields only)
 *       without one:     the name is saved as a detail (full_name); the rest waits for the setup sheet
 *
 * Welcome mode (first sign-in only) shows name, occupation (+ specialty) and country, and the same
 * rules apply: those three are what "details complete" means. Phone, gender are never required.
 */

import {
  cleanName, cleanBio, cleanHandle, messageForCode, isAvatarCode,
  PHYSICIAN_OCCUPATIONS, handleChangeDaysLeft,
} from './profileRules.js'
import { previewPublic } from './profileData.js'
import { COUNTRIES, DIAL_TO_ISO2, isPhoneInvalid } from './profileOptions.js'

const filled = (v) => typeof v === 'string' && v.trim() !== ''
const str = (v) => (typeof v === 'string' ? v : '')

export const WELCOME_FIELDS = ['fullName', 'occupation', 'occupationOther', 'specialty', 'studentType', 'country']
export const NOT_PUBLIC_LINE = 'Not shown on your public profile'
export const PHONE_HELP = 'Optional. Not shown on your public profile.'
export const FORWARDING_LABEL = 'Old addresses keep working'
export const FORWARDING_HELP = 'When you change your username, the old link still opens your profile.'

// The form's starting values from the person's own row (profileData.fetchProfile, waiting changes on top).
export function valuesFromRow(row) {
  return {
    fullName: str(row?.full_name),
    gender: str(row?.gender),
    phoneCountryCode: str(row?.phone_country_code),
    phoneNumber: str(row?.phone_number),
    occupation: str(row?.occupation),
    occupationOther: str(row?.occupation_other),
    specialty: str(row?.specialty),
    studentType: str(row?.student_type),
    country: str(row?.country),
    handle: str(row?.handle).trim(),
    bio: str(row?.bio),
    avatarCode: isAvatarCode(row?.avatar_code) ? row.avatar_code : null,
    handleForwarding: row?.handle_forwarding !== false,
  }
}

export const hasHandle = (values) => filled(values?.handle)
export const isPhysicianValue = (occupation) => PHYSICIAN_OCCUPATIONS.includes(String(occupation ?? '').trim())

// One change in the form. Same conditional clearing and country fill-in as the old wizard:
// a new occupation clears the fields that no longer apply; picking a phone code fills the country.
export function applyChange(values, field, value) {
  const next = { ...values, [field]: value }
  if (field === 'occupation') {
    if (!isPhysicianValue(value)) next.specialty = ''
    if (value !== 'Medical Student') next.studentType = ''
    if (value !== 'Other') next.occupationOther = ''
  }
  if (field === 'phoneCountryCode') {
    const match = COUNTRIES.find((c) => c.iso2 === DIAL_TO_ISO2[value])
    if (match) next.country = match.name
  }
  return next
}

// Which fields of the form are shown. welcome: only the three that make "details complete".
export function visibleFields(values, { welcome = false } = {}) {
  return {
    name: true,
    occupation: true,
    occupationOther: values.occupation === 'Other',
    specialty: isPhysicianValue(values.occupation),
    studentType: values.occupation === 'Medical Student' && !welcome,
    country: true,
    gender: !welcome,
    phone: !welcome,
    publicGroup: !welcome,
  }
}

// What is wrong with the details, by field. Phone is optional: only a number that is there is checked.
// field keys: fullName, occupation, occupationOther, specialty, country, phone
export function detailsProblems(values, { welcome = false } = {}) {
  const out = {}
  if (!filled(values.fullName)) out.fullName = messageForCode('name_required')
  if (!filled(values.occupation)) out.occupation = 'Choose your occupation.'
  if (values.occupation === 'Other' && !filled(values.occupationOther)) out.occupationOther = 'Tell us your occupation.'
  if (isPhysicianValue(values.occupation) && !filled(values.specialty)) out.specialty = 'Choose your specialty.'
  if (!filled(values.country)) out.country = 'Choose your country.'
  if (!welcome && filled(values.phoneNumber)) {
    if (!filled(values.phoneCountryCode)) out.phone = 'Choose the country code.'
    else if (isPhoneInvalid(values.phoneCountryCode, values.phoneNumber)) out.phone = "That doesn't look like a valid phone number."
  }
  return out
}

// What the details save sends (snake_case, the columns saveDetails allows). With a username the name
// goes through the public path instead, so it is left out here. Saving always ends the welcome:
// profile_setup_dismissed only stops the welcome from opening again.
export function detailsPayload(values, { welcome = false } = {}) {
  const hasNumber = filled(values.phoneNumber)
  const out = {
    occupation: values.occupation,
    occupation_other: values.occupation === 'Other' ? values.occupationOther : '',
    student_type: values.occupation === 'Medical Student' ? values.studentType : '',
    specialty: isPhysicianValue(values.occupation) ? values.specialty : '',
    country: values.country,
    profile_setup_dismissed: true,
  }
  if (!hasHandle(values)) out.full_name = cleanName(values.fullName)
  if (!welcome) {
    out.gender = values.gender
    out.phone_country_code = hasNumber ? values.phoneCountryCode : ''
    out.phone_number = hasNumber ? values.phoneNumber : ''
  }
  return out
}

const handleOf = (h) => cleanHandle(String(h ?? '').trim()).replace(/^-+|-+$/g, '')

// The public fields that changed, as save_public_profile wants them. Only for a person who has a
// username (without one the setup sheet does this). The username is left out inside the 30-day pause.
// A cleared bio is sent as an empty text so it really is cleared. Returns null when nothing changed.
export function publicPayload(values, saved, { now = Date.now(), savedRow = null } = {}) {
  if (!hasHandle(saved)) return null
  const out = {}
  const name = cleanName(values.fullName)
  if (name !== cleanName(saved.fullName)) out.name = name
  const daysLeft = savedRow ? handleChangeDaysLeft(savedRow, now) : 0
  const handle = handleOf(values.handle)
  if (daysLeft === 0 && handle !== handleOf(saved.handle)) out.handle = handle
  const bio = cleanBio(values.bio)
  if (bio !== cleanBio(saved.bio)) out.bio = bio
  if ((values.avatarCode ?? null) !== (saved.avatarCode ?? null)) out.avatar_code = values.avatarCode ?? null
  if (Boolean(values.handleForwarding) !== Boolean(saved.handleForwarding)) out.handle_forwarding = Boolean(values.handleForwarding)
  return Object.keys(out).length > 0 ? out : null
}

// Wording under the public fields while typing: only a changed, filled field can be wrong.
// A blocked word and a taken username can only come back from the database.
export function publicProblems(values, saved, opts) {
  const payload = publicPayload(values, saved, opts)
  if (!payload) return {}
  const { problems } = previewPublic(payload, { currentName: values.fullName })
  const out = {}
  for (const key of ['name', 'handle', 'bio']) if (problems[key]) out[key] = messageForCode(problems[key])
  return out
}

// Which field a refused save belongs under (the screen shows the message there).
export function fieldForPublicRefusal(res) {
  const code = String(res?.code ?? '')
  if (res?.field === 'name' || code.startsWith('name_')) return 'name'
  if (res?.field === 'handle' || code.startsWith('handle_')) return 'handle'
  if (res?.field === 'bio' || code.startsWith('bio_')) return 'bio'
  if (res?.field === 'avatar_code' || code === 'avatar_unknown') return 'avatar'
  return 'general'
}

// Anything to save? Save stays on while something changed; what is wrong is shown on the fields when
// it is tapped, so a disabled button never leaves the person guessing why.
export function hasChanges(values, saved) {
  return JSON.stringify(values) !== JSON.stringify(saved)
}

// After the details were saved but the public part was refused: the details count as saved, so the
// next tap on Save does not send them again. The name counts only when it went with the details.
export function mergeDetails(saved, values) {
  const next = { ...saved }
  for (const k of ['gender', 'phoneCountryCode', 'phoneNumber', 'occupation', 'occupationOther', 'specialty', 'studentType', 'country']) next[k] = values[k]
  if (!hasHandle(saved)) next.fullName = values.fullName
  return next
}

// Router state from the entry points: which group to open at.
export function groupFromState(state) {
  const g = state?.group
  return g === 'details' || g === 'public' ? g : null
}
