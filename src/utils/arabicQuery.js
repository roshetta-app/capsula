/**
 * src/utils/arabicQuery.js
 *
 * 2026-10-14 (plan v9 Session 13 follow-up, 'Arabic search like English'):
 * reads a typed Arabic brand query the way the English search reads 'panadol
 * 500mg tab': name + strength + form. Three pieces live here:
 *
 *  1. Arabic text cleanup (moved here from searchUtils.js so this file has no
 *     import from it; searchUtils re-exports both functions, nothing else that
 *     imports them changes). Mirrors the database function ar_search_norm.
 *  2. arabicUnitsToLatin: turns Arabic unit words that follow a number into the
 *     English units the stored strengths use (4 مجم/2 مل becomes 4 mg/2 ml), so
 *     the existing English strength reader and strength check can be reused.
 *  3. extractArabicForm: finds an Arabic dosage-form word (قرص, امبول, شراب ...)
 *     and points it at the same stored forms the English form chips use.
 *
 * Built from the form words and units that really occur in the 8,511 shown
 * Arabic titles. The first typed word is always part of the name (a brand may
 * start with a form-like word). Comparison-only: nothing here changes what is
 * shown on screen.
 */
import { FORM_OPTIONS } from '../components/drugs/DrugFilterPanel'

// ─── Cleanup (same rules as the database's ar_search_norm) ───────────────────
// Diacritics (U+064B-0652, U+0670) and tatweel (U+0640) removed; hamza alef forms
// to alef; alef maqsura to ya; ta marbuta to ha; hamza on waw to waw; hamza on ya
// to ya; Arabic-Indic digits to Western; leading 'al-' dropped per word; hyphens
// removed; spaces collapsed.
const AR_LETTER_RE = /[\u0600-\u06FF]/
const AR_FOLD = {
  '\u0623': '\u0627', '\u0625': '\u0627', '\u0622': '\u0627', '\u0671': '\u0627',
  '\u0649': '\u064A', '\u0629': '\u0647', '\u0624': '\u0648', '\u0626': '\u064A',
}

export function hasArabicLetters(text) {
  return AR_LETTER_RE.test(text ?? '')
}

export function arSearchNorm(text) {
  return (text ?? '')
    .replace(/[\u064B-\u0652\u0670\u0640]/g, '')
    .replace(/[\u0623\u0625\u0622\u0671\u0649\u0629\u0624\u0626]/g, c => AR_FOLD[c])
    .replace(/[\u0660-\u0669]/g, c => String(c.charCodeAt(0) - 0x0660))
    .replace(/[\u06F0-\u06F9]/g, c => String(c.charCodeAt(0) - 0x06F0))
    .replace(/-/g, '')
    .replace(/(^|\s)\u0627\u0644(?=\S)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()
}

// ─── Strength: Arabic units to the English units used by stored strengths ────
// Written in cleaned spelling (ta marbuta as ha, hamza forms as plain alef).
// Only read when they directly follow a number, so a word that merely looks like
// a unit is never touched.
const AR_UNIT_WORDS = {
  mg:  ['مجم', 'ملجم', 'ملغم', 'ملغ', 'ملجرام', 'ملغرام', 'مجرام', 'ميلي جرام', 'ميلي غرام', 'ميليجرام'],
  mcg: ['مكجم', 'مكغم', 'مكج', 'مكغ', 'ميكروجرام', 'ميكروغرام', 'ميكرو جرام', 'ميكرو غرام', 'ميكرو'],
  g:   ['جم', 'جرام', 'جرامات', 'غرام', 'غم'],
  ml:  ['مل', 'ملل', 'ملي', 'مليلتر'],
  iu:  ['وحده دوليه', 'وحدات دوليه', 'وحده عالميه', 'وحدات عالميه'],
}
const AR_UNIT_TO_EN = {}
for (const [en, words] of Object.entries(AR_UNIT_WORDS)) {
  for (const w of words) AR_UNIT_TO_EN[w] = en
}
const AR_UNIT_ALTERNATION = Object.keys(AR_UNIT_TO_EN)
  .sort((a, b) => b.length - a.length)
  .join('|')
const AR_NOT_LETTER = '(?![\\u0600-\\u06FF])'
const AR_UNIT_RE = new RegExp(`(\\d+(?:\\.\\d+)?)\\s*(${AR_UNIT_ALTERNATION})${AR_NOT_LETTER}`, 'g')
const AR_PER_ML_RE = new RegExp(`/\\s*(?:مل|ملل|ملي)${AR_NOT_LETTER}`, 'g')
// A plain 'وحدة' / 'وحدات' after a number is read as international units unless the
// next word shows it is a pack word ('20 وحدة مفردة' = 20 single doses).
const AR_PLAIN_UNIT_RE = new RegExp(
  `(\\d+(?:\\.\\d+)?)\\s*(?:وحده|وحدات)${AR_NOT_LETTER}(?!\\s*(?:مفرد|منفصل|منفرد|موحد|جرع))`, 'g')

/**
 * Cleans a typed Arabic query and turns the Arabic units after numbers into
 * English ones: '4 مجم/2 مل' gives '4 mg/2 ml', '5مجم/مل' gives '5 mg/ml',
 * '2٪' gives '2%'. Arabic-Indic digits and the Arabic decimal mark are read too.
 * Words that are not units stay as they are (cleaned).
 */
export function arabicUnitsToLatin(text) {
  const cleaned = arSearchNorm(
    (text ?? '').replace(/\u066B/g, '.').replace(/\u066A/g, '%')
  )
  return cleaned
    .replace(AR_UNIT_RE, (m, num, unit) => `${num} ${AR_UNIT_TO_EN[unit]}`)
    .replace(AR_PLAIN_UNIT_RE, (m, num) => `${num} iu`)
    .replace(AR_PER_ML_RE, '/ml')
    .replace(/\s+/g, ' ')
    .trim()
}

// Combination strengths ('250/50 mcg', '5/500 mg', '100/62.5/25 mcg', or each part
// with its own unit): the English strength reader would take only one part and leave
// '/50' in the name, so they are read here as a list of parts, e.g. ['250mcg', '50mcg'].
// The stored text may list them in the other order, so the check (drugMatchesStrength)
// compares the parts as a set.
const COMBO_UNIT = '(?:mg|mcg|g|iu)'
const COMBO_EXPLICIT_RE = new RegExp(
  `(\\d+(?:\\.\\d+)?\\s*${COMBO_UNIT}(?:\\s*\\/\\s*\\d+(?:\\.\\d+)?\\s*${COMBO_UNIT})+)(?![a-z])`, 'i')
const COMBO_SHARED_RE = new RegExp(
  `(\\d+(?:\\.\\d+)?(?:\\s*\\/\\s*\\d+(?:\\.\\d+)?)+)\\s*(${COMBO_UNIT})(?![a-z])`, 'i')

/**
 * Reads a combination strength out of text already passed through
 * arabicUnitsToLatin. Returns { value, unit: null, per: null, combo, remainingText }
 * or null when the text has none.
 */
export function extractArabicCombo(text) {
  const t = text ?? ''
  let parts = null
  let m = t.match(COMBO_EXPLICIT_RE)
  if (m) {
    parts = [...m[1].matchAll(/(\d+(?:\.\d+)?)\s*(mg|mcg|g|iu)/gi)].map(x => `${x[1]}${x[2].toLowerCase()}`)
  } else if ((m = t.match(COMBO_SHARED_RE))) {
    const unit = m[2].toLowerCase()
    parts = m[1].split('/').map(n => `${n.trim()}${unit}`)
  }
  if (!parts || parts.length < 2) return null
  const remainingText = (t.slice(0, m.index) + ' ' + t.slice(m.index + m[0].length)).replace(/\s+/g, ' ').trim()
  return { value: parts[0], unit: null, per: null, combo: parts, remainingText }
}

// ─── Form words ──────────────────────────────────────────────────────────────
// Each group lists the Arabic words (cleaned spelling, singular and plural) and the
// existing form chips it points at. The stored form often disagrees with the word
// in the title (sachets are mostly stored as effervescent, 'solution' covers
// several things), so a group can point at more than one chip and add raw stored
// forms; a drug passes when its stored form is in the union.
const FORM_GROUPS = [
  { chips: ['tablet'],
    words: ['قرص', 'اقراص', 'كبسوله', 'كبسول', 'كبسولات', 'حبه', 'حبوب', 'فوار', 'فواره', 'استحلاب'] },
  { chips: ['injection'], extra: ['solution'],
    words: ['امبوله', 'امبول', 'امبولات', 'فيال', 'فيالات', 'حقنه', 'حقن', 'سرنجه', 'سرنجات', 'سرنج',
            'قلم', 'اقلام', 'خرطوشه', 'خراطيش', 'خرطوش'] },
  { chips: ['sachet'], extra: ['effervescent'],
    words: ['كيس', 'اكياس', 'ساشيه', 'ساشي'] },
  { chips: ['suppository'], extra: ['piece'],
    words: ['لبوس', 'لبوسه', 'لبوسات', 'اقماع', 'قمع'] },
  { chips: ['drops'],
    words: ['قطره', 'قطرات', 'نقط', 'نقاط'] },
  { chips: ['spray', 'inhaler'],
    words: ['بخاخ', 'بخاخه', 'بخاخات', 'بخه', 'بخات', 'سبراي', 'رذاذ', 'استنشاق'] },
  { chips: ['inhaler', 'syrup'],
    words: ['نيبولس'] },
  { chips: ['syrup'], extra: ['effervescent'],
    words: ['شراب', 'معلق', 'مستحلب'] },
  { chips: ['syrup', 'drops', 'injection'],
    words: ['محلول'] },
  { chips: ['cream'],
    words: ['كريم', 'لوشن', 'لوسيون', 'مرهم', 'غسول', 'شامبو', 'جل', 'بلسم'] },
  { chips: ['sachet', 'syrup', 'inhaler'], extra: ['effervescent'],
    words: ['بودره', 'بودر', 'باودر', 'مسحوق', 'حبيبات'] },
  { chips: ['cream'], extra: ['piece'],
    words: ['لصقه', 'لصقات', 'لاصقه', 'لاصق', 'باتش', 'باتشات'] },
]

const FORM_OPTION_BY_VALUE = new Map(FORM_OPTIONS.map(opt => [opt.value, opt]))

// word -> { value, matches, routes }, same shape extractFormFromQuery returns, so
// the existing drugMatchesForm check is used unchanged.
const AR_FORM_BY_WORD = new Map()
for (const group of FORM_GROUPS) {
  const matches = new Set(group.extra ?? [])
  const routes = new Set()
  for (const chip of group.chips) {
    const opt = FORM_OPTION_BY_VALUE.get(chip)
    if (!opt) continue
    opt.matches.forEach(m => matches.add(m))
    ;(opt.routes ?? []).forEach(r => routes.add(r))
  }
  const form = { value: group.chips[0], matches: [...matches], routes: [...routes] }
  for (const w of group.words) AR_FORM_BY_WORD.set(w, form)
}

// Small typo tolerance for form words of 5+ letters (one letter wrong, dropped,
// added, or two neighbours swapped), only when the plain reading found nothing.
const TYPO_WORDS = [...AR_FORM_BY_WORD.keys()].filter(w => w.length >= 5)

function oneEditApart(a, b) {
  if (a === b) return false
  if (Math.abs(a.length - b.length) > 1) return false
  if (a.length === b.length) {
    let diff = []
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) diff.push(i)
    if (diff.length === 1) return true
    return diff.length === 2 && diff[1] === diff[0] + 1 && a[diff[0]] === b[diff[1]] && a[diff[1]] === b[diff[0]]
  }
  const [s, l] = a.length < b.length ? [a, b] : [b, a]
  let i = 0
  while (i < s.length && s[i] === l[i]) i++
  return s.slice(i) === l.slice(i + 1)
}

function resolveFormWord(word, allowTypo) {
  const exact = AR_FORM_BY_WORD.get(word)
  if (exact) return exact
  if (!allowTypo || word.length < 5) return null
  const hits = TYPO_WORDS.filter(w => oneEditApart(word, w))
  if (hits.length === 0) return null
  const forms = new Set(hits.map(w => AR_FORM_BY_WORD.get(w)))
  return forms.size === 1 ? AR_FORM_BY_WORD.get(hits[0]) : null
}

/**
 * Finds a dosage-form word in already-cleaned Arabic text (after the strength has
 * been taken out). The first word is never a form word (it starts the name). A bare
 * number right before the form word is a pack count ('5 امبولات') and is dropped
 * with it. Returns { value, matches, routes, matchedText, remainingText } or null.
 */
export function extractArabicForm(text, { allowTypo = false } = {}) {
  const tokens = (text ?? '').split(' ').filter(Boolean)
  // A lone exact form word ('اقراص' alone) is a form with no name, like English 'tab'.
  if (tokens.length === 1 && AR_FORM_BY_WORD.has(tokens[0])) {
    const form = AR_FORM_BY_WORD.get(tokens[0])
    return { value: form.value, matches: form.matches, routes: form.routes, matchedText: tokens[0], remainingText: '' }
  }
  for (let i = 1; i < tokens.length; i++) {
    const form = resolveFormWord(tokens[i], allowTypo)
    if (!form) continue
    const dropFrom = i >= 2 && /^\d+(?:\.\d+)?$/.test(tokens[i - 1]) ? i - 1 : i
    const remaining = [...tokens.slice(0, dropFrom), ...tokens.slice(i + 1)]
    return {
      value: form.value,
      matches: form.matches,
      routes: form.routes,
      matchedText: tokens[i],
      remainingText: remaining.join(' ').trim(),
    }
  }
  return null
}
