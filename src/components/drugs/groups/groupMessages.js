/**
 * src/components/drugs/groups/groupMessages.js
 * 2026-10-19 (Drug groups plan, step 5.1): the short refusal messages shown
 * from the drug page's Add to group sheet, kept in one place. (The Drugs home
 * and the editor still carry their own copies of the same wording; they move
 * here in a later tidy-up.) The limit sheet replaces the limit messages in
 * Phase 7.
 */

export const OFFLINE_MESSAGE = "You're offline. Reconnect to change your groups."
export const READ_ONLY_MESSAGE = 'Your groups are read only. Delete a group or upgrade to edit.'

export function groupsLimitMessage(isPro) {
  return isPro
    ? "You've reached 100 groups. Delete one to add another."
    : 'Free accounts can keep 1 group. Upgrade to Pro for more.'
}

export function drugsLimitMessage(isPro) {
  return isPro
    ? 'A group can hold 50 drugs. Remove one to add another.'
    : 'Free accounts can keep 20 drugs in a group. Upgrade to Pro for 50.'
}
