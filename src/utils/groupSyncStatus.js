/**
 * src/utils/groupSyncStatus.js
 * 2026-10-20 (Drug groups plan, step 17.6a): which line the groups status
 * (components/drugs/groups/GroupSyncStatus.jsx) shows. Plain function, no screen.
 */

export function syncStatusLine({ online, failedCount, waitingCount, syncState }) {
  if (failedCount > 0) {
    return { tone: 'warning', title: `${failedCount} change${failedCount === 1 ? '' : 's'} could not be saved.` }
  }
  if (!online) return { tone: 'neutral', title: "Offline. Changes are saved on this phone." }
  if (syncState === 'syncing') return { tone: 'neutral', title: 'Syncing...' }
  if (waitingCount > 0) return { tone: 'neutral', title: 'Changes are waiting to sync.' }
  if (syncState === 'saved') return { tone: 'neutral', title: 'All changes saved' }
  return null
}
