/**
 * src/utils/shareDrugLink.js
 *
 * 2026-10-18 (header tidy-up, Omar): the Share icon in the drug header copies
 * a short message with the drug's page link to the clipboard.
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

export function buildDrugShareText(drug) {
  const suffix = getDrugTitleSuffix(drug, { omitModifierTags: TITLE_HIDDEN_MODIFIER_TAGS })
  const title = [toTitleCase(drug.tradenameClean), suffix].filter(Boolean).join(' ')
  const generic = drug.genericName ? `Active ingredient: ${toTitleCase(drug.genericName)}\n` : ''
  return `${title}\n${generic}Uses, dose, safety and interactions on Capsula:\n${buildDrugLink(drug)}`
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
