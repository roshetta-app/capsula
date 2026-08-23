/**
 * supabase/functions/delete-account/index.ts
 * profile-danger-zone (2026-08-23) — self-service permanent account
 * deletion, reached from AccountEditScreen.jsx's Danger Zone section.
 *
 * Unlike admin-users/index.ts, this is NOT admin-gated — any signed-in
 * user may call it, but only ever against their own account. The id to
 * delete is taken exclusively from the caller's own verified auth token
 * (via callerClient.auth.getUser()), never from anything the client sends
 * in the request body, so there is no way to pass someone else's id and
 * delete their account instead.
 *
 * No table in this database has a foreign key back to auth.users (confirmed
 * via a live schema check, 2026-08-23), so deleting the auth.users row
 * alone would silently orphan the person's data rather than remove it.
 * This function explicitly deletes their rows from every table found to
 * hold user-owned data — favourites, notes, push_tokens, recently_viewed,
 * profiles — before removing the login itself via
 * auth.admin.deleteUser(), which (like admin-users' ban/unban) requires
 * the service-role client; this action is structurally unreachable from
 * client code with just the anon key.
 *
 * Order matters: the five data-table deletes run first, then
 * deleteUser() last — if a data delete fails, the person keeps their
 * login and can retry, rather than being locked out with data left
 * behind and no way back in to finish cleaning it up.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL              = Deno.env.get('SUPABASE_URL')!
const SUPABASE_ANON_KEY         = Deno.env.get('SUPABASE_ANON_KEY')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// Tables confirmed (2026-08-23 schema check) to hold rows keyed to a user,
// each via a `user_id` column. profiles is handled separately below since
// it's keyed by `id`, not `user_id`.
const USER_ID_TABLES = ['favourites', 'notes', 'push_tokens', 'recently_viewed']

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
    // --- verify the caller and get their own id — never from the body ---
    const authHeader = req.headers.get('Authorization') ?? ''
    const callerClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: userData, error: userErr } = await callerClient.auth.getUser()
    if (userErr || !userData?.user) {
      return jsonResponse({ error: 'Not signed in' }, 401)
    }
    const userId = userData.user.id

    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // --- delete owned rows from every user_id-keyed table ---
    for (const table of USER_ID_TABLES) {
      const { error } = await adminClient.from(table).delete().eq('user_id', userId)
      if (error) throw error
    }

    // --- delete the profiles row (keyed by id, not user_id) ---
    const { error: profileErr } = await adminClient.from('profiles').delete().eq('id', userId)
    if (profileErr) throw profileErr

    // --- finally, remove the login itself ---
    const { error: deleteUserErr } = await adminClient.auth.admin.deleteUser(userId)
    if (deleteUserErr) throw deleteUserErr

    return jsonResponse({ ok: true })

  } catch (err) {
    console.error('delete-account error:', err)
    return jsonResponse({ error: err instanceof Error ? err.message : String(err) }, 500)
  }
})
