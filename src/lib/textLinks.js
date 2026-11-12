/**
 * textLinks — src/lib/textLinks.js
 *
 * Drug links and class links inside a text block (plan step 4). Only the editor
 * toolbar adds them (Drug and Class buttons); the AI never does.
 *
 * How a link is saved (a normal link in the text, so old text is not affected):
 *   drug    [**Panadol** <span class="rt-s-sm rt-c-gray">500mg - Tab.</span>](capsula:drug/<brand slug>)
 *   class   [Statins](capsula:class/<class name>)
 *   family  [Statins](capsula:family/<class name>/<family name>)
 * Names are written with percent-codes so spaces, commas and brackets are safe.
 * Classes and families are known by name only, so renaming a linked class or
 * family breaks its links (they then show as plain text).
 *
 * Exports:
 *   drugLinkMarkdown(drug)                 saved text for a drug picked in the drug picker
 *   classLinkMarkdown(className, family?)  saved text for a class or a family
 *   linkEditorHtml(markdown)               the same link as the editing box shows it
 *   parseTextLink(href)                    what a saved link points at, or null
 *   fixDrugLinkNames(html)                 shows drug names in a link with capital first letters
 *   resolveTextLinks(html, drugs)          for the app screen: a link whose drug,
 *                                          class or family no longer exists becomes
 *                                          plain text (the look stays, the tap goes)
 */

import { marked } from 'marked'
import { getSheetDrugSuffix, toTitleCase } from '../utils/drugTitleFormat'

export const DRUG_PREFIX   = 'capsula:drug/'
export const CLASS_PREFIX  = 'capsula:class/'
export const FAMILY_PREFIX = 'capsula:family/'

// encodeURIComponent leaves ( and ) alone, which would end a saved link early.
function enc(s) {
  return encodeURIComponent(String(s ?? '')).replace(/\(/g, '%28').replace(/\)/g, '%29')
}

function dec(s) {
  try { return decodeURIComponent(s) } catch { return s }
}

// Text that goes inside [ ] must not contain characters the saved text would read as marks.
function safeLabel(s) {
  return String(s ?? '').replace(/[[\]\\*_<>`|]/g, ' ').replace(/\s+/g, ' ').trim()
}

export function drugLinkMarkdown(drug) {
  const slug = drug?.slug || drug?.id
  // first letter of each word capital, the same as the drug block shows brand names
  const name = toTitleCase(safeLabel(drug?.tradenameClean || drug?.name || drug?.genericName))
  if (!slug || !name) return ''
  const suffix = safeLabel(getSheetDrugSuffix({
    concentration: drug.concentration,
    form: drug.form,
    formulation: drug,
    tradenameClean: drug.tradenameClean,
  }))
  const small = suffix ? ` <span class="rt-s-sm rt-c-gray">${suffix}</span>` : ''
  return `[**${name}**${small}](${DRUG_PREFIX}${enc(slug)})`
}

export function classLinkMarkdown(className, familyName = null) {
  const cls = String(className ?? '').trim()
  const fam = String(familyName ?? '').trim()
  if (!cls) return ''
  if (fam) return `[${safeLabel(fam)}](${FAMILY_PREFIX}${enc(cls)}/${enc(fam)})`
  return `[${safeLabel(cls)}](${CLASS_PREFIX}${enc(cls)})`
}

// The editing box shows the link as its HTML; marked builds it the same way the app does.
export function linkEditorHtml(markdown) {
  return fixDrugLinkNames(marked.parseInline(markdown, { gfm: true }))
}

export function parseTextLink(href) {
  const h = String(href ?? '')
  if (h.startsWith(DRUG_PREFIX)) {
    const slug = dec(h.slice(DRUG_PREFIX.length))
    return slug ? { kind: 'drug', slug } : null
  }
  if (h.startsWith(FAMILY_PREFIX)) {
    const [c, f] = h.slice(FAMILY_PREFIX.length).split('/')
    return c && f ? { kind: 'family', className: dec(c), familyName: dec(f) } : null
  }
  if (h.startsWith(CLASS_PREFIX)) {
    const c = h.slice(CLASS_PREFIX.length)
    return c ? { kind: 'class', className: dec(c) } : null
  }
  return null
}

// Does what the link points at still exist in the app's (published) drug list?
export function textLinkTargetExists(link, drugs) {
  if (!link) return false
  const list = drugs ?? []
  if (link.kind === 'drug')   return list.some(d => d.slug === link.slug || d.id === link.slug)
  if (link.kind === 'class')  return list.some(d => d.class === link.className)
  if (link.kind === 'family') return list.some(d => d.class === link.className && d.subclass === link.familyName)
  return false
}

// Drug names in links saved before the capital-letter rule (or typed by hand) are shown the
// same way as the drug block shows brand names, whatever was saved. Names only, nothing else.
const DRUG_NAME_RE = /(<a\s+href="capsula:drug\/[^"]*"[^>]*>\s*<strong>)([^<]*)(<\/strong>)/g
export function fixDrugLinkNames(html) {
  if (!html || !html.includes('capsula:drug/')) return html
  return html.replace(DRUG_NAME_RE, (_m, open, name, close) => `${open}${toTitleCase(name)}${close}`)
}

const LINK_RE = /<a\s+href="(capsula:[^"]*)"[^>]*>([\s\S]*?)<\/a>/g

function unescapeAttr(s) {
  return s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
}

// Used on the app screen only. While the drug list has not loaded yet the links are
// left as they are (a tap then does nothing), so they do not flash into plain text.
export function resolveTextLinks(html, drugs, drugsReady = true) {
  if (!html || !html.includes('capsula:')) return html
  return html.replace(LINK_RE, (whole, href, inner) => {
    if (!drugsReady) return whole
    const link = parseTextLink(unescapeAttr(href))
    return textLinkTargetExists(link, drugs) ? whole : inner
  })
}
