/**
 * src/pages/DrugGroupsScreen.jsx
 * 2026-10-22 (UI refresh plan, step 8.2b): the See all screen for My drug groups. Back arrow
 * to Drugs, the title, then the groups section in its full form (sort button, Tiles / List
 * switch, every group, New group at the end). All the states and actions are the same as on
 * the home because it is the same section (GroupsSection with all).
 */

import { Navigate, useNavigate } from 'react-router-dom'
import GroupsSection from '../components/drugs/groups/GroupsSection'
import { useDeepLinkParent } from '../hooks/useDeepLinkParent'
import { isDrugGroupsOn } from '../constants/features'
import { ROUTES } from '../router'

export default function DrugGroupsScreen() {
  const navigate = useNavigate()
  useDeepLinkParent(ROUTES.DRUGS)

  if (!isDrugGroupsOn()) return <Navigate to={ROUTES.DRUGS} replace />

  return (
    <div style={{ padding: 'var(--space-3) 0 var(--space-4)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
        <button
          onClick={() => navigate(-1)}
          aria-label="Back to Drugs"
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--color-accent)', fontSize: 14, fontWeight: 500,
            fontFamily: 'var(--font-body)', padding: '4px 0',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Drugs
        </button>
      </div>
      <h1 style={{ margin: '0 0 var(--space-3)', fontSize: 22, fontWeight: 700, lineHeight: 1.2, color: 'var(--color-text-primary)', fontFamily: 'var(--font-body)' }}>
        My drug groups
      </h1>
      <GroupsSection all />
    </div>
  )
}
