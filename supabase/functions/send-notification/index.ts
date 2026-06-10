/**
 * supabase/functions/send-notification/index.ts
 * Phase 3K — Broadcast Push Notifications Edge Function
 *
 * Pure Deno crypto. Imports VAPID private key as JWK to avoid PKCS8 issues.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const enc = new TextEncoder()

function b64u(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

function b64uDecode(s: string): Uint8Array {
  const pad = s.length % 4
  const b64 = s.replace(/-/g, '+').replace(/\_/g, '/') + (pad ? '='.repeat(4 - pad) : '')
  return Uint8Array.from(atob(b64), c => c.charCodeAt(0))
}

async function makeVapidJwt(audience: string): Promise<string> {
  const subject  = Deno.env.get('VAPID_SUBJECT')!
  const privB64u = Deno.env.get('VAPID_PRIVATE_KEY')!
  const pubB64u  = Deno.env.get('VAPID_PUBLIC_KEY')!

  // Decode public key (65-byte uncompressed point) to get x/y for JWK
  const pubBytes = b64uDecode(pubB64u)
  // pubBytes[0] === 0x04 (uncompressed point marker)
  const x = b64u(pubBytes.slice(1, 33).buffer)
  const y = b64u(pubBytes.slice(33, 65).buffer)

  const jwk = {
    kty: 'EC',
    crv: 'P-256',
    x,
    y,
    d: privB64u, // raw private scalar as base64url
  }

  const key = await crypto.subtle.importKey(
    'jwk', jwk,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false, ['sign'],
  )

  const header  = { typ: 'JWT', alg: 'ES256' }
  const payload = { aud: audience, exp: Math.floor(Date.now() / 1000) + 43200, sub: subject }
  const toSign  = `${b64u(enc.encode(JSON.stringify(header)).buffer)}.${b64u(enc.encode(JSON.stringify(payload)).buffer)}`

  const sig = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    enc.encode(toSign),
  )

  return `${toSign}.${b64u(sig)}`
}

async function sendPush(sub: { endpoint: string; keys: { p256dh: string; auth: string } }, payload: string): Promise<void> {
  const url      = new URL(sub.endpoint)
  const audience = `${url.protocol}//${url.host}`
  const pubKey   = Deno.env.get('VAPID_PUBLIC_KEY')!
  const jwt      = await makeVapidJwt(audience)

  // Generate server ECDH key pair
  const serverKeys     = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits'])
  const serverPubRaw   = new Uint8Array(await crypto.subtle.exportKey('raw', serverKeys.publicKey))

  // Import client public key
  const clientPub = await crypto.subtle.importKey(
    'raw', b64uDecode(sub.keys.p256dh).buffer,
    { name: 'ECDH', namedCurve: 'P-256' }, false, [],
  )

  // Derive shared secret
  const sharedBits = await crypto.subtle.deriveBits(
    { name: 'ECDH', public: clientPub },
    serverKeys.privateKey, 256,
  )

  const authSecret = b64uDecode(sub.keys.auth)
  const salt       = crypto.getRandomValues(new Uint8Array(16))

  // HKDF helper
  async function hkdf(ikm: ArrayBuffer, saltBuf: ArrayBuffer, info: Uint8Array, bits: number): Promise<ArrayBuffer> {
    const baseKey = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits'])
    return crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt: saltBuf, info }, baseKey, bits)
  }

  // PRK
  const prk = await hkdf(
    sharedBits,
    authSecret.buffer,
    enc.encode('Content-Encoding: auth\0'),
    256,
  )

  // CEK and nonce
  const cekBits   = await hkdf(prk, salt.buffer, enc.encode('Content-Encoding: aes128gcm\0\0\1'), 128)
  const nonceBits = await hkdf(prk, salt.buffer, enc.encode('Content-Encoding: nonce\0\0\1'), 96)

  const cek   = await crypto.subtle.importKey('raw', cekBits, 'AES-GCM', false, ['encrypt'])
  const nonce = new Uint8Array(nonceBits)

  // Encrypt payload
  const plaintext  = new Uint8Array([...enc.encode(payload), 0x02])
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, cek, plaintext))

  // Build aes128gcm header: salt(16) + rs(4) + idlen(1) + serverPub
  const header = new Uint8Array(21 + serverPubRaw.length)
  header.set(salt)
  new DataView(header.buffer).setUint32(16, 4096, false)
  header[20] = serverPubRaw.length
  header.set(serverPubRaw, 21)

  const body = new Uint8Array(header.length + ciphertext.length)
  body.set(header)
  body.set(ciphertext, header.length)

  const res = await fetch(sub.endpoint, {
    method: 'POST',
    headers: {
      'Authorization':    `vapid t=${jwt},k=${pubKey}`,
      'Content-Encoding': 'aes128gcm',
      'Content-Type':     'application/octet-stream',
      'TTL':              '86400',
    },
    body,
  })

  if (!res.ok && res.status !== 201) {
    const text = await res.text()
    throw new Error(`Push failed ${res.status}: ${text}`)
  }
}

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
