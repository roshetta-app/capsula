/**
 * src/pages/DrugGroupsScreen.jsx
 * 2026-10-22 (UI refresh plan, step 8.2b): the See all screen for My drug groups. Back arrow
 * to Drugs, the title, then the groups section in its full form (sort, Tiles / List switch, every
 * group, New group at the end). All the states and actions are the same as on the home because it
 * is the same section (GroupsSection with all).
 * 2026-10-22 (step 8.12): the same tinted header as the other Browse screens (back arrow, big title,
 * and 'N groups' under it once there are groups). The sort and the view switch sit under it.
 */

import { Navigate, useNavigate } from 'react-router-dom'
import GroupsSection from '../components/drugs/groups/GroupsSection'
import { useFavouritesContext } from '../context/FavouritesContext'
import { useAuth } from '../hooks/useAuth'
import { useDeepLinkParent } from '../hooks/useDeepLinkParent'
import useScrollToTopOnOpen from '../hooks/useScrollToTopOnOpen'
import { isDrugGroupsOn } from '../constants/features'
import { ROUTES } from '../router'

export default function DrugGroupsScreen() {
  useScrollToTopOnOpen()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { groups, groupsStatus } = useFavouritesContext()
  useDeepLinkParent(ROUTES.DRUGS)

  if (!isDrugGroupsOn()) return <Navigate to={ROUTES.DRUGS} replace />

  const n = groups?.length ?? 0
  const subtitle = user && groupsStatus === 'ready' && n > 0 ? `${n} ${n === 1 ? 'group' : 'groups'}` : null

  // Side gap and max width come from Layout; this page adds bottom space only.
  return (
    <div style={{ padding: '0 0 var(--space-4)' }}>
      <GroupsSection all headerProps={{ backLabel: 'Drugs', onBack: () => navigate(-1), title: 'My drug groups', subtitle }} />
    </div>
  )
}
