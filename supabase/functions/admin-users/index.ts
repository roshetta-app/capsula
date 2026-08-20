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
 *   { action: 'updateTier', userId, tier }   tier: 'free' | 'paid'
 *   { action: 'ban',        userId }
 *   { action: 'unban',      userId }
 *
 * 'list' reads auth.users via supabase.auth.admin.listUsers() (service
 * role only — structurally unreachable from client code, per F11 Stage 1
 * audit) and joins each user with their profiles row (role/tier/
 * created_at — the table's only 4 columns). updateRole/updateTier write
 * profiles directly with the service-role client — profiles has no admin
 * write policy today (F11 Stage 1 audit), so this function is the only
 * path that can change role/tier. That boundary matters beyond this
 * stage too: D34's future own-row profile-update policy for the Account
 * page is explicitly scoped to exclude role/tier so a user can't
 * self-promote — this function stays the sole writer of those two
 * columns. ban/unban use Supabase Auth's native banned_until via
 * updateUserById's ban_duration field — no custom ban logic invented.
 * ban_duration takes a duration string; there's no built-in "forever",
 * so ban sets a 100-year duration as an effectively-permanent ban and
 * unban passes 'none' to lift it immediately.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL              = Deno.env.get('SUPABASE_URL')!
const SUPABASE_ANON_KEY         = Deno.env.get('SUPABASE_ANON_KEY')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const VALID_ROLES = ['admin', 'user']
const VALID_TIERS = ['free', 'paid']
const PERMANENT_BAN_DURATION = '876000h' // ~100 years — Auth API has no literal 'forever'

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
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
    const { action, userId, role, tier } = await req.json()

    // --- list ---
    if (action === 'list') {
      const { data: listData, error: listErr } = await adminClient.auth.admin.listUsers()
      if (listErr) throw listErr

      const { data: profiles, error: profilesErr } = await adminClient
        .from('profiles')
        .select('id, role, tier, created_at')
      if (profilesErr) throw profilesErr

      const profileById = new Map((profiles ?? []).map((p: Record<string, unknown>) => [p.id, p]))

      const users = listData.users.map(u => {
        const profile = profileById.get(u.id) as Record<string, unknown> | undefined
        return {
          id:              u.id,
          email:           u.email ?? null,
          created_at:      profile?.created_at ?? u.created_at,
          last_sign_in_at: u.last_sign_in_at ?? null,
          banned_until:    u.banned_until ?? null,
          role:            profile?.role ?? 'user',
          tier:            profile?.tier ?? 'free',
        }
      })

      return jsonResponse({ users })
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
    if (action === 'updateTier') {
      if (!userId || !VALID_TIERS.includes(tier)) {
        return jsonResponse({ error: 'userId and a valid tier are required' }, 400)
      }
      const { error } = await adminClient.from('profiles').update({ tier }).eq('id', userId)
      if (error) throw error
      return jsonResponse({ ok: true })
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
