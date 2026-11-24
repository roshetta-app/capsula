/**
 * supabase/functions/pro-receipts-clean/index.ts
 * Stage 3, step 2b (2026-11-24) - the 90 day receipt clean-up.
 *
 * Why this is a function and not plain SQL: the database refuses to delete
 * receipt files directly ("use the Storage API"), so the file has to be removed
 * through the Storage API and only then does the database forget its path.
 *
 * Called once a night by the pg_cron job `pro_receipts_clean_nightly`.
 * What it does, in this order, for every receipt the database lists as due
 * (`pro_receipts_due`, set by approve, reject, cancel and account deletion):
 *   1. removes that one file from the private bucket `pro-receipts`;
 *   2. only if the removal worked, calls `pro_receipt_mark_deleted` so the path is cleared.
 * A failed removal leaves the row due, so the next night tries again.
 *
 * Nothing is read from the request: whoever calls this function can only make it
 * remove files the database already says are due. It deletes nothing else, and
 * a path that does not have the exact shape `<id>/<id>.<jpg|jpeg|png|webp>` is skipped.
 * It logs counts only, never a path or a person.
 *
 * Deploy with JWT verification OFF (same as deliver-notification: the job calls it
 * by address with no key).
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL              = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const BUCKET = 'pro-receipts'
const BATCH = 100
const MAX_BATCHES = 5
const PATH_SHAPE = /^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|jpeg|png|webp)$/

Deno.serve(async () => {
  const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

  let due = 0
  let deleted = 0
  let failed = 0
  let skipped = 0

  for (let round = 0; round < MAX_BATCHES; round++) {
    const { data, error } = await db.rpc('pro_receipts_due', { p_limit: BATCH })
    if (error) {
      console.error('pro-receipts-clean: could not list due receipts:', error.message)
      return json({ ok: false, error: 'list_failed', due, deleted, failed, skipped }, 500)
    }
    const rows: { id: string; receipt_path: string }[] = data ?? []
    if (rows.length === 0) break
    due += rows.length

    let progressed = 0
    for (const row of rows) {
      if (!PATH_SHAPE.test(row.receipt_path ?? '')) { skipped++; continue }

      const { error: rmError } = await db.storage.from(BUCKET).remove([row.receipt_path])
      if (rmError) { failed++; continue }

      const { error: markError } = await db.rpc('pro_receipt_mark_deleted', { p_id: row.id })
      if (markError) { failed++; continue }

      deleted++
      progressed++
    }

    // Nothing cleared in this round: the same rows would come back, so stop.
    if (progressed === 0 || rows.length < BATCH) break
  }

  console.log(`pro-receipts-clean: due ${due}, deleted ${deleted}, failed ${failed}, skipped ${skipped}`)
  return json({ ok: failed === 0, due, deleted, failed, skipped }, 200)
})

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}
