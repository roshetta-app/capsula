/**
 * src/pages/HomeScreen.jsx
 * Phase H, step 9.3 — Home, the app's first screen (address "/").
 *
 * Top bar (wordmark, bell, dark mode), the welcome heading, the featured card and, from step 9.4,
 * the My roshettas row. My drug groups joins in step 9.5. The roshettas shelf stays on Topics and
 * My drug groups on Drugs until steps 9.6 and 9.7 take them off.
 * No search on Home (assumption W). The card opens its topic or drug; it is not drawn at all when there
 * is nothing to show.
 */
import { useNavigate } from 'react-router-dom'
import HomeTopBar from '../components/home/HomeTopBar'
import FeaturedCardView from '../components/home/FeaturedCardView'
import HomeRoshettasSection from '../components/home/HomeRoshettasSection'
import { useAuth } from '../hooks/useAuth'
import { useConditionContext } from '../context/ConditionContext'
import { useDrugContext } from '../context/DrugContext'
import { useHomeFeatured } from '../hooks/useHomeFeatured'
import { cardPath } from '../utils/homeFeatured'
import { headingText } from '../utils/homeHeading'
import { ROUTES } from '../router'

export default function HomeScreen() {
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const { conditions, loading: conditionsLoading } = useConditionContext()
  const { drugs, loading: drugsLoading } = useDrugContext()
  const { item, loadingFirst } = useHomeFeatured(conditions, drugs, !conditionsLoading && !drugsLoading)

  const heading = headingText(!!user, profile?.fullName)
  const path = item ? cardPath(item) : null

  return (
    <div style={{ paddingTop: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      <HomeTopBar />

      <h1 dir="auto" style={{
        margin: 0, fontSize: 28, fontWeight: 600, lineHeight: 1.2, overflowWrap: 'anywhere',
        color: 'var(--color-text-primary)', fontFamily: 'var(--font-body)',
      }}>
        {heading}
      </h1>

      {item && path ? (
        <FeaturedCardView item={item} onOpen={() => navigate(path)} />
      ) : loadingFirst ? (
        <div aria-hidden="true" style={{
          minHeight: 150, borderRadius: 16, backgroundColor: 'var(--color-surface-muted, var(--color-border))', opacity: 0.6,
        }} />
      ) : null}

      <HomeRoshettasSection
        onOpenRoshetta={r => navigate(ROUTES.ROSHETTA(r.id))}
        onSeeAll={() => navigate(ROUTES.ROSHETTAS)}
      />
    </div>
  )
}
