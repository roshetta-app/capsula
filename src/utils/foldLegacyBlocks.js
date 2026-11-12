/**
 * foldLegacyBlocks.js — turns the older loose blocks (text post, image gallery,
 * note, divider) into rows of the two list blocks that replaced them.
 *
 * 2026-11-12: the Rx-level blocks and the Review blocks are now each ONE list
 * block built like a sheet ('rx_level' and 'review', data = { rows: [...] },
 * the same row shapes a sheet uses), so every row type works at every level.
 * A condition saved before that still has loose blocks. The CMS folds them into
 * the lists when the condition is opened, so nothing is lost, and the lists are
 * saved in the new form the next time the condition is saved. The app also still
 * shows the loose form, so a condition nobody has re-saved looks the same.
 *
 * Pure: no side effects. Returns the same array when there is nothing to fold.
 */

import { nanoid } from 'nanoid'

export const RX_LEVEL_TYPE = 'rx_level'
export const REVIEW_TYPE   = 'review'
export const LIST_BLOCK_TYPES = [RX_LEVEL_TYPE, REVIEW_TYPE]

const LOOSE_TYPES = ['image_gallery', 'free_text_post', 'note_callout', 'divider']

export function isLooseBlock(block) {
  return LOOSE_TYPES.includes(block?.block_type)
}

// One loose block -> one sheet-style row (same words, same images, same flavour).
export function looseBlockToRow(block) {
  const d = block.data ?? {}
  switch (block.block_type) {
    case 'free_text_post':
      return { row_type: 'free_text', id: nanoid(), title: d.title ?? '', content: d.markdown ?? '' }
    case 'image_gallery':
      return { row_type: 'image', id: nanoid(), title: d.title ?? '', images: d.images ?? [] }
    case 'note_callout':
      return { row_type: 'note', id: nanoid(), text_en: d.text ?? null, text_ar: null, flavor: d.flavor ?? 'info' }
    case 'divider':
      return { row_type: 'divider', id: nanoid() }
    default:
      return null
  }
}

export function emptyListBlock(type) {
  return { block_type: type, order_index: 0, data: { rows: [] } }
}

export function foldLegacyBlocks(blocks) {
  const list = blocks ?? []
  if (!list.some(isLooseBlock)) return list

  const keep = []
  const rxRows = []
  const reviewRows = []
  for (const block of list) {
    if (!isLooseBlock(block)) { keep.push(block); continue }
    const row = looseBlockToRow(block)
    if (!row) continue
    ;(block.data?.context === 'rx' ? rxRows : reviewRows).push(row)
  }

  function withRows(type, rows) {
    if (rows.length === 0) return
    const at = keep.findIndex(b => b.block_type === type)
    if (at >= 0) {
      keep[at] = { ...keep[at], data: { ...keep[at].data, rows: [...(keep[at].data?.rows ?? []), ...rows] } }
    } else {
      keep.push({ block_type: type, order_index: keep.length, data: { rows } })
    }
  }
  withRows(RX_LEVEL_TYPE, rxRows)
  withRows(REVIEW_TYPE, reviewRows)

  return keep.map((b, i) => ({ ...b, order_index: i }))
}
