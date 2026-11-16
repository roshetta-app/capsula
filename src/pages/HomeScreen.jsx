/**
 * src/pages/HomeScreen.jsx
 * Phase H, step 9.3 — Home, the app's first screen (address "/").
 *
 * Top bar (wordmark, bell, dark mode), the welcome heading, and the featured card. My roshettas and
 * My drug groups join in steps 9.4 and 9.5; until then they stay where they are today (Topics and Drugs).
 * No search on Home (assumption W). The card opens its topic or drug; it is not drawn at all when there
 * is nothing to show.
 */
import { useNavigate } from 'react-router-dom'
import HomeTopBar from '../components/home/HomeTopBar'
import FeaturedCardView from '../components/home/FeaturedCardView'
import { useAuth } from '../hooks/useAuth'
import { useConditionContext } from '../context/ConditionContext'
import { useDrugContext } from '../context/DrugContext'
import { useHomeFeatured } from '../hooks/useHomeFeatured'
import { cardPath } from '../utils/homeFeatured'
import { headingText } from '../utils/homeHeading'

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
    </div>
  )
}
