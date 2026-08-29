/**
 * src/pages/admin/AnalyticsDashboard.jsx
 * Phase 3J — Analytics Dashboard
 *
 * F10 Batch D (D38), step 8h+ — tab consolidation: 9 tabs collapsed to 6.
 *   - 'quality' replaces 'health' + 'gaps' + 'coverage' (all three were
 *     different views of the same content library — rendered via
 *     ContentQualityTab.jsx, three stacked sections, no computation changed)
 *   - 'promos' replaces 'messages' + 'monetization' (both were stat-card-
 *     plus-chart views of banner/prompt interaction — rendered via
 *     PromptsUpgradesTab.jsx, two stacked sections, no computation changed)
 * Final six: Identity & Segment | Engagement | Retention | Usage |
 * Content Quality | Prompts & Upgrades.
 *
 * Same pass also fixes the tab bar showing an unwanted vertical scrollbar:
 * the bar only sets overflowX, and per the CSS spec, when one overflow axis
 * is 'auto' and the other is left as the default 'visible', the browser
 * force-computes the visible one to 'auto' too — so overflowY was silently
 * becoming scrollable. Explicit overflowY: 'hidden' below fixes it.
 *
 * Refresh button (re-fetches all data)
 * CSV export button (exports current tab data)
 *
 * Route: /admin/analytics  (added to router.jsx)
 * Entry: AdminDashboard nav card (added to AdminDashboard.jsx)
 *
 * Messages analytics (Phase 2, App Gate System plan §10.5) — extends the
 * existing usage_events pattern rather than a parallel tracking system,
 * per the plan's confirmed decision. Reads the four gate_* event types
 * logged by useAppGate.js / AppGate.jsx (impression, dismiss, maybe_later,
 * cta_click) and aggregates per gate by entity_name, same convention every
 * other event type here already uses. Now rendered inside
 * PromptsUpgradesTab.jsx rather than its own tab.
 *
 * F10 Batch B — Analytics Revamp (D30/D32): the `prescriptions` fetch is
 * removed entirely — that table doesn't exist in the schema, a retired
 * legacy concept superseded by the `clinical_blocks` block system.
 * `genericsWithBrands`/`genericsWithDoses` and `publishedConditions` all
 * switch from an unfiltered/`is_published`-only existence check to a real
 * `needs_review`-aware completeness check (published AND NOT flagged for
 * review) — see the fetch query and computation below.
 *
 * F10 Batch D (D38), steps 8a/8b — two queries (`usageDetail`,
 * `profilesRes`) power the Engagement, Retention, and Identity/Segment
 * tabs. `profilesRes` powers Identity/Segment (8c) and Retention (8e, via
 * the `id` column added in that step). `usageDetail` powers Engagement
 * (8d), Retention (8e), and Monetization (8f, via the `pro_feature_click`
 * event already present in that same 90-day pull) — now folded into
 * `promos.monetization` below.
 *
 * F10 usage-tracking audit fix (follow-up pass) — the 1,000-row default
 * cap on unpaginated Supabase reads wasn't only truncating usage_events;
 * it was also silently truncating generics (7,270 rows live), formulations
 * (11,817 rows), the 14-day search_gaps pull (2,410 rows), and the 90-day
 * usage_events pull (9,080 rows) — undercounting Content Quality,
 * Engagement, Retention, and Monetization by anywhere from 60-90%. All
 * four now page through every row via `fetchAllRows`, the same pattern
 * `fetchAllEventNames` already used for the Usage tab's totals and Top
 * lists. No computation logic changed — only how much of each table
 * actually gets loaded before those computations run.
 */

import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, Download } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import AdminPageHeader from '../../components/admin/AdminPageHeader'

import IdentitySegmentTab  from './analytics/IdentitySegmentTab'
import EngagementTab       from './analytics/EngagementTab'
import RetentionTab        from './analytics/RetentionTab'
import UsageTab            from './analytics/UsageTab'
import ContentQualityTab   from './analytics/ContentQualityTab'
import PromptsUpgradesTab  from './analytics/PromptsUpgradesTab'

// ─── Tab config ───────────────────────────────────────────────────────────────
// F10 Batch D (D38), step 8h+: 'health' + 'gaps' + 'coverage' merged into
// 'quality'; 'messages' + 'monetization' merged into 'promos'. 'usage'
// stays separate from 'engagement' — Usage is unbounded, event-count based;
// Engagement is 90-day, session-based, and depends on the session-linking
// tracking that only started 2026-08-27, so combining them would put solid
// long-run numbers next to a still-mostly-empty section in the same tab.

const TABS = [
  { id: 'identity',   label: 'Identity & Segment' },
  { id: 'engagement', label: 'Engagement'          },
  { id: 'retention',  label: 'Retention'           },
  { id: 'usage',      label: 'Usage'               },
  { id: 'quality',    label: 'Content Quality'     },
  { id: 'promos',     label: 'Prompts & Upgrades'  },
]

// ─── Data fetching ────────────────────────────────────────────────────────────

// F10 usage-tracking audit fix — Supabase caps any unpaginated request at
// 1,000 rows by default. condition_view alone is already 6,539 rows live
// (well past that cap), which was silently truncating both the "Top
// Viewed" rankings AND (via a separate query) the Usage tab's total
// counts. Total counts are fixed below by switching to count-only
// queries (head: true — no rows returned, so there's nothing to cap).
// The "Top X" rankings still need every row to rank correctly, so this
// helper pages through in chunks of 1000, same pattern queries.js's
// fetchAllBrandRows already uses for the brands table.
const EVENT_PAGE_SIZE = 1000

async function fetchAllEventNames(eventType) {
  let rows = []
  let from = 0
  for (;;) {
    const { data, error } = await supabase
      .from('usage_events')
      .select('entity_name')
      .eq('event_type', eventType)
      .not('entity_name', 'is', null)
      .range(from, from + EVENT_PAGE_SIZE - 1)
    if (error) throw error
    rows = rows.concat(data ?? [])
    if (!data || data.length < EVENT_PAGE_SIZE) break
    from += EVENT_PAGE_SIZE
  }
  return rows
}

// F10 usage-tracking audit fix, extended — the same 1,000-row cap that
// hit usage_events above also silently truncates every other unpaginated
// read below. Confirmed live: generics is 7,270 rows (~14% was loading),
// formulations is 11,817 rows (~8%), search_gaps in the last 14 days is
// 2,410 rows (~41%), and usage_events in the last 90 days is 9,080 rows
// (~11%) — each one was quietly feeding wrong numbers into Content
// Quality, Engagement, Retention, and Monetization. Generic version of
// the helper above: takes a function that builds the query fresh each
// page (Supabase's builder can't be re-ranged after it's been awaited),
// pages through in the same 1,000-row chunks.
async function fetchAllRows(buildQuery) {
  let rows = []
  let from = 0
  for (;;) {
    const { data, error } = await buildQuery().range(from, from + EVENT_PAGE_SIZE - 1)
    if (error) throw error
    rows = rows.concat(data ?? [])
    if (!data || data.length < EVENT_PAGE_SIZE) break
    from += EVENT_PAGE_SIZE
  }
  return rows
}

async function fetchAllAnalytics() {
  const [
    conditionsRes,
    brandsRes,
    specialtiesRes,
    conditionViewCountRes,
    drugViewCountRes,
    conditionSearchCountRes,
    drugSearchCountRes,
    gateEventsRes,
    profilesRes,
  ] = await Promise.all([

    // Conditions: total + published counts + needs_review + missing definition
    supabase
      .from('conditions')
      .select('id, is_published, needs_review, definition, specialty_id, specialties!conditions_specialty_id_fkey(name_en)'),

    // Total brands
    supabase
      .from('brands')
      .select('id', { count: 'exact', head: true }),

    // Specialties for coverage table
    supabase
      .from('specialties')
      .select('id, name_en, is_active')
      .eq('is_active', true)
      .order('sort_order', { ascending: true }),

    // Usage totals — F10 audit fix: four separate head-only counts
    // instead of one query that fetched actual rows for all four event
    // types combined (9,058 rows worth — silently truncated to 1,000 by
    // Supabase's default cap, undercounting every total on this tab by
    // roughly 90%). head: true returns just a number, no rows, so there
    // is no cap to hit no matter how large usage_events grows.
    supabase
      .from('usage_events')
      .select('*', { count: 'exact', head: true })
      .eq('event_type', 'condition_view'),

    supabase
      .from('usage_events')
      .select('*', { count: 'exact', head: true })
      .eq('event_type', 'drug_view'),

    supabase
      .from('usage_events')
      .select('*', { count: 'exact', head: true })
      .eq('event_type', 'condition_search'),

    supabase
      .from('usage_events')
      .select('*', { count: 'exact', head: true })
      .eq('event_type', 'drug_search'),

    // App Gate events: impressions, dismisses, maybe-laters, CTA clicks
    supabase
      .from('usage_events')
      .select('event_type, entity_name')
      .in('event_type', ['gate_impression', 'gate_dismiss', 'gate_maybe_later', 'gate_cta_click']),

    // F10 Batch D (D38), step 8b — identity/segment fields already
    // collected at sign-up. Direct table read, not through the
    // admin-users edge function (that function exists for auth.users
    // email/last-sign-in-at, not needed here). Powers the Identity/
    // Segment tab. `id` added in step 8e so Retention can link a signup
    // to that person's later usage_events rows.
    supabase
      .from('profiles')
      .select('id, specialty, country, occupation, created_at'),
  ])

  // F10 usage-tracking audit fix — every query here needs every matching
  // row (to rank the Usage tab's "Top Viewed/Searched" lists correctly,
  // or to compute accurate Content Quality / Engagement / Retention /
  // Monetization figures), not just the first 1,000 Supabase would
  // return by default. Run in parallel via fetchAllEventNames' and
  // fetchAllRows' internal pagination (see helpers above).
  const [
    topViewCondNames,
    topSearchCondNames,
    topViewDrugNames,
    generics,
    formulations,
    gaps,
    usageDetail,
  ] = await Promise.all([
    fetchAllEventNames('condition_view'),
    fetchAllEventNames('condition_search'),
    fetchAllEventNames('drug_view'),

    // Generics: category grouping + has any real (published, not-flagged)
    // brands/doses. 7,270 rows live — was silently capped to ~1,000.
    fetchAllRows(() => supabase
      .from('generics')
      .select('id, category, is_published, formulations(id, doses_structured, brands(id, is_published, needs_review))')),

    // Formulations with no dose data. 11,817 rows live — was silently
    // capped to ~1,000.
    fetchAllRows(() => supabase
      .from('formulations')
      .select('id, doses_structured')),

    // Search gaps: last 14 days. 2,410 rows live in that window — was
    // silently capped to ~1,000.
    fetchAllRows(() => supabase
      .from('search_gaps')
      .select('term, context, created_at')
      .gte('created_at', new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString())),

    // F10 Batch D (D38), step 8a — full usage_events rows with device/
    // session/user context, bounded to the last 90 days. Powers the
    // Engagement tab (8d), Retention tab (8e), and Monetization (8f).
    // 9,080 rows live in that window — was silently capped to ~1,000.
    fetchAllRows(() => supabase
      .from('usage_events')
      .select('event_type, entity_name, device_id, user_id, session_id, created_at')
      .gte('created_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())),
  ])

  // ── Content Health ───────────────────────────────────────────────────────────
  const conditions   = conditionsRes.data   ?? []
  // generics / formulations now come straight from fetchAllRows above —
  // already plain arrays, no `.data` wrapper to unwrap.

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
  // `gaps` now comes straight from fetchAllRows above — already a plain
  // array, no `.data` wrapper to unwrap.

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
  // F10 usage-tracking audit fix — totals now come straight from the four
  // count-only queries above (real, uncapped numbers), not from counting
  // a row-fetch that Supabase was silently truncating at 1,000.

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
  // `usageDetail` pulled in step 8a above (now paginated via
  // fetchAllRows — no new query needed, just fixed to load all of it).

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

  // ── Retention ────────────────────────────────────────────────────────────────
  // F10 Batch D (D38), step 8e. "D-N retained" = at least one usage_events
  // row for that person in the N days after signup (not counting signup
  // day itself). A cohort/horizon only gets a number once N days have
  // actually elapsed since signup for everyone in it — otherwise it's
  // left as null so the UI can show '—' instead of a misleading 0%.
  const DAY_MS = 24 * 60 * 60 * 1000
  const nowMs = Date.now()

  const eventTimesByUser = {}
  usageDetail.forEach(e => {
    if (!e.user_id) return
    if (!eventTimesByUser[e.user_id]) eventTimesByUser[e.user_id] = []
    eventTimesByUser[e.user_id].push(new Date(e.created_at).getTime())
  })

  function returnedWithin(userId, signupMs, days) {
    const events = eventTimesByUser[userId]
    if (!events) return false
    const windowEnd = signupMs + DAY_MS * days
    return events.some(t => t > signupMs && t <= windowEnd)
  }

  function cohortRate(users, days) {
    const eligible = users.filter(p => nowMs - new Date(p.created_at).getTime() >= DAY_MS * days)
    if (eligible.length === 0) return null
    const retained = eligible.filter(p => returnedWithin(p.id, new Date(p.created_at).getTime(), days)).length
    return Math.round((retained / eligible.length) * 100)
  }

  const cohortsByWeek = {}
  profiles.forEach(p => {
    if (!p.id || !p.created_at) return
    const wk = weekKey(p.created_at)
    if (!cohortsByWeek[wk]) cohortsByWeek[wk] = []
    cohortsByWeek[wk].push(p)
  })

  const retentionByWeek = Object.entries(cohortsByWeek)
    .map(([week, users]) => ({
      week,
      totalUsers: users.length,
      d1:  cohortRate(users, 1),
      d7:  cohortRate(users, 7),
      d30: cohortRate(users, 30),
    }))
    .sort((a, b) => a.week.localeCompare(b.week))

  const usersWithIdAndSignup = profiles.filter(p => p.id && p.created_at)

  // ── Monetization ────────────────────────────────────────────────────────────
  // F10 Batch D (D38), step 8f. Fake-door tap counter for the "Upgrade to
  // Capsula PRO" banner (8g) — no real paid tier exists yet. Built from the
  // same 90-day usageDetail pull as Engagement/Retention above, no new
  // query needed: pro_feature_click events were already included in that
  // broad, unfiltered usage_events select. Every tap counts here (unlike
  // Engagement's per-session sessionsPerWeek dedup) since the thing being
  // measured is raw interest in the banner, not distinct visits.
  const proClicks = usageDetail.filter(e => e.event_type === 'pro_feature_click')

  const clickWeekMap = {}
  proClicks.forEach(e => {
    const wk = weekKey(e.created_at)
    clickWeekMap[wk] = (clickWeekMap[wk] ?? 0) + 1
  })
  const clicksPerWeek = Object.entries(clickWeekMap)
    .map(([week, count]) => ({ week, count }))
    .sort((a, b) => a.week.localeCompare(b.week))

  const totalProClicks = proClicks.length

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
    retention: {
      overallD1:  cohortRate(usersWithIdAndSignup, 1),
      overallD7:  cohortRate(usersWithIdAndSignup, 7),
      overallD30: cohortRate(usersWithIdAndSignup, 30),
      retentionByWeek,
    },
    usage: {
      totalConditionViews:    conditionViewCountRes.count   ?? 0,
      totalConditionSearches: conditionSearchCountRes.count ?? 0,
      totalDrugViews:         drugViewCountRes.count         ?? 0,
      totalDrugSearches:      drugSearchCountRes.count       ?? 0,
      topViewedConditions:    topNames(topViewCondNames),
      topSearchedConditions:  topNames(topSearchCondNames),
      topViewedDrugs:         topNames(topViewDrugNames),
    },
    // F10 Batch D (D38), step 8h+: former top-level 'health' + 'gaps' +
    // 'coverage' now nested here, rendered together by ContentQualityTab.
    quality: {
      health: {
        totalConditions,
        publishedConditions,
        conditionsMissingDefinition: condsMissingDef,
        totalGenerics,
        genericsWithBrands,
        genericsWithDoses,
        formulationsWithNoDose,
      },
      coverage: {
        totalSpecialties,
        totalConditions,
        totalGenerics,
        totalBrands,
        specialtyCoverage,
        drugGroups,
      },
      gaps: {
        drugGaps,
        conditionGaps,
      },
    },
    // F10 Batch D (D38), step 8h+: former top-level 'messages' +
    // 'monetization' now nested here, rendered together by
    // PromptsUpgradesTab.
    promos: {
      messages: {
        totalImpressions: countGateType('gate_impression'),
        totalDismisses:   countGateType('gate_dismiss'),
        totalMaybeLater:  countGateType('gate_maybe_later'),
        totalCtaClicks:   countGateType('gate_cta_click'),
        topGates:         topGates(gateEvents),
      },
      monetization: {
        totalProClicks,
        clicksPerWeek,
      },
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

  } else if (activeTab === 'retention') {
    const d = data.retention
    rows = [
      ['Overall D1', d.overallD1 == null ? '' : `${d.overallD1}%`],
      ['Overall D7', d.overallD7 == null ? '' : `${d.overallD7}%`],
      ['Overall D30', d.overallD30 == null ? '' : `${d.overallD30}%`],
      ['', ''],
      ['Signup Week', 'Signups', 'D1', 'D7', 'D30'],
    ]
    d.retentionByWeek.forEach(r => rows.push([
      r.week, r.totalUsers,
      r.d1 == null ? '' : `${r.d1}%`,
      r.d7 == null ? '' : `${r.d7}%`,
      r.d30 == null ? '' : `${r.d30}%`,
    ]))
    filename = 'capsula-retention.csv'

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

  } else if (activeTab === 'quality') {
    const { health, coverage, gaps } = data.quality
    rows = [
      ['Content Health', ''],
      ['Total Conditions',          health.totalConditions],
      ['Published Conditions',      health.publishedConditions],
      ['Conditions Missing Def',    health.conditionsMissingDefinition],
      ['Total Generics',            health.totalGenerics],
      ['Generics With Brands',      health.genericsWithBrands],
      ['Generics With Doses',       health.genericsWithDoses],
      ['Formulations With No Dose', health.formulationsWithNoDose],
      ['', ''],
      ['Coverage by Specialty', ''],
      ['Specialty', 'Total Conditions', 'Published', 'Publish Rate %'],
      ...coverage.specialtyCoverage.map(r => [
        r.specialty, r.total, r.published,
        r.total > 0 ? Math.round((r.published / r.total) * 100) : 0,
      ]),
      ['', ''],
      ['Search Gaps', ''],
      ['Term', 'Context', 'Count'],
      ...gaps.conditionGaps.map(r => [r.term, 'conditions', r.count]),
      ...gaps.drugGaps.map(r => [r.term, 'drugs', r.count]),
    ]
    filename = 'capsula-content-quality.csv'

  } else if (activeTab === 'promos') {
    const { messages, monetization } = data.promos
    rows = [
      ['In-App Messages', ''],
      ['Total Impressions', messages.totalImpressions],
      ['Total Dismisses',   messages.totalDismisses],
      ['Total Maybe Later', messages.totalMaybeLater],
      ['Total CTA Clicks',  messages.totalCtaClicks],
      ['', ''],
      ['Message', 'Impressions', 'Dismisses', 'Maybe Later', 'CTA Clicks'],
      ...messages.topGates.map(g => [g.name, g.impressions, g.dismisses, g.maybeLater, g.ctaClicks]),
      ['', ''],
      ['Upgrade to PRO', ''],
      ['Total "Upgrade to PRO" Taps (last 90 days)', monetization.totalProClicks],
      ['', ''],
      ['Week', 'Taps'],
      ...monetization.clicksPerWeek.map(r => [r.week, r.count]),
    ]
    filename = 'capsula-prompts-upgrades.csv'
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
  const [activeTab, setActiveTab] = useState('identity')
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
          plan §1). overflowY is now set explicitly to 'hidden': leaving it
          unset let the browser force-compute it to 'auto' (per spec,
          pairing overflowX:'auto' with an unset/'visible' overflowY makes
          the browser treat the unset axis as 'auto' too), which is what
          was causing the stray vertical scrollbar on this strip. */}
      <div style={{
        display: 'flex', gap: 0,
        borderBottom: '1px solid var(--color-border)',
        marginBottom: 'var(--space-5)',
        overflowX: 'auto',
        overflowY: 'hidden',
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
            {activeTab === 'retention'  && <RetentionTab       data={activeData} />}
            {activeTab === 'usage'      && <UsageTab           data={activeData} />}
            {activeTab === 'quality'    && <ContentQualityTab  data={activeData} />}
            {activeTab === 'promos'     && <PromptsUpgradesTab data={activeData} />}
          </>
        )}

      {/* Spin keyframe */}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </AdminPageHeader>
  )
}
