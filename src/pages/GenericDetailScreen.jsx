/**
 * src/pages/GenericDetailScreen.jsx
 *
 * 2026-11-13 (generic page, Omar): the page a generic link opens. It is the drug page with
 * everything that belongs to a brand taken out, so there is no brand name anywhere on it:
 *   - no brand name, strength or form line (the generic's name is the title)
 *   - no Favourite heart, no Add to group, no Share (they all belong to a brand)
 *   - no picture / Arabic name / Check price strip
 *   - no "See Available Brands", and the class and family rows are plain text
 *   - the Alternatives list is a list of OTHER GENERICS in the same class and family
 * 2026-11-13 (round 2): the Active ingredient block at the top is gone (mechanism stays). A
 * Related drugs button lists this generic's brands and a tap opens that brand's page. The class
 * and family rows open the brand lists as on the brand page. "Other generics in this family" is
 * removed again (the family row in the class tree covers it).
 * Kept: mechanism, Uses, Dose, Side effects, Pregnancy, Contraindications,
 * Interactions, Pharmacology, Sources. All of those read generic-level data, so the sections
 * are the same components the brand page uses, fed with one brand of this generic as the
 * carrier of that data (the brand itself is never shown).
 *
 * Route: /drugs/generic/:slug   (:slug is the generic's slug)
 * It sits under /drugs/, so the bottom bar keeps Drugs highlighted and Back works as on the
 * brand page.
 */

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { WifiOff } from 'lucide-react'
import DrugHeader from '../components/drugs/DrugHeader'
import DrugDetailSheet from '../components/drugs/DrugDetailSheet'
import BottomNav from '../components/BottomNav'
import GenericOverviewSection from '../components/drugs/sections/GenericOverviewSection'
import UsesSection from '../components/drugs/sections/UsesSection'
import DoseSection from '../components/drugs/sections/DoseSection'
import SideEffectsSection from '../components/drugs/sections/SideEffectsSection'
import PregnancySection from '../components/drugs/sections/PregnancySection'
import ContraindicationsSection from '../components/drugs/sections/ContraindicationsSection'
import DrugInteractionsSection from '../components/drugs/sections/DrugInteractionsSection'
import PharmacologySection from '../components/drugs/sections/PharmacologySection'
import SourcesSection from '../components/drugs/sections/SourcesSection'
import { DrugDetailSkeleton } from './DrugDetailScreen'
import { useDrugContext } from '../context/DrugContext'
import { useCategories } from '../hooks/useCategories'
import { useDeepLinkParent } from '../hooks/useDeepLinkParent'
import { useIsDark } from '../utils/specialtyIcon'
import { resolveToken, FALLBACK_TOKEN } from '../utils/specialtyTokens'
import { logUsageEvent } from '../analytics/usageEvents'
import { ROUTES } from '../router'

// Same two lists the brand page builds for its sheets (DrugDetailScreen: findAlternatives and
// findClassDrugs): the brands of the other generics in this class AND family, and every brand in
// the class. Kept here as copies so the brand page file stays as it is.
function findAlternatives(drugs, drug) {
  if (!drug || !drug.class || !drug.subclass) return []
  return drugs.filter(d =>
    d.genericId !== drug.genericId && d.class === drug.class && d.subclass === drug.subclass)
}
function findClassDrugs(drugs, drug) {
  if (!drug || !drug.class) return []
  return drugs.filter(d => d.class === drug.class)
}

function Message({ icon, title, text, actionLabel, onAction }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      minHeight: '60dvh', gap: 'var(--space-3)', color: 'var(--color-text-tertiary)',
      padding: 'var(--space-6)', textAlign: 'center',
    }}>
      {icon}
      <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-text-secondary)' }}>{title}</div>
      <div style={{ fontSize: 13 }}>{text}</div>
      <button
        onClick={onAction}
        style={{
          marginTop: 'var(--space-2)', padding: '8px 20px', borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--color-border)', background: 'none', fontSize: 13, fontWeight: 500,
          color: 'var(--color-text-secondary)', cursor: 'pointer', fontFamily: 'var(--font-body)',
        }}
      >{actionLabel}</button>
    </div>
  )
}

export default function GenericDetailScreen() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  useDeepLinkParent('/drugs')

  const { drugs, loading, error, retry } = useDrugContext()

  // One brand of this generic carries the generic's data into the sections. It is never shown.
  const drug = useMemo(() => drugs.find(d => d.genericSlug === slug), [drugs, slug])

  // The brands of this generic (all of them: the carrier brand is never singled out), the brands of
  // the other generics in the same family, and everything in the same class. Same rules as the brand page.
  const siblings = useMemo(
    () => (drug ? drugs.filter(d => d.genericId === drug.genericId) : []),
    [drugs, drug?.genericId], // eslint-disable-line react-hooks/exhaustive-deps
  )
  const alternatives = useMemo(
    () => findAlternatives(drugs, drug),
    [drugs, drug?.genericId, drug?.class, drug?.subclass], // eslint-disable-line react-hooks/exhaustive-deps
  )
  const classDrugs = useMemo(
    () => findClassDrugs(drugs, drug),
    [drugs, drug?.class], // eslint-disable-line react-hooks/exhaustive-deps
  )

  // Tapping a brand in a sheet opens that brand's page. Same history handling as the brand page, so
  // Back from the brand page returns here (see DrugDetailScreen, handleAlternativeTap).
  // The page change waits for the sheet to finish closing, so it runs in an effect after a tap. The
  // tap is kept in a ref and the effect is woken by a counter, so the effect never sets state itself.
  const pendingNavRef = useRef(null)
  const [navTick, setNavTick] = useState(0)
  function handleBrandTap(item) {
    const hadSheetPlaceholder = !!window.history.state?.capsulaBackClose
    const alreadyHop          = !!location.state?.relatedHop
    const mode = hadSheetPlaceholder
      ? (alreadyHop ? 'pop-replace' : 'replace')
      : (alreadyHop ? 'replace' : 'push')
    pendingNavRef.current = { slug: item.slug || item.id, mode }
    setNavTick(t => t + 1)
  }
  useEffect(() => {
    const pending = pendingNavRef.current
    if (!pending) return undefined
    pendingNavRef.current = null
    const to   = ROUTES.DRUG_DETAIL(pending.slug)
    const opts = { state: { relatedHop: true } }
    if (pending.mode === 'pop-replace') {
      function onPop() {
        window.removeEventListener('popstate', onPop)
        navigate(to, { ...opts, replace: true })
      }
      window.addEventListener('popstate', onPop)
      window.history.back()
      return () => window.removeEventListener('popstate', onPop)
    }
    navigate(to, { ...opts, replace: pending.mode === 'replace' })
    return undefined
  }, [navTick]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (drug) logUsageEvent('drug_view', drug.genericId ?? drug.id, drug.genericName ?? slug)
  }, [drug?.genericId]) // eslint-disable-line react-hooks/exhaustive-deps

  const rootRef = useRef(null)
  const [availableHeight, setAvailableHeight] = useState(null)
  useLayoutEffect(() => {
    function measure() {
      if (rootRef.current) setAvailableHeight(window.innerHeight - rootRef.current.getBoundingClientRect().top)
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])

  const isDark = useIsDark()
  const { categories } = useCategories()
  const category = categories.find(c => c.slug === drug?.category)
  const colors = resolveToken(category?.color_token || FALLBACK_TOKEN, isDark)

  if (loading && !drug) {
    return (<><DrugDetailSkeleton /><BottomNav /></>)
  }
  if (!drug && !loading && error) {
    return (
      <Message
        icon={<WifiOff size={28} color="var(--color-text-tertiary)" />}
        title="Couldn't load this drug" text="Check your connection and try again"
        actionLabel="Try again" onAction={retry}
      />
    )
  }
  if (!drug) {
    return (
      <Message
        icon={<div style={{ fontSize: 32, opacity: 0.3 }}>💊</div>}
        title="Generic not found" text="This page may have been removed or the link is incorrect."
        actionLabel="← Back to Drugs" onAction={() => navigate('/drugs')}
      />
    )
  }

  return (
    <>
      <div
        ref={rootRef}
        style={{
          height: availableHeight ?? '100dvh', overflow: 'hidden',
          display: 'flex', flexDirection: 'column', backgroundColor: 'var(--color-hero-bg)',
        }}
      >
        <DrugHeader drug={drug} category={category} colors={colors} onBack={() => navigate(-1)} genericMode />

        <DrugDetailSheet resetKey={drug.genericId}>
          <div style={{ paddingTop: 'var(--space-5)', paddingBottom: 'var(--space-12)' }}>
            <GenericOverviewSection
              drug={drug}
              genericMode
              siblings={siblings}
              alternatives={alternatives}
              classDrugs={classDrugs}
              onSelectBrand={handleBrandTap}
            />
            <UsesSection drug={drug} colors={colors} isDark={isDark} />
            <DoseSection key={drug.genericId} drug={drug} />
            <SideEffectsSection drug={drug} />
            <PregnancySection drug={drug} />
            <ContraindicationsSection drug={drug} />
            <DrugInteractionsSection drug={drug} />
            <PharmacologySection drug={drug} />
            <SourcesSection drug={drug} />
          </div>
        </DrugDetailSheet>
      </div>
      <BottomNav />
    </>
  )
}
