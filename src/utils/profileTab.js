// src/utils/profileTab.js
// 14.7a (public profile plan, 2026-11-22): what the Profile tab shows, worked out in one place so the
// screen only draws it. Plain functions, no React, no database: checked in profileTab.check.js.
//
// The tab shows ONE state at a time:
//   loading   the sign-in or the person's own row is still being read
//   guest     not signed in
//   offline   the row could not be read because there is no connection
//   error     the row could not be read for another reason
//   details   signed in, required details missing (name, occupation, country; specialty for a physician)
//   public    details done, no username yet: the public card is next
//   ready     both done (14.7b adds the two lists here)
// The order of the last three comes from profileRules.nextProfileCard (never from a "skipped" flag).

import { nextProfileCard, detailsProgress } from './profileRules.js'

export function profileTabView({ authLoading = false, signedIn = false, status = 'loading', profile = null } = {}) {
  if (authLoading) return 'loading'
  if (!signedIn) return 'guest'
  if (status === 'loading') return 'loading'
  if (status === 'offline') return 'offline'
  if (status !== 'ready' || !profile) return 'error'
  return nextProfileCard(profile) ?? 'ready'
}

// How a failed read of the person's own row is shown: no connection, or something else.
export function statusForFailure(result) {
  if (result && result.ok) return 'ready'
  return result && result.kind === 'retry' && result.code === 'offline' ? 'offline' : 'error'
}

// Name and username lines under the avatar. The username is shown with an @ and always left to right.
export function heroLines(profile) {
  const name = String(profile?.full_name ?? '').trim()
  const handle = String(profile?.handle ?? '').trim()
  return { name: name || 'Your profile', handle: handle ? `@${handle}` : '' }
}

// Width of the slim bar on the details card, 0 to 100.
export function detailsPercent(profile) {
  const { done, total } = detailsProgress(profile)
  return total > 0 ? Math.round((done / total) * 100) : 0
}

export const TAB_WORDS = {
  guestTitle: 'Sign in to set up your profile',
  guestLine: 'Your profile shows the roshettas and drug groups you choose to make public.',
  offlineTitle: 'No connection',
  offlineLine: 'Your profile needs a connection. Try again when you are back online.',
  errorTitle: 'Could not load your profile',
  errorLine: 'Something went wrong. Try again.',
  detailsTitle: 'Finish your details',
  detailsLine: 'Not shown on your public profile.',
  publicTitle: 'Set up your public profile',
  publicLine: 'Choose a username and an avatar. You decide what is public.',
}
