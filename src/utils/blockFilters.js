/**
 * blockFilters.js — Tab-routing helpers for condition blocks.
 *
 * Implements the exact algorithm from Section 2.3 of the masterplan.
 * Pure functions — no side effects, no imports, unit-testable in isolation.
 *
 * Input shape (each block):
 *   { id, blockType, orderIndex, data }
 * as produced by mapConditions() in queries.js (Phase 2.1).
 */

/**
 * Returns the ordered list of blocks to render in the Clinical Data tab.
 *
 * Algorithm (Phase 4.2 update — Step 4.2):
 *   All clinical block types (including image_gallery) sorted purely by
 *   orderIndex. The previous sort-first override for image_gallery blocks
 *   has been removed — CMS editors control gallery position via block
 *   drag-reorder.
 *
 * Filters out:
 *   - prescription_sheet blocks (belong to Rx tab)
 *   - note_callout blocks whose data.context === 'rx' (belong to Rx tab per 2.8)
 *   - image_gallery blocks with empty data.images[] (per 3.1 — zero images = no content)
 *   - free_text_post blocks with empty data.markdown (per 3.2 — empty = no content)
 *
 * @param {Array<{id: string, blockType: string, orderIndex: number, data: object}>} allBlocks
 * @returns {Array}
 */
export function getClinicalDataBlocks(allBlocks) {
  if (!allBlocks?.length) return []

  const CLINICAL_TYPES = new Set([
    'image_gallery',
    'free_text_post',
    'note_callout',
    'rich_text_section',
    'list_section',
    'differential_dx',
    'table',
  ])

  return allBlocks
    .filter(b => {
      if (!CLINICAL_TYPES.has(b.blockType)) return false
      // image_gallery with no images has no content (Section 3.1)
      if (b.blockType === 'image_gallery' && !b.data?.images?.length) return false
      // note_callout with context 'rx' belongs to Rx tab (Section 2.8)
      if (b.blockType === 'note_callout' && b.data?.context === 'rx') return false
      // free_text_post with empty markdown has no content (Section 3.2)
      if (b.blockType === 'free_text_post' && !b.data?.markdown) return false
      return true
    })
    .sort((a, b) => a.orderIndex - b.orderIndex)
}

/**
 * Returns the ordered list of blocks to render in the Rx tab.
 *
 * Algorithm (Section 2.3 + 2.8):
 *   - prescription_sheet blocks, sorted by orderIndex.
 *   - note_callout blocks whose data.context === 'rx', interleaved by orderIndex.
 *   - Empty prescription_sheet blocks (rows: []) are excluded (per 3.3 — no content).
 *
 * @param {Array<{id: string, blockType: string, orderIndex: number, data: object}>} allBlocks
 * @returns {Array}
 */
export function getRxBlocks(allBlocks) {
  if (!allBlocks?.length) return []

  return allBlocks
    .filter(b => {
      if (b.blockType === 'prescription_sheet') {
        // Empty rows array = no content (Section 3.3)
        return b.data?.rows?.length > 0
      }
      // note_callout with context 'rx' participates in Rx tab (Section 2.8)
      if (b.blockType === 'note_callout' && b.data?.context === 'rx') return true
      return false
    })
    .sort((a, b) => a.orderIndex - b.orderIndex)
}
