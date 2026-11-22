// src/utils/profileView.js
// 14.7b (public profile plan, 2026-11-22): the plain rules behind a public profile page (/u/<username>)
// and the list part of the Profile tab, so the screens only draw. No React, no browser, no database:
// checked in profileView.check.js. Nothing here keeps anything on the phone.

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export const PROFILE_WORDS = {
  safety: 'Titles are written by the person and are not checked by Capsula.',
  ownerTitle: 'This is your profile',
  ownerLine: 'This is how other people see it.',
  emptyVisitor: 'Nothing public yet',
  emptyOwnRoshettas: 'Nothing public yet. Make a roshetta public to show it here.',
  emptyOwnGroups: 'Nothing public yet. Make a drug group public to show it here.',
  share: 'Share profile',
  addToProfile: 'Add to profile',
  copied: 'Link copied',
  shareFailed: 'Could not share. Try again.',
}

// '2026-11-12T10:00:00Z' -> '12 Nov'. Anything that is not a date gives an empty string.
export function shortDate(iso) {
  if (typeof iso !== 'string' || !iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`
}

// <base>/u/<username>. The base may end with a slash.
export function profileLinkFor(base, handle) {
  return `${String(base).replace(/\/+$/, '')}/u/${encodeURIComponent(handle)}`
}

// { title, text, url } for the phone share sheet. Only the name and username: never a roshetta or a drug.
export function profileShareMessage(name, handle, url) {
  const clean = String(name ?? '').replace(/\s+/g, ' ').trim()
  const shown = clean || `@${handle}`
  return {
    title: `${shown} on Capsula`,
    text: `\u{1F469}\u200D\u2695\uFE0F ${shown}\nA public profile on Capsula, the drug reference made for doctors \u{1FA7A}`,
    url,
  }
}

// What is copied when the phone has no share sheet.
export function profileCopyText(msg) {
  return `${msg.text}\n\u{1F449} ${msg.url}`
}

// Roshettas first. Drug groups first only when the person has groups public and no roshettas.
export function defaultTab(profile) {
  const r = profile?.roshettas?.total ?? 0
  const g = profile?.groups?.total ?? 0
  return r === 0 && g > 0 ? 'groups' : 'roshettas'
}

export function tabsFor(profile) {
  return [
    { key: 'roshettas', label: 'Roshettas', total: profile?.roshettas?.total ?? 0 },
    { key: 'groups', label: 'Drug groups', total: profile?.groups?.total ?? 0 },
  ]
}

// "Showing the newest 50 of 73" only when the list is cut short.
export function capLine(section) {
  const shown = Array.isArray(section?.items) ? section.items.length : 0
  const total = section?.total ?? 0
  return total > shown && shown > 0 ? `Showing the newest ${shown} of ${total}` : ''
}

// "5 drugs · 12 Nov"
export function itemLine(item) {
  const n = item?.drugCount ?? 0
  const parts = [`${n} ${n === 1 ? 'drug' : 'drugs'}`]
  const date = shortDate(item?.createdAt)
  if (date) parts.push(date)
  return parts.join(' \u00B7 ')
}

export function emptyLine(tabKey, own) {
  if (!own) return PROFILE_WORDS.emptyVisitor
  return tabKey === 'groups' ? PROFILE_WORDS.emptyOwnGroups : PROFILE_WORDS.emptyOwnRoshettas
}

// Which state the profile page draws from the answer of fetchPublicProfile.
export function profilePageState(result) {
  const s = result && result.status
  if (s === 'ok' || s === 'not_found' || s === 'too_many' || s === 'offline' || s === 'error') return s
  return 'loading'
}

export function problemText(state) {
  if (state === 'too_many') {
    return { title: 'Too many tries', body: 'Try again later.', actionLabel: 'Open Capsula', action: 'open' }
  }
  if (state === 'offline') {
    return { title: "You're offline", body: 'Reconnect to open this profile.', actionLabel: 'Try again', action: 'retry' }
  }
  if (state === 'error') {
    return { title: "Couldn't open this profile", body: 'Check your connection and try again.', actionLabel: 'Try again', action: 'retry' }
  }
  return { title: 'Profile not found', body: 'The username may have changed, or the profile was removed.', actionLabel: 'Open Capsula', action: 'open' }
}

// An old username forwards to the current one: the page replaces the address with the current username.
// Returns that username, or null when the address is already right.
export function forwardTarget(result, requestedHandle) {
  if (!result || result.status !== 'ok') return null
  const current = result.profile?.handle
  if (typeof current !== 'string' || !current) return null
  return current.toLowerCase() === String(requestedHandle ?? '').trim().toLowerCase() ? null : current
}

// A card colour from a group, only when it is a plain hex colour (never an arbitrary string in a style).
export function safeColor(value) {
  return typeof value === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(value) ? value : null
}
