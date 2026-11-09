/**
 * src/utils/shareConditionLink.js
 *
 * Share for a condition page, same behaviour as the drug page
 * (utils/shareDrugLink.js): the phone's share sheet with a short friendly
 * message and the page link, or copy to the clipboard where there is no
 * share sheet. Inside the Android app the public site address is used.
 * Returns 'shared' | 'cancelled' | 'copied' | 'failed'.
 */
import { Capacitor } from '@capacitor/core'
import { copyText } from './shareDrugLink'

const PUBLIC_SITE = 'https://roshetta-app.github.io/capsula'

export function buildConditionLink(condition) {
  const slug = encodeURIComponent(condition.slug || condition.id)
  const base = Capacitor.isNativePlatform()
    ? PUBLIC_SITE
    : `${window.location.origin}${import.meta.env.BASE_URL}`.replace(/\/$/, '')
  return `${base}/conditions/${slug}`
}

export function buildConditionShareMessage(condition) {
  const name = condition.name
  return {
    title: `${name} on Capsula`,
    text: `\u{1F4CB} ${name}\nTreatment plans and clinical review in seconds, on Capsula, the drug reference made for doctors \u{1FA7A}`,
    url: buildConditionLink(condition),
  }
}

export async function shareCondition(condition) {
  const msg = buildConditionShareMessage(condition)
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
