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
 *
 * 2026-10-06 (plurals): when the typed text finds no class or subclass by name, the
 * same search is repeated with its words made singular ('antibiotics' finds
 * 'Antibiotic', 'beta blockers' finds 'Beta blocker'). The hint in Brand and
 * Generic mode does the same. Typed singular already finds a stored plural.
 *
 * Keywords (class keywords plan, CLASS_SEARCH_MODE_PLAN.md section 8, phase C,
 * 2026-10-04): a keyword is a common word ('vomiting') that points at one or
 * more classes or families by NAME. They are an extra pass on top of the name
 * matching above, which is unchanged:
 *   - buildKeywordIndex joins the keyword list to the real class and subclass
 *     entries. A target whose class or family no longer exists is dropped
 *     silently (names are plain text, so a rename just breaks the link), and a
 *     keyword with no live target is dropped altogether.
 *   - searchClassIndex runs the name matching first, then adds keyword hits
 *     BELOW the name hits in each group. An entry already shown by name is not
 *     shown again. A keyword hit is a copy of the entry with 'matchedKeyword'
 *     set to the keyword's text (for the 'matches: ...' line, phase D).
 *   - Filler words ('drugs', 'for', 'medicine'...) are dropped from the typed
 *     text before keyword matching only, so 'vomiting drugs' finds 'vomiting'.
 *     Every remaining typed word must start a word of the keyword (or the
 *     keyword must start with the whole remaining phrase). 2+ characters.
 *   - Order of keyword hits: an exact keyword first, then more brands, then
 *     A to Z.
 *   - 'Did you mean' can also offer a keyword when the typed text is a small
 *     typo of it; names still come before keywords on a tie.
 *
 * Plurals and 'with' (2026-10-05, keyword pass only; name matching is
 * unchanged): a typed word also matches a keyword word when its singular form
 * does ('headaches' finds 'headache', 'tonsils' finds 'tonsillitis',
 * 'allergies' finds 'allergy'), and 'with' is a filler word like 'in' ('anemia
 * with pregnancy'). Singular forms are only used for words of 4+ letters, so
 * short words ('gas') behave exactly as before.
 *
 * Class hint (2026-10-05): searchClassHint is a stricter, quieter version of
 * searchClassIndex for the 'Also in Class mode' hint shown in Brand and
 * Generic mode. Same entries, same keyword join, but it needs 3+ characters
 * and only counts names where the whole name or one of its words STARTS with
 * the typed text (tiers 1 and 2; never 'anywhere in the name'), plus keywords
 * by the same word-start rule. So a two-letter fragment of a drug name stays
 * quiet, while 'ssri', 'antibiotic' or 'vomiting' still finds its class.
 * Class mode itself keeps using searchClassIndex, unchanged.
 *
 * Keyword hits also carry 'matchedExact' (true when the typed words, without
 * filler or a plural ending, are the keyword itself). keywordHitsToLog uses it
 * so the usage log counts a keyword only when it was really typed, not while
 * it is half-typed (phase G).
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

// 2026-10-06 (plurals in class names): the typed text again, with its words made
// singular ('antibiotics' -> 'antibiotic', 'beta blockers' -> 'beta blocker',
// 'anti-inflammatories' -> 'anti-inflammatory'). Up to three variants, because
// a word can lose '-ies' -> 'y', '-es' or '-s'. Used only when the typed text
// itself finds nothing. A typed singular already finds a stored plural by
// 'starts with', so that direction needs nothing.
function singularQueryVariants(q) {
  const words = q.split(' ').filter(Boolean)
  const out = []
  for (let k = 0; k < 3; k++) {
    const variant = words.map(w => {
      const forms = singularForms(w)
      return forms.length > k ? forms[k] : (forms.length > 0 ? forms[forms.length - 1] : w)
    }).join(' ')
    if (variant !== q && !out.includes(variant)) out.push(variant)
  }
  return out
}

// matchGroup on the typed text first; if that finds nothing, on its singular
// variants (first one that finds anything wins).
function matchGroupWithPlurals(entries, q, tiersFor) {
  const direct = matchGroup(entries, q, tokenize(q).join(' '), tiersFor(q))
  if (direct.length > 0) return direct
  for (const v of singularQueryVariants(q)) {
    const found = matchGroup(entries, v, tokenize(v).join(' '), tiersFor(v))
    if (found.length > 0) return found
  }
  return []
}

// Words that only describe 'a drug for X' and never help find a keyword.
const KEYWORD_FILLER = new Set([
  'a', 'an', 'the', 'of', 'for', 'to', 'in', 'with', 'and', 'or',
  'drug', 'drugs', 'medicine', 'medicines', 'medication', 'medications',
  'treatment', 'treatments', 'agent', 'agents',
])

// The typed words that matter for keyword matching (filler removed).
function keywordQueryWords(q) {
  return tokenize(q).filter(w => !KEYWORD_FILLER.has(w))
}

// Possible singular forms of a typed word ('headaches' -> 'headache',
// 'allergies' -> 'allergy'). Words under 4 letters are left alone.
function singularForms(word) {
  if (!word || word.length < 4) return []
  const out = []
  if (word.endsWith('ies') && word.length >= 5) out.push(word.slice(0, -3) + 'y')
  if (word.endsWith('es')) out.push(word.slice(0, -2))
  if (word.endsWith('s') && !word.endsWith('ss')) out.push(word.slice(0, -1))
  return out.filter(w => w.length >= 3)
}

// Does a typed word match this word of a keyword? Same 'starts with' rule as
// before, plus the same test with the typed word's singular form (a singular
// of 3 letters only counts when it is the whole word: 'ears' = 'ear').
function wordMatchesToken(word, token) {
  if (token.startsWith(word)) return true
  return singularForms(word).some(s => token === s || (s.length >= 4 && token.startsWith(s)))
}

/**
 * Joins the keyword list to the real class and subclass entries.
 *
 * @param {{ classes: object[], subclasses: object[] }} index — from buildClassIndex
 * @param {object[]} keywords — [{ keyword, targets: [{ class, subclass }] }]
 * @returns {object[]} [{ keyword, norm, tokens, classes: [entry], subclasses: [entry] }],
 *   only keywords with at least one target that still exists
 */
export function buildKeywordIndex(index, keywords) {
  if (!index || !Array.isArray(keywords) || keywords.length === 0) return []

  const classByName = new Map(index.classes.map(c => [c.name, c]))
  const subByKey    = new Map(index.subclasses.map(s => [`${s.className}\u0000${s.name}`, s]))

  const out = []
  for (const k of keywords) {
    const norm = normalizeSearchText(k?.keyword)
    if (norm.length < 2) continue

    const classes = new Set()
    const subs    = new Set()
    for (const t of k.targets ?? []) {
      if (!t || !t.class) continue
      if (t.subclass) {
        const sub = subByKey.get(`${t.class}\u0000${t.subclass}`)
        if (sub) subs.add(sub)
      } else {
        const cls = classByName.get(t.class)
        if (cls) classes.add(cls)
      }
    }
    if (classes.size + subs.size === 0) continue

    out.push({
      keyword:    k.keyword,
      norm,
      tokens:     tokenize(norm),
      classes:    [...classes],
      subclasses: [...subs],
    })
  }
  return out
}

// 0 = exact keyword, 1 = keyword starts with the typed phrase, 2 = every typed
// word starts a word of the keyword, -1 = no match.
function keywordMatchRank(kw, words, phrase) {
  const core = kw.tokens.filter(t => !KEYWORD_FILLER.has(t)).join(' ')
  if (kw.norm === phrase || core === phrase) return 0
  // Same test with the last typed word in its singular form ('headaches').
  const last = words[words.length - 1]
  for (const s of singularForms(last)) {
    const alt = [...words.slice(0, -1), s].join(' ')
    if (kw.norm === alt || core === alt) return 0
  }
  if (kw.norm.startsWith(phrase)) return 1
  if (words.every(w => kw.tokens.some(t => wordMatchesToken(w, t)))) return 2
  return -1
}

// Keyword hits for the typed text, split into classes and subclasses, each
// sorted (exact keyword, more brands, A to Z). Entries in 'skip' (already shown
// by name) are left out. Each hit is a copy carrying 'matchedKeyword'.
function matchKeywords(keywordIndex, q, skip) {
  const words  = keywordQueryWords(q)
  const phrase = words.join(' ')
  if (phrase.length < 2) return { classes: [], subclasses: [] }

  const bestClass = new Map()
  const bestSub   = new Map()
  const consider = (map, entry, rank, keyword) => {
    if (skip.has(entry)) return
    const cur = map.get(entry)
    if (!cur || rank < cur.rank || (rank === cur.rank && keyword.localeCompare(cur.keyword) < 0)) {
      map.set(entry, { rank, keyword })
    }
  }
  for (const kw of keywordIndex) {
    const rank = keywordMatchRank(kw, words, phrase)
    if (rank < 0) continue
    kw.classes.forEach(e => consider(bestClass, e, rank, kw.keyword))
    kw.subclasses.forEach(e => consider(bestSub, e, rank, kw.keyword))
  }

  const finish = map => [...map.entries()]
    .sort(([ea, a], [eb, b]) => {
      if ((a.rank === 0) !== (b.rank === 0)) return a.rank === 0 ? -1 : 1
      if (ea.brandCount !== eb.brandCount) return eb.brandCount - ea.brandCount
      return ea.name.localeCompare(eb.name) || (ea.className ?? '').localeCompare(eb.className ?? '')
    })
    .map(([entry, hit]) => ({ ...entry, matchedKeyword: hit.keyword, matchedExact: hit.rank === 0 }))

  return { classes: finish(bestClass), subclasses: finish(bestSub) }
}

/**
 * Finds the classes and subclasses whose names match the typed text.
 *
 * @param {{ classes: object[], subclasses: object[] }} index — from buildClassIndex
 * @param {string} query — what the person typed
 * @param {object[]} [keywordIndex] — from buildKeywordIndex; omit for name-only search
 * @returns {{ classes: object[], subclasses: object[] }} — each group sorted
 *   (name hits first, then keyword hits carrying 'matchedKeyword'), both empty
 *   when the text is under 2 characters or nothing matched
 */
export function searchClassIndex(index, query, keywordIndex = null) {
  const q = normalizeSearchText(query)
  if (q.length < 2) return { classes: [], subclasses: [] }

  const tiersFor = text => (text.length >= 4 ? [1, 2, 3] : [1, 2])

  const byName = {
    classes:    matchGroupWithPlurals(index.classes,    q, tiersFor),
    subclasses: matchGroupWithPlurals(index.subclasses, q, tiersFor),
  }
  if (!keywordIndex || keywordIndex.length === 0) return byName

  const skip = new Set([...byName.classes, ...byName.subclasses])
  const byKeyword = matchKeywords(keywordIndex, q, skip)
  return {
    classes:    [...byName.classes,    ...byKeyword.classes],
    subclasses: [...byName.subclasses, ...byKeyword.subclasses],
  }
}

/**
 * Stricter search for the Class hint in Brand and Generic mode (see the header
 * note). Needs 3+ characters; names match only by 'starts with' or 'a word
 * starts with' (never anywhere in the name); keywords need 3+ characters once
 * filler words are removed.
 *
 * @param {{ classes: object[], subclasses: object[] }} index — from buildClassIndex
 * @param {string} query — what the person typed
 * @param {object[]} [keywordIndex] — from buildKeywordIndex; omit for name-only
 * @returns {{ classes: object[], subclasses: object[] }} — same shape as
 *   searchClassIndex; both empty when the text is under 3 characters or
 *   nothing matched strictly
 */
export function searchClassHint(index, query, keywordIndex = null) {
  const q = normalizeSearchText(query)
  if (q.length < 3) return { classes: [], subclasses: [] }

  const tiersFor = () => [1, 2]

  const byName = {
    classes:    matchGroupWithPlurals(index.classes,    q, tiersFor),
    subclasses: matchGroupWithPlurals(index.subclasses, q, tiersFor),
  }
  if (!keywordIndex || keywordIndex.length === 0) return byName
  if (keywordQueryWords(q).join(' ').length < 3) return byName

  const skip = new Set([...byName.classes, ...byName.subclasses])
  const byKeyword = matchKeywords(keywordIndex, q, skip)
  return {
    classes:    [...byName.classes,    ...byKeyword.classes],
    subclasses: [...byName.subclasses, ...byKeyword.subclasses],
  }
}

/**
 * The keywords worth counting in the usage log for one search: only those the
 * typed words match exactly (see 'matchedExact'), each once, lower-case.
 *
 * @param {{ classes: object[], subclasses: object[] }} found — from searchClassIndex
 * @returns {string[]}
 */
export function keywordHitsToLog(found) {
  const out = new Set()
  for (const e of [...(found?.classes ?? []), ...(found?.subclasses ?? [])]) {
    if (e.matchedKeyword && e.matchedExact) out.add(String(e.matchedKeyword).toLowerCase())
  }
  return [...out]
}

/**
 * Up to 3 'Did you mean' names, only meant to be called when searchClassIndex
 * found nothing. Compares the typed text with each whole name and with each
 * word of it (3+ letters), same first letter required. Classes come before
 * subclasses on a tie; one name is only offered once even if it exists under
 * several classes.
 *
 * Keywords are offered too (typed text with filler words removed, compared with
 * the whole keyword and each word of it); a name wins over a keyword on a tie.
 *
 * @param {{ classes: object[], subclasses: object[] }} index
 * @param {string} query
 * @param {object[]} [keywordIndex] — from buildKeywordIndex
 * @returns {string[]} display names (capitalised like the cards), [] if none
 */
export function getClassSearchSuggestions(index, query, keywordIndex = null) {
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

  // Keywords: compared using the typed words without filler ('nausia drugs').
  if (keywordIndex && keywordIndex.length > 0) {
    const qk = keywordQueryWords(q).join(' ')
    const allowedK = qk.length >= 2 ? maxAllowedEdits(qk.length) : -1
    if (allowedK >= 0) {
      for (const kw of keywordIndex) {
        const candidates = [kw.norm, ...kw.tokens.filter(t => t.length >= 3)]
        let best = null
        for (const cand of candidates) {
          if (!cand || cand[0] !== qk[0]) continue
          const d = editDistance(qk, cand)
          if (d <= allowedK && (best === null || d < best)) best = d
        }
        if (best !== null) {
          scored.push({ entry: { norm: kw.norm, name: kw.keyword, brandCount: 0 }, d: best, isClass: false, isKeyword: true })
        }
      }
    }
  }

  scored.sort((a, b) => {
    if (a.d !== b.d) return a.d - b.d
    if (Boolean(a.isKeyword) !== Boolean(b.isKeyword)) return a.isKeyword ? 1 : -1
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
