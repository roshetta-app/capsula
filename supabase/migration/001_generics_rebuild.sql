-- =============================================================================
-- CAPSULA — Phase 1A: Generics Table Schema Migration
-- File: supabase/migrations/001_generics_rebuild.sql
--
-- Adds all new columns to the generics table.
-- Renames uses → uses_legacy, warnings → warnings_legacy.
-- Adds is_published, updated_at, and all clinical enrichment columns.
-- Safe to run once. All ADDs use IF NOT EXISTS guards.
-- =============================================================================

BEGIN;

-- ─── Rename legacy columns ────────────────────────────────────────────────────
-- Keep old data intact for reference during data migration (Phase 1F.4)

ALTER TABLE generics
  RENAME COLUMN uses TO uses_legacy;

ALTER TABLE generics
  RENAME COLUMN warnings TO warnings_legacy;

-- ─── Add new columns ──────────────────────────────────────────────────────────

-- Card display
ALTER TABLE generics
  ADD COLUMN IF NOT EXISTS card_tagline TEXT;

-- Clinical detail
ALTER TABLE generics
  ADD COLUMN IF NOT EXISTS mechanism_of_action TEXT;

-- Structured uses (replaces uses_legacy)
ALTER TABLE generics
  ADD COLUMN IF NOT EXISTS uses_structured JSONB;
-- Shape: [{ use_name: string, context: string }]

-- Side effects
ALTER TABLE generics
  ADD COLUMN IF NOT EXISTS side_effects_common TEXT[] DEFAULT '{}';

ALTER TABLE generics
  ADD COLUMN IF NOT EXISTS side_effects_serious TEXT[] DEFAULT '{}';

-- Pregnancy / safety
ALTER TABLE generics
  ADD COLUMN IF NOT EXISTS pregnancy_category TEXT;
-- Allowed: A, B, C, D, X, N

ALTER TABLE generics
  ADD COLUMN IF NOT EXISTS breastfeeding_safety TEXT;
-- Allowed: safe, caution, unsafe, unknown

ALTER TABLE generics
  ADD COLUMN IF NOT EXISTS crosses_placenta TEXT;
-- Allowed: yes, no, unknown

ALTER TABLE generics
  ADD COLUMN IF NOT EXISTS crosses_bbb TEXT;
-- Allowed: yes, no, unknown (BBB = blood-brain barrier)

-- Contraindications & interactions
ALTER TABLE generics
  ADD COLUMN IF NOT EXISTS contraindications TEXT[] DEFAULT '{}';

ALTER TABLE generics
  ADD COLUMN IF NOT EXISTS drug_interactions JSONB;
-- Shape: [{ drug_name: string, risk: string, severity: 'major'|'moderate'|'minor' }]

-- Dose adjustments
ALTER TABLE generics
  ADD COLUMN IF NOT EXISTS dose_adjustments JSONB;
-- Shape: [{ condition: 'renal'|'hepatic'|'elderly'|'pediatric', adjustment: string }]

-- Pharmacokinetics
ALTER TABLE generics
  ADD COLUMN IF NOT EXISTS pharmacokinetics JSONB;
-- Shape: { onset, peak, duration, half_life, bioavailability } — all strings

-- Textbook reference doses (shown collapsed in Drug Detail screen)
ALTER TABLE generics
  ADD COLUMN IF NOT EXISTS textbook_doses JSONB;
-- Same dose-row structure as formulations.doses_structured

ALTER TABLE generics
  ADD COLUMN IF NOT EXISTS textbook_dose_notes TEXT;

-- Publish control
ALTER TABLE generics
  ADD COLUMN IF NOT EXISTS is_published BOOLEAN NOT NULL DEFAULT true;

-- updated_at (trigger already exists from Phase 0 — trg_generics_updated_at)
-- Column was already present. No action needed.

-- ─── CHECK constraints ────────────────────────────────────────────────────────

ALTER TABLE generics DROP CONSTRAINT IF EXISTS generics_pregnancy_category_check;
ALTER TABLE generics
  ADD CONSTRAINT generics_pregnancy_category_check
  CHECK (pregnancy_category IS NULL OR pregnancy_category IN ('A','B','C','D','X','N'));

ALTER TABLE generics DROP CONSTRAINT IF EXISTS generics_breastfeeding_safety_check;
ALTER TABLE generics
  ADD CONSTRAINT generics_breastfeeding_safety_check
  CHECK (breastfeeding_safety IS NULL OR breastfeeding_safety IN ('safe','caution','unsafe','unknown'));

ALTER TABLE generics DROP CONSTRAINT IF EXISTS generics_crosses_placenta_check;
ALTER TABLE generics
  ADD CONSTRAINT generics_crosses_placenta_check
  CHECK (crosses_placenta IS NULL OR crosses_placenta IN ('yes','no','unknown'));

ALTER TABLE generics DROP CONSTRAINT IF EXISTS generics_crosses_bbb_check;
ALTER TABLE generics
  ADD CONSTRAINT generics_crosses_bbb_check
  CHECK (crosses_bbb IS NULL OR crosses_bbb IN ('yes','no','unknown'));

-- ─── Index: is_published (app queries filter by this) ─────────────────────────

CREATE INDEX IF NOT EXISTS idx_generics_is_published
  ON generics (is_published);

-- ─── VERIFY ───────────────────────────────────────────────────────────────────

SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name   = 'generics'
ORDER BY ordinal_position;

COMMIT;
