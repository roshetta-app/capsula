/**
 * galleryImageUrls.js — Image System Refinement Plan, Part A.
 *
 * Pulls every gallery photo's web address out of a condition's block data,
 * so useConditions.js knows what to download during onboarding / prune on
 * each refresh.
 *
 * A condition's image_gallery blocks live at condition.blocks[].data.images
 * (confirmed live shape — see queries.js's mapConditions() and
 * BlockRenderer.jsx / ImageGalleryBlock.jsx: { url, caption? }).
 * condition.images (from the legacy condition_images table) is confirmed
 * unused for display (see IMAGE_SYSTEM_REFINEMENT_PLAN.md §3), so it is
 * deliberately not read here — reading it would download photos nothing
 * on screen ever shows.
 */

/**
 * Every gallery photo URL referenced by a single condition, in block order.
 * @param {object} condition — a mapped ConditionFull (see queries.js)
 * @returns {string[]}
 */
export function getConditionGalleryUrls(condition) {
  if (!condition?.blocks?.length) return []
  const urls = []
  for (const block of condition.blocks) {
    if (block.blockType !== 'image_gallery') continue
    const images = block.data?.images ?? []
    for (const img of images) {
      if (img?.url) urls.push(img.url)
    }
  }
  return urls
}

/**
 * Every gallery photo URL referenced across a full conditions list,
 * deduplicated. Used for the one-time onboarding download and for pruning
 * photos no longer referenced by any condition (utils/cache.js's
 * pruneOrphanedPhotos).
 * @param {object[]} conditions
 * @returns {string[]}
 */
export function getAllGalleryUrls(conditions) {
  const seen = new Set()
  for (const condition of conditions ?? []) {
    for (const url of getConditionGalleryUrls(condition)) {
      seen.add(url)
    }
  }
  return [...seen]
}
