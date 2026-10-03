/**
 * src/utils/classSearch.js
 * Class search mode (CLASS_SEARCH_MODE_PLAN.md, 2026-10-04).
 *
 * Everything the third Drugs search mode ('class') needs that is not a screen:
 * building the list of classes and subclasses from the drugs already in the
 * app, matching the typed text against their names, and 'Did you mean' names.
 * Pure functions, no hooks, no network, no database. The drugs list is the
 * same flat list Brand and Generic mode use (one entry per brand row, each
 * carrying 'class' and 'subclass'), so Class mode works offline.
 *
 * What a result is:
 *   - A class entry: one per distinct class name. Counts are brand rows in
 *     that class (including brands that have a class but no subclass), plus
 *     how many distinct subclasses the class has.
 *   - A subclass entry: one per class + subclass pair. A subclass that sits
 *     under several classes is NOT merged: it appears once under each class,
 *     with the count of that class only. Names are compared exactly as stored
 *     (the same way the class sheet groups its drugs), so the entry the user
 *     taps always opens the same drugs the class sheet would show.
 *
 * Matching rules (plan section 4):
 *   - Text is normalised with normalizeSearchText, same as the other modes.
 *   - Needs 2+ characters. The caller shows the 'type at least 2 characters'
 *     message for 1 character, so this file never searches for less.
 *   - Tiers, stopping at the first tier that finds anything: 1 starts with,
 *     2 a word starts with it, 3 anywhere in the name (only at 4+ characters).
 *     Classes and subclasses run through the tiers separately, so a class can
 *     match at tier 1 while its subclasses match at tier 2.
 *   - Tier 2 splits names at anything that is not a letter or a number, so a
 *     short abbreviation inside brackets ('SSRI' in 'Selective serotonin
 *     reuptake inhibitor (SSRI)') matches from 2 characters on.
 *   - Order inside a group: an exact name first, then more brands, then A to Z.
 *   - No strength or form parsing (those belong to drugs, not groups).
 *
 * 'Did you mean' uses the same letter-difference rule as the other modes
 * (editDistance and maxAllowedEdits from searchUtils.js): same first letter,
 * tolerance grows with the length of the typed text.
 */

import { normalizeSearchText, editDistance, maxAllowedEdits } from './searchUtils'

// Makes every word start with a capital letter, including the words after a
// plus sign, slash, bracket or hyphen. Only the first letter of each word is
// touched, so names that are already capitalised ('ACE', 'SGLT2') stay as
// they are. Shared by the class sheet and the Class search cards so a name
// reads the same everywhere. Pure function.
export function titleCaseWords(text) {
  return (text ?? '').replace(/(^|[\s+/(-])([a-z])/g, (_, lead, ch) => lead + ch.toUpperCase())
}

// Splits already-normalised text into words, dropping brackets, plus signs,
// slashes and other punctuation.
function tokenize(normalized) {
  return normalized.split(/[^\p{L}\p{N}]+/u).filter(Boolean)
}

/**
 * Builds the class and subclass entries from the flat drugs list.
 *
 * @param {object[]} drugs — flat drug rows, each with optional 'class' and 'subclass'
 * @returns {{ classes: object[], subclasses: object[] }}
 *   classes:    { name, norm, tokens, brandCount, subclassCount }
 *   subclasses: { name, className, norm, tokens, brandCount }
 */
export function buildClassIndex(drugs) {
  const classMap = new Map()
  const subMap   = new Map()

  for (const d of drugs ?? []) {
    const cls = d.class
    if (!cls) continue

    let c = classMap.get(cls)
    if (!c) {
      const norm = normalizeSearchText(cls)
      c = { name: cls, norm, tokens: tokenize(norm), brandCount: 0, subs: new Set() }
      classMap.set(cls, c)
    }
    c.brandCount += 1

    const sub = d.subclass
    if (!sub) continue
    c.subs.add(sub)

    const key = `${cls}\u0000${sub}`
    let s = subMap.get(key)
    if (!s) {
      const norm = normalizeSearchText(sub)
      s = { name: sub, className: cls, norm, tokens: tokenize(norm), brandCount: 0 }
      subMap.set(key, s)
    }
    s.brandCount += 1
  }

  const classes = [...classMap.values()].map(c => ({
    name:          c.name,
    norm:          c.norm,
    tokens:        c.tokens,
    brandCount:    c.brandCount,
    subclassCount: c.subs.size,
  }))
  const subclasses = [...subMap.values()]

  return { classes, subclasses }
}

// Does this entry match at the given tier? 'q' is the normalised typed text,
// 'qWords' the same text split into words and joined with single spaces.
function entryMatchesAtTier(entry, q, qWords, tier) {
  if (tier === 1) return entry.norm.startsWith(q)
  if (tier === 2) {
    if (!qWords) return false
    return (' ' + entry.tokens.join(' ')).includes(' ' + qWords)
  }
  return entry.norm.includes(q)
}

// Exact name first, then more brands, then A to Z.
function sortEntries(entries, q) {
  return entries.slice().sort((a, b) => {
    const aExact = a.norm === q
    const bExact = b.norm === q
    if (aExact !== bExact) return aExact ? -1 : 1
    if (a.brandCount !== b.brandCount) return b.brandCount - a.brandCount
    return a.name.localeCompare(b.name) || (a.className ?? '').localeCompare(b.className ?? '')
  })
}

// First tier that finds anything wins; returns the matches already sorted.
function matchGroup(entries, q, qWords, tiers) {
  for (const tier of tiers) {
    const matched = entries.filter(e => entryMatchesAtTier(e, q, qWords, tier))
    if (matched.length > 0) return sortEntries(matched, q)
  }
  return []
}

/**
 * Finds the classes and subclasses whose names match the typed text.
 *
 * @param {{ classes: object[], subclasses: object[] }} index — from buildClassIndex
 * @param {string} query — what the person typed
 * @returns {{ classes: object[], subclasses: object[] }} — each group sorted,
 *   both empty when the text is under 2 characters or nothing matched
 */
export function searchClassIndex(index, query) {
  const q = normalizeSearchText(query)
  if (q.length < 2) return { classes: [], subclasses: [] }

  const qWords = tokenize(q).join(' ')
  const tiers  = q.length >= 4 ? [1, 2, 3] : [1, 2]

  return {
    classes:    matchGroup(index.classes,    q, qWords, tiers),
    subclasses: matchGroup(index.subclasses, q, qWords, tiers),
  }
}

/**
 * Up to 3 'Did you mean' names, only meant to be called when searchClassIndex
 * found nothing. Compares the typed text with each whole name and with each
 * word of it (3+ letters), same first letter required. Classes come before
 * subclasses on a tie; one name is only offered once even if it exists under
 * several classes.
 *
 * @param {{ classes: object[], subclasses: object[] }} index
 * @param {string} query
 * @returns {string[]} display names (capitalised like the cards), [] if none
 */
export function getClassSearchSuggestions(index, query) {
  const q = normalizeSearchText(query)
  if (q.length === 0) return []
  const allowed = maxAllowedEdits(q.length)
  if (allowed < 0) return []

  const scored = []
  const consider = (entry, isClass) => {
    const candidates = [entry.norm, ...entry.tokens.filter(t => t.length >= 3)]
    let best = null
    for (const cand of candidates) {
      if (!cand || cand[0] !== q[0]) continue
      const d = editDistance(q, cand)
      if (d <= allowed && (best === null || d < best)) best = d
    }
    if (best !== null) scored.push({ entry, d: best, isClass })
  }
  index.classes.forEach(c => consider(c, true))
  index.subclasses.forEach(s => consider(s, false))

  scored.sort((a, b) => {
    if (a.d !== b.d) return a.d - b.d
    if (a.isClass !== b.isClass) return a.isClass ? -1 : 1
    if (a.entry.brandCount !== b.entry.brandCount) return b.entry.brandCount - a.entry.brandCount
    return a.entry.name.localeCompare(b.entry.name)
  })

  const names = []
  const seen  = new Set()
  for (const { entry } of scored) {
    if (seen.has(entry.norm)) continue
    seen.add(entry.norm)
    names.push(titleCaseWords(entry.name))
    if (names.length === 3) break
  }
  return names
}
