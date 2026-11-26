# MIGRATION.md — Supabase lock-in register

Written 2026-11-25 (Track S, step S9). Facts read from the live `capsula` project and from the code at commit `2ff59c4`.
Purpose: if Capsula ever has to leave Supabase, this is the checklist. Each row says what depends on Supabase and what it would become elsewhere.

**Rule from now on:** any new feature that adds a Supabase-only dependency is written into this register the same day.

## 1. How hard is a move? (by destination)

| Destination | Difficulty | Why |
|---|---|---|
| Another Supabase project, or self-hosted Supabase | Easy | Same interface. A full restore into a spare Supabase project is already proven (A1, A1b). Change the server address and key. |
| Plain Postgres + own API layer | Project of weeks | The phone talks straight to the database through Supabase's interface; security rules, sign-in and scheduled calls are written the Supabase way. |
| Data only (any provider) | Easy | 80 plain Postgres tables, about 248 MB. |

## 2. The register

### Database
| Dependency | Size (measured 2026-11-25) | Becomes elsewhere |
|---|---|---|
| Plain tables and data | 80 public tables | Restores into any Postgres 17. Nothing to change. |
| Database functions (called from the app with `.rpc`) | 237 public functions; 34 use `auth.uid()` | Functions move as they are. `auth.uid()` must be replaced by whatever tells the function who is calling (a session setting set by the new API layer). |
| Row security rules | 107 public rules; 43 use Supabase login functions (`auth.uid` / `auth.jwt` / `auth.role`) | Rules move as they are, but the 43 need the new login system to provide the same "who is this" value. Without it, nothing is private. |
| Links to the accounts table | 25 foreign keys to `auth.users` | The new sign-in system must keep the same user ids (export and import users with their ids), or these 25 links must be remapped. |
| Triggers | 80, including the change-log trigger `trg_audit_direct_edit` and the version-stamp triggers | Move as they are (plain Postgres). Some read the login role setting `request.jwt.claim.role`; see the change-log function `audit_log_direct_edit`. |
| Extensions | `pg_cron`, `pg_net`, `supabase_vault` (installed, 0 secrets stored), plus `pgcrypto`, `pg_trgm`, `uuid-ossp`, `pg_stat_statements` | The last four are standard. The first three are below. |

### Scheduled jobs (15 active since 2026-11-25; the four price jobs were retired, `retention_purge_nightly` added)
| Group | Jobs | Becomes elsewhere |
|---|---|---|
| Plain database work (12) | archive_purge_expired, cap_empty_reader_log_daily, cap_probe_collect, cap_probe_send, cron_history_prune, notifications_clean_daily, pro_doorbell_late_hourly, pro_expire_hourly, pro_remind_daily, profile_logs_clean, retention_purge_nightly, view_counts_clean | Any scheduler that can run SQL (`pg_cron` on any Postgres, or a timed job). |
| Call a server function through `pg_net` (3) | deliver-pending-notifications (every minute), telegram-doorbell (every minute), pro_receipts_clean_nightly | A timed job that calls the same web address, or the same function rewritten on the new host. `pg_net` is Supabase-specific in practice. |

### Sign-in
| Dependency | Size | Becomes elsewhere |
|---|---|---|
| Email and password, Google sign-in (`supabase.auth.*`) | 15 calls; mainly `src/context/AuthContext.jsx`, also `src/hooks/usePushSubscription.js`, `src/pages/admin/ProRequestsManager.jsx` | A new sign-in provider. Users would sign in again (passwords cannot be exported; Google sign-in would need its allowed addresses updated). Decide at the exit drill (S12) whether to ever move sign-in off Supabase: not planned. |
| Session handling in the app | `getSession`, `getUser`, `onAuthStateChange`: 7 calls | Replaced together with the sign-in provider. |

### Files (storage)
| Bucket | Access | Notes |
|---|---|---|
| condition-images, note-images, notification-images, specialty-icons | public | Copy files to any object store or the static host; every stored picture address in the database must be rewritten. |
| pro-receipts | private | Same, plus the access rules (19 storage rules) must be recreated. |
| App code | about 13 calls (`.storage`), in `src/lib/proQueries.js`, `src/lib/adminQueries.js`, `src/lib/noteQueries.js`, `src/pages/admin/ProRequestsManager.jsx` | These four files are the only places to change. |

### Server functions (7)
`admin-users`, `backup-receipts`, `delete-account`, `deliver-notification`, `pro-receipts-clean`, `send-notification`, `telegram-doorbell`, all in `supabase/functions/`, written for Supabase's function runtime (Deno). The app calls four of them (`admin-users` 6 times, `delete-account`, `deliver-notification`, `send-notification` once each; 9 calls in `src/lib/adminQueries.js`, `src/lib/queries.js`, `src/pages/admin/NotificationsPanel.jsx`). Elsewhere: any Deno-capable host (Deno Deploy, Cloudflare Workers with small changes). They use the Supabase admin key and the database client, which would change to the new provider's.

### The app's way of talking to the database
| Dependency | Size | Becomes elsewhere |
|---|---|---|
| Direct calls from the phone to the database | 54 of 506 files import `src/lib/supabase.js`: 38 table reads (`supabase.from`, 16 files), 48 function calls (`.rpc`, 24 files), 15 sign-in calls, about 13 file-storage calls, 9 server-function calls. No realtime. | Either keep a Supabase-compatible API (self-hosted Supabase, nothing to change) or write a new API and move the 54 files behind it. Step S11 moves calls behind small data modules gradually, so a move changes one place per area. |
| Server address and key | Built in at build time: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (`src/lib/supabase.js`, `.github/workflows/deploy.yml`) | Step S10 (remote address book) will let an installed phone read the address from a small file on the static host, so a provider change needs no new app release. |
| Installed app address | `appId com.capsula.app`; the app and its sign-in allowed addresses depend on the web address it is served from | Moving the app to Cloudflare Pages (S3) changes this once, before launch (E7, P9). |

## 3. What is NOT locked in
- The data itself (plain Postgres).
- The drug catalog download (becomes static files in S2, host-independent).
- Backups (weekly dump, S8; restore proven in A1 and A1b).

## 4. Exit drill (S12): spare Supabase DONE 2026-11-25, plain Postgres still open
Date: 2026-11-25 (evening). Backup used: `backup-20261125` (created 21:07 UTC), restored by `restore-test` with the tag empty.

### A. Second Supabase project (`capsula-restore-test`): done
- Restore of the data: succeeded in 3m 9s (whole workflow; download and decrypt 4 s).
- Compared with live afterwards: 75 public tables, the 6 Pro tables, pg_trgm and 4 text-search indexes, 24 links to accounts, 10 accounts and 10 profiles, brands 21,728, formulations 12,531, generics 7,250, roshettas 16, change log 68,871, Pro history 7, plan prices 3, payment codes 3, 239 functions: all equal to live. Size 119 MB against 186 MB on live (job logs and the web-call log are not in the backup).
- `storage-setup.sql` (corrected 2026-11-25): ran without errors; 5 buckets and 19 rules equal to live (hash check). The OLD file did not create `pro-receipts` and still recreated the open `public read note-images` rule; fixed.
- `jobs-setup.sql` (corrected 2026-11-25 and 2026-11-26): ran without errors; 14 jobs equal to live (schedule and command, project address replaced). The OLD file lacked `retention_purge_nightly`; fixed. On the spare the 5 jobs that call outside are switched off.
- Edge functions: all 7 deployed, same sign-in settings as live. Proof from the spare database: `backup-receipts` without token 503 not_configured, `pro-receipts-clean` 200 (due 0), `telegram-doorbell` 500 not_configured before its secrets and sent an alert email (test row, sent through Resend) after `RESEND_API_KEY` and `ALERT_EMAIL` were added.
- **Finding:** the restore leaves the spare WITHOUT `pg_net`; function-calling jobs would fail with "schema net does not exist". Fixed by hand (`create extension pg_net with schema extensions`). Cause (dump or the empty-the-spare step) not found. Keep: check `pg_net` after any restore into an existing project.
- Not done on the spare: secrets `FIREBASE_SERVICE_ACCOUNT_JSON` and `BACKUP_RECEIPTS_TOKEN`, Google sign-in, sign-in addresses, image upload. Functions were deployed without their long header comments (code identical, fingerprints differ).

### B. Plain Postgres: NOT DONE
Needs Docker on a computer (steps in `S12_PREP.md` section 5, untested). Minutes: ____ ; errors: ____ ; stubs needed: ____ ; count comparison: ____

### C. Decisions
- `storage-setup.sql` creates `pro-receipts`: YES.
- Move sign-in off Supabase: not planned.
