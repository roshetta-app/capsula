/**
 * src/components/drugs/groups/groupMessages.js
 * 2026-10-19 (Drug groups plan, step 5.1): the short refusal messages shown
 * from the drug page's Add to group sheet, kept in one place. (The Drugs home
 * and the editor still carry their own copies of the same wording; they move
 * here in a later tidy-up.) The limit sheet replaces the limit messages in
 * Phase 7.
 */

import { DRUG_GROUPS_CAP_FREE, DRUG_GROUP_DRUGS_CAP_FREE, DRUG_GROUP_DRUGS_CAP_PRO } from '../../../constants/features'

export const OFFLINE_MESSAGE = "You're offline. Reconnect to change your groups."
export const READ_ONLY_MESSAGE = 'Your groups are read only. Delete a group or upgrade to edit.'

// 2026-10-21 (limits review): wording follows the caps in constants/features.js. The Pro
// group cap is a safety cap that is never shown as a number.
export function groupsLimitMessage(isPro) {
  return isPro
    ? "You've reached the most groups an account can have. Delete one to add another."
    : `Free accounts can have ${DRUG_GROUPS_CAP_FREE} groups. Pro lets you add many more.`
}

export function drugsLimitMessage(isPro) {
  return isPro
    ? `A group can hold up to ${DRUG_GROUP_DRUGS_CAP_PRO} drugs. Remove one to add another.`
    : `Free accounts can have ${DRUG_GROUP_DRUGS_CAP_FREE} drugs in a group. Pro lets you have up to ${DRUG_GROUP_DRUGS_CAP_PRO}.`
}

// 2026-10-19 (Drug groups plan, step 8.3): Save to my groups, on the shared page.
export const SAVE_OFFLINE_MESSAGE = "You're offline. Reconnect to save."
export const SAVE_READ_ONLY_MESSAGE = 'Your groups are read only. Upgrade to save this group.'

export function savedGroupMessage(saved, total) {
  return saved < total
    ? `Saved ${saved} of ${total} drugs. Upgrade to Pro to keep all of them.`
    : 'Saved to your groups'
}
