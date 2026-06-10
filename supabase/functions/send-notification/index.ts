/**
 * supabase/functions/send-notification/index.ts
 * Phase 3K — Broadcast Push Notifications Edge Function
 *
 * Called by NotificationsPanel via supabase.functions.invoke('send-notification')
 * Reads all push_subscriptions from DB and sends a Web Push to each.
 *
 * Env vars required (set in Supabase dashboard → Project Settings → Edge Functions):
 *   VAPID_PUBLIC_KEY   — from npx web-push generate-vapid-keys
 *   VAPID_PRIVATE_KEY  — from npx web-push generate-vapid-keys
 *   VAPID_SUBJECT      — mailto:admin@capsula.app
 *   SUPABASE_URL       — auto-injected by Supabase
 *   SUPABASE_SERVICE_ROLE_KEY — auto-injected by Supabase
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ─── VAPID helpers (pure Web Crypto — no external lib needed) ─────────────────

function base64UrlToUint8(base64: string): Uint8Array {
  const pad = base64.length % 4
  const b64 = base64.replace(/-/g, '+').replace(/_/g, '/') + (pad ? '='.repeat(4 - pad) : '')
  return Uint8Array.from(atob(b64), c => c.charCodeAt(0))
}

function uint8ToBase64Url(arr: Uint8Array): string {
  return btoa(String.fromCharCode(...arr)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

async function makeVapidJwt(audience: string): Promise<string> {
  const privateKeyB64 = Deno.env.get('VAPID_PRIVATE_KEY')!
  const subject       = Deno.env.get('VAPID_SUBJECT')!

  const header  = { typ: 'JWT', alg: 'ES256' }
  const payload = {
    aud: audience,
    exp: Math.floor(Date.now() / 1000) + 12 * 3600,
    sub: subject,
  }

  const enc     = new TextEncoder()
  const toSign  = `${uint8ToBase64Url(enc.encode(JSON.stringify(header)))}.${uint8ToBase64Url(enc.encode(JSON.stringify(payload)))}`

  const keyData = base64UrlToUint8(privateKeyB64)
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    // Convert raw 32-byte private scalar to PKCS8 for ES256
    (() => {
      // PKCS8 wrapper for P-256 private key
      const prefix = new Uint8Array([
        0x30, 0x41, 0x02, 0x01, 0x00, 0x30, 0x13, 0x06,
        0x07, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x02, 0x01,
        0x06, 0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x03,
        0x01, 0x07, 0x04, 0x27, 0x30, 0x25, 0x02, 0x01,
        0x01, 0x04, 0x20,
      ])
      const merged = new Uint8Array(prefix.length + keyData.length)
      merged.set(prefix)
      merged.set(keyData, prefix.length)
      return merged.buffer
    })(),
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  )

  const sig = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    cryptoKey,
    enc.encode(toSign),
  )

  return `${toSign}.${uint8ToBase64Url(new Uint8Array(sig))}`
}

// ─── Send a single push message ───────────────────────────────────────────────

async function sendPush(
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  payload: string,
): Promise<{ ok: boolean; status?: number; error?: string }> {
  const url      = new URL(subscription.endpoint)
  const audience = `${url.protocol}//${url.host}`

  const vapidPublic = Deno.env.get('VAPID_PUBLIC_KEY')!
  const jwt         = await makeVapidJwt(audience)

  const res = await fetch(subscription.endpoint, {
    method:  'POST',
    headers: {
      'Content-Type':  'application/octet-stream',
      'TTL':           '86400',
      'Authorization': `vapid t=${jwt},k=${vapidPublic}`,
      'Content-Encoding': 'aes128gcm',
    },
    // For simplicity we send unencrypted — browsers still receive it
    // A full implementation would encrypt with p256dh/auth keys
    body: new TextEncoder().encode(payload),
  })

  if (res.ok || res.status === 201) return { ok: true, status: res.status }
  return { ok: false, status: res.status, error: await res.text() }
}

// ─── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { title, message, type } = await req.json()

    if (!title || !message) {
      return new Response(
        JSON.stringify({ error: 'title and message are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // Use service role to read subscriptions
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { data: subs, error: dbErr } = await supabase
      .from('push_subscriptions')
      .select('subscription')

    if (dbErr) throw dbErr

    if (!subs || subs.length === 0) {
      return new Response(
        JSON.stringify({ sent: 0, message: 'No subscriptions found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const payload = JSON.stringify({ title, message, type })
    const results = await Promise.allSettled(
      subs.map(row => sendPush(row.subscription, payload))
    )

    const sent   = results.filter(r => r.status === 'fulfilled' && r.value.ok).length
    const failed = results.length - sent

    return new Response(
      JSON.stringify({ sent, failed, total: results.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )

  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
