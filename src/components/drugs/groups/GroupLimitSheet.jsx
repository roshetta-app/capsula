/**
 * src/components/drugs/groups/GroupLimitSheet.jsx
 * 2026-10-19 (Drug groups plan, step 7.1): the "you hit a limit" sheet for drug
 * groups. A thin wrapper around the shared PaywallGateSheet, the same way
 * FavouriteLimitSheet is, so it looks and behaves like the favourites one.
 *
 * 2026-10-21 (step 13.3, F13, F17): redrawn as one of the two message sheets
 * (icon, count line, title, short body, one main button, "Not now"):
 *   - the count line says what it counts ("1 of 1 group used");
 *   - the sentence has no comma splice ("Free accounts can have 1 group. Pro
 *     lets you have up to 100.");
 *   - a Pro account at its limit now gets this sheet too, instead of the
 *     floating message bar: no Upgrade button and no lock, one OK button;
 *   - kind 'readonly' is the lapsed account message, shown here instead of a
 *     floating bar when a tap is refused because the groups are read only.
 *
 * Props:
 *   isOpen   boolean
 *   kind     'groups' | 'drugs' | 'readonly'   (kept while the sheet closes, so the text does not change mid-slide)
 *   isPro    boolean   (kept the same way)
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

const groupWord = n => (n === 1 ? 'group' : 'groups')
const drugWord = n => (n === 1 ? 'drug' : 'drugs')

export default function GroupLimitSheet({ isOpen, kind, isPro = false, onClose }) {
  if (kind === 'readonly') {
    return (
      <PaywallGateSheet
        isOpen={isOpen}
        onClose={onClose}
        icon={Folder}
        headline="Your groups are read only"
        message={<>Delete a group or go <strong>Pro</strong> to edit them.</>}
        dismissLabel="Not now"
      />
    )
  }

  const isGroups = kind !== 'drugs'
  const cap = isGroups
    ? (isPro ? DRUG_GROUPS_CAP_PRO : DRUG_GROUPS_CAP_FREE)
    : (isPro ? DRUG_GROUP_DRUGS_CAP_PRO : DRUG_GROUP_DRUGS_CAP_FREE)

  const countLabel = isGroups
    ? `${cap} of ${cap} ${groupWord(cap)} used`
    : `${cap} of ${cap} ${drugWord(cap)} used`
  const headline = isGroups ? 'Group limit reached' : 'This group is full'

  let message
  if (isPro) {
    message = isGroups
      ? `You have ${DRUG_GROUPS_CAP_PRO} groups, the most Pro allows. Delete one to add another.`
      : `A group can hold up to ${DRUG_GROUP_DRUGS_CAP_PRO} drugs. Remove one to add another.`
  } else {
    message = isGroups
      ? <>Free accounts can have {DRUG_GROUPS_CAP_FREE} {groupWord(DRUG_GROUPS_CAP_FREE)}. <strong>Pro</strong> lets you have up to {DRUG_GROUPS_CAP_PRO}.</>
      : <>Free accounts can have {DRUG_GROUP_DRUGS_CAP_FREE} drugs in a group. <strong>Pro</strong> lets you have up to {DRUG_GROUP_DRUGS_CAP_PRO}.</>
  }

  return (
    <PaywallGateSheet
      isOpen={isOpen}
      onClose={onClose}
      icon={Folder}
      countLabel={countLabel}
      headline={headline}
      message={message}
      dismissLabel="Not now"
      showUpgrade={!isPro}
      lockBadge={!isPro}
    />
  )
}
