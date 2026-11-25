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

### Scheduled jobs (18, all active)
| Group | Jobs | Becomes elsewhere |
|---|---|---|
| Plain database work (15) | archive_purge_expired, cap_empty_reader_log_daily, cap_probe_collect, cap_probe_send, cron_history_prune, eg_cand_tick, eg_price_daily, eg_price_sitemap_req, eg_price_tick, notifications_clean_daily, pro_doorbell_late_hourly, pro_expire_hourly, pro_remind_daily, profile_logs_clean, view_counts_clean | Any scheduler that can run SQL (`pg_cron` on any Postgres, or a timed job). |
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
- The drug catalog download (static files since S2, host-independent). Where it lives: a separate small Cloudflare Pages project, `capsula-catalog`, at `https://capsula-catalog.pages.dev` (a `manifest.json` plus 32 chunk files), published by the GitHub Action "Publish drug catalog to Cloudflare Pages" (`.github/workflows/publish-catalog.yml`; runs every night at 03:15 and can be run by hand; scripts `scripts/build-catalog.mjs`, `scripts/catalog-publish.mjs`). The Action needs two repository secrets, `CLOUDFLARE_API_TOKEN` (Pages-only) and `CLOUDFLARE_ACCOUNT_ID`, besides the Supabase ones it already uses. The app reads it in `src/lib/catalogStatic.js`, only while the `cms_config` row `catalog_static_enabled` is `true`; delete that row or set another value and every phone goes back to downloading from Supabase, with no app release. To point it at another host, change `CATALOG_HOST` in `src/lib/catalogStatic.js` (a new app build), or later through the remote address book (S10). After a big data job, run that workflow by hand (about 2 minutes): until it has run, phones that open the app in that gap keep their saved copy, and new phones use the Supabase download.
- Backups (weekly dump, S8; restore proven in A1 and A1b).

## 4. Exit drill (S12, not done yet)
To fill in before launch: restore the newest backup into a plain Postgres and into a second Supabase project; write below what broke and how long it took.

- Result: _not run yet_
