-- =============================================================================
-- CAPSULA — Phase 1B: Formulations & Doses Schema Migration
-- File: supabase/migrations/002_formulations_doses_rebuild.sql
--
-- Adds to formulations:
--   doses_structured      JSONB   — structured dose rows (replaces old doses blob)
--   default_dose_override TEXT    — free-text note shown above dose table
--   is_published          BOOLEAN — hide from app without deleting
--   updated_at            TIMESTAMPTZ — auto-updated via trigger
--   slug                  TEXT    — URL-safe identifier for /drugs/:slug route
--
-- Adds to generics (dose fields needed by 1B, missed in 1A):
--   textbook_doses and textbook_dose_notes already added in 1A — no action.
--
-- Wires updated_at trigger on formulations.
-- =============================================================================

BEGIN;

-- ─── formulations: new columns ────────────────────────────────────────────────

-- Slug for /drugs/:slug route (format: generic-slug-concentration-form)
ALTER TABLE formulations
  ADD COLUMN IF NOT EXISTS slug TEXT;

-- Structured dose rows — replaces the old doses JSONB blob on formulations
-- Shape: [{ who: string, instruction: string, max_dose: string|null, route: string|null }]
-- who values: 'adult' | 'child' | 'child_6_12' | 'child_under_6' | 'elderly' | 'neonate'
ALTER TABLE formulations
  ADD COLUMN IF NOT EXISTS doses_structured JSONB;

-- Optional free-text note displayed above the dose table in the app
ALTER TABLE formulations
  ADD COLUMN IF NOT EXISTS default_dose_override TEXT;

-- Publish control — unpublishing hides formulation AND all its brands from app
ALTER TABLE formulations
  ADD COLUMN IF NOT EXISTS is_published BOOLEAN NOT NULL DEFAULT true;

-- updated_at — will be managed by trigger below
ALTER TABLE formulations
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- ─── formulations: slug unique constraint ─────────────────────────────────────

-- Populate slugs from existing data before adding constraint
-- Format: <generic_slug>-<concentration_slugified>-<form_slugified>
UPDATE formulations f
SET slug = (
  SELECT
    g.slug
    || '-' || lower(regexp_replace(f.concentration, '[^a-zA-Z0-9]+', '-', 'g'))
    || '-' || lower(regexp_replace(f.form, '[^a-zA-Z0-9]+', '-', 'g'))
  FROM generics g
  WHERE g.id = f.generic_id
)
WHERE f.slug IS NULL;

-- Make slug unique and not null now that it's populated
ALTER TABLE formulations
  ALTER COLUMN slug SET NOT NULL;

ALTER TABLE formulations
  DROP CONSTRAINT IF EXISTS formulations_slug_key;

ALTER TABLE formulations
  ADD CONSTRAINT formulations_slug_key UNIQUE (slug);

-- ─── Index: is_published ──────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_formulations_is_published
  ON formulations (is_published);

-- ─── Index: slug ──────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_formulations_slug
  ON formulations (slug);

-- ─── Trigger: auto-update updated_at on formulations ─────────────────────────
-- The trigger function update_updated_at() already exists from Phase 0.
-- The trigger trg_formulations_updated_at already exists from Phase 0.
-- No action needed.

-- ─── prescription_items: new columns (per masterplan §1D) ────────────────────
-- Added here because they extend the prescription flow tied to formulation doses.

ALTER TABLE prescription_items
  ADD COLUMN IF NOT EXISTS dose_override TEXT;
-- Overrides formulation's doses_structured for this specific prescription context.
-- If null, app uses the parent formulation's doses_structured.

ALTER TABLE prescription_items
  ADD COLUMN IF NOT EXISTS drug_note TEXT;
-- Admin note shown under this drug in the prescription card.
-- E.g. 'Only if cramping present'. English or Arabic.

ALTER TABLE prescription_items
  ADD COLUMN IF NOT EXISTS drug_note_ar TEXT;
-- Arabic version of drug_note. Shown below English note if both present.

ALTER TABLE prescription_items
  ADD COLUMN IF NOT EXISTS show_generic_link BOOLEAN NOT NULL DEFAULT true;
-- If true, drug name is tappable and links to Drug Detail screen.

-- ─── VERIFY ───────────────────────────────────────────────────────────────────

SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('formulations', 'prescription_items')
ORDER BY table_name, ordinal_position;

COMMIT;
