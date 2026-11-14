/**
 * src/utils/shareRoshettaLink.js
 * 2026-11-14 (Roshetta plan, step 6.1a): the link and the share action for a
 * roshetta. Same pattern as shareGroupLink.js; the plain rules (link shape and
 * message words) live in roshettaShareText.js so they can be checked.
 *
 * Link: <site>/r/<share code>. On the website the site is the page's own
 * origin; inside the Android app the app's own address is not a public page, so
 * the public site address below is used (same /capsula/ base as vite.config.js).
 */

import { Capacitor } from '@capacitor/core'
import { copyText } from './shareDrugLink'
import { roshettaLinkFor, roshettaShareMessage, roshettaCopyText } from './roshettaShareText'

// Same address shareDrugLink.js and shareGroupLink.js use for the Android app.
const PUBLIC_SITE = 'https://roshetta-app.github.io/capsula'

export { copyText }

export function buildRoshettaLink(code) {
  const base = Capacitor.isNativePlatform()
    ? PUBLIC_SITE
    : `${window.location.origin}${import.meta.env.BASE_URL}`
  return roshettaLinkFor(base, code)
}

export function buildRoshettaShareMessage(name, code) {
  return roshettaShareMessage(name, buildRoshettaLink(code))
}

// Phone share sheet first; copy the message and link when the device has none.
// Returns 'shared' | 'cancelled' | 'copied' | 'failed'.
export async function shareRoshetta(name, code) {
  const msg = buildRoshettaShareMessage(name, code)
  if (typeof navigator.share === 'function') {
    try {
      await navigator.share(msg)
      return 'shared'
    } catch (err) {
      if (err && err.name === 'AbortError') return 'cancelled'
    }
  }
  const ok = await copyText(roshettaCopyText(msg))
  return ok ? 'copied' : 'failed'
}
