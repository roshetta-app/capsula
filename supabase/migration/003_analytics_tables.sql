-- ─────────────────────────────────────────────────────────────────────────────
-- 003_analytics_tables.sql
-- Phase 3J — Analytics: usage_events + search_gaps
--
-- usage_events  — tracks condition_view, drug_view, condition_search, drug_search
-- search_gaps   — tracks search terms that returned zero results
--
-- No personal data. No user IDs. No device IDs.
-- Both tables are append-only. RLS enabled; anon role can INSERT only.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── usage_events ─────────────────────────────────────────────────────────────

create table if not exists public.usage_events (
  id           uuid primary key default gen_random_uuid(),
  event_type   text not null
                 check (event_type in ('condition_view','drug_view','condition_search','drug_search')),
  entity_id    uuid,          -- UUID of condition or drug; null for search events
  entity_name  text,          -- Name snapshot at time of event
  created_at   timestamptz not null default now()
);

-- Index for dashboard queries (aggregate by type + name)
create index if not exists usage_events_event_type_idx  on public.usage_events (event_type);
create index if not exists usage_events_created_at_idx  on public.usage_events (created_at desc);
create index if not exists usage_events_entity_name_idx on public.usage_events (entity_name) where entity_name is not null;

-- RLS
alter table public.usage_events enable row level security;

-- Anon users (app) can insert; nobody can select/update/delete via anon
drop policy if exists "anon_insert_usage_events" on public.usage_events;
create policy "anon_insert_usage_events"
  on public.usage_events
  for insert
  to anon
  with check (true);

-- Authenticated (admin) can read all
drop policy if exists "auth_select_usage_events" on public.usage_events;
create policy "auth_select_usage_events"
  on public.usage_events
  for select
  to authenticated
  using (true);


-- ── search_gaps ───────────────────────────────────────────────────────────────

create table if not exists public.search_gaps (
  id         uuid primary key default gen_random_uuid(),
  term       text not null,
  context    text not null
               check (context in ('conditions','drugs')),
  created_at timestamptz not null default now()
);

-- Index for dashboard queries (aggregate by term + context, filter by date)
create index if not exists search_gaps_context_idx    on public.search_gaps (context);
create index if not exists search_gaps_created_at_idx on public.search_gaps (created_at desc);
create index if not exists search_gaps_term_idx       on public.search_gaps (term);

-- RLS
alter table public.search_gaps enable row level security;

drop policy if exists "anon_insert_search_gaps" on public.search_gaps;
create policy "anon_insert_search_gaps"
  on public.search_gaps
  for insert
  to anon
  with check (true);

drop policy if exists "auth_select_search_gaps" on public.search_gaps;
create policy "auth_select_search_gaps"
  on public.search_gaps
  for select
  to authenticated
  using (true);
