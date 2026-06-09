-- ─────────────────────────────────────────────────────────────────────────────
-- 004_crash_logs_push_subscriptions.sql
-- Phase 3K — Crash Logger & Notifications Panel
-- ─────────────────────────────────────────────────────────────────────────────

-- ── crash_logs ────────────────────────────────────────────────────────────────

create table if not exists public.crash_logs (
  id                uuid primary key default gen_random_uuid(),
  error_message     text not null,
  error_stack       text,
  component_stack   text,
  app_version       text,
  created_at        timestamptz not null default now()
);

create index if not exists crash_logs_created_at_idx on public.crash_logs (created_at desc);

alter table public.crash_logs disable row level security;

-- ── push_subscriptions ────────────────────────────────────────────────────────

create table if not exists public.push_subscriptions (
  id           uuid primary key default gen_random_uuid(),
  subscription jsonb not null,
  created_at   timestamptz not null default now()
);

alter table public.push_subscriptions disable row level security;
