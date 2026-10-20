/**
 * src/components/drugs/groups/GroupSyncStatus.jsx
 * 2026-10-20 (Drug groups plan, step 17.6a): the one status line for groups that
 * are saved on the phone first. Shown in the groups area on Drugs home and on a
 * group's page. Shows nothing when there is nothing to say.
 *
 * One line, first match wins:
 *   changes the server refused   "1 change could not be saved."       (warning)
 *   offline                      "Offline. Changes are saved on this phone."
 *   sending now                  "Syncing..."
 *   waiting, not sending         "Changes are waiting to sync."
 *   just finished sending        "All changes saved"  (for 3 seconds)
 *
 * "Offline" uses the app's shared online signal, so a Wi-Fi with no internet
 * counts as offline. Free accounts never see it: they cannot use the app offline.
 */

import GroupStateMessage from './GroupStateMessage'
import { useFavouritesContext } from '../../../context/FavouritesContext'
import { useOnlineStatus } from '../../../hooks/useOnlineStatus'
import { syncStatusLine } from '../../../utils/groupSyncStatus'

export default function GroupSyncStatus({ marginTop }) {
  const { failedCount = 0, waitingCount = 0, syncState = 'idle' } = useFavouritesContext()
  const { isOnline } = useOnlineStatus()
  const line = syncStatusLine({ online: isOnline, failedCount, waitingCount, syncState })
  if (!line) return null
  const banner = <GroupStateMessage variant="banner" tone={line.tone} title={line.title} />
  return marginTop ? <div style={{ marginTop }}>{banner}</div> : banner
}
