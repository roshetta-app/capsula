/**
 * supabase/functions/send-notification/index.ts
 * Phase F4 Stage 3 — rebuilt on Firebase Cloud Messaging (FCM) HTTP v1.
 * Phase F4 Stage 4 — notification_log row created before sending, id
 * threaded through to each device's FCM data payload as log_id.
 * Phase F9 Stage 1 (D27) — trimmed: no longer sends FCM itself. Only
 * creates the notification_log row as status='pending' with a
 * scheduled_send_at 30 minutes out, then returns immediately. The actual
 * FCM send now happens in deliver-notification, invoked by a pg_cron job
 * once scheduled_send_at has passed — this gives an admin a real window to
 * cancel or edit a send before it actually goes out.
 *
 * Admin-only: reuses the app's existing is_admin() Postgres function (the
 * same one already gating CMS writes) rather than inventing a second way
 * to check admin status - it runs as the caller by forwarding their own
 * login token to a scoped Supabase client, so is_admin() sees the real
 * caller, not the function's own service role.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL              = Deno.env.get('SUPABASE_URL')!
const SUPABASE_ANON_KEY         = Deno.env.get('SUPABASE_ANON_KEY')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // --- admin-only caller check ---
    const authHeader = req.headers.get('Authorization') ?? ''
    const callerClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: isAdmin, error: adminErr } = await callerClient.rpc('is_admin')
    if (adminErr || !isAdmin) {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const { data: { user: callerUser } } = await callerClient.auth.getUser()

    const { title, message, type } = await req.json()

    if (!title || !message) {
      return new Response(
        JSON.stringify({ error: 'title and message are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Phase F9 Stage 1: create as pending, scheduled 30 min out. No FCM
    // call here — deliver-notification's cron job picks this up once due.
    const { data: logRow, error: logInsertErr } = await adminClient
      .from('notification_log')
      .insert({
        type: type ?? 'info', title, message,
        sent_by: callerUser?.id ?? null,
        status: 'pending',
        sent_count: 0,
        failed_count: 0,
      })
      .select('id, scheduled_send_at')
      .single()

    if (logInsertErr || !logRow) throw logInsertErr ?? new Error('Failed to create notification_log row')

    return new Response(
      JSON.stringify({ id: logRow.id, status: 'pending', scheduled_send_at: logRow.scheduled_send_at }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )

  } catch (err) {
    console.error('send-notification error:', err)
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
