/**
 * supabase/functions/backup-receipts/index.ts
 * Side step BR1 (2026-11-24) - lets the nightly backup job copy the receipt pictures.
 *
 * Why this exists: the bucket `pro-receipts` is private, so it can only be read with the project's
 * master (service role) key. The backup job must NOT hold that key (a leak of the backup repo's
 * secrets would then expose everything). This function holds the key itself and hands the backup job
 * only what it needs, protected by a separate long random token that works for nothing else.
 *
 * It answers exactly two questions, both with POST and the header `x-backup-token`:
 *   { "action": "list" }                        -> the files in `pro-receipts`: path, size, uploaded time
 *   { "action": "links", "paths": ["<p>", ...] } -> a short-lived (5 minutes) download link for each path
 *                                                   (at most 50 paths per call)
 *
 * What it never does: write, change or delete anything; read any other bucket or table; return a
 * person's name, email or request details; accept a path that is not exactly `<id>/<id>.<jpg|jpeg|png|webp>`;
 * answer when the secret `BACKUP_RECEIPTS_TOKEN` is missing or shorter than 32 characters (it refuses
 * everyone instead). The token is compared in constant time. Logs hold counts only, never a path.
 * If the token ever leaks, the most anyone can do is read receipts; rotate it by setting a new value
 * in Supabase and in the backup repo's secrets.
 *
 * Deploy with JWT verification OFF (the backup job has no login; the token is the check).
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

const BUCKET = 'pro-receipts'
const PATH_SHAPE = /^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|jpeg|png|webp)$/
const FOLDER_SHAPE = /^[0-9a-f-]{36}$/
const MIN_TOKEN_LENGTH = 32
const LINK_SECONDS = 300
const MAX_LINKS = 50
const MAX_FILES = 5000
const PAGE = 1000

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

/** Constant-time comparison: both sides are hashed to the same length first, then compared byte by byte. */
async function sameSecret(given: string, expected: string): Promise<boolean> {
  const enc = new TextEncoder()
  const [x, y] = await Promise.all([
    crypto.subtle.digest('SHA-256', enc.encode(given)),
    crypto.subtle.digest('SHA-256', enc.encode(expected)),
  ])
  const a = new Uint8Array(x)
  const b = new Uint8Array(y)
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i]
  return diff === 0
}

// deno-lint-ignore no-explicit-any
async function listReceipts(db: any) {
  const files: { path: string; size: number | null; uploaded_at: string | null }[] = []
  let skipped = 0
  let truncated = false

  // The top level holds one folder per person.
  const folders: string[] = []
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await db.storage.from(BUCKET).list('', { limit: PAGE, offset, sortBy: { column: 'name', order: 'asc' } })
    if (error) throw new Error('list_failed')
    const rows = data ?? []
    for (const r of rows) {
      if (r.id === null || r.id === undefined) folders.push(String(r.name)) // a folder has no file id
      else skipped++                                                         // a loose file at the top is not a receipt
    }
    if (rows.length < PAGE) break
  }

  outer:
  for (const folder of folders) {
    if (!FOLDER_SHAPE.test(folder)) { skipped++; continue }
    for (let offset = 0; ; offset += PAGE) {
      const { data, error } = await db.storage.from(BUCKET).list(folder, { limit: PAGE, offset, sortBy: { column: 'name', order: 'asc' } })
      if (error) throw new Error('list_failed')
      const rows = data ?? []
      for (const r of rows) {
        if (r.id === null || r.id === undefined) { skipped++; continue }
        const path = `${folder}/${r.name}`
        if (!PATH_SHAPE.test(path)) { skipped++; continue }
        if (files.length >= MAX_FILES) { truncated = true; break outer }
        files.push({
          path,
          size: typeof r.metadata?.size === 'number' ? r.metadata.size : null,
          uploaded_at: r.created_at ?? null,
        })
      }
      if (rows.length < PAGE) break
    }
  }

  files.sort((a, b) => a.path.localeCompare(b.path))
  return { files, skipped, truncated }
}

export async function handle(req: Request): Promise<Response> {
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

  const expected = Deno.env.get('BACKUP_RECEIPTS_TOKEN') ?? ''
  if (expected.length < MIN_TOKEN_LENGTH) {
    console.error('backup-receipts: BACKUP_RECEIPTS_TOKEN is missing or too short; refusing everyone')
    return json({ error: 'not_configured' }, 503)
  }

  const given = req.headers.get('x-backup-token') ?? ''
  if (!(await sameSecret(given, expected))) return json({ error: 'unauthorized' }, 401)

  let body: { action?: unknown; paths?: unknown }
  try { body = await req.json() } catch { return json({ error: 'bad_request' }, 400) }

  const db = createClient(Deno.env.get('SUPABASE_URL')!, pickKey('SUPABASE_SECRET_KEYS', 'SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } })

  try {
    if (body.action === 'list') {
      const { files, skipped, truncated } = await listReceipts(db)
      console.log(`backup-receipts: list ${files.length} files, skipped ${skipped}, truncated ${truncated}`)
      return json({ ok: true, count: files.length, skipped, truncated, files }, 200)
    }

    if (body.action === 'links') {
      const paths = body.paths
      if (!Array.isArray(paths) || paths.length === 0 || paths.length > MAX_LINKS
          || !paths.every(p => typeof p === 'string' && PATH_SHAPE.test(p))) {
        return json({ error: 'bad_paths' }, 400)
      }
      const unique = [...new Set(paths as string[])]
      const { data, error } = await db.storage.from(BUCKET).createSignedUrls(unique, LINK_SECONDS)
      if (error) throw new Error('links_failed')
      const links: { path: string; url: string }[] = []
      let failed = 0
      for (const row of data ?? []) {
        if (row.signedUrl && !row.error) links.push({ path: row.path, url: row.signedUrl })
        else failed++
      }
      console.log(`backup-receipts: links ${links.length}, failed ${failed}`)
      return json({ ok: true, expires_in: LINK_SECONDS, links, failed }, 200)
    }

    return json({ error: 'unknown_action' }, 400)
  } catch (err) {
    console.error('backup-receipts error:', err instanceof Error ? err.message : 'unknown')
    return json({ error: 'failed' }, 500)
  }
}

Deno.serve(handle)
