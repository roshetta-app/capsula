/**
 * supabase/functions/telegram-doorbell/index.ts
 * Track F, step F1b (2026-11-23) — the Telegram doorbell.
 *
 * Called every minute by the pg_cron job `telegram-doorbell`, only when the
 * table `doorbell_queue` has an unsent row (filled by the trigger on `reports`).
 * Sends ONE short message to the owner's Telegram chat, then marks the rows sent.
 *
 * What the message holds: the kind of page or item, the reason, how many
 * reports, and a link to the CMS Reports screen. Never a name, a note, a
 * reporter or any personal detail (the queue does not hold them).
 *
 * Secrets (Edge Function secrets, dashboard only): TELEGRAM_BOT_TOKEN,
 * TELEGRAM_CHAT_ID. Nothing is read from the request: anyone who calls this
 * function can only cause rows already in the queue to be sent to the owner's
 * own chat; they cannot choose the text or the chat.
 *
 * Limits: at most 20 messages an hour (rows over the limit wait and go out in
 * a later, grouped message; nothing is lost). A failed send puts the rows
 * back and is tried again next minute. Sent rows are deleted after 7 days.
 *
 * Deploy with JWT verification OFF (same as deliver-notification: the job
 * calls it by address with no key).
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL              = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const BOT_TOKEN                 = Deno.env.get('TELEGRAM_BOT_TOKEN') ?? ''
const CHAT_ID                   = Deno.env.get('TELEGRAM_CHAT_ID') ?? ''

const CMS_REPORTS_URL = 'https://roshetta-app.github.io/capsula/admin/reports'
const MAX_MESSAGES_PER_HOUR = 20
const MAX_ROWS_PER_RUN = 200
const MAX_LINES = 15

const KIND_WORDS: Record<string, string> = {
  roshetta: 'Roshetta',
  group: 'Drug group',
  profile: 'Profile',
  topic: 'Topic page',
  brand: 'Brand page',
  generic: 'Generic page',
}

const REASON_WORDS: Record<string, string> = {
  medical: 'wrong or dangerous medical content',
  impersonation: 'impersonation',
  spam: 'spam',
  inappropriate: 'inappropriate',
  other: 'other',
  wrong_dose: 'wrong dose or strength',
  wrong_info: 'other wrong information',
  missing: 'something missing',
  typo: 'typing or wording',
  broken: 'something broken',
}

type Row = { id: number; target_id: string; kind: string; reason: string; urgent: boolean }

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

function buildMessage(rows: Row[]): string {
  // one line per page or item (same kind + same target), with a count
  const groups = new Map<string, { kind: string; urgent: boolean; reasons: Map<string, number>; count: number }>()
  for (const r of rows) {
    const key = `${r.kind}:${r.target_id}`
    let g = groups.get(key)
    if (!g) { g = { kind: r.kind, urgent: false, reasons: new Map(), count: 0 }; groups.set(key, g) }
    g.count += 1
    if (r.urgent) g.urgent = true
    g.reasons.set(r.reason, (g.reasons.get(r.reason) ?? 0) + 1)
  }
  const list = [...groups.values()].sort((a, b) => Number(b.urgent) - Number(a.urgent))
  const shown = list.slice(0, MAX_LINES)
  const lines = shown.map((g) => {
    const reasons = [...g.reasons.entries()]
      .map(([k, n]) => (REASON_WORDS[k] ?? 'other') + (n > 1 ? ` x${n}` : ''))
      .join(', ')
    const word = KIND_WORDS[g.kind] ?? 'Report'
    const count = g.count > 1 ? ` (${g.count} reports)` : ''
    return `${g.urgent ? '\u{1F534} URGENT ' : ''}${word}: ${reasons}${count}`
  })
  if (list.length > shown.length) lines.push(`and ${list.length - shown.length} more`)
  return `Capsula: new report${rows.length > 1 ? 's' : ''}\n\n${lines.join('\n')}\n\n${CMS_REPORTS_URL}`
}

Deno.serve(async () => {
  if (!BOT_TOKEN || !CHAT_ID) return json({ ok: false, error: 'not_configured' }, 500)

  const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

  // tidy: sent rows older than 7 days
  await db.from('doorbell_queue').delete().lt('sent_at', new Date(Date.now() - 7 * 86400_000).toISOString())

  // rate limit: count messages (one distinct sent_at per message) in the last hour
  const hourAgo = new Date(Date.now() - 3600_000).toISOString()
  const { data: recent, error: recentErr } = await db.from('doorbell_queue').select('sent_at').gte('sent_at', hourAgo)
  if (recentErr) return json({ ok: false, error: 'read_failed' }, 500)
  const messagesLastHour = new Set((recent ?? []).map((r: { sent_at: string }) => r.sent_at)).size
  if (messagesLastHour >= MAX_MESSAGES_PER_HOUR) return json({ ok: true, waiting: 'hourly_limit' })

  // claim unsent rows (so two overlapping runs never send the same row twice)
  const { data: pending, error: pendErr } = await db
    .from('doorbell_queue').select('id').is('sent_at', null).order('created_at').limit(MAX_ROWS_PER_RUN)
  if (pendErr) return json({ ok: false, error: 'read_failed' }, 500)
  if (!pending || pending.length === 0) return json({ ok: true, sent: 0 })

  const stamp = new Date().toISOString()
  const ids = pending.map((p: { id: number }) => p.id)
  const { data: claimed, error: claimErr } = await db
    .from('doorbell_queue').update({ sent_at: stamp }).in('id', ids).is('sent_at', null)
    .select('id, target_id, kind, reason, urgent')
  if (claimErr) return json({ ok: false, error: 'claim_failed' }, 500)
  if (!claimed || claimed.length === 0) return json({ ok: true, sent: 0 })

  const release = async () => {
    await db.from('doorbell_queue').update({ sent_at: null }).in('id', claimed.map((c: Row) => c.id))
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: buildMessage(claimed as Row[]),
        disable_web_page_preview: true,
      }),
    })
    if (!res.ok) {
      await release()
      // log the status only, never the address (it holds the token)
      console.error('telegram send failed, status', res.status)
      return json({ ok: false, error: 'send_failed', status: res.status }, 502)
    }
    return json({ ok: true, sent: claimed.length })
  } catch (_e) {
    await release()
    console.error('telegram send failed (network)')
    return json({ ok: false, error: 'send_failed' }, 502)
  }
})
