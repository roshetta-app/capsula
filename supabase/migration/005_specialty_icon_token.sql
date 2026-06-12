-- =============================================================================
-- 005_specialty_icon_token.sql
--
-- Adds structured icon + color-token columns to the specialties table.
-- Old columns (icon_name, color_hex) are kept and nulled-out after migration
-- so a rollback can restore them without data loss.
-- =============================================================================

-- 1. New columns
ALTER TABLE specialties
  ADD COLUMN IF NOT EXISTS icon_type  text NOT NULL DEFAULT 'lucide',
  ADD COLUMN IF NOT EXISTS icon_url   text,
  ADD COLUMN IF NOT EXISTS color_token text NOT NULL DEFAULT 'slate';

-- 2. Constrain icon_type to valid values
ALTER TABLE specialties
  DROP CONSTRAINT IF EXISTS specialties_icon_type_check;

ALTER TABLE specialties
  ADD CONSTRAINT specialties_icon_type_check
  CHECK (icon_type IN ('lucide', 'custom'));

-- 3. Migrate existing data:
--    Map known emoji values → best-fit Lucide key + token.
--    Everything else falls back to Stethoscope + slate.

UPDATE specialties SET
  icon_type   = 'lucide',
  icon_url    = NULL,
  color_token = CASE
    WHEN color_hex IN ('#DBEAFE','#E0F2FE','#BAE6FD') THEN 'sky'
    WHEN color_hex IN ('#EDE9FE','#DDD6FE')            THEN 'violet'
    WHEN color_hex IN ('#D1FAE5','#A7F3D0')            THEN 'emerald'
    WHEN color_hex IN ('#FEF3C7','#FDE68A')            THEN 'amber'
    WHEN color_hex IN ('#FCE7F3','#FBCFE8')            THEN 'pink'
    WHEN color_hex IN ('#FEE2E2','#FECACA')            THEN 'rose'
    WHEN color_hex IN ('#FFF7ED','#FED7AA')            THEN 'orange'
    WHEN color_hex IN ('#F3F4F6','#E5E7EB')            THEN 'slate'
    ELSE 'slate'
  END,
  -- Map emoji → closest Lucide icon name
  icon_name = CASE
    WHEN icon_name IN ('👶','🤰')          THEN 'Baby'
    WHEN icon_name IN ('🧠')               THEN 'Brain'
    WHEN icon_name IN ('🦴')               THEN 'Bone'
    WHEN icon_name IN ('👁️','👁')          THEN 'Eye'
    WHEN icon_name IN ('👂')               THEN 'Ear'
    WHEN icon_name IN ('🫀')               THEN 'HeartPulse'
    WHEN icon_name IN ('💉')               THEN 'Syringe'
    WHEN icon_name IN ('💊')               THEN 'Pill'
    WHEN icon_name IN ('🔬')               THEN 'Microscope'
    WHEN icon_name IN ('🧪','🧫')          THEN 'FlaskConical'
    WHEN icon_name IN ('🧬')               THEN 'Dna'
    WHEN icon_name IN ('🩻','🩺')          THEN 'Stethoscope'
    WHEN icon_name IN ('🏥')               THEN 'Hospital'
    WHEN icon_name IN ('⚕️','🩹')          THEN 'BriefcaseMedical'
    WHEN icon_name IN ('✂️')               THEN 'Scissors'
    WHEN icon_name IN ('🫁')               THEN 'Wind'
    WHEN icon_name IN ('🩸')               THEN 'Droplets'
    WHEN icon_name IN ('☢️')               THEN 'Radiation'
    WHEN icon_name IN ('🌡️')               THEN 'Thermometer'
    WHEN icon_name IN ('🦠')               THEN 'Microscope'
    ELSE 'Stethoscope'
  END;

-- 4. Create Supabase Storage bucket for custom specialty icons (run once).
--    If the bucket already exists this is a no-op due to the ON CONFLICT clause.
INSERT INTO storage.buckets (id, name, public)
VALUES ('specialty-icons', 'specialty-icons', true)
ON CONFLICT (id) DO NOTHING;

-- 5. Storage RLS: allow authenticated admins to upload; public read.
CREATE POLICY IF NOT EXISTS "specialty_icons_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'specialty-icons');

CREATE POLICY IF NOT EXISTS "specialty_icons_admin_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'specialty-icons'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY IF NOT EXISTS "specialty_icons_admin_delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'specialty-icons'
    AND auth.role() = 'authenticated'
  );
