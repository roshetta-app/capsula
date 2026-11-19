/**
 * src/pages/HomeScreen.jsx
 * Phase H, step 9.3 — Home, the app's first screen (address "/").
 *
 * Top bar (wordmark, bell, dark mode), the welcome (Welcome to Capsula, or a small Hello, over the first name; 11.2), the featured card, then the My roshettas
 * row (step 9.4) and the My drug groups row (step 9.5). The roshettas shelf stays on Topics and
 * My drug groups on Drugs until steps 9.6 and 9.7 take them off.
 * No search on Home (assumption W). 2026-11-16 (Phase J 11.1): a rotating line sits under the welcome
 * heading (HomeTagline). The card opens its topic or drug; it is not drawn at all when there
 * is nothing to show.
 */
import { useNavigate } from 'react-router-dom'
import HomeTopBar from '../components/home/HomeTopBar'
import FeaturedCardView, { FEATURED_H } from '../components/home/FeaturedCardView'
import HomeTagline from '../components/home/HomeTagline'
import HomeRoshettasSection from '../components/home/HomeRoshettasSection'
import HomeGroupsSection from '../components/home/HomeGroupsSection'
import { useAuth } from '../hooks/useAuth'
import { useConditionContext } from '../context/ConditionContext'
import { useDrugContext } from '../context/DrugContext'
import { useHomeFeatured } from '../hooks/useHomeFeatured'
import { cardPath } from '../utils/homeFeatured'
import { welcomeParts } from '../utils/homeHeading'
import { ROUTES } from '../router'

export default function HomeScreen() {
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const { conditions, loading: conditionsLoading } = useConditionContext()
  const { drugs, loading: drugsLoading } = useDrugContext()
  const { item, loadingFirst } = useHomeFeatured(conditions, drugs, !conditionsLoading && !drugsLoading)

  const welcome = welcomeParts(!!user, profile?.fullName)
  const path = item ? cardPath(item) : null

  return (
    <div style={{ paddingTop: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      <HomeTopBar />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <h1 style={{
          margin: 0, display: 'flex', flexDirection: 'column', gap: 2, overflowWrap: 'anywhere',
          color: 'var(--color-text-primary)', fontFamily: 'var(--font-body)',
        }}>
          {welcome.greeting && (
            <span style={{ fontSize: 15, fontWeight: 500, lineHeight: 1.3, color: 'var(--color-text-secondary)' }}>
              {welcome.greeting}
            </span>
          )}
          <span dir="auto" style={{ fontSize: welcome.greeting ? 32 : 28, fontWeight: welcome.greeting ? 800 : 700, lineHeight: 1.15, letterSpacing: '-0.02em' }}>
            {welcome.title}
          </span>
        </h1>
        <HomeTagline />
      </div>

      {item && path ? (
        <FeaturedCardView item={item} onOpen={() => navigate(path)} />
      ) : loadingFirst ? (
        <div aria-hidden="true" style={{
          height: FEATURED_H, borderRadius: 24, backgroundColor: 'var(--color-surface-muted, var(--color-border))', opacity: 0.6,
        }} />
      ) : null}

      <HomeRoshettasSection
        onOpenRoshetta={r => navigate(ROUTES.ROSHETTA(r.id))}
        onSeeAll={() => navigate(ROUTES.ROSHETTAS)}
      />

      <HomeGroupsSection
        onOpenGroup={g => navigate(ROUTES.DRUGS_GROUP(g.id))}
        onSeeAll={() => navigate(ROUTES.DRUGS_GROUPS)}
      />
    </div>
  )
}
