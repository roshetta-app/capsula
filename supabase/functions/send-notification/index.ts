/**
 * supabase/functions/send-notification/index.ts
 * Phase 3K — Broadcast Push Notifications Edge Function
 *
 * Sends Web Push notifications using Deno native crypto (no external libs).
 * VAPID signing via ES256 + AES-GCM payload encryption per RFC 8291.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ─── Base64url helpers ────────────────────────────────────────────────────────

function b64u(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

function b64uDecode(s: string): Uint8Array {
  const pad = s.length % 4
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + (pad ? '='.repeat(4 - pad) : '')
  return Uint8Array.from(atob(b64), c => c.charCodeAt(0))
}

// ─── VAPID JWT ────────────────────────────────────────────────────────────────

async function makeVapidJwt(audience: string, subject: string, privateKeyB64u: string): Promise<string> {
  const header  = { typ: 'JWT', alg: 'ES256' }
  const payload = { aud: audience, exp: Math.floor(Date.now() / 1000) + 43200, sub: subject }

  const enc    = new TextEncoder()
  const hdr    = b64u(enc.encode(JSON.stringify(header)).buffer)
  const pld    = b64u(enc.encode(JSON.stringify(payload)).buffer)
  const toSign = `${hdr}.${pld}`

  // Import raw EC private key (32 bytes) wrapped in PKCS8
  const rawKey = b64uDecode(privateKeyB64u)
  const pkcs8  = new Uint8Array([
    0x30, 0x41, 0x02, 0x01, 0x00, 0x30, 0x13, 0x06, 0x07, 0x2a, 0x86, 0x48,
    0xce, 0x3d, 0x02, 0x01, 0x06, 0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x03,
    0x01, 0x07, 0x04, 0x27, 0x30, 0x25, 0x02, 0x01, 0x01, 0x04, 0x20,
    ...rawKey,
  ])

  const key = await crypto.subtle.importKey(
    'pkcs8', pkcs8.buffer,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false, ['sign'],
  )

  const sig = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    enc.encode(toSign),
  )

  return `${toSign}.${b64u(sig)}`
}

// ─── Send one push message (unencrypted body — works for text payloads) ───────

async function sendPush(sub: { endpoint: string; keys: { p256dh: string; auth: string } }, payload: string): Promise<void> {
  const url      = new URL(sub.endpoint)
  const audience = `${url.protocol}//${url.host}`

  const subject    = Deno.env.get('VAPID_SUBJECT')!
  const pubKey     = Deno.env.get('VAPID_PUBLIC_KEY')!
  const privKey    = Deno.env.get('VAPID_PRIVATE_KEY')!

  const jwt = await makeVapidJwt(audience, subject, privKey)

  // Encrypt payload using AES-GCM per RFC 8291
  const enc         = new TextEncoder()
  const salt        = crypto.getRandomValues(new Uint8Array(16))
  const serverKeys  = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits'])
  const serverPubRaw = await crypto.subtle.exportKey('raw', serverKeys.publicKey)

  const clientPub = await crypto.subtle.importKey(
    'raw', b64uDecode(sub.keys.p256dh).buffer,
    { name: 'ECDH', namedCurve: 'P-256' }, false, [],
  )

  const sharedBits = await crypto.subtle.deriveBits(
    { name: 'ECDH', public: clientPub }, serverKeys.privateKey, 256,
  )

  const authSecret = b64uDecode(sub.keys.auth)

  // HKDF to derive content encryption key and nonce
  const ikm = await crypto.subtle.importKey('raw', sharedBits, 'HKDF', false, ['deriveBits'])

  const prk = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt: authSecret, info: enc.encode('Content-Encoding: auth\0') },
    ikm, 256,
  )

  const prkKey = await crypto.subtle.importKey('raw', prk, 'HKDF', false, ['deriveBits'])

  const keyInfo   = new Uint8Array([...enc.encode('Content-Encoding: aes128gcm\0'), 0, 1])
  const nonceInfo = new Uint8Array([...enc.encode('Content-Encoding: nonce\0'), 0, 1])

  const cekBits   = await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info: keyInfo }, prkKey, 128)
  const nonceBits = await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info: nonceInfo }, prkKey, 96)

  const cek   = await crypto.subtle.importKey('raw', cekBits, 'AES-GCM', false, ['encrypt'])
  const nonce = new Uint8Array(nonceBits)

  // Pad and encrypt
  const plaintext = new Uint8Array([...enc.encode(payload), 0x02]) // record delimiter
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, cek, plaintext)

  // Build aes128gcm content-encoding header
  const serverPubBytes = new Uint8Array(serverPubRaw)
  const header = new Uint8Array(21 + serverPubBytes.length)
  header.set(salt)
  new DataView(header.buffer).setUint32(16, 4096, false) // rs = 4096
  header[20] = serverPubBytes.length
  header.set(serverPubBytes, 21)

  const body = new Uint8Array(header.length + ciphertext.byteLength)
  body.set(header)
  body.set(new Uint8Array(ciphertext), header.length)

  const res = await fetch(sub.endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `vapid t=${jwt},k=${pubKey}`,
      'Content-Encoding': 'aes128gcm',
      'Content-Type': 'application/octet-stream',
      'TTL': '86400',
    },
    body,
  })

  if (!res.ok && res.status !== 201) {
    const text = await res.text()
    throw new Error(`Push failed ${res.status}: ${text}`)
  }
}

// ─── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
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
      subs.map(row => sendPush(row.subscription, payload))
    )

    const sent  = results.filter(r => r.status === 'fulfilled').length
    const failed = results.length - sent

    results.forEach((r, i) => {
      if (r.status === 'rejected') {
        console.error(`Sub ${subs[i].id} failed:`, r.reason?.message ?? r.reason)
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
