/**
 * src/context/AuthContext.jsx
 *
 * AuthContext — makes the shared sign-in/session state available app-wide.
 * Same shape as FavouritesContext/PushSubscriptionContext: create the
 * context, a Provider that runs the sign-in check once, and a consumer
 * hook that throws if used outside the Provider.
 *
 * Added (auth-shared-context fix) to solve a real, confirmed cost of
 * useAuth() not having a shared Context before this: every mounted copy
 * of the hook ran its own separate supabase.auth.getSession() + profile
 * fetch, so navigating between two screens that both call useAuth() (e.g.
 * Account → Edit Profile) re-ran the whole sign-in check from scratch on
 * the second screen even though the first screen had just finished it a
 * moment earlier — this showed up as a visible load delay opening Edit
 * Profile. It also caused a previously-fixed but only-worked-around bug:
 * duplicate appUrlOpen listener registrations during Google sign-in
 * (Stage 3 F6, 2026-08-13), patched at the time with a module-level
 * singleton flag rather than solved at the root. This file is that root
 * fix — the flag below stays, since it's still correct defensive coding,
 * but with a real shared Context it can no longer actually fire more
 * than once anyway.
 *
 * src/hooks/useAuth.js now just re-exports useAuth from here — every
 * existing call site keeps working completely unchanged.
 *
 * full_name added to the profile load (account-screen-redesign task) —
 * previously this only carried role/tier, and the person's name was
 * fetched separately, fresh, every time AccountScreen mounted, causing a
 * visible delay before the name/avatar appeared. Loading it here instead
 * means it's ready at the same time as role/tier, with no extra
 * round-trip. refreshProfile is exposed so AccountEditScreen can pull the
 * new name in right after a save, without this only updating on the next
 * sign-in/sign-out/token-refresh.
 *
 * phone_number/occupation/country/specialty added (profile-nudge-instant-
 * load, 2026-08-23) — same reasoning as full_name above. AccountScreen's
 * "finish setting up your profile" banner used to run its own separate
 * fetchOwnProfile() call on every mount and wait on it before deciding
 * whether to show anything, which is exactly the delay that was reported.
 * Now that these four fields ride along with the rest of the profile load
 * that already happens once per app session, AccountScreen reads them
 * straight off `profile` with no extra round-trip and no visible wait.
 *
 * account-header-tweaks (2026-08-23) — profile_setup_dismissed added to
 * the same load (see loadProfile), and a real SIGNED_IN event now
 * re-enters `loading` for the duration of that fetch (see the
 * onAuthStateChange subscription below). Together these close the gap
 * that let AccountScreen render signed-in for a beat before
 * ProfileSetupRedirect.jsx could redirect a first-time signup to the
 * wizard — see that file's own note for the full picture.
 *
 * pwa-first-signin-blank-wizard fix (2026-09-01) — the initial mount
 * effect's `loading` handling (added by the offline-profile-account fix
 * below) is now conditioned on a real cache seed actually being found,
 * not just on a session existing. See that effect's own comment for the
 * full race this closes: a first-ever sign-in on a given browser/device
 * (no local snapshot yet) landing on the website via a full-page OAuth
 * redirect could previously clear `loading` before the real profile
 * fetch resolved, letting AccountEditScreen's once-per-user-id
 * auto-open-wizard check run against a still-null profile and lock in a
 * blank first-time wizard for what was actually a returning account.
 *
 * profile-avatar-offline-fix (2026-09-01) — loadProfile(null) no longer
 * wipes the remembered auth snapshot (name/avatar/tier/everything).
 * Same root-cause class as the recently-viewed-offline-fix: `loadProfile`
 * gets called with `currentUser` null any time the sign-in library can't
 * currently confirm a session — which includes a real sign-out, but also
 * a background session recheck failing purely from being offline. This
 * function had no way to tell those apart, so an offline hiccup wiped the
 * exact same snapshot this file otherwise goes out of its way to protect
 * for instant/offline loading — explaining why the Account screen's
 * photo/name sometimes rendered correctly and sometimes fell back to
 * initials or the email fallback with no real cause. The snapshot is now
 * only ever cleared from signOut() below, the one place a sign-out is
 * guaranteed to be real (and which already protects itself against a
 * network-timing false positive via isNetworkTimingError) — not
 * reactively here on every merely-unconfirmed session.
 */

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { Capacitor } from '@capacitor/core'
import { Browser } from '@capacitor/browser'
import { App } from '@capacitor/app'
import { supabase } from '../lib/supabase'
import { useToast } from './ToastContext'
import { writeCachedAuthSnapshot, clearCachedAuthSnapshot, getCachedAuthSnapshot } from '../utils/authSnapshot'
import { setCurrentUserId } from '../analytics/deviceSession'

// Stage 3 (F6) — the custom scheme/host the native app registers in
// AndroidManifest.xml to catch Google's redirect back from the system
// browser. Must stay in sync with that file and with the redirect URL
// added to Supabase's dashboard allow-list.
const NATIVE_AUTH_CALLBACK_URL = 'com.capsula.app://auth-callback'

// Stage 3 (F6) bug fix, 2026-08-13 — confirmed on-device: useAuth() used
// to be called directly (no shared Context) from several components
// (AuthGuard, AccountSheet, etc.), so each mounted copy of this hook was
// registering its own separate appUrlOpen listener — logcat showed eight
// registrations at once. One real Google redirect then triggered several
// of them simultaneously, all racing to exchange the same one-time code;
// since a PKCE code can only be used once, only one such attempt could
// ever succeed regardless of any other fix. This module-level flag makes
// the listener a true app-wide singleton — registered once, ever. Now
// that AuthProvider itself only ever mounts once (App.jsx renders it a
// single time), this flag can't actually fire more than once in practice
// either way, but it's left in place as correct defensive coding.
let oauthCallbackListenerRegistered = false

// Stage 3 (F6) bug fix, 2026-08-13, second finding (intermittent-signin-fail)
// — confirmed via a real on-device logcat capture: right after returning
// from the Google browser tab, the app can briefly have no working network
// connection. Android suspends an app's network access while it's
// backgrounded (during the time spent in the browser signing in), and
// there's a real window right after the app returns to the foreground
// where that hasn't finished waking back up yet. If
// exchangeCodeForSession() fires in that window, its request to
// Supabase's token endpoint fails outright with a generic fetch error —
// nothing to do with the code or the PKCE flow being wrong. One retry
// after a short delay is enough to clear this in practice, since the
// window is brief. Only retries on this specific network-timing failure
// — a real rejection from Google/Supabase (expired/invalid code) is a
// permanent failure retrying can't fix, so that still fails immediately.
const OAUTH_EXCHANGE_RETRY_DELAY_MS = 1500

function isNetworkTimingError(error) {
  if (!error) return false
  const message = error.message ?? ''
  return message.includes('Failed to fetch') || message.includes('NetworkError')
}

// Pro-offline cold-start fix, round 2 (2026-09-01) — maps the durable
// snapshot (authSnapshot.js) onto the same shape `profile` normally holds.
// The snapshot now carries the whole profile, not just tier (round 1 of
// this fix only cached tier, which fixed the offline block but left every
// other field reading as blank — an already-set-up person's occupation/
// country/specialty/etc. looked wiped on a cold offline start, and
// profileSetupDismissed reading as missing could even bounce them back
// into the setup wizard). Fields the snapshot doesn't carry (currently
// none — every profile field it needs now rides along, see
// writeCachedAuthSnapshot below) would fall back to null here, same as a
// real "field not filled in yet" state.
function cachedSnapshotToProfile(cached) {
  return {
    role:                  cached.role ?? null,
    tier:                  cached.tier ?? null,
    fullName:              cached.fullName ?? null,
    themePreference:       cached.themePreference ?? null,
    phoneNumber:           cached.phoneNumber ?? null,
    occupation:            cached.occupation ?? null,
    country:               cached.country ?? null,
    specialty:             cached.specialty ?? null,
    profileSetupDismissed: cached.profileSetupDismissed ?? null,
    // offline-profile-account (2026-09-01): the four fields Manage
    // Profile's edit screen needs that weren't cached before — added so
    // that screen can read entirely from this shared, offline-safe
    // profile instead of running its own separate, offline-unsafe fetch
    // (see AccountEditScreen.jsx for the other half of this fix).
    gender:                cached.gender ?? null,
    phoneCountryCode:      cached.phoneCountryCode ?? null,
    occupationOther:       cached.occupationOther ?? null,
    studentType:           cached.studentType ?? null,
  }
}

// offline-profile-account (2026-09-01) — pulled out of loadProfile so the
// initial mount effect below can seed `profile` from the cache and clear
// `loading` immediately, without waiting on the network fetch that used
// to gate it. loadProfile still calls this itself for the mid-session
// (already-signed-in, background-refresh) case — same helper, one
// definition, not two copies of the same "does this cached snapshot
// belong to this user" check.
function seedProfileFromCache(currentUser) {
  const cached = getCachedAuthSnapshot()
  if (cached?.id === currentUser.id) return cachedSnapshotToProfile(cached)
  return null
}

async function exchangeCodeWithRetry(code) {
  const first = await supabase.auth.exchangeCodeForSession(code)
  if (!first.error || !isNetworkTimingError(first.error)) return first

  await new Promise(resolve => setTimeout(resolve, OAUTH_EXCHANGE_RETRY_DELAY_MS))
  return supabase.auth.exchangeCodeForSession(code)
}

// Phase F3 bug fix — both notes and recently-viewed clear their own local
// storage reactively, but only while their exact screen/condition happens
// to be mounted at the moment of sign-out (see useNotes.js /
// useRecentlyViewed.js). Favourites doesn't have this problem — it's
// mirrored by an always-mounted context, so its own effect always fires.
// This sweeps the remaining two directly, from the one place sign-out
// always runs through regardless of what page is open. Storage keys are
// duplicated from useNotes.js's prefix and useRecentlyViewed.js's CONFIG
// on purpose (importing back into this file from hooks that already
// import useAuth would create a circular dependency) — if either hook's
// storage-key naming changes, update both spots.
function clearAllNotesStorage() {
  try {
    const keysToRemove = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith('capsula_notes_')) keysToRemove.push(key)
    }
    keysToRemove.forEach(key => localStorage.removeItem(key))
  } catch {
    // localStorage unavailable — silently ignore
  }
}

function clearAllRecentlyViewedStorage() {
  try {
    localStorage.removeItem('capsula_recent_conditions')
    localStorage.removeItem('capsula_recent_drugs')
  } catch {
    // localStorage unavailable — silently ignore
  }
}

const AuthCtx = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  // admin-cms-shell-flash fix (2026-08-24) — tracks whichever user id is
  // currently loaded so onAuthStateChange (below) can tell a genuine new
  // sign-in apart from supabase-js re-firing SIGNED_IN for the SAME user
  // on browser tab/window refocus (a documented supabase-js behavior:
  // the client re-validates its session on visibilitychange, and that
  // re-validation itself dispatches SIGNED_IN, not just TOKEN_REFRESHED).
  // Confirmed as the cause of the whole admin CMS shell (sidebar +
  // content) flashing on every tab switch, once all 11 admin routes
  // started sharing one AuthGuard/AdminLayout instance — previously each
  // screen had its own AuthGuard, so the same spurious event only
  // reloaded one screen instead of the whole shell.
  const userIdRef = useRef(null)

  const loadProfile = useCallback(async (currentUser) => {
    if (!currentUser) {
      setProfile(null)
      // profile-avatar-offline-fix (2026-09-01) — this used to also call
      // clearCachedAuthSnapshot() here unconditionally. That treated
      // "we don't currently have a confirmed user in this one call" the
      // same as "this person is genuinely signed out" — but this branch
      // runs any time a session simply can't be confirmed right now,
      // including a background recheck failing purely from being
      // offline (same library quirk documented in the
      // recently-viewed-offline-fix). Wiping the snapshot on that false
      // signal is exactly what made the Account screen's photo/name
      // sometimes vanish for no real reason. The snapshot is durable,
      // offline-safe data by design (see authSnapshot.js) — it should
      // only ever be cleared by a real, confirmed sign-out, which
      // signOut() below already handles on its own, safely.
      return
    }

    // Pro-offline cold-start fix, round 2 (2026-09-01) — seed `profile`
    // from the durable snapshot BEFORE the network call below, not after
    // it fails. The previous version of this fix only fell back to the
    // snapshot once the fetch below had already failed — which, with no
    // network interface at all, isn't instant; the request can sit
    // failing/timing out for several seconds first. That's what produced
    // the reported "offline block shows, then disappears a few seconds
    // later" behavior: correct end state, wrong timing. Seeding here
    // instead means a cold start reads correctly right away, and the
    // fetch below just quietly confirms/refreshes it in the background —
    // same instant-then-confirm pattern account-instant-load already
    // established for name/photo, just triggered earlier in the
    // function. `prev ?? ...` still protects an already-known-good
    // in-memory profile from ever being downgraded by a stale cached
    // snapshot (e.g. a background token-refresh call arriving after the
    // real profile already loaded this session).
    const seedForLoad = seedProfileFromCache(currentUser)
    if (seedForLoad) {
      setProfile(prev => prev ?? seedForLoad)
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('role, tier, full_name, theme_preference, phone_number, occupation, country, specialty, profile_setup_dismissed, gender, phone_country_code, occupation_other, student_type')
      .eq('id', currentUser.id)
      .single()

    // theme_preference rides along on this same already-happening request —
    // no extra round-trip — so useDarkMode's account-sync effect has it as
    // soon as the profile loads, same timing full_name already gets.
    // profile-nudge-instant-load: phone_number/occupation/country/specialty
    // ride along the same way — AccountScreen's completeness banner used to
    // run its own separate fetchOwnProfile() on every mount, which is the
    // visible delay before the banner appeared. Now that data loads here,
    // at the same time as everything else this Context already carries, and
    // AccountScreen just reads it straight off `profile` with no wait.
    // account-header-tweaks (2026-08-23): profile_setup_dismissed added the
    // same way — ProfileSetupRedirect.jsx used to run its own separate
    // fetchOwnProfile() call to get this one flag, which resolved later
    // than (and independently of) this already-in-flight load, and that
    // gap is what let AccountScreen render signed-in for a beat before the
    // redirect to the wizard kicked in. Reading it straight off `profile`
    // like everything else here closes that gap.

    // Pro-offline bug fix — a connectivity failure (device genuinely
    // offline, or a background session re-validation on tab refocus /
    // app resume — see the SIGNED_IN branch below — firing mid-flaky-
    // connection) is not the same thing as "this profile doesn't exist."
    // Before this check, ANY error here — including a plain fetch
    // failure — fell through to setProfile(null) below, which wiped an
    // already-known tier: 'paid' the instant a background refresh
    // couldn't reach the server while offline. That's what could
    // silently downgrade a Pro user into the offline block mid-session.
    // A genuine "no profile row" error (e.g. right after first sign-up,
    // before one exists yet) is a different, legitimate case and should
    // still clear it below — only a connectivity failure bails out here,
    // deliberately leaving the last known-good profile in place until a
    // real check can actually succeed.
    //
    // Pro-offline-cold-start fix (2026-09-01) — the check above only
    // helps when `profile` already holds a known-good value in memory
    // from earlier in this same session. It did nothing for a genuine
    // cold start while offline: the app process gets killed in the
    // background, then relaunched with no connection, `profile` starts
    // back at null, and this same fetch fails the same way — but there's
    // no in-memory "last known good" left to protect, so a Pro account
    // stayed stuck reading as not-Pro (profile null → useIsPro() false)
    // for as long as the device was offline, showing the free-tier
    // offline block to a paying user. Falls back to the durable snapshot
    // (authSnapshot.js) the same way AccountScreen already falls back to
    // it for name/photo — but only when nothing already loaded this
    // session (the functional setProfile below leaves an existing
    // known-good profile untouched, so this never overrides the case the
    // check above already handles).
    //
    // Round 2 (2026-09-01, same day) — this branch only ever ran AFTER
    // the fetch above had already failed, which isn't instant with no
    // network at all, so the offline block would show correctly then
    // disappear several seconds later once this finally caught up. The
    // real fix is now further up this function, before the fetch even
    // starts — this branch stays as a second layer of protection for the
    // mid-session case (see its own comment below).
    if (error && isNetworkTimingError(error)) {
      // Belt-and-suspenders alongside the upfront seed above: covers the
      // case where `profile` already held a real, known-good value from
      // earlier in this session (so the upfront seed's `prev ?? ...`
      // correctly left it alone) and now needs protecting from being
      // wiped by this failed request, same reasoning as the original
      // Pro-offline bug fix above.
      const seedForRetry = seedProfileFromCache(currentUser)
      if (seedForRetry) {
        setProfile(prev => prev ?? seedForRetry)
      }
      return
    }

    setProfile(error ? null : {
      role:                  data.role,
      tier:                  data.tier,
      fullName:              data.full_name,
      themePreference:       data.theme_preference,
      phoneNumber:           data.phone_number,
      occupation:            data.occupation,
      country:               data.country,
      specialty:             data.specialty,
      profileSetupDismissed: data.profile_setup_dismissed,
      // offline-profile-account (2026-09-01): rides along the same way
      // every other field here already does — see cachedSnapshotToProfile
      // for why these four were missing.
      gender:                data.gender,
      phoneCountryCode:      data.phone_country_code,
      occupationOther:       data.occupation_other,
      studentType:           data.student_type,
    })

    // account-instant-load: durable snapshot written after a real,
    // successful (or legitimately-empty, e.g. no profile row yet) load —
    // never after a connectivity failure, which bails out above before
    // reaching here. avatarUrl comes straight off the auth user, not the
    // profiles table — Google's photo URL, not something this app stores
    // (via profile_setup_dismissed) risking an unwanted bounce back into the
    // setup wizard. See cachedSnapshotToProfile above for the read side.
    writeCachedAuthSnapshot({
      id:                    currentUser.id,
      email:                 currentUser.email ?? null,
      avatarUrl:             currentUser.user_metadata?.avatar_url || currentUser.user_metadata?.picture || null,
      role:                  error ? null : data.role,
      tier:                  error ? null : data.tier,
      fullName:              error ? null : data.full_name,
      themePreference:       error ? null : data.theme_preference,
      phoneNumber:           error ? null : data.phone_number,
      occupation:            error ? null : data.occupation,
      country:               error ? null : data.country,
      specialty:             error ? null : data.specialty,
      profileSetupDismissed: error ? null : data.profile_setup_dismissed,
      // offline-profile-account (2026-09-01): see cachedSnapshotToProfile
      // above — these four are what Manage Profile's edit screen needs
      // to read from the shared, offline-safe profile instead of its own
      // separate fetch.
      gender:                error ? null : data.gender,
      phoneCountryCode:      error ? null : data.phone_country_code,
      occupationOther:       error ? null : data.occupation_other,
      studentType:           error ? null : data.student_type,
    })
  }, [])

  useEffect(() => {
    let cancelled = false

    // Get the current session on mount, then load its profile row before
    // clearing `loading` — callers like AuthGuard need role available on
    // the very first render that has a user, not one tick later. This
    // now runs exactly once for the whole app (AuthProvider mounts once
    // in App.jsx), not once per screen that calls useAuth().
    //
    // offline-profile-account (2026-09-01) — `loading` used to only clear
    // once the WHOLE loadProfile() call finished, seed step and network
    // fetch together. With no connection at all, that network fetch isn't
    // instant — it has to actually time out before loadProfile() ever
    // returns — so a cold, offline start sat on a blank screen (Account
    // tab and Manage Profile both gate on `loading`) for however long
    // that failing request took, even though the seeded, remembered
    // profile was sitting there the whole time. `loading` now clears the
    // moment there's a first paintable state: nobody signed in (nothing
    // to wait for), or signed in with the cache seed already applied —
    // the real network confirm/refresh keeps running in the background
    // exactly as it already does for every later profile reload, it just
    // no longer blocks the very first paint.
    //
    // pwa-first-signin-blank-wizard fix (2026-09-01) — the above is only
    // safe when a seed was actually found. It wasn't safe for a session
    // that exists but has NOTHING cached locally yet — the exact shape of
    // a first-ever sign-in on a given browser/device. That case is
    // genuinely still "nothing paintable yet," same as a first-time
    // sign-up, and used to incorrectly clear `loading` anyway just
    // because a session object existed. On the website, sign-in
    // completes via a full-page reload back from Google — this effect
    // runs fresh at that exact moment — so a screen gated on `loading`
    // (AccountEditScreen's once-per-user-id auto-open-wizard check) could
    // run against a still-null `profile`, decide "no saved data, this
    // must be a first-time signup," and open the wizard blank — a
    // decision that check never revisits once made, so it stuck even
    // after the real profile arrived moments later. Native doesn't hit
    // this: its sign-in completes while the app is already running (no
    // fresh mount of this effect at that moment), so it always goes
    // through the onAuthStateChange SIGNED_IN branch below instead, which
    // already correctly holds `loading` until the real fetch finishes —
    // this fix just brings this mount-time path in line with that
    // already-correct behavior.
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (cancelled) return
      userIdRef.current = session?.user?.id ?? null
      // F10 Stage 2, Batch C — links this device's analytics events to
      // the signed-in account (or clears the link on a signed-out
      // check), same nullable "claim on sign-in" pattern push_tokens
      // already uses.
      setCurrentUserId(userIdRef.current)
      setUser(session?.user ?? null)

      let seed = null
      if (session?.user) {
        seed = seedProfileFromCache(session.user)
        if (seed) setProfile(seed)
      }
      // Only a real seed (or no one signed in at all) counts as a first
      // paintable state — see comment above. A session with no seed
      // leaves `loading` true, closed out below once the real fetch
      // resolves, same as the onAuthStateChange SIGNED_IN branch already
      // does for this exact case.
      if (!session?.user || seed) {
        if (!cancelled) setLoading(false)
      }

      await loadProfile(session?.user ?? null)
      if (!cancelled) setLoading(false)
    })

    // Subscribe to auth state changes (sign in / sign out / token refresh).
    // account-header-tweaks (2026-08-23): a real SIGNED_IN event now
    // re-enters `loading` for the duration of that fetch, the same
    // way the initial getSession() check above already does. Previously
    // this handler set `user` immediately but left `loading` false the
    // whole time profile loaded, so anything gated on `loading` (e.g.
    // AccountScreen's own `if (loading) return null`) rendered signed-in
    // right away, before profile_setup_dismissed was known — that's the
    // gap that let AccountScreen flash briefly before ProfileSetupRedirect
    // (see that file) could redirect a first-time signup to the wizard.
    // Scoped to SIGNED_IN only, not TOKEN_REFRESHED/other events, so a
    // routine background token refresh doesn't re-trigger a loading gate.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const incomingUserId = session?.user?.id ?? null
      // F10 Stage 2, Batch C — keeps analytics events linked to whichever
      // account (if any) is actually signed in, covering every branch
      // below including sign-out (incomingUserId is null there).
      setCurrentUserId(incomingUserId)

      // admin-cms-shell-flash fix (2026-08-24) — a SIGNED_IN event for the
      // SAME user already loaded is supabase-js's tab-refocus session
      // re-validation, not a real sign-in. Update state quietly in the
      // background without touching `loading`, so AuthGuard never
      // unmounts an already-authenticated screen for it. A SIGNED_IN
      // event that actually changes the user id (real sign-in, or a
      // different account) still goes through the original loading gate
      // below, unchanged — this keeps the profile_setup_dismissed timing
      // fix (account-header-tweaks) intact for genuine sign-ins.
      if (event === 'SIGNED_IN' && incomingUserId === userIdRef.current) {
        setUser(session?.user ?? null)
        loadProfile(session?.user ?? null)
        return
      }

      if (event === 'SIGNED_IN') {
        userIdRef.current = incomingUserId
        setLoading(true)
        setUser(session?.user ?? null)
        loadProfile(session?.user ?? null).finally(() => setLoading(false))
        return
      }

      userIdRef.current = incomingUserId
      setUser(session?.user ?? null)
      loadProfile(session?.user ?? null)
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [loadProfile])

  // Stage 3 (F6) — native only. Google's sign-in flow can't complete
  // inside an embedded WebView (a platform restriction on Google's side,
  // not something configurable), so the native branch of
  // signInWithGoogle() below opens the OAuth URL in the system browser
  // instead of redirecting in-place. This listener is what catches the
  // app being reopened via the deep link once that browser flow
  // finishes, exchanges the returned code for a real session (PKCE, per
  // supabase.js), and closes the browser tab. Registered once on mount,
  // a no-op on web.
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return
    if (oauthCallbackListenerRegistered) return
    oauthCallbackListenerRegistered = true

    // No cleanup/remove here on purpose — this listener is meant to live
    // for the whole app session (any component may trigger a Google
    // sign-in), not tied to whichever component happened to mount it
    // first.
    App.addListener('appUrlOpen', async ({ url }) => {
      if (!url.startsWith(NATIVE_AUTH_CALLBACK_URL)) return

      // Stage 3 (F6) bug fix, 2026-08-13 — confirmed on-device:
      // exchangeCodeForSession() expects just the one-time authorization
      // code, not the full callback URL. Passing the whole URL sends it
      // as-is to Supabase's token endpoint, which can't match it to the
      // stored sign-in attempt and fails with "invalid flow state, no
      // valid flow state found" — even though the code-verifier
      // round-trip itself (confirmed via the diagnostic logging above)
      // was working correctly the whole time.
      const code = new URL(url).searchParams.get('code')
      if (!code) {
        console.error('OAuth callback URL had no code parameter:', url)
        await Browser.close()
        return
      }

      const { error } = await exchangeCodeWithRetry(code)
      if (error) {
        // Bug fix, 2026-08-13 (intermittent-signin-fail) — this used to
        // only log to the console, leaving the person back in the app
        // still signed out with no idea why. A retry already ran inside
        // exchangeCodeWithRetry for the transient network-timing case;
        // reaching here means it still failed (either a real
        // Google/Supabase rejection, or the network genuinely didn't
        // recover), so tell them directly rather than staying silent.
        console.error('OAuth callback session exchange failed:', error.message)
        toast.error('Sign-in failed. Please try again.')
      }
      await Browser.close()
    })
  }, [toast])

  async function signIn(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error }
  }

  // signInWithGoogle — end-user sign-in (D2: Google OAuth only, no
  // email/password at first).
  //
  // Web: unchanged from before — Supabase handles the redirect away to
  // Google and back in the same tab; the redirected-to page picks up the
  // new session via onAuthStateChange above.
  //
  // Native (Stage 3, F6): the same in-tab redirect can't complete inside
  // the app's embedded WebView, so this instead asks Supabase for the
  // OAuth URL without auto-navigating (skipBrowserRedirect), opens that
  // URL in the system browser via the Browser plugin, and returns. The
  // appUrlOpen listener above picks up the rest once Google redirects
  // back to the app.
  async function signInWithGoogle() {
    if (Capacitor.isNativePlatform()) {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: NATIVE_AUTH_CALLBACK_URL,
          skipBrowserRedirect: true,
        },
      })
      if (error) return { error }
      await Browser.open({ url: data.url })
      return { error: null }
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.href },
    })
    return { error }
  }

  // Notes and recently-viewed each own storage keys that only get cleared
  // reactively while their specific screen/condition is on-screen (see
  // clearAllNotesStorage / clearAllRecentlyViewedStorage for why). Signing
  // out sweeps both from here, the one place guaranteed to run regardless
  // of what page is currently open. Favourites doesn't need the same
  // treatment — it's mirrored by an always-mounted context, so its own
  // sign-out effect already covers every case.
  //
  // Offline-sign-out bug fix (2026-09-01) — this used to wipe the local
  // notes/recently-viewed storage AND the remembered Pro-status snapshot
  // (authSnapshot.js) unconditionally, before even attempting the real
  // supabase.auth.signOut() call below. That snapshot is the one thing a
  // cold app restart has to go on for "is this person Pro" while offline
  // (see authSnapshot.js's header) — wiping it the instant Sign Out is
  // tapped, regardless of whether the account was actually signed out,
  // meant an offline Pro user who tried to sign out with no connection
  // lost their offline-Pro fallback immediately, then got shown the
  // free-tier offline block on the next cold start even though nothing
  // had actually been confirmed server-side. Now the real sign-out is
  // attempted FIRST, and local data is only cleared once that's confirmed
  // to have actually gone through. A connectivity failure here (same
  // isNetworkTimingError check used elsewhere in this file, e.g.
  // loadProfile above) leaves everything untouched and reports back via
  // the returned `error` instead of failing silently, so AccountSheet.jsx
  // and AccountScreen.jsx can tell the person what happened.
  //
  // profile-avatar-offline-fix (2026-09-01) — this is now also the ONLY
  // place clearCachedAuthSnapshot() is called from — see loadProfile's
  // header comment above for why it was removed from there.
  async function signOut() {
    const { error } = await supabase.auth.signOut()
    if (error && isNetworkTimingError(error)) return { error }

    clearAllNotesStorage()
    clearAllRecentlyViewedStorage()
    // account-instant-load: wipe the remembered name/photo/email right
    // away, on the same guaranteed sign-out path as the other storage
    // cleanup above — don't rely on the next loadProfile(null) call to
    // catch this, so there's no window where a signed-out AccountScreen
    // could still show the last signed-in person's info.
    clearCachedAuthSnapshot()
    return { error: error ?? null }
  }

  // account-screen-redesign — lets a screen that just changed the name
  // (AccountEditScreen, after a successful save) pull the fresh value
  // back into this shared Context immediately, instead of the rest of
  // the app only seeing it on the next sign-in/sign-out/token-refresh.
  const refreshProfile = useCallback(() => loadProfile(user), [user, loadProfile])

  const value = { user, profile, loading, signIn, signInWithGoogle, signOut, refreshProfile }
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthCtx)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
