/**
 * src/components/drugs/classes/classGrouping.js
 *
 * 2026-10-08 (refactor, phase 2): the pure helpers of the class sheet moved here
 * from ClassSheet.jsx, word for word. They have no hooks and no screen code, so
 * they can be checked on their own. No behaviour change.
 */

// Groups drugs by subclass name, biggest group first; groups of the same size
// go A to Z. Drugs without a subclass are skipped. Pure function, no hooks,
// so it can be checked on its own.
export function groupBySubclass(drugs) {
  const map = new Map()
  for (const d of drugs) {
    if (!d.subclass) continue
    if (!map.has(d.subclass)) map.set(d.subclass, [])
    map.get(d.subclass).push(d)
  }
  return [...map.entries()]
    .map(([name, items]) => ({ name, items }))
    .sort((a, b) => b.items.length - a.items.length || a.name.localeCompare(b.name))
}

// Key and label of the 'Other families' card that collects the families with
// only one drug each.
export const OTHERS_KEY   = '__other_families__'
export const OTHERS_LABEL = 'Other families'

// Key of the first row (opens every brand in the class) lives in classKeys.js,
// so the Drugs screen can open the sheet straight on it without importing the sheet.
export const ALL_LABEL = 'All drugs in this class'

// Builds the cards of the subclass list. Families with a single drug are
// collected into one 'Other families' card, put last, but only when there are
// at least two of them and at least one bigger family stays in the list (with
// fewer, the card would save nothing). Pure function, no hooks, so it can be
// checked on its own.
export function buildListGroups(groups) {
  const singles = groups.filter(g => g.items.length === 1)
  const bigger  = groups.filter(g => g.items.length !== 1)
  if (singles.length < 2 || bigger.length === 0) return groups
  return [
    ...bigger,
    { name: OTHERS_KEY, items: singles.flatMap(g => g.items), isOthers: true },
  ]
}

// A keyword as shown: the first letter capital, the rest as written.
export function capFirst(text) {
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : text
}

// Sorts keyword texts A to Z and drops repeats (ignoring capital letters).
export function uniqueSorted(words) {
  const seen = new Map()
  for (const w of words) {
    const key = w.trim().toLowerCase()
    if (key && !seen.has(key)) seen.set(key, w.trim())
  }
  return [...seen.values()].sort((a, b) => a.localeCompare(b))
}

// Splits the active keywords into the ones that point at the whole class and
// the ones that point at one family of it (a Map: family name -> words).
// Pure function, no hooks, so it can be checked on its own.
export function splitKeywords(keywords, className) {
  const classWords = []
  const byFamily   = new Map()
  for (const k of keywords ?? []) {
    if (!k || !k.keyword) continue
    for (const t of k.targets ?? []) {
      if (!t || t.class !== className) continue
      if (t.subclass) {
        if (!byFamily.has(t.subclass)) byFamily.set(t.subclass, [])
        byFamily.get(t.subclass).push(k.keyword)
      } else {
        classWords.push(k.keyword)
      }
    }
  }
  return {
    classWords:   uniqueSorted(classWords),
    familyWords:  new Map([...byFamily].map(([name, words]) => [name, uniqueSorted(words)])),
  }
}
