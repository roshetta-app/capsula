/**
 * src/utils/shareGroupLink.js
 * 2026-10-19 (Drug groups plan, step 8.1): the link and the message for
 * sharing a drug group. Same pattern as shareDrugLink.js.
 *
 * Link: <site>/g/<share code>. On the website the site is the page's own
 * origin; inside the Android app the app's own address is not a public page, so
 * the public site address below is used (same /capsula/ base as vite.config.js).
 *
 * The message carries the group's name, because the website cannot give a
 * link preview a per-link title (plan section 9).
 */

import { Capacitor } from '@capacitor/core'
import { copyText } from './shareDrugLink'

// Same address shareDrugLink.js uses for the Android app.
const PUBLIC_SITE = 'https://roshetta-app.github.io/capsula'

export { copyText }

export function buildGroupLink(code) {
  const base = Capacitor.isNativePlatform()
    ? PUBLIC_SITE
    : `${window.location.origin}${import.meta.env.BASE_URL}`.replace(/\/$/, '')
  return `${base}/g/${encodeURIComponent(code)}`
}

export function buildGroupShareMessage(name, code) {
  const clean = String(name ?? '').trim()
  return {
    title: `${clean} on Capsula`,
    text: `\u{1F4CB} ${clean}\nA drug group on Capsula, the drug reference made for doctors \u{1FA7A}`,
    url: buildGroupLink(code),
  }
}

// Phone share sheet first; copy the message and link when the device has none.
// Returns 'shared' | 'cancelled' | 'copied' | 'failed'.
export async function shareGroup(name, code) {
  const msg = buildGroupShareMessage(name, code)
  if (typeof navigator.share === 'function') {
    try {
      await navigator.share(msg)
      return 'shared'
    } catch (err) {
      if (err && err.name === 'AbortError') return 'cancelled'
    }
  }
  const ok = await copyText(`${msg.text}\n\u{1F449} ${msg.url}`)
  return ok ? 'copied' : 'failed'
}
