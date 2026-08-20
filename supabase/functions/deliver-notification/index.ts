/**
 * supabase/functions/deliver-notification/index.ts
 * Phase F9 Stage 1 (D27) — the actual FCM-sending half of what used to be
 * inline in send-notification. Called on a ~1min pg_cron schedule (see
 * migration f9_stage1_cron_job), never directly by the admin UI.
 *
 * Finds every notification_log row with status='pending' whose
 * scheduled_send_at has passed, sends it via FCM (same v1 HTTP + hand-signed
 * service-account JWT approach send-notification used), then sets
 * status='sent' and the real sent_at on completion.
 *
 * Phase F9 Stage 2 (D28) — FCM payload gains notification.image,
 * data.url (deep link), and android.notification.channel_id per type, so
 * rich content set by the admin actually reaches the device.
 *
 * Runs entirely as service role — this is a cron-invoked function, not a
 * caller-invoked one, so there's no admin JWT to check (unlike
 * send-notification, which still gates on is_admin() since a real admin
 * calls it directly from the CMS).
 *
 * Bug fix, 2026-08-20 (send-now-cors-fix) — this function was only ever
 * called server-to-server by pg_cron, which isn't subject to browser CORS
 * enforcement, so it never needed CORS headers or OPTIONS preflight
 * handling. The new admin "Send now" action invokes it directly from the
 * browser (supabase.functions.invoke), which IS a real cross-origin
 * request — without these headers the browser blocks it before it even
 * reaches the function, surfacing as supabase-js's generic "Failed to send
 * a request to the Edge Function" error. Mirrors send-notification's
 * existing corsHeaders + OPTIONS handling exactly. pg_cron's own calls are
 * unaffected by this change — CORS is a browser-only mechanism.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL              = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const FIREBASE_SERVICE_ACCOUNT_JSON = Deno.env.get('FIREBASE_SERVICE_ACCOUNT_JSON')!

const FCM_PROJECT_ID = JSON.parse(FIREBASE_SERVICE_ACCOUNT_JSON).project_id
const FCM_SCOPE        = 'https://www.googleapis.com/auth/firebase.messaging'
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'

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

async function sendToToken(
  accessToken: string,
  token: string,
  title: string,
  message: string,
  type: string,
  logId: string,
  imageUrl: string | null,
  deepLinkPath: string | null,
): Promise<{ ok: boolean; deadToken: boolean }> {
  const channelId = type === 'important' ? 'capsula_important' : type === 'update' ? 'capsula_update' : 'capsula_info'

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
          notification: {
            title,
            body: message,
            ...(imageUrl ? { image: imageUrl } : {}),
          },
          data: {
            type,
            log_id: logId,
            ...(deepLinkPath ? { url: deepLinkPath } : {}),
          },
          android: {
            priority: 'high',
            notification: {
              channel_id: channelId,
              ...(imageUrl ? { image: imageUrl } : {}),
            },
          },
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

async function deliverOne(
  adminClient: ReturnType<typeof createClient>,
  accessToken: string,
  logRow: { id: string; type: string; title: string; message: string; image_url: string | null; deep_link_path: string | null },
) {
  const { data: tokens, error: dbErr } = await adminClient
    .from('push_tokens')
    .select('id, token')

  if (dbErr) throw dbErr

  if (!tokens || tokens.length === 0) {
    await adminClient
      .from('notification_log')
      .update({ status: 'sent', sent_at: new Date().toISOString(), sent_count: 0, failed_count: 0 })
      .eq('id', logRow.id)
    return
  }

  const results = await Promise.allSettled(
    tokens.map(row => sendToToken(
      accessToken, row.token, logRow.title, logRow.message, logRow.type ?? 'info', logRow.id,
      logRow.image_url ?? null, logRow.deep_link_path ?? null,
    )),
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
    if (deleteErr) console.error('Failed to drop dead tokens:', deleteErr.message)
  }

  await adminClient
    .from('notification_log')
    .update({ status: 'sent', sent_at: new Date().toISOString(), sent_count: sent, failed_count: failed })
    .eq('id', logRow.id)
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    const { data: dueRows, error: dueErr } = await adminClient
      .from('notification_log')
      .select('id, type, title, message, image_url, deep_link_path')
      .eq('status', 'pending')
      .lte('scheduled_send_at', new Date().toISOString())

    if (dueErr) throw dueErr

    if (!dueRows || dueRows.length === 0) {
      return new Response(JSON.stringify({ delivered: 0 }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const accessToken = await getFcmAccessToken()

    for (const row of dueRows) {
      try {
        await deliverOne(adminClient, accessToken, row as { id: string; type: string; title: string; message: string; image_url: string | null; deep_link_path: string | null })
      } catch (err) {
        console.error(`deliver-notification: failed to deliver ${row.id}:`, err)
      }
    }

    return new Response(JSON.stringify({ delivered: dueRows.length }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (err) {
    console.error('deliver-notification error:', err)
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
