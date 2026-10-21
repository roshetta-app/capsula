/**
 * src/utils/groupSyncStatus.js
 * 2026-10-20 (Drug groups plan, step 17.6a): which line the groups status
 * (components/drugs/groups/GroupSyncStatus.jsx) shows. Plain function, no screen.
 */

export function syncStatusLine({ online, failedCount, waitingCount, syncState }) {
  if (failedCount > 0) {
    return { tone: 'warning', title: `${failedCount} change${failedCount === 1 ? '' : 's'} couldn't be saved.` }
  }
  if (!online) return { tone: 'neutral', title: "Offline. Changes are saved on this phone." }
  if (syncState === 'syncing') return { tone: 'neutral', title: 'Saving your changes…' }
  if (waitingCount > 0) return { tone: 'neutral', title: 'Changes are waiting to be saved.' }
  if (syncState === 'saved') return { tone: 'neutral', title: 'All changes saved' }
  return null
}

// Plain words for one change the server refused (step 17.6b), for the list in
// the "could not be saved" sheet. groupName / drugName may be null.
const REASON_TEXT = {
  name_taken: 'That name is already in use.',
  group_gone: 'The group was deleted on another device.',
  group_limit: "You've reached the group limit.",
  drug_limit: 'The group is full.',
  read_only: 'Your groups are read only.',
  error: 'Something went wrong. Try again.',
}

export function describeFailedChange(change, { groupName = null, drugName = null } = {}) {
  const quote = t => `\u201c${t}\u201d`
  const g = groupName ?? change.data?.name ?? null
  const group = g ? quote(g) : 'a group'
  let title
  switch (change.type) {
    case 'create': title = `New group ${group}`; break
    case 'update': title = `Changes to ${group}`; break
    case 'add_drug': title = `Adding ${drugName ? quote(drugName) : 'a drug'} to ${group}`; break
    case 'remove_drug': title = `Removing ${drugName ? quote(drugName) : 'a drug'} from ${group}`; break
    case 'delete': title = `Deleting ${group}`; break
    default: title = `A change to ${group}`
  }
  return { title, reason: REASON_TEXT[change.failed?.reason] ?? REASON_TEXT.error }
}
