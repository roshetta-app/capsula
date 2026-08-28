/**
 * src/pages/admin/AnalyticsDashboard.jsx
 * Phase 3J — Analytics Dashboard
 *
 * 5 tabs: Content Health | Search Gaps | Coverage | Usage | Messages
 * Refresh button (re-fetches all data)
 * CSV export button (exports current tab data)
 *
 * Route: /admin/analytics  (added to router.jsx)
 * Entry: AdminDashboard nav card (added to AdminDashboard.jsx)
 *
 * Messages tab (Phase 2, App Gate System plan §10.5, this session) —
 * extends this existing usage_events pattern rather than a parallel
 * tracking system, per the plan's confirmed decision. Reads the four
 * gate_* event types logged by useAppGate.js / AppGate.jsx (impression,
 * dismiss, maybe_later, cta_click) and aggregates per gate by
 * entity_name, same convention every other event type here already uses.
 *
 * F10 Batch B — Analytics Revamp (D30/D32): the `prescriptions` fetch is
 * removed entirely — that table doesn't exist in the schema, a retired
 * legacy concept superseded by the `clinical_blocks` block system.
 * `genericsWithBrands`/`genericsWithDoses` and `publishedConditions` all
 * switch from an unfiltered/`is_published`-only existence check to a real
 * `needs_review`-aware completeness check (published AND NOT flagged for
 * review) — see the fetch query and computation below.
 *
 * F10 Batch D (D38), steps 8a/8b — two new queries added below
 * (`usageDetailRes`, `profilesRes`) to power the Engagement, Retention,
 * and Identity/Segment tabs. `profilesRes` powers Identity/Segment (8c).
 * `usageDetailRes` powers Engagement (8d, this step) and will also power
 * Retention (8e) — none of the existing 6 queries or tabs change here.
 */

import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, Download } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import AdminPageHeader from '../../components/admin/AdminPageHeader'

import ContentHealthTab   from './analytics/ContentHealthTab'
import SearchGapsTab      from './analytics/SearchGapsTab'
import CoverageTab        from './analytics/CoverageTab'
import UsageTab           from './analytics/UsageTab'
import MessagesTab        from './analytics/MessagesTab'
import IdentitySegmentTab from './analytics/IdentitySegmentTab'
import EngagementTab      from './analytics/EngagementTab'

// ─── Tab config ───────────────────────────────────────────────────────────────
// F10 Batch D (D38), step 8c: 'identity' added at the front. Step 8d adds
// 'engagement' right after it, matching D15's five-layer order (identity,
// engagement, retention, quality, monetization). Retention/monetization
// land in later steps — 'health' stays as-is until step 8h relabels it.

const TABS = [
  { id: 'identity',   label: 'Identity & Segment' },
  { id: 'engagement', label: 'Engagement'          },
  { id: 'health',     label: 'Content Health'      },
  { id: 'gaps',       label: 'Search Gaps'         },
  { id: 'coverage',   label: 'Coverage'            },
  { id: 'usage',      label: 'Usage'               },
  { id: 'messages',   label: 'Messages'            },
]

// ─── Data fetching ────────────────────────────────────────────────────────────

async function fetchAllAnalytics() {
  const [
    conditionsRes,
    genericsRes,
    brandsRes,
    formulationsRes,
    specialtiesRes,
    gapsRes,
    usageViewRes,
    usageSearchRes,
    topViewCondRes,
    topSearchCondRes,
    topViewDrugRes,
    gateEventsRes,
    usageDetailRes,
    profilesRes,
  ] = await Promise.all([

    // Conditions: total + published counts + needs_review + missing definition
    supabase
      .from('conditions')
      .select('id, is_published, needs_review, definition, specialty_id, specialties!conditions_specialty_id_fkey(name_en)'),

    // Generics: category grouping + has any real (published, not-flagged) brands/doses
    supabase
      .from('generics')
      .select('id, category, is_published, formulations(id, doses_structured, brands(id, is_published, needs_review))'),

    // Total brands
    supabase
      .from('brands')
      .select('id', { count: 'exact', head: true }),

    // Formulations with no dose data
    supabase
      .from('formulations')
      .select('id, doses_structured'),

    // Specialties for coverage table
    supabase
      .from('specialties')
      .select('id, name_en, is_active')
      .eq('is_active', true)
      .order('sort_order', { ascending: true }),

    // Search gaps: last 14 days
    supabase
      .from('search_gaps')
      .select('term, context, created_at')
      .gte('created_at', new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()),

    // Usage: aggregate view counts
    supabase
      .from('usage_events')
      .select('event_type', { count: 'exact', head: false })
      .in('event_type', ['condition_view', 'drug_view', 'condition_search', 'drug_search']),

    // Not used directly — counts extracted below
    Promise.resolve({ data: null }),

    // Top viewed conditions
    supabase
      .from('usage_events')
      .select('entity_name')
      .eq('event_type', 'condition_view')
      .not('entity_name', 'is', null),

    // Top searched conditions
    supabase
      .from('usage_events')
      .select('entity_name')
      .eq('event_type', 'condition_search')
      .not('entity_name', 'is', null),

    // Top viewed drugs
    supabase
      .from('usage_events')
      .select('entity_name')
      .eq('event_type', 'drug_view')
      .not('entity_name', 'is', null),

    // App Gate events: impressions, dismisses, maybe-laters, CTA clicks
    supabase
      .from('usage_events')
      .select('event_type, entity_name')
      .in('event_type', ['gate_impression', 'gate_dismiss', 'gate_maybe_later', 'gate_cta_click']),

    // F10 Batch D (D38), step 8a — full usage_events rows with device/
    // session/user context, bounded to the last 90 days. Powers the
    // Engagement tab (8d) and the upcoming Retention tab (8e). Not
    // consumed by any other tab; the 6 queries above are untouched.
    supabase
      .from('usage_events')
      .select('event_type, entity_name, device_id, user_id, session_id, created_at')
      .gte('created_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()),

    // F10 Batch D (D38), step 8b — identity/segment fields already
    // collected at sign-up. Direct table read, not through the
    // admin-users edge function (that function exists for auth.users
    // email/last-sign-in-at, not needed here). Powers the Identity/
    // Segment tab.
    supabase
      .from('profiles')
      .select('specialty, country, occupation, created_at'),
  ])

  // ── Content Health ───────────────────────────────────────────────────────────
  const conditions   = conditionsRes.data   ?? []
  const generics     = genericsRes.data     ?? []
  const formulations = formulationsRes.data ?? []

  const totalConditions       = conditions.length
  // Real completeness: published AND NOT flagged for review (D32) — a
  // condition sitting at is_published=true with needs_review=true no
  // longer counts as "done."
  const publishedConditions   = conditions.filter(c => c.is_published && !c.needs_review).length
  const condsMissingDef       = conditions.filter(c => !c.definition || c.definition.trim() === '').length

  // A brand only counts toward "has a real brand" if it's published and
  // not flagged for review (D30 decision 5) — previously this was a bare
  // existence check with no quality filter at all.
  function isRealBrand(b) {
    return (b.is_published ?? true) && !(b.needs_review ?? false)
  }

  const totalGenerics         = generics.length
  const genericsWithBrands    = generics.filter(g =>
    (g.formulations ?? []).some(f => (f.brands ?? []).some(isRealBrand))
  ).length
  const genericsWithDoses     = generics.filter(g =>
    (g.formulations ?? []).some(f => f.doses_structured && f.doses_structured.length > 0)
  ).length

  const totalBrands           = brandsRes.count ?? 0
  const formulationsWithNoDose= formulations.filter(f => !f.doses_structured || f.doses_structured.length === 0).length

  // ── Search Gaps ─────────────────────────────────────────────────────────────
  const gaps = gapsRes.data ?? []

  function aggregateGaps(rows) {
    const map = {}
    rows.forEach(r => {
      const key = r.term
      map[key] = (map[key] ?? 0) + 1
    })
    return Object.entries(map)
      .map(([term, count]) => ({ term, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20)
  }

  const drugGaps      = aggregateGaps(gaps.filter(g => g.context === 'drugs'))
  const conditionGaps = aggregateGaps(gaps.filter(g => g.context === 'conditions'))

  // ── Coverage ─────────────────────────────────────────────────────────────────
  const specialties  = specialtiesRes.data ?? []
  const totalSpecialties = specialties.length

  // Build specialty coverage rows
  const specialtyCoverage = specialties.map(sp => {
    const spConds = conditions.filter(c => c.specialty_id === sp.id)
    return {
      specialty:     sp.name_en,
      total:         spConds.length,
      published:     spConds.filter(c => c.is_published).length,
    }
  }).filter(r => r.total > 0)
    .sort((a, b) => b.total - a.total)

  // Drug groups
  const categoryMap = {}
  generics.forEach(g => {
    const cat = g.category || 'Uncategorized'
    categoryMap[cat] = (categoryMap[cat] ?? 0) + 1
  })
  const drugGroups = Object.entries(categoryMap)
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15)

  // ── Usage ────────────────────────────────────────────────────────────────────
  const usageEvents = usageViewRes.data ?? []

  function countByType(type) {
    return usageEvents.filter(e => e.event_type === type).length
  }

  function topNames(rows, n = 10) {
    const map = {}
    ;(rows ?? []).forEach(r => {
      if (r.entity_name) map[r.entity_name] = (map[r.entity_name] ?? 0) + 1
    })
    return Object.entries(map)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, n)
  }

  // ── Messages (App Gate analytics) ─────────────────────────────────────────────
  const gateEvents = gateEventsRes.data ?? []

  function countGateType(type) {
    return gateEvents.filter(e => e.event_type === type).length
  }

  function topGates(rows, n = 10) {
    const map = {}
    ;(rows ?? []).forEach(r => {
      if (!r.entity_name) return
      if (!map[r.entity_name]) {
        map[r.entity_name] = { name: r.entity_name, impressions: 0, dismisses: 0, maybeLater: 0, ctaClicks: 0 }
      }
      if (r.event_type === 'gate_impression')  map[r.entity_name].impressions++
      if (r.event_type === 'gate_dismiss')     map[r.entity_name].dismisses++
      if (r.event_type === 'gate_maybe_later') map[r.entity_name].maybeLater++
      if (r.event_type === 'gate_cta_click')   map[r.entity_name].ctaClicks++
    })
    return Object.values(map)
      .sort((a, b) => b.impressions - a.impressions)
      .slice(0, n)
  }

  // ── Identity / Segment ───────────────────────────────────────────────────────
  // F10 Batch D (D38), step 8c. Buckets missing values as 'Not set' rather
  // than dropping them, so an incomplete profile is still visible in the
  // breakdown instead of silently disappearing.
  const profiles = profilesRes.data ?? []

  function groupCount(rows, field) {
    const map = {}
    rows.forEach(r => {
      const raw = r[field]
      const key = raw && String(raw).trim() !== '' ? raw : 'Not set'
      map[key] = (map[key] ?? 0) + 1
    })
    return Object.entries(map)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
  }

  // ── Engagement ───────────────────────────────────────────────────────────────
  // F10 Batch D (D38), step 8d. Built entirely from the 90-day
  // usageDetailRes pulled in step 8a above — no new query needed.
  const usageDetail = usageDetailRes.data ?? []

  // Monday-of-week label ("2026-08-24") for a given ISO timestamp, so
  // sessions bucket into calendar weeks rather than arbitrary 7-day
  // windows.
  function weekKey(dateStr) {
    const d = new Date(dateStr)
    const day = d.getDay()
    const diffToMonday = (day === 0 ? -6 : 1) - day
    const monday = new Date(d)
    monday.setDate(d.getDate() + diffToMonday)
    return monday.toISOString().slice(0, 10)
  }

  // One row per distinct session, bucketed by the week of its earliest
  // event in the 90-day window.
  const sessionFirstSeen = {}
  usageDetail.forEach(e => {
    if (!e.session_id) return
    if (!sessionFirstSeen[e.session_id] || e.created_at < sessionFirstSeen[e.session_id]) {
      sessionFirstSeen[e.session_id] = e.created_at
    }
  })
  const weekMap = {}
  Object.values(sessionFirstSeen).forEach(dateStr => {
    const wk = weekKey(dateStr)
    weekMap[wk] = (weekMap[wk] ?? 0) + 1
  })
  const sessionsPerWeek = Object.entries(weekMap)
    .map(([week, count]) => ({ week, count }))
    .sort((a, b) => a.week.localeCompare(b.week))

  const totalSessions = Object.keys(sessionFirstSeen).length

  // Repeat-visit content — condition/drug pages viewed across more than
  // one distinct session, ranked by how many distinct sessions returned.
  const contentSessions = {}
  usageDetail
    .filter(e => (e.event_type === 'condition_view' || e.event_type === 'drug_view') && e.entity_name && e.session_id)
    .forEach(e => {
      if (!contentSessions[e.entity_name]) contentSessions[e.entity_name] = new Set()
      contentSessions[e.entity_name].add(e.session_id)
    })
  const repeatVisitContent = Object.entries(contentSessions)
    .map(([name, sessions]) => ({ name, count: sessions.size }))
    .filter(r => r.count > 1)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  return {
    identity: {
      totalAccounts: profiles.length,
      bySpecialty:   groupCount(profiles, 'specialty'),
      byCountry:     groupCount(profiles, 'country'),
      byOccupation:  groupCount(profiles, 'occupation'),
    },
    engagement: {
      totalSessions,
      sessionsPerWeek,
      repeatVisitContent,
    },
    health: {
      totalConditions,
      publishedConditions,
      conditionsMissingDefinition: condsMissingDef,
      totalGenerics,
      genericsWithBrands,
      genericsWithDoses,
      formulationsWithNoDose,
    },
    gaps: {
      drugGaps,
      conditionGaps,
    },
    coverage: {
      totalSpecialties,
      totalConditions,
      totalGenerics,
      totalBrands,
      specialtyCoverage,
      drugGroups,
    },
    usage: {
      totalConditionViews:    countByType('condition_view'),
      totalConditionSearches: countByType('condition_search'),
      totalDrugViews:         countByType('drug_view'),
      totalDrugSearches:      countByType('drug_search'),
      topViewedConditions:    topNames(topViewCondRes.data),
      topSearchedConditions:  topNames(topSearchCondRes.data),
      topViewedDrugs:         topNames(topViewDrugRes.data),
    },
    messages: {
      totalImpressions: countGateType('gate_impression'),
      totalDismisses:   countGateType('gate_dismiss'),
      totalMaybeLater:  countGateType('gate_maybe_later'),
      totalCtaClicks:   countGateType('gate_cta_click'),
      topGates:         topGates(gateEvents),
    },
  }
}

// ─── CSV export ───────────────────────────────────────────────────────────────

function exportCSV(activeTab, data) {
  if (!data) return

  let rows = []
  let filename = 'capsula-analytics.csv'

  if (activeTab === 'identity') {
    const d = data.identity
    rows = [['Total Accounts', d.totalAccounts], ['', '']]
    rows.push(['Specialty', 'Count'])
    d.bySpecialty.forEach(r => rows.push([r.name, r.count]))
    rows.push(['', ''])
    rows.push(['Country', 'Count'])
    d.byCountry.forEach(r => rows.push([r.name, r.count]))
    rows.push(['', ''])
    rows.push(['Occupation', 'Count'])
    d.byOccupation.forEach(r => rows.push([r.name, r.count]))
    filename = 'capsula-identity-segment.csv'

  } else if (activeTab === 'engagement') {
    const d = data.engagement
    rows = [['Sessions (last 90 days)', d.totalSessions], ['', '']]
    rows.push(['Week', 'Sessions'])
    d.sessionsPerWeek.forEach(r => rows.push([r.week, r.count]))
    rows.push(['', ''])
    rows.push(['Content', 'Distinct Sessions'])
    d.repeatVisitContent.forEach(r => rows.push([r.name, r.count]))
    filename = 'capsula-engagement.csv'

  } else if (activeTab === 'health') {
    const d = data.health
    rows = [
      ['Metric', 'Value'],
      ['Total Conditions',          d.totalConditions],
      ['Published Conditions',      d.publishedConditions],
      ['Conditions Missing Def',    d.conditionsMissingDefinition],
      ['Total Generics',            d.totalGenerics],
      ['Generics With Brands',      d.genericsWithBrands],
      ['Generics With Doses',       d.genericsWithDoses],
      ['Formulations With No Dose', d.formulationsWithNoDose],
    ]
    filename = 'capsula-content-health.csv'

  } else if (activeTab === 'gaps') {
    rows = [['Term', 'Context', 'Count']]
    data.gaps.conditionGaps.forEach(r => rows.push([r.term, 'conditions', r.count]))
    data.gaps.drugGaps.forEach(r => rows.push([r.term, 'drugs', r.count]))
    filename = 'capsula-search-gaps.csv'

  } else if (activeTab === 'coverage') {
    rows = [['Specialty', 'Total Conditions', 'Published', 'Publish Rate %']]
    data.coverage.specialtyCoverage.forEach(r => {
      const rate = r.total > 0 ? Math.round((r.published / r.total) * 100) : 0
      rows.push([r.specialty, r.total, r.published, rate])
    })
    filename = 'capsula-coverage.csv'

  } else if (activeTab === 'usage') {
    const d = data.usage
    rows = [
      ['Metric', 'Value'],
      ['Total Condition Views',    d.totalConditionViews],
      ['Total Condition Searches', d.totalConditionSearches],
      ['Total Drug Views',         d.totalDrugViews],
      ['Total Drug Searches',      d.totalDrugSearches],
      ['', ''],
      ['Top Viewed Conditions', ''],
      ...d.topViewedConditions.map((r, i) => [`${i + 1}. ${r.name}`, r.count]),
      ['', ''],
      ['Top Viewed Drugs', ''],
      ...d.topViewedDrugs.map((r, i) => [`${i + 1}. ${r.name}`, r.count]),
    ]
    filename = 'capsula-usage.csv'

  } else if (activeTab === 'messages') {
    const d = data.messages
    rows = [
      ['Metric', 'Value'],
      ['Total Impressions', d.totalImpressions],
      ['Total Dismisses',   d.totalDismisses],
      ['Total Maybe Later', d.totalMaybeLater],
      ['Total CTA Clicks',  d.totalCtaClicks],
      ['', ''],
      ['Message', 'Impressions', 'Dismisses', 'Maybe Later', 'CTA Clicks'],
      ...d.topGates.map(g => [g.name, g.impressions, g.dismisses, g.maybeLater, g.ctaClicks]),
    ]
    filename = 'capsula-messages.csv'
  }

  const csv = rows.map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function AnalyticsDashboard() {
  const [activeTab, setActiveTab] = useState('health')
  const [data,      setData]      = useState(null)
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState(null)
  const [refreshing,setRefreshing]= useState(false)

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else           setLoading(true)
    setError(null)
    try {
      const result = await fetchAllAnalytics()
      setData(result)
    } catch (err) {
      setError(err.message ?? 'Failed to load analytics')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  function handleRefresh() { load(true) }

  const activeData = data ? data[activeTab] : null

  return (
    <AdminPageHeader
      title="Analytics"
      actions={
        <>
          {/* CSV export */}
          <button
            onClick={() => exportCSV(activeTab, data)}
            disabled={!data}
            style={{
              display: 'flex', alignItems: 'center', gap: 'var(--space-1)',
              padding: 'var(--space-2) var(--space-3)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-surface)',
              color: 'var(--color-text-secondary)',
              fontSize: 13, fontWeight: 500,
              fontFamily: 'var(--font-body)',
              cursor: data ? 'pointer' : 'not-allowed',
              opacity: data ? 1 : 0.5,
            }}
          >
            <Download size={14} />
            Export CSV
          </button>

          {/* Refresh */}
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            style={{
              display: 'flex', alignItems: 'center', gap: 'var(--space-1)',
              padding: 'var(--space-2) var(--space-3)',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              backgroundColor: 'var(--color-accent)',
              color: '#fff',
              fontSize: 13, fontWeight: 600,
              fontFamily: 'var(--font-body)',
              cursor: refreshing ? 'not-allowed' : 'pointer',
              opacity: refreshing ? 0.7 : 1,
            }}
          >
            <RefreshCw size={14} style={{ animation: refreshing ? 'spin 0.8s linear infinite' : 'none' }} />
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
        </>
      }
    >
      {/* Tab bar — reference pattern for any screen needing a sub-row (per
          plan §1); stays exactly as before, now sitting inside the content
          area's width instead of stretching edge-to-edge under the old
          sticky header */}
      <div style={{
        display: 'flex', gap: 0,
        borderBottom: '1px solid var(--color-border)',
        marginBottom: 'var(--space-5)',
        overflowX: 'auto',
      }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: 'var(--space-3) var(--space-4)',
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 14, fontWeight: activeTab === tab.id ? 600 : 400,
              color: activeTab === tab.id ? 'var(--color-accent)' : 'var(--color-text-secondary)',
              borderBottom: activeTab === tab.id ? '2px solid var(--color-accent)' : '2px solid transparent',
              fontFamily: 'var(--font-body)',
              whiteSpace: 'nowrap',
              transition: 'color 0.15s',
              marginBottom: -1,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>


        {/* Loading skeleton */}
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {[80, 200, 140].map((h, i) => (
              <div key={i} style={{
                height: h,
                borderRadius: 'var(--radius-lg)',
                backgroundColor: 'var(--color-border)',
                animation: 'shimmer 1.4s ease-in-out infinite',
              }} />
            ))}
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div style={{
            backgroundColor: 'var(--color-danger-light)',
            border: '1px solid var(--color-danger)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-4)',
            fontSize: 14, color: 'var(--color-danger)',
          }}>
            Failed to load analytics: {error}
          </div>
        )}

        {/* Tabs */}
        {!loading && !error && (
          <>
            {activeTab === 'identity'   && <IdentitySegmentTab data={activeData} />}
            {activeTab === 'engagement' && <EngagementTab      data={activeData} />}
            {activeTab === 'health'     && <ContentHealthTab   data={activeData} />}
            {activeTab === 'gaps'       && <SearchGapsTab      data={activeData} />}
            {activeTab === 'coverage'   && <CoverageTab        data={activeData} />}
            {activeTab === 'usage'      && <UsageTab           data={activeData} />}
            {activeTab === 'messages'   && <MessagesTab        data={activeData} />}
          </>
        )}

      {/* Spin keyframe */}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </AdminPageHeader>
  )
}
