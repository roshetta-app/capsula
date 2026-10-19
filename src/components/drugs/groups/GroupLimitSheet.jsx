/**
 * src/components/drugs/groups/GroupLimitSheet.jsx
 * 2026-10-19 (Drug groups plan, step 7.1): the "you hit a free limit" sheet for
 * drug groups. A thin wrapper around the shared PaywallGateSheet, the same way
 * FavouriteLimitSheet is, so it looks and behaves like the favourites one.
 *
 * Shown only to free accounts. A Pro account at its limit gets a short message
 * instead (see showGroupLimit in useDrugGroups.js), because the Pro upsell
 * button would be wrong for it.
 *
 * Props:
 *   isOpen   boolean
 *   kind     'groups' | 'drugs'   (kept while the sheet closes, so the text does not change mid-slide)
 *   onClose  () => void
 */

import { Folder } from 'lucide-react'
import PaywallGateSheet from '../../ui/PaywallGateSheet'
import {
  DRUG_GROUPS_CAP_FREE,
  DRUG_GROUPS_CAP_PRO,
  DRUG_GROUP_DRUGS_CAP_FREE,
  DRUG_GROUP_DRUGS_CAP_PRO,
} from '../../../constants/features'

export default function GroupLimitSheet({ isOpen, kind, onClose }) {
  const isGroups = kind !== 'drugs'

  return (
    <PaywallGateSheet
      isOpen={isOpen}
      onClose={onClose}
      icon={Folder}
      countLabel={isGroups
        ? `${DRUG_GROUPS_CAP_FREE}/${DRUG_GROUPS_CAP_FREE}`
        : `${DRUG_GROUP_DRUGS_CAP_FREE}/${DRUG_GROUP_DRUGS_CAP_FREE}`}
      headline={isGroups ? 'Group limit reached' : 'This group is full'}
      message={isGroups
        ? <>Free accounts can keep {DRUG_GROUPS_CAP_FREE} group, go <strong>Pro</strong> for up to {DRUG_GROUPS_CAP_PRO}.</>
        : <>Free accounts can keep {DRUG_GROUP_DRUGS_CAP_FREE} drugs in a group, go <strong>Pro</strong> for up to {DRUG_GROUP_DRUGS_CAP_PRO}.</>}
      dismissLabel="Maybe Later"
    />
  )
}
