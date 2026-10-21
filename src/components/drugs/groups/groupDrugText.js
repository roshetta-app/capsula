/**
 * src/components/drugs/groups/groupDrugText.js
 * 2026-10-19 (Drug groups plan, step 4.3): the wording helpers for a drug row
 * in the group editor, kept apart from the component so the screen reloads
 * cleanly while editing: the title (brand name with its pack suffix) and the
 * generic line. Same rules as the drug card (SharedDrugCard.jsx).
 */

import { toTitleCase, getDrugTitleSuffix, TITLE_HIDDEN_MODIFIER_TAGS } from '../../../utils/drugTitleFormat'

export function drugRowTitle(drug) {
  const suffix = getDrugTitleSuffix(drug, { omitModifierTags: TITLE_HIDDEN_MODIFIER_TAGS })
  return [toTitleCase(drug.tradenameClean || ''), suffix].filter(Boolean).join(' ')
}

export function drugGenericLine(drug) {
  if (drug.ingredients?.length > 0) {
    return drug.ingredients.length > 2
      ? `${drug.ingredients.slice(0, 2).map(toTitleCase).join(', ')} +${drug.ingredients.length - 2}`
      : drug.ingredients.map(toTitleCase).join(', ')
  }
  return toTitleCase(drug.genericName || '')
}

// One collator for every name sort in the group screens. Building a collator is the slow part
// of localeCompare, and a sort calls it hundreds of times.
const NAME_COLLATOR = new Intl.Collator()
const TITLE_COLLATOR = new Intl.Collator(undefined, { sensitivity: 'base' })

// The first 'count' names in alphabetical order, in one pass (the list rows show three).
// Same result as sorting every name and taking the first three.
export function firstNames(ids, nameById, count = 3) {
  const best = []
  for (const id of ids) {
    const name = nameById.get(id)
    if (!name) continue
    if (best.length === count && NAME_COLLATOR.compare(name, best[count - 1]) >= 0) continue
    let i = best.length
    while (i > 0 && NAME_COLLATOR.compare(name, best[i - 1]) < 0) i--
    best.splice(i, 0, name)
    if (best.length > count) best.pop()
  }
  return best
}

// The drugs of a group in title order. Each title is built once, not twice per comparison.
export function sortDrugsByTitle(drugs) {
  return drugs
    .map(drug => ({ drug, title: drugRowTitle(drug) }))
    .sort((a, b) => TITLE_COLLATOR.compare(a.title, b.title))
    .map(x => x.drug)
}

