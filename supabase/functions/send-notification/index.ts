/**
 * supabase/functions/send-notification/index.ts
 * Phase 3K — uses npm:web-push (Deno npm specifier, no esm.sh needed)
 */

// @deno-types="npm:@types/web-push@3.6.3"
import webpush from 'npm:web-push@3.6.7'
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
    webpush.setVapidDetails(
      Deno.env.get('VAPID_SUBJECT')!,
      Deno.env.get('VAPID_PUBLIC_KEY')!,
      Deno.env.get('VAPID_PRIVATE_KEY')!,
    )

    const { title, message, type } = await req.json()

    if (!title || !message) {
      return new Response(
        JSON.stringify({ error: 'title and message are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

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

    const payload = JSON.stringify({ title, message, type })

    const results = await Promise.allSettled(
      subs.map(row => webpush.sendNotification(row.subscription, payload))
    )

    const sent   = results.filter(r => r.status === 'fulfilled').length
    const failed = results.length - sent

    results.forEach((r, i) => {
      if (r.status === 'rejected') {
        console.error(`Sub ${subs[i].id} failed:`, r.reason?.message ?? String(r.reason))
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
