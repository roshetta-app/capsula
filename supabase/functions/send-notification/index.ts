/**
 * supabase/functions/send-notification/index.ts
 * Phase F4 Stage 3 — rebuilt on Firebase Cloud Messaging (FCM) HTTP v1.
 *
 * Replaces the retired web-push/VAPID system. Reads device addresses from
 * push_tokens (not the old push_subscriptions table) and writes every send
 * attempt to notification_log instead of only console-logging it.
 *
 * Security: this function has no admin check at the platform level - the
 * project's public anon key alone satisfies Supabase's 'valid JWT' gate, so
 * without the check below, anyone holding the public anon key could call
 * this endpoint directly and broadcast to every device. The check below
 * reuses the project's existing is_admin() database function (same one
 * gating CMS writes) rather than inventing a second way to check admin
 * status - it runs as the caller by forwarding their own login token to a
 * scoped Supabase client, so is_admin() sees the real caller, not the
 * function's own service role.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL              = Deno.env.get('SUPABASE_URL')!
const SUPABASE_ANON_KEY         = Deno.env.get('SUPABASE_ANON_KEY')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const FIREBASE_SERVICE_ACCOUNT_JSON = Deno.env.get('FIREBASE_SERVICE_ACCOUNT_JSON')!

// project_id comes from the service account JSON itself - keeps this down
// to the one new secret already scoped, rather than a second env var.
const FCM_PROJECT_ID = JSON.parse(FIREBASE_SERVICE_ACCOUNT_JSON).project_id

const FCM_SCOPE      = 'https://www.googleapis.com/auth/firebase.messaging'
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'

// --- base64url helpers (Web Crypto works in raw bytes, FCM/OAuth want base64url) ---

function base64UrlFromBytes(bytes: Uint8Array): string {
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64UrlFromString(str: string): string {
  return base64UrlFromBytes(new TextEncoder().encode(str))
}

function pemToPkcs8(pem: string): ArrayBuffer {
  const clean = pem
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s+/g, '')
  const binary = atob(clean)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes.buffer
}

// --- Google OAuth2 service-account exchange, signed by hand via Web Crypto ---
// (chosen over the firebase-admin npm package - that package is built for a
// Node-style server, not this Deno runtime, and there was no other Edge
// Function in this project to confirm it actually runs here)

async function getFcmAccessToken(): Promise<string> {
  const serviceAccount = JSON.parse(FIREBASE_SERVICE_ACCOUNT_JSON)

  const header = { alg: 'RS256', typ: 'JWT' }
  const now = Math.floor(Date.now() / 1000)
  const claims = {
    iss: serviceAccount.client_email,
    scope: FCM_SCOPE,
    aud: GOOGLE_TOKEN_URL,
    iat: now,
    exp: now + 3600,
  }

  const unsigned = `${base64UrlFromString(JSON.stringify(header))}.${base64UrlFromString(JSON.stringify(claims))}`

  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToPkcs8(serviceAccount.private_key),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  )

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    new TextEncoder().encode(unsigned),
  )

  const jwt = `${unsigned}.${base64UrlFromBytes(new Uint8Array(signature))}`

  const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  })

  if (!tokenRes.ok) {
    throw new Error(`Google token exchange failed: ${await tokenRes.text()}`)
  }

  const { access_token } = await tokenRes.json()
  return access_token
}

// --- one FCM v1 send ---

async function sendToToken(
  accessToken: string,
  token: string,
  title: string,
  message: string,
  type: string,
): Promise<{ ok: boolean; deadToken: boolean }> {
  const res = await fetch(
    `https://fcm.googleapis.com/v1/projects/${FCM_PROJECT_ID}/messages:send`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: {
          token,
          notification: { title, body: message },
          data: { type },
        },
      }),
    },
  )

  if (res.ok) return { ok: true, deadToken: false }

  const body = await res.json().catch(() => null)
  const status = body?.error?.status
  const deadToken = status === 'UNREGISTERED' || status === 'NOT_FOUND'
  console.error(`FCM send failed (${status ?? res.status}) for token ${token}:`, body ?? await res.text())
  return { ok: false, deadToken }
}

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

    const { data: tokens, error: dbErr } = await adminClient
      .from('push_tokens')
      .select('id, token')

    if (dbErr) throw dbErr

    if (!tokens || tokens.length === 0) {
      await adminClient.from('notification_log').insert({
        type: type ?? 'info', title, message,
        sent_by: callerUser?.id ?? null,
        sent_count: 0,
        failed_count: 0,
      })
      return new Response(
        JSON.stringify({ sent: 0, failed: 0, total: 0, message: 'No devices registered' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const accessToken = await getFcmAccessToken()

    const results = await Promise.allSettled(
      tokens.map(row => sendToToken(accessToken, row.token, title, message, type ?? 'info')),
    )

    let sent = 0
    let failed = 0
    const deadTokenIds: string[] = []

    results.forEach((r, i) => {
      if (r.status === 'fulfilled' && r.value.ok) {
        sent++
      } else {
        failed++
        if (r.status === 'fulfilled' && r.value.deadToken) {
          deadTokenIds.push(tokens[i].id)
        }
      }
    })

    if (deadTokenIds.length > 0) {
      const { error: deleteErr } = await adminClient
        .from('push_tokens')
        .delete()
        .in('id', deadTokenIds)
      if (deleteErr) {
        console.error('Failed to drop dead tokens:', deleteErr.message)
      }
    }

    await adminClient.from('notification_log').insert({
      type: type ?? 'info', title, message,
      sent_by: callerUser?.id ?? null,
      sent_count: sent,
      failed_count: failed,
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
