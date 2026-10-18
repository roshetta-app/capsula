/**
 * src/utils/shareDrugLink.js
 *
 * 2026-10-18 (header tidy-up, Omar): the Share icon in the drug header opens
 * the phone's share sheet with a short friendly message and the drug's page
 * link; where there is no share sheet it copies the same message instead.
 *
 * Link: on the website it is the page's own address; inside the Android app
 * the app's own address is not a public page, so the public site address below
 * is used (same /capsula/ base as vite.config.js).
 */

import { Capacitor } from '@capacitor/core'
import { toTitleCase, getDrugTitleSuffix, TITLE_HIDDEN_MODIFIER_TAGS } from './drugTitleFormat'

const PUBLIC_SITE = 'https://roshetta-app.github.io/capsula'

export function buildDrugLink(drug) {
  const slug = encodeURIComponent(drug.slug || drug.id)
  const base = Capacitor.isNativePlatform()
    ? PUBLIC_SITE
    : `${window.location.origin}${import.meta.env.BASE_URL}`.replace(/\/$/, '')
  return `${base}/drugs/${slug}`
}

export function buildDrugShareMessage(drug) {
  const suffix = getDrugTitleSuffix(drug, { omitModifierTags: TITLE_HIDDEN_MODIFIER_TAGS })
  const name = [toTitleCase(drug.tradenameClean), suffix].filter(Boolean).join(' ')
  const generic = drug.genericName ? ` (${toTitleCase(drug.genericName)})` : ''
  return {
    title: `${name} on Capsula`,
    text: `\u{1F48A} ${name}${generic}\nDose, safety and interactions in seconds, on Capsula, the drug reference made for doctors \u{1FA7A}`,
    url: buildDrugLink(drug),
  }
}

// Phone share sheet first (one tap to WhatsApp and friends, with Copy inside
// it); copy to the clipboard when the device has no share sheet.
// Returns 'shared' | 'cancelled' | 'copied' | 'failed'.
export async function shareDrug(drug) {
  const msg = buildDrugShareMessage(drug)
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

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    try {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.setAttribute('readonly', '')
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      const ok = document.execCommand('copy')
      document.body.removeChild(ta)
      return ok
    } catch {
      return false
    }
  }
}
