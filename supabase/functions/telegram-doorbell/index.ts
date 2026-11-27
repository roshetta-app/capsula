/**
 * supabase/functions/telegram-doorbell/index.ts
 * Track F, step F1b (2026-11-23) - the report doorbell.
 * The alert channel changed twice the same night: Telegram refused every request with
 * "Too Many Requests", then ntfy refused with "daily message quota reached" (both limit
 * by the sending address, and Supabase's address is shared with many other projects).
 * Email through Resend is limited per account, so it is not affected. The function and
 * job keep the name `telegram-doorbell` so nothing else had to be renamed.
 *
 * Called every minute by the pg_cron job `telegram-doorbell`, only when the
 * table `doorbell_queue` has an unsent row (filled by the trigger on `reports`).
 * Sends ONE short alert email to the owner through Resend (https://resend.com), then marks the rows sent.
 *
 * What the message holds: the kind of page or item, the reason, how many
 * reports, and a link to the CMS Reports screen. Never a name, a note, a
 * reporter or any personal detail (the queue does not hold them).
 *
 * Secrets (Edge Function secrets, dashboard only): RESEND_API_KEY, the API key of a
 * free Resend account; and ALERT_EMAIL, the address that gets the alerts (on the free
 * plan with the shared sender it must be the email the Resend account was made with).
 * Nothing is read from the request: anyone who calls this function can only cause
 * rows already in the queue to be sent to the owner's own address; they cannot choose
 * the text or the address.
 *
 * Limits: at most 20 messages an hour (rows over the limit wait and go out in
 * a later, grouped message; nothing is lost). A failed send puts the rows
 * back and is tried again next minute. Sent rows are deleted after 7 days.
 *
 * Deploy with JWT verification OFF (same as deliver-notification: the job
 * calls it by address with no key).
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Key rotation (LR1.5, 2026-11-27): use the new-style key when Supabase provides one, else the old one.
// SUPABASE_SECRET_KEYS / SUPABASE_PUBLISHABLE_KEYS hold a small JSON object of named keys ("default").
function pickKey(newVar: string, oldVar: string, name = 'default'): string {
  try {
    const raw = Deno.env.get(newVar)
    if (raw) {
      const k = JSON.parse(raw)?.[name]
      if (typeof k === 'string' && k) return k
    }
  } catch { /* not JSON: use the old key */ }
  return Deno.env.get(oldVar)!
}

const SUPABASE_URL              = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = pickKey('SUPABASE_SECRET_KEYS', 'SUPABASE_SERVICE_ROLE_KEY')
const RESEND_API_KEY            = (Deno.env.get('RESEND_API_KEY') ?? '').trim()
const ALERT_EMAIL               = (Deno.env.get('ALERT_EMAIL') ?? '').trim()

const CMS_REPORTS_URL = 'https://capsula-app.pages.dev/admin/reports'
const CMS_PRO_URL = 'https://capsula-app.pages.dev/admin/pro-requests'
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
  pro_request: 'Pro payment request',
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
  new: 'waiting for your approval',
  late12: 'still waiting after 12 hours (we promised 24)',
}

type Row = { id: number; target_id: string; kind: string; reason: string; urgent: boolean }

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

function buildMessage(rows: Row[]): { title: string; body: string; urgent: boolean } {
  const hasReports = rows.some((r) => r.kind !== 'pro_request')
  const hasPro = rows.some((r) => r.kind === 'pro_request')
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
    return `${g.urgent ? 'URGENT ' : ''}${word}: ${reasons}${count}`
  })
  if (list.length > shown.length) lines.push(`and ${list.length - shown.length} more`)
  return {
    title: hasPro && !hasReports
      ? `Capsula: Pro request${rows.length > 1 ? 's' : ''}`
      : `Capsula: new report${rows.length > 1 ? 's' : ''}`,
    body: `${lines.join('\n')}\n\n${[hasReports ? CMS_REPORTS_URL : '', hasPro ? CMS_PRO_URL : ''].filter(Boolean).join('\n')}`,
    urgent: list.some((g) => g.urgent),
  }
}

Deno.serve(async () => {
  if (RESEND_API_KEY.length < 10 || !ALERT_EMAIL.includes('@')) return json({ ok: false, error: 'not_configured' }, 500)

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
    const msg = buildMessage(claimed as Row[])
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Capsula alerts <onboarding@resend.dev>',
        to: [ALERT_EMAIL],
        subject: (msg.urgent ? 'URGENT - ' : '') + msg.title,
        text: msg.body,
      }),
    })
    if (!res.ok) {
      await release()
      // Resend's refusal text holds no key and no address, so it is safe to log (first 200 letters).
      let why = ''
      try { why = (await res.text()).slice(0, 200) } catch (_e) { /* ignore */ }
      console.error('doorbell send failed, status', res.status, why)
      return json({ ok: false, error: 'send_failed', status: res.status }, 502)
    }
    return json({ ok: true, sent: claimed.length })
  } catch (_e) {
    await release()
    console.error('doorbell send failed (network)')
    return json({ ok: false, error: 'send_failed' }, 502)
  }
})
