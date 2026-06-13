-- =============================================================================
-- 007_migrate_images_to_blocks.sql
--
-- One-time migration: copies existing condition_images rows into
-- image_gallery blocks in condition_blocks.
--
-- For each condition that has images, inserts one image_gallery block
-- with data.images = array of { id, url, caption } sorted by sort_order.
-- order_index = 0 (images always render first per Section 2.4).
--
-- Safe to run once. Skips any condition that already has an image_gallery
-- block (idempotent guard).
-- =============================================================================

insert into public.condition_blocks (condition_id, block_type, order_index, data)
select
  ci_grouped.condition_id,
  'image_gallery',
  0,
  jsonb_build_object(
    'images',
    jsonb_agg(
      jsonb_build_object(
        'id',      ci_grouped.id,
        'url',     ci_grouped.url,
        'caption', ci_grouped.caption
      )
      order by ci_grouped.sort_order asc
    )
  )
from public.condition_images ci_grouped
where
  -- Only migrate conditions that don't already have an image_gallery block
  not exists (
    select 1
    from public.condition_blocks cb
    where cb.condition_id = ci_grouped.condition_id
      and cb.block_type = 'image_gallery'
  )
group by ci_grouped.condition_id;
