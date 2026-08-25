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
 */

import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, Download } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import AdminPageHeader from '../../components/admin/AdminPageHeader'

import ContentHealthTab from './analytics/ContentHealthTab'
import SearchGapsTab    from './analytics/SearchGapsTab'
import CoverageTab      from './analytics/CoverageTab'
import UsageTab         from './analytics/UsageTab'
import MessagesTab      from './analytics/MessagesTab'

// ─── Tab config ───────────────────────────────────────────────────────────────

const TABS = [
  { id: 'health',   label: 'Content Health' },
  { id: 'gaps',     label: 'Search Gaps'    },
  { id: 'coverage', label: 'Coverage'       },
  { id: 'usage',    label: 'Usage'          },
  { id: 'messages', label: 'Messages'       },
]

// ─── Data fetching ────────────────────────────────────────────────────────────

async function fetchAllAnalytics() {
  const [
    conditionsRes,
    genericsRes,
    brandsRes,
    formulationsRes,
    prescriptionsRes,
    specialtiesRes,
    gapsRes,
    usageViewRes,
    usageSearchRes,
    topViewCondRes,
    topSearchCondRes,
    topViewDrugRes,
    gateEventsRes,
  ] = await Promise.all([

    // Conditions: total + published counts + missing definition
    supabase
      .from('conditions')
      .select('id, is_published, definition, specialty_id, specialties!conditions_specialty_id_fkey(name_en)'),

    // Generics: category grouping + has any brands/doses
    supabase
      .from('generics')
      .select('id, category, is_published, formulations(id, doses_structured, brands(id))'),

    // Total brands
    supabase
      .from('brands')
      .select('id', { count: 'exact', head: true }),

    // Formulations with no dose data
    supabase
      .from('formulations')
      .select('id, doses_structured'),

    // Prescriptions: total + has source label
    supabase
      .from('prescriptions')
      .select('id, label'),

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
  ])

  // ── Content Health ───────────────────────────────────────────────────────────
  const conditions   = conditionsRes.data   ?? []
  const generics     = genericsRes.data     ?? []
  const formulations = formulationsRes.data ?? []
  const prescriptions= prescriptionsRes.data?? []

  const totalConditions       = conditions.length
  const publishedConditions   = conditions.filter(c => c.is_published).length
  const condsMissingDef       = conditions.filter(c => !c.definition || c.definition.trim() === '').length

  const totalGenerics         = generics.length
  const genericsWithBrands    = generics.filter(g =>
    (g.formulations ?? []).some(f => (f.brands ?? []).length > 0)
  ).length
  const genericsWithDoses     = generics.filter(g =>
    (g.formulations ?? []).some(f => f.doses_structured && f.doses_structured.length > 0)
  ).length

  const totalBrands           = brandsRes.count ?? 0
  const formulationsWithNoDose= formulations.filter(f => !f.doses_structured || f.doses_structured.length === 0).length

  const totalPrescriptions    = prescriptions.length
  // "source" not a dedicated column — use label as proxy (non-empty label = has context)
  const prescriptionsWithSource = prescriptions.filter(p => p.label && p.label.trim().length > 0).length

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
    // prescription count would need a join — use conditions proxy
    const rxCount = spConds.reduce((acc, c) => acc + (c.prescriptions?.length ?? 0), 0)
    return {
      specialty:     sp.name_en,
      total:         spConds.length,
      published:     spConds.filter(c => c.is_published).length,
      prescriptions: rxCount,
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

  return {
    health: {
      totalConditions,
      publishedConditions,
      conditionsMissingDefinition: condsMissingDef,
      totalGenerics,
      genericsWithBrands,
      genericsWithDoses,
      formulationsWithNoDose,
      totalPrescriptions,
      prescriptionsWithSource,
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

  if (activeTab === 'health') {
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
      ['Total Prescriptions',       d.totalPrescriptions],
      ['Prescriptions With Source', d.prescriptionsWithSource],
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
            {activeTab === 'health'   && <ContentHealthTab data={activeData} />}
            {activeTab === 'gaps'     && <SearchGapsTab    data={activeData} />}
            {activeTab === 'coverage' && <CoverageTab      data={activeData} />}
            {activeTab === 'usage'    && <UsageTab         data={activeData} />}
            {activeTab === 'messages' && <MessagesTab      data={activeData} />}
          </>
        )}

      {/* Spin keyframe */}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </AdminPageHeader>
  )
}
