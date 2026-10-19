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
