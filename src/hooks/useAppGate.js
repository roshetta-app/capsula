/**
 * src/hooks/useAppGate.js
 * App Gate System Phase 1 Step 4a.
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
 * screen's copy; otherwise sensible defaults are used. dismissible is
 * always forced to false here regardless of any stored value — Force
 * Update is always the hard, non-dismissible block, by design.
 *
 * The other three types are decided purely by app_gates: active + platform
 * match + inside its scheduling window (fetchActiveGates already applies
 * all three). When more than one could show at once, TYPE_PRIORITY below
 * picks one — force_update always wins, then maintenance (something's
 * actually down right now outranks a one-off announcement), then
 * critical_announcement, then promo.
 *
 * Per-device dismissals are stored in @capacitor/preferences (D — not
 * localStorage, the safer of the two options on native) so a dismissed
 * gate doesn't resurface for that device until it's switched off and a
 * different one (or a new instance of the same message) takes its place.
 *
 * This hook only fetches + computes — it does not decide when to re-check.
 * App.jsx's resume listener (Step 4c) is what calls refresh() again when
 * the app comes back to the foreground.
 */

import { useState, useEffect, useCallback } from 'react'
import { Capacitor } from '@capacitor/core'
import { App as CapacitorApp } from '@capacitor/app'
import { Preferences } from '@capacitor/preferences'
import { supabase } from '../lib/supabase'
import { fetchActiveGates, fetchMinimumSupportedVersion } from '../lib/queries'

const DISMISSED_GATES_KEY = 'capsula_dismissed_gate_ids'

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
 *   dismiss: (id: string) => Promise<void>,
 *   refresh: () => Promise<void>,
 * }}
 */
export function useAppGate() {
  const [gate, setGate]       = useState(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const platform = Capacitor.getPlatform() // 'android' | 'ios' | 'web'

      const [gates, minimumSupported, runningVersion, dismissedIds] = await Promise.all([
        fetchActiveGates(supabase, platform),
        fetchMinimumSupportedVersion(supabase, platform),
        CapacitorApp.getInfo().then(info => info.version).catch(() => null),
        getDismissedIds(),
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
          ctaLabel:    forceUpdateGate?.ctaLabel ?? null,
          ctaUrl:      forceUpdateGate?.ctaUrl ?? null,
          dismissible: false,
        })
      }

      for (const g of gates) {
        if (g.type === 'force_update') continue // handled above, version-driven only
        if (dismissedIds.includes(g.id)) continue
        candidates.push(g)
      }

      candidates.sort((a, b) => TYPE_PRIORITY.indexOf(a.type) - TYPE_PRIORITY.indexOf(b.type))

      setGate(candidates[0] ?? null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const dismiss = useCallback(async (id) => {
    setGate(current => (current?.id === id ? null : current))
    await addDismissedId(id)
  }, [])

  return { gate, loading, dismiss, refresh }
}
