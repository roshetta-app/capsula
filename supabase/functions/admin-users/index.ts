/**
 * supabase/functions/admin-users/index.ts
 * Phase F11 Stage 2 — Users CMS.
 *
 * Admin-gated via the app's existing is_admin() Postgres function (same
 * pattern as send-notification/index.ts) — forwards the caller's own
 * login token to a scoped client so is_admin() sees the real caller, not
 * the function's own service role.
 *
 * Single endpoint, action-routed body:
 *   { action: 'list' }
 *   { action: 'updateRole', userId, role }   role: 'admin' | 'user'
 *   { action: 'updateTier', userId, tier, reason? }   tier: 'free' | 'paid'
 *   { action: 'detail',     userId }   one person: Pro history, requests, limit hits
 *   { action: 'ban',        userId }
 *   { action: 'unban',      userId }
 *
 * 'list' reads auth.users via supabase.auth.admin.listUsers() (service
 * role only — structurally unreachable from client code, per F11 Stage 1
 * audit) and joins each user with their profiles row. updateRole/
 * updateTier write profiles directly with the service-role client —
 * profiles has no admin write policy today (F11 Stage 1 audit), so this
 * function is the only path that can change role/tier. That boundary
 * matters beyond this stage too: D34's future own-row profile-update
 * policy for the Account page is explicitly scoped to exclude role/tier
 * so a user can't self-promote — this function stays the sole writer of
 * those two columns. ban/unban use Supabase Auth's native banned_until
 * via updateUserById's ban_duration field — no custom ban logic invented.
 * ban_duration takes a duration string; there's no built-in "forever",
 * so ban sets a 100-year duration as an effectively-permanent ban and
 * unban passes 'none' to lift it immediately.
 *
 * Admin CMS sidebar redesign, Users migration (D6/D7) — 'list' now also
 * selects the profiles columns the profile wizard has grown since this
 * function was first written (full_name, occupation, occupation_other,
 * specialty, student_type, country, gender, phone_country_code,
 * phone_number). These are shown view-only in the CMS (D7 — admins don't
 * get an editing UI for a user's personal/professional info; only
 * role/tier/ban stay admin-writable). 'governorate' is intentionally
 * left out — confirmed dead per the redesign plan's live DB check, the
 * profile wizard stopped collecting it 2026-08-23 and nothing reads or
 * writes it anymore. profile_setup_dismissed / theme_preference are also
 * left out — UI-state fields with nothing for an admin to act on, not
 * account information.
 *
 * K5e: 'detail' also returns reference_code (the person's payment code, read only).
 * Track K step K5b — 'list' also returns each person's plan (pro_plan), Pro end
 * date (pro_end), trial start, last seen, items made (roshettas) and their
 * waiting Pro request (with hours waiting). 'detail' is new and read only.
 * 'updateTier' now goes through the database function admin_set_tier (Migration
 * 21) called with the ADMIN'S OWN login, so the tier change and its Pro history
 * line (who, old tier, new tier, reason) are one step and carry the real admin.
 * Everything else in this function is unchanged.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Key rotation (LR1.5, 2026-11-27): use the new-style key when Supabase provides one, else the old one.
// SUPABASE_SECRET_KEYS / SUPABASE_PUBLISHABLE_KEYS hold a small JSON object of named keys ("default").
function pickKey(newVar: string, oldVar: string, name = 'default'): string {
  try {
    const raw = Deno.env.get(newVar)
    if (raw) {
      const k = JSON.parse(raw)?.[name]
      if (typeof k === 'string' && k) return k
    }
  } catch { /* not JSON: use the old key */ }
  return Deno.env.get(oldVar)!
}

const corsHeaders = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL              = Deno.env.get('SUPABASE_URL')!
const SUPABASE_ANON_KEY         = pickKey('SUPABASE_PUBLISHABLE_KEYS', 'SUPABASE_ANON_KEY')
const SUPABASE_SERVICE_ROLE_KEY = pickKey('SUPABASE_SECRET_KEYS', 'SUPABASE_SERVICE_ROLE_KEY')

const VALID_ROLES = ['admin', 'user']
const VALID_TIERS = ['free', 'paid']
const PERMANENT_BAN_DURATION = '876000h' // ~100 years — Auth API has no literal 'forever'

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}


const PAGE = 1000 // PostgREST returns at most 1000 rows per request; page through

// Read every row of a simple select, 1000 at a time (a plain select would stop at 1000).
async function fetchAll(build: (from: number, to: number) => PromiseLike<{ data: unknown[] | null; error: { message: string } | null }>) {
  const rows: unknown[] = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await build(from, from + PAGE - 1)
    if (error) throw new Error(error.message)
    const batch = data ?? []
    rows.push(...batch)
    if (batch.length < PAGE) break
  }
  return rows
}

// auth.admin.listUsers() returns only 50 people per call by default; read them all.
async function listAllAuthUsers(adminClient: ReturnType<typeof createClient>) {
  const all: Array<Record<string, unknown>> = []
  for (let page = 1; ; page++) {
    const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage: PAGE })
    if (error) throw error
    const users = (data?.users ?? []) as Array<Record<string, unknown>>
    all.push(...users)
    if (users.length < PAGE) break
  }
  return all
}

function hoursSince(iso: unknown): number | null {
  if (typeof iso !== 'string') return null
  const t = Date.parse(iso)
  if (Number.isNaN(t)) return null
  return Math.max(0, Math.floor((Date.now() - t) / 3_600_000))
}

function countBy(rows: unknown[], key: string): Map<string, number> {
  const m = new Map<string, number>()
  for (const r of rows as Array<Record<string, unknown>>) {
    const k = r[key]
    if (typeof k === 'string') m.set(k, (m.get(k) ?? 0) + 1)
  }
  return m
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // --- admin-only caller check (same pattern as send-notification) ---
    const authHeader = req.headers.get('Authorization') ?? ''
    const callerClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: isAdmin, error: adminErr } = await callerClient.rpc('is_admin')
    if (adminErr || !isAdmin) {
      return jsonResponse({ error: 'Admin access required' }, 403)
    }

    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    const { action, userId, role, tier, reason } = await req.json()

    // --- list ---
    if (action === 'list') {
      const authUsers = await listAllAuthUsers(adminClient)

      const profiles = await fetchAll((from, to) => adminClient
        .from('profiles')
        .select(`
          id, role, tier, created_at,
          full_name, occupation, occupation_other, specialty, student_type,
          country, gender, phone_country_code, phone_number,
          pro_plan, pro_start, pro_end, trial_started_at, last_seen_at
        `)
        .order('id')
        .range(from, to))

      // Items made = roshettas. Only the owner column is read, then counted here.
      const roshettaOwners = await fetchAll((from, to) => adminClient
        .from('roshettas').select('id, user_id').order('id').range(from, to))
      const itemsByUser = countBy(roshettaOwners, 'user_id')

      // Waiting requests: oldest first, so the first one seen per person is the oldest.
      const waiting = await fetchAll((from, to) => adminClient
        .from('pro_requests')
        .select('id, user_id, plan, amount_egp, created_at')
        .eq('status', 'waiting')
        .order('created_at', { ascending: true })
        .order('id')
        .range(from, to))
      const waitingByUser = new Map<string, Record<string, unknown>>()
      for (const w of waiting as Array<Record<string, unknown>>) {
        const uid = w.user_id as string
        if (!waitingByUser.has(uid)) waitingByUser.set(uid, w)
      }

      const profileById = new Map((profiles as Array<Record<string, unknown>>).map(p => [p.id, p]))

      const users = authUsers.map(u => {
        const profile = profileById.get(u.id) as Record<string, unknown> | undefined
        const w = waitingByUser.get(u.id as string)
        return {
          id:                  u.id,
          email:               (u.email as string | undefined) ?? null,
          created_at:          profile?.created_at ?? u.created_at,
          last_sign_in_at:     (u.last_sign_in_at as string | undefined) ?? null,
          banned_until:        (u.banned_until as string | undefined) ?? null,
          role:                profile?.role ?? 'user',
          tier:                profile?.tier ?? 'free',
          full_name:           profile?.full_name ?? null,
          occupation:          profile?.occupation ?? null,
          occupation_other:    profile?.occupation_other ?? null,
          specialty:           profile?.specialty ?? null,
          student_type:        profile?.student_type ?? null,
          country:             profile?.country ?? null,
          gender:              profile?.gender ?? null,
          phone_country_code:  profile?.phone_country_code ?? null,
          phone_number:        profile?.phone_number ?? null,
          pro_plan:            profile?.pro_plan ?? null,
          pro_start:           profile?.pro_start ?? null,
          pro_end:             profile?.pro_end ?? null,
          trial_started_at:    profile?.trial_started_at ?? null,
          last_seen_at:        profile?.last_seen_at ?? null,
          items_made:          itemsByUser.get(u.id as string) ?? 0,
          waiting_request:     w ? {
            id:            w.id,
            plan:          w.plan,
            amount_egp:    w.amount_egp,
            created_at:    w.created_at,
            hours_waiting: hoursSince(w.created_at),
          } : null,
        }
      })

      return jsonResponse({ users })
    }

    // --- detail (read only) ---
    if (action === 'detail') {
      if (!userId) {
        return jsonResponse({ error: 'userId is required' }, 400)
      }

      const { data: profile, error: profileErr } = await adminClient
        .from('profiles')
        .select('id, tier, pro_plan, pro_start, pro_end, trial_started_at, last_seen_at, created_at')
        .eq('id', userId)
        .maybeSingle()
      if (profileErr) throw profileErr
      if (!profile) return jsonResponse({ error: 'No such user' }, 404)

      const { data: history, error: historyErr } = await adminClient
        .from('pro_history')
        .select('id, event_type, plan, days_added, old_end, new_end, reason, by_user, created_at, old_tier, new_tier')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(200)
      if (historyErr) throw historyErr

      // The person's own payment code (decision 26). Read only: it is created when they first open
      // the Upgrade page, so a person who never did has none and this stays empty.
      const { data: refRow, error: refErr } = await adminClient
        .from('pro_references').select('code').eq('user_id', userId).maybeSingle()
      if (refErr) throw refErr

      // Receipt files are never returned here: only whether one is attached and not yet deleted.
      const { data: requests, error: requestsErr } = await adminClient
        .from('pro_requests')
        .select('id, reference_code, plan, amount_egp, sender_last4, status, reject_reason, receipt_path, receipt_deleted_at, created_at, decided_at, decided_by')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50)
      if (requestsErr) throw requestsErr

      const { count: limitHits, error: hitsErr } = await adminClient
        .from('usage_events')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .in('event_type', ['roshetta_limit_hit', 'group_limit_hit'])
      if (hitsErr) throw hitsErr

      const { count: itemsMade, error: itemsErr } = await adminClient
        .from('roshettas')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
      if (itemsErr) throw itemsErr

      // Who did each thing: names for the admins named on history lines and decisions.
      const historyRows  = (history ?? []) as Array<Record<string, unknown>>
      const requestRows  = (requests ?? []) as Array<Record<string, unknown>>
      const whoIds = new Set<string>()
      for (const h of historyRows) if (typeof h.by_user === 'string') whoIds.add(h.by_user)
      for (const r of requestRows) if (typeof r.decided_by === 'string') whoIds.add(r.decided_by)

      const whoName = new Map<string, string>()
      if (whoIds.size > 0) {
        const { data: whoProfiles, error: whoErr } = await adminClient
          .from('profiles').select('id, full_name').in('id', [...whoIds])
        if (whoErr) throw whoErr
        for (const p of (whoProfiles ?? []) as Array<Record<string, unknown>>) {
          if (typeof p.full_name === 'string' && p.full_name.trim()) whoName.set(p.id as string, p.full_name)
        }
        for (const id of whoIds) {
          if (whoName.has(id)) continue
          const { data: au } = await adminClient.auth.admin.getUserById(id)
          const email = au?.user?.email
          if (email) whoName.set(id, email)
        }
      }

      return jsonResponse({
        profile,
        reference_code: (refRow as { code?: string } | null)?.code ?? null,
        limit_hits: limitHits ?? 0,
        items_made: itemsMade ?? 0,
        history: historyRows.map(h => ({
          ...h,
          by_name: typeof h.by_user === 'string' ? (whoName.get(h.by_user) ?? null) : null,
        })),
        requests: requestRows.map(r => {
          const { receipt_path, ...rest } = r
          return {
            ...rest,
            has_receipt: Boolean(receipt_path) && !r.receipt_deleted_at,
            decided_by_name: typeof r.decided_by === 'string' ? (whoName.get(r.decided_by) ?? null) : null,
          }
        }),
      })
    }

    // --- updateRole ---
    if (action === 'updateRole') {
      if (!userId || !VALID_ROLES.includes(role)) {
        return jsonResponse({ error: 'userId and a valid role are required' }, 400)
      }
      const { error } = await adminClient.from('profiles').update({ role }).eq('id', userId)
      if (error) throw error
      return jsonResponse({ ok: true })
    }

    // --- updateTier ---
    // Goes through admin_set_tier with the ADMIN'S OWN login (callerClient), so the
    // history line names the real admin and the change and the line are one step.
    if (action === 'updateTier') {
      if (!userId || !VALID_TIERS.includes(tier)) {
        return jsonResponse({ error: 'userId and a valid tier are required' }, 400)
      }
      const cleanReason = typeof reason === 'string' ? reason.trim().slice(0, 500) : null
      const { data: result, error } = await callerClient.rpc('admin_set_tier', {
        p_user:   userId,
        p_tier:   tier,
        p_reason: cleanReason || null,
      })
      if (error) {
        const msg = error.message ?? ''
        if (msg.includes('forbidden'))    return jsonResponse({ error: 'Admin access required' }, 403)
        if (msg.includes('no_such_user')) return jsonResponse({ error: 'No such user' }, 404)
        if (msg.includes('bad_tier'))     return jsonResponse({ error: 'userId and a valid tier are required' }, 400)
        throw error
      }
      return jsonResponse({ ok: true, changed: result !== 'unchanged' })
    }

    // --- ban / unban ---
    if (action === 'ban' || action === 'unban') {
      if (!userId) {
        return jsonResponse({ error: 'userId is required' }, 400)
      }
      const { error } = await adminClient.auth.admin.updateUserById(userId, {
        ban_duration: action === 'ban' ? PERMANENT_BAN_DURATION : 'none',
      })
      if (error) throw error
      return jsonResponse({ ok: true })
    }

    return jsonResponse({ error: `Unknown action: ${action}` }, 400)

  } catch (err) {
    console.error('admin-users error:', err)
    return jsonResponse({ error: err instanceof Error ? err.message : String(err) }, 500)
  }
})
