/**
 * src/utils/shareProfileLink.js
 * 14.7b (2026-11-22): the link and the share action for a public profile. Same pattern as
 * shareRoshettaLink.js; the plain rules (link shape and message words) are in profileView.js.
 * Link: <site>/u/<username>. Inside the Android app the public site address is used.
 */

import { Capacitor } from '@capacitor/core'
import { copyText, PUBLIC_SITE } from './shareDrugLink'
import { profileLinkFor, profileShareMessage, profileCopyText } from './profileView'

export function buildProfileLink(handle) {
  const base = Capacitor.isNativePlatform()
    ? PUBLIC_SITE
    : `${window.location.origin}${import.meta.env.BASE_URL}`
  return profileLinkFor(base, handle)
}

// Phone share sheet first; copy the message and link when the device has none.
// Returns 'shared' | 'cancelled' | 'copied' | 'failed'.
export async function shareProfile(name, handle) {
  const msg = profileShareMessage(name, handle, buildProfileLink(handle))
  if (typeof navigator.share === 'function') {
    try {
      await navigator.share(msg)
      return 'shared'
    } catch (err) {
      if (err && err.name === 'AbortError') return 'cancelled'
    }
  }
  const ok = await copyText(profileCopyText(msg))
  return ok ? 'copied' : 'failed'
}
