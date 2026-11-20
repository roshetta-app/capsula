/**
 * useOpenDrug — the one door for opening a drug from a list (Roshetta plan, Phase K, step 12.7a).
 *
 * Returns openDrug(drug). It opens the drug page as one new step through the shared tap guard
 * (a double tap opens it once, so one Back returns), and writes the drug to "recently viewed"
 * through the screen's own writer when one is given (pass the screen's addRecentDrug; the screen
 * keeps its single copy of that list). The rules are in utils/openDrug.js.
 * Used by the Drugs screen (search results, category lists, the class sheet and recent sheet)
 * and the Classes screen. Steps 12.7b and 12.7c move the other doors to it.
 */
import { useCallback } from 'react'
import { useTapGuard } from './useTapGuard'
import { openDrugWith } from '../utils/openDrug'
import { ROUTES } from '../router'

export function useOpenDrug(addRecent) {
  const { openPage } = useTapGuard()
  return useCallback(
    drug => openDrugWith(drug, { openPage, addRecent, pathFor: ROUTES.DRUG_DETAIL }),
    [openPage, addRecent],
  )
}
