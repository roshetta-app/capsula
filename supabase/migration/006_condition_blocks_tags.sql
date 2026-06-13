-- =============================================================================
-- 006_condition_blocks_tags.sql
--
-- Creates three new tables for the Condition Detail System Rebuild (Phase 1):
--
--   condition_blocks  — ordered, typed content blocks per condition
--   tags              — global tag vocabulary (admin-managed)
--   condition_tags    — many-to-many join between conditions and tags
--
-- RLS policy model:
--   condition_blocks  anon SELECT (published conditions only), auth full CRUD
--   tags              anon SELECT, auth full CRUD
--   condition_tags    anon SELECT, auth full CRUD
--
-- updated_at trigger applied to condition_blocks.
-- =============================================================================

-- ─── condition_blocks ────────────────────────────────────────────────────────
--
-- One row per content block per condition. block_type drives rendering in
-- the app and editing in the CMS. data shape varies by block_type:
--
--   image_gallery     { images: [{ id, url, caption }] }
--   free_text_post    { markdown: string }
--   note_callout      { text: string, flavor: 'info'|'warning'|'tip',
--                       context: 'clinical'|'rx' }
--   prescription_sheet { label: string,
--                        rows: [{ row_type: 'drug_library'|'drug_freetext'|'note',
--                                 ... }] }
--
-- order_index determines render order within a condition.
-- Gaps are fine — UI reorders by fractional assignment; batch update on drag.

create table if not exists public.condition_blocks (
  id           uuid        primary key default gen_random_uuid(),
  condition_id uuid        not null references public.conditions (id) on delete cascade,
  block_type   text        not null
                             check (block_type in (
                               'image_gallery',
                               'free_text_post',
                               'note_callout',
                               'prescription_sheet'
                             )),
  order_index  integer     not null default 0,
  data         jsonb       not null default '{}'::jsonb,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Index: fetch all blocks for a condition, pre-sorted
create index if not exists idx_condition_blocks_condition_id
  on public.condition_blocks (condition_id, order_index);

-- Index: analytics queries — find conditions missing a given block_type
create index if not exists idx_condition_blocks_block_type
  on public.condition_blocks (block_type);

-- ─── updated_at trigger for condition_blocks ──────────────────────────────────

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_condition_blocks_updated_at on public.condition_blocks;
create trigger trg_condition_blocks_updated_at
  before update on public.condition_blocks
  for each row execute function public.set_updated_at();

-- ─── RLS: condition_blocks ────────────────────────────────────────────────────

alter table public.condition_blocks enable row level security;

-- Anon (app users) can read blocks for published conditions only
drop policy if exists "anon_select_condition_blocks" on public.condition_blocks;
create policy "anon_select_condition_blocks"
  on public.condition_blocks
  for select
  to anon
  using (
    exists (
      select 1 from public.conditions c
      where c.id = condition_id
        and c.is_published = true
    )
  );

-- Authenticated (CMS admin) can read all blocks (including unpublished conditions)
drop policy if exists "auth_select_condition_blocks" on public.condition_blocks;
create policy "auth_select_condition_blocks"
  on public.condition_blocks
  for select
  to authenticated
  using (true);

drop policy if exists "auth_insert_condition_blocks" on public.condition_blocks;
create policy "auth_insert_condition_blocks"
  on public.condition_blocks
  for insert
  to authenticated
  with check (true);

drop policy if exists "auth_update_condition_blocks" on public.condition_blocks;
create policy "auth_update_condition_blocks"
  on public.condition_blocks
  for update
  to authenticated
  using (true);

drop policy if exists "auth_delete_condition_blocks" on public.condition_blocks;
create policy "auth_delete_condition_blocks"
  on public.condition_blocks
  for delete
  to authenticated
  using (true);


-- ─── tags ─────────────────────────────────────────────────────────────────────
--
-- Global tag vocabulary. Tags are created and managed by admins.
-- name is the canonical display label (e.g. "Antibiotic", "Paediatric").
-- slug is a URL-safe unique identifier derived from name.

create table if not exists public.tags (
  id         uuid        primary key default gen_random_uuid(),
  name       text        not null,
  slug       text        not null,
  created_at timestamptz not null default now(),
  constraint tags_name_key unique (name),
  constraint tags_slug_key unique (slug)
);

create index if not exists idx_tags_slug on public.tags (slug);

-- RLS: tags

alter table public.tags enable row level security;

-- Anon can read all tags (needed for app tag-based search)
drop policy if exists "anon_select_tags" on public.tags;
create policy "anon_select_tags"
  on public.tags
  for select
  to anon
  using (true);

drop policy if exists "auth_select_tags" on public.tags;
create policy "auth_select_tags"
  on public.tags
  for select
  to authenticated
  using (true);

drop policy if exists "auth_insert_tags" on public.tags;
create policy "auth_insert_tags"
  on public.tags
  for insert
  to authenticated
  with check (true);

drop policy if exists "auth_update_tags" on public.tags;
create policy "auth_update_tags"
  on public.tags
  for update
  to authenticated
  using (true);

drop policy if exists "auth_delete_tags" on public.tags;
create policy "auth_delete_tags"
  on public.tags
  for delete
  to authenticated
  using (true);


-- ─── condition_tags ──────────────────────────────────────────────────────────
--
-- Many-to-many join. A condition can have many tags; a tag can apply to many
-- conditions. Cascade deletes keep this table clean automatically.

create table if not exists public.condition_tags (
  condition_id uuid        not null references public.conditions (id) on delete cascade,
  tag_id       uuid        not null references public.tags (id)       on delete cascade,
  created_at   timestamptz not null default now(),
  constraint condition_tags_pkey primary key (condition_id, tag_id)
);

-- Index: fetch all tags for a condition (used in queries.js join)
create index if not exists idx_condition_tags_condition_id
  on public.condition_tags (condition_id);

-- Index: fetch all conditions for a tag (used in analytics / CMS tag views)
create index if not exists idx_condition_tags_tag_id
  on public.condition_tags (tag_id);

-- RLS: condition_tags

alter table public.condition_tags enable row level security;

-- Anon can read all condition_tags (needed for search + display)
drop policy if exists "anon_select_condition_tags" on public.condition_tags;
create policy "anon_select_condition_tags"
  on public.condition_tags
  for select
  to anon
  using (true);

drop policy if exists "auth_select_condition_tags" on public.condition_tags;
create policy "auth_select_condition_tags"
  on public.condition_tags
  for select
  to authenticated
  using (true);

drop policy if exists "auth_insert_condition_tags" on public.condition_tags;
create policy "auth_insert_condition_tags"
  on public.condition_tags
  for insert
  to authenticated
  with check (true);

drop policy if exists "auth_delete_condition_tags" on public.condition_tags;
create policy "auth_delete_condition_tags"
  on public.condition_tags
  for delete
  to authenticated
  using (true);
