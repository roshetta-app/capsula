/**
 * src/hooks/useAppGate.js
 * App Gate System Phase 1 Step 4a.
 * Phase 2 additions (this session) — Maybe Later (persistent, capped +
 * spaced-out), analytics, and a default Force Update CTA. See below.
 *
 * Fetches whatever should currently be shown to this device — a Force
 * Update block, or a maintenance / critical_announcement / promo message —
 * and exposes it as a single `gate` value (or null if nothing applies).
 *
 * Force Update is decided purely by comparing the running app version
 * (from @capacitor/app's App.getInfo().version, already a dependency, D)
 * against app_releases' flagged minimum-supported version for this
 * platform (fetchMinimumSupportedVersion). A force_update-type app_gates
 * row's own min_version field is never read for this comparison — per
 * plan decision, that field is informational only, kept in sync by hand by
 * whoever writes the message. If an active force_update-type gate exists
 * for this platform, its title/message/image/cta are used as the block
 * screen's copy; otherwise sensible defaults are used, INCLUDING a
 * default ctaUrl pointing at Capsula's Play Store listing (Phase 2 fix —
 * previously a Force Update block with no custom message configured had
 * no action button at all, since GateCta renders nothing without a URL).
 * dismissible is always forced to false here regardless of any stored
 * value — Force Update is always the hard, non-dismissible block, by
 * design.
 *
 * Known limitation, surfaced during Phase 2 testing, NOT fixed here:
 * App.getInfo().version has no web implementation, so runningVersion is
 * always null on the website build — Force Update can never trigger
 * there no matter what's flagged in Releases for platform 'web'. Real
 * web support would need a different version source entirely (e.g. a
 * build-time-injected constant) and is out of scope for this pass.
 *
 * The other three types are decided purely by app_gates: active + platform
 * match + inside its scheduling window (fetchActiveGates already applies
 * all three). When more than one could show at once, TYPE_PRIORITY below
 * picks one — force_update always wins, then maintenance (something's
 * actually down right now outranks a one-off announcement), then
 * critical_announcement, then promo.
 *
 * TWO separate "don't show this again" mechanisms, on purpose (plan
 * §10.2/§10.3) — not the same thing with different labels:
 *
 *   - Permanent (X button / dismiss()): stored in @capacitor/preferences,
 *     survives app close/reopen, forever, until a NEW gate row is
 *     created. Unchanged from Phase 1.
 *
 *   - Maybe Later (maybeLater()) — REWRITTEN this session, was
 *     session-only (in-memory, cleared the moment the app reopened),
 *     which meant it resurfaced on literally the very next open — not
 *     the intended "later" behavior at all. Now persistent, capped, and
 *     spaced out:
 *       - MAX_MAYBE_LATER (3): after the 3rd time someone taps Maybe
 *         Later on the same gate, it converts to a permanent dismiss —
 *         it will not keep coming back indefinitely.
 *       - SKIP_OPENS (2): after tapping Maybe Later, the gate is
 *         suppressed for the next 2 app opens and only becomes eligible
 *         to show again on the 3rd. "App open" here means this hook
 *         remounting (a real cold start / relaunch) — NOT every
 *         resume-from-background, which just calls refresh() on the
 *         already-mounted hook and does not advance this counter.
 *
 * Analytics (plan §10.5) — extends the existing usageEvents.js pattern.
 * gate_impression fires at most once per gate becoming the one actually
 * shown (tracked via a ref, not on every refresh() re-poll of the same
 * still-showing gate). gate_dismiss / gate_maybe_later fire from their
 * respective functions below. gate_cta_click is logged in AppGate.jsx,
 * not here — only that component knows a specific button was tapped.
 *
 * This hook only fetches + computes — it does not decide when to re-check.
 * App.jsx's resume listener (Step 4c) is what calls refresh() again when
 * the app comes back to the foreground.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { Capacitor } from '@capacitor/core'
import { App as CapacitorApp } from '@capacitor/app'
import { Preferences } from '@capacitor/preferences'
import { supabase } from '../lib/supabase'
import { fetchActiveGates, fetchMinimumSupportedVersion } from '../lib/queries'
import { logUsageEvent } from '../analytics/usageEvents'

const DISMISSED_GATES_KEY  = 'capsula_dismissed_gate_ids'
const MAYBE_LATER_KEY      = 'capsula_gate_maybe_later_state'
const APP_OPEN_COUNT_KEY   = 'capsula_app_open_count'

const MAX_MAYBE_LATER = 3 // total times a gate can be snoozed before it's treated as a permanent dismiss
const SKIP_OPENS      = 2 // app opens to suppress after a Maybe Later, before it's eligible to show again

// Used only when a Force Update block has no admin-configured CTA link —
// see file header note. Matches capacitor.config.json's appId.
const DEFAULT_FORCE_UPDATE_CTA_URL = 'https://play.google.com/store/apps/details?id=com.capsula.app'

// force_update always wins (it's the hard block); maintenance outranks a
// one-off announcement; promo is lowest priority, never worth interrupting
// anything above it.
const TYPE_PRIORITY = ['force_update', 'maintenance', 'critical_announcement', 'promo']

/**
 * Plain dotted-number version compare (e.g. "4.2.0" vs "4.10.0"), since
 * this project has no semver dependency and app_releases.version is
 * always this simple "major.minor.patch"-style string (plan §7). Missing
 * segments are treated as 0, so "4.2" vs "4.2.0" compares equal.
 */
function compareVersions(a, b) {
  const partsA = String(a).split('.').map(n => parseInt(n, 10) || 0)
  const partsB = String(b).split('.').map(n => parseInt(n, 10) || 0)
  const len = Math.max(partsA.length, partsB.length)

  for (let i = 0; i < len; i++) {
    const diff = (partsA[i] ?? 0) - (partsB[i] ?? 0)
    if (diff !== 0) return diff < 0 ? -1 : 1
  }
  return 0
}

async function getDismissedIds() {
  try {
    const { value } = await Preferences.get({ key: DISMISSED_GATES_KEY })
    return value ? JSON.parse(value) : []
  } catch {
    return []
  }
}

async function addDismissedId(id) {
  const ids = await getDismissedIds()
  if (!ids.includes(id)) {
    await Preferences.set({ key: DISMISSED_GATES_KEY, value: JSON.stringify([...ids, id]) })
  }
}

async function getMaybeLaterState() {
  try {
    const { value } = await Preferences.get({ key: MAYBE_LATER_KEY })
    return value ? JSON.parse(value) : {}
  } catch {
    return {}
  }
}

async function setMaybeLaterState(state) {
  try {
    await Preferences.set({ key: MAYBE_LATER_KEY, value: JSON.stringify(state) })
  } catch {
    // best-effort — worst case a snooze isn't remembered, not worth surfacing an error for
  }
}

async function incrementAndGetOpenCount() {
  let current = 0
  try {
    const { value } = await Preferences.get({ key: APP_OPEN_COUNT_KEY })
    current = value ? parseInt(value, 10) || 0 : 0
  } catch {
    current = 0
  }
  const next = current + 1
  try {
    await Preferences.set({ key: APP_OPEN_COUNT_KEY, value: String(next) })
  } catch {
    // best-effort — worst case the skip-opens count resets, not fatal
  }
  return next
}

/**
 * @returns {{
 *   gate: null | {
 *     id: string,
 *     type: 'force_update'|'maintenance'|'critical_announcement'|'promo',
 *     title: string, message: string,
 *     imageUrl: string|null, ctaLabel: string|null, ctaUrl: string|null,
 *     dismissible: boolean,
 *   },
 *   loading: boolean,
 *   dismiss: (id: string, title?: string) => Promise<void>,
 *   maybeLater: (id: string, title?: string) => Promise<void>,
 *   refresh: () => Promise<void>,
 * }}
 */
export function useAppGate() {
  const [gate, setGate]       = useState(null)
  const [loading, setLoading] = useState(true)

  // This app-open's number, per incrementAndGetOpenCount() — set once at
  // mount (a real cold start), read synchronously by refresh() thereafter.
  // Not state: changing it should never itself trigger a re-render.
  const openCountRef = useRef(0)

  // Tracks which gate id we last logged an impression for, so refresh()
  // re-polling the same still-active gate doesn't log a fresh impression
  // every cooldown-interval resume — only an actual change counts.
  const lastImpressionIdRef = useRef(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const platform = Capacitor.getPlatform() // 'android' | 'ios' | 'web'

      const [gates, minimumSupported, runningVersion, dismissedIds, maybeLaterState] = await Promise.all([
        fetchActiveGates(supabase, platform),
        fetchMinimumSupportedVersion(supabase, platform),
        CapacitorApp.getInfo().then(info => info.version).catch(() => null),
        getDismissedIds(),
        getMaybeLaterState(),
      ])

      const forceUpdateNeeded = Boolean(
        runningVersion && minimumSupported && compareVersions(runningVersion, minimumSupported) < 0
      )

      const forceUpdateGate = gates.find(g => g.type === 'force_update')
      const candidates = []

      if (forceUpdateNeeded) {
        candidates.push({
          id:          forceUpdateGate?.id ?? 'force_update',
          type:        'force_update',
          title:       forceUpdateGate?.title ?? 'Update required',
          message:     forceUpdateGate?.message ?? 'A new version of Capsula is required to continue.',
          imageUrl:    forceUpdateGate?.imageUrl ?? null,
          ctaLabel:    forceUpdateGate?.ctaLabel ?? 'Update now',
          ctaUrl:      forceUpdateGate?.ctaUrl ?? DEFAULT_FORCE_UPDATE_CTA_URL,
          dismissible: false,
        })
      }

      for (const g of gates) {
        if (g.type === 'force_update') continue // handled above, version-driven only
        if (dismissedIds.includes(g.id)) continue

        const ml = maybeLaterState[g.id]
        if (ml && openCountRef.current < ml.skipUntilOpen) continue // still within the skip window

        candidates.push(g)
      }

      candidates.sort((a, b) => TYPE_PRIORITY.indexOf(a.type) - TYPE_PRIORITY.indexOf(b.type))

      const next = candidates[0] ?? null
      setGate(next)

      if (next && next.id !== lastImpressionIdRef.current) {
        lastImpressionIdRef.current = next.id
        logUsageEvent('gate_impression', next.id, next.title)
      } else if (!next) {
        lastImpressionIdRef.current = null
      }
    } finally {
      setLoading(false)
    }
  }, [])

  // Runs once per real app mount (cold start / relaunch) — increments the
  // persistent open-count BEFORE the first refresh() so Maybe Later's
  // skip-window check has an accurate number to compare against on this
  // very first load, not just from the second load onward.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      openCountRef.current = await incrementAndGetOpenCount()
      if (!cancelled) refresh()
    })()
    return () => { cancelled = true }
  }, [refresh])

  const dismiss = useCallback(async (id, title) => {
    setGate(current => (current?.id === id ? null : current))
    await addDismissedId(id)
    logUsageEvent('gate_dismiss', id, title ?? null)
  }, [])

  const maybeLater = useCallback(async (id, title) => {
    setGate(current => (current?.id === id ? null : current))

    const state = await getMaybeLaterState()
    const prev  = state[id] ?? { count: 0 }
    const nextCount = prev.count + 1

    if (nextCount >= MAX_MAYBE_LATER) {
      // Cap reached — stop offering "later" and just treat this as final,
      // same as tapping the X, so it never resurfaces at all going forward.
      delete state[id]
      await setMaybeLaterState(state)
      await addDismissedId(id)
    } else {
      state[id] = { count: nextCount, skipUntilOpen: openCountRef.current + SKIP_OPENS }
      await setMaybeLaterState(state)
    }

    logUsageEvent('gate_maybe_later', id, title ?? null)
  }, [])

  return { gate, loading, dismiss, maybeLater, refresh }
}
