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
 *   - image_gallery blocks whose data.context === 'rx' (belong to Rx tab per Phase 2)
 *   - image_gallery blocks with empty data.images[] (per 3.1 — zero images = no content)
 *   - free_text_post blocks whose data.context === 'rx' (belong to Rx tab per 2.8)
 *   - free_text_post blocks with empty data.markdown (per 3.2 — empty = no content)
 *
 *   - note_callout blocks with empty text (no content, renders nothing)
 *   - divider blocks whose data.context === 'rx' (belong to Rx tab)
 *   - divider blocks left at the very start or very end of the list (nothing
 *     to divide)
 *
 * Backward-compat: existing image_gallery blocks with no context field have
 * data.context === undefined, which is !== 'rx', so they continue to appear
 * in Clinical. No migration required.
 *
 * @param {Array<{id: string, blockType: string, orderIndex: number, data: object}>} allBlocks
 * @returns {Array}
 */
/**
 * Drops divider blocks at the very start and very end of a list — a divider
 * with nothing on one side has nothing to divide. Pure; keeps order.
 */
export function trimDividerEdges(blocks) {
  let start = 0
  let end = blocks.length
  while (start < end && blocks[start].blockType === 'divider') start += 1
  while (end > start && blocks[end - 1].blockType === 'divider') end -= 1
  return blocks.slice(start, end)
}

export function getClinicalDataBlocks(allBlocks) {
  if (!allBlocks?.length) return []

  const CLINICAL_TYPES = new Set([
    'image_gallery',
    'free_text_post',
    'note_callout',
    'divider',
    'rich_text_section',
    'list_section',
    'differential_dx',
    'table',
  ])

  const filtered = allBlocks
    .filter(b => {
      if (!CLINICAL_TYPES.has(b.blockType)) return false
      // divider with context 'rx' belongs to Rx tab
      if (b.blockType === 'divider' && b.data?.context === 'rx') return false
      // note_callout with empty text has no content
      if (b.blockType === 'note_callout' && !b.data?.text?.trim()) return false
      // Phase 2: image_gallery with context 'rx' belongs to Rx tab, not Clinical
      if (b.blockType === 'image_gallery' && b.data?.context === 'rx') return false
      // image_gallery with no images has no content (Section 3.1)
      if (b.blockType === 'image_gallery' && !b.data?.images?.length) return false
      // note_callout with context 'rx' belongs to Rx tab (Section 2.8)
      if (b.blockType === 'note_callout' && b.data?.context === 'rx') return false
      // free_text_post with context 'rx' belongs to Rx tab (Section 2.8)
      if (b.blockType === 'free_text_post' && b.data?.context === 'rx') return false
      // free_text_post with empty markdown has no content (Section 3.2)
      if (b.blockType === 'free_text_post' && !b.data?.markdown) return false
      return true
    })
    .sort((a, b) => a.orderIndex - b.orderIndex)

  return trimDividerEdges(filtered)
}

/**
 * Returns the ordered list of blocks to render in the Rx tab.
 *
 * Algorithm (Section 2.3 + 2.8 + Phase 2):
 *   - prescription_sheet blocks, sorted by orderIndex.
 *   - image_gallery blocks whose data.context === 'rx' (Phase 2 — new).
 *   - free_text_post blocks whose data.context === 'rx' (Phase 2 — new).
 *   - note_callout blocks whose data.context === 'rx', interleaved by orderIndex
 *     (empty notes excluded).
 *   - divider blocks whose data.context === 'rx'.
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
      // Phase 2: image_gallery with context 'rx' appears in Rx tab
      if (b.blockType === 'image_gallery' && b.data?.context === 'rx') return true
      // Phase 2: free_text_post with context 'rx' appears in Rx tab
      if (b.blockType === 'free_text_post' && b.data?.context === 'rx') return true
      // note_callout with context 'rx' participates in Rx tab (Section 2.8)
      if (b.blockType === 'note_callout' && b.data?.context === 'rx') return !!b.data?.text?.trim()
      // divider with context 'rx' participates in Rx tab (edge dividers are
      // trimmed where the below-sheet list is built)
      if (b.blockType === 'divider' && b.data?.context === 'rx') return true
      return false
    })
    .sort((a, b) => a.orderIndex - b.orderIndex)
}
