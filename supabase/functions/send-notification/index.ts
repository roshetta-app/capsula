/**
 * supabase/functions/send-notification/index.ts
 * Phase 3K — Broadcast Push Notifications Edge Function
 *
 * Uses web-push library via esm.sh for reliable VAPID signing.
 *
 * Env vars (set in Supabase Dashboard → Edge Functions → Secrets):
 *   VAPID_PUBLIC_KEY
 *   VAPID_PRIVATE_KEY
 *   VAPID_SUBJECT
 *   SUPABASE_URL            — auto-injected
 *   SUPABASE_SERVICE_ROLE_KEY — auto-injected
 */

import webpush from 'https://esm.sh/web-push@3.6.7'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // ── Configure VAPID ──────────────────────────────────────────────────────
    webpush.setVapidDetails(
      Deno.env.get('VAPID_SUBJECT')!,
      Deno.env.get('VAPID_PUBLIC_KEY')!,
      Deno.env.get('VAPID_PRIVATE_KEY')!,
    )

    // ── Parse request body ───────────────────────────────────────────────────
    const { title, message, type } = await req.json()

    if (!title || !message) {
      return new Response(
        JSON.stringify({ error: 'title and message are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // ── Load subscriptions from DB ───────────────────────────────────────────
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { data: subs, error: dbErr } = await supabase
      .from('push_subscriptions')
      .select('id, subscription')

    if (dbErr) throw dbErr

    if (!subs || subs.length === 0) {
      return new Response(
        JSON.stringify({ sent: 0, message: 'No subscriptions found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // ── Send to all subscriptions ────────────────────────────────────────────
    const payload = JSON.stringify({ title, message, type })

    const results = await Promise.allSettled(
      subs.map(row =>
        webpush.sendNotification(row.subscription, payload)
      )
    )

    const sent   = results.filter(r => r.status === 'fulfilled').length
    const failed = results.length - sent

    // Log failures for debugging
    results.forEach((r, i) => {
      if (r.status === 'rejected') {
        console.error(`Failed to send to subscription ${subs[i].id}:`, r.reason)
      }
    })

    return new Response(
      JSON.stringify({ sent, failed, total: results.length }),
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
