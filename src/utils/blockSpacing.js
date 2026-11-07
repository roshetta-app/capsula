/**
 * blockSpacing.js — the one spacing rule for items stacked in a tab or in a
 * prescription sheet.
 *
 * Items carry no outer spacing of their own; whoever stacks them (the
 * sheet, or BlockStack in a tab) puts blockGap(prev, next) above each item.
 *   - Standard gap between neighbours: GAP_STANDARD.
 *   - A divider gets a larger gap on both sides: GAP_DIVIDER.
 *   - A drug row keeps its own top/bottom padding (DRUG_ROW_PAD) because its
 *     hairline sits inside that padding, so that padding counts toward the
 *     gap instead of being added on top of it.
 *
 * Kinds: 'drug' | 'note' | 'text' | 'section' | 'gallery' | 'divider' | 'zigzag' | 'other'
 */

export const GAP_STANDARD = 12
export const GAP_DIVIDER = 20
export const DRUG_ROW_PAD = 13

export function blockGap(prevKind, nextKind) {
  if (!prevKind) return 0
  if (prevKind === 'drug' && nextKind === 'drug') return 0
  if (prevKind === 'divider' || nextKind === 'divider') {
    const other = prevKind === 'divider' ? nextKind : prevKind
    return other === 'drug' ? GAP_DIVIDER - DRUG_ROW_PAD : GAP_DIVIDER
  }
  if (nextKind === 'drug') return 0
  return GAP_STANDARD
}

export function blockKind(blockType) {
  switch (blockType) {
    case 'image_gallery':  return 'gallery'
    case 'free_text_post': return 'text'
    case 'note_callout':   return 'note'
    case 'divider':        return 'divider'
    default:               return 'other'
  }
}
