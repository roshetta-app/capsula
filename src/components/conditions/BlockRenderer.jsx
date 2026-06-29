import ImageGalleryBlock from './ImageGalleryBlock'
import FreeTextPostBlock from './FreeTextPostBlock'
import PrescriptionSheetBlock from './PrescriptionSheetBlock'
import NoteCallout from '../ui/NoteCallout'

/**
 * BlockRenderer — renders a single condition_blocks row based on `block.blockType`.
 *
 * New unified block model (Section 2 / 3): each block is
 *   { id, blockType, orderIndex, data }
 * (shape per `mapConditions()` in queries.js, Phase 2.1).
 *
 * Supported block types (Phase 2.13 build scope):
 *   image_gallery      -> ImageGalleryBlock (2.4) — thin wrapper, no card chrome
 *   free_text_post     -> FreeTextPostBlock (2.5) — markdown + RTL, flush to surface
 *   prescription_sheet -> PrescriptionSheetBlock (2.7) — flush to surface
 *                         (data = { label, rows: [...] })
 *   note_callout       -> NoteCallout (2.6) — standalone divider block,
 *                         variant='divider': icon above text, lighter bg
 *
 * Unrecognized block types render `null` + dev-only console warning (per 2.13).
 *
 * Props:
 *   block  { id, blockType, orderIndex, data }
 */
export default function BlockRenderer({ block }) {
  const { blockType, data } = block

  switch (blockType) {
    case 'image_gallery':
      return <ImageGalleryBlock block={block} />

    case 'free_text_post':
      return <FreeTextPostBlock block={block} />

    case 'prescription_sheet':
      return <PrescriptionSheetBlock sheet={data} />

    case 'note_callout':
      return <NoteCallout text={data?.text} flavor={data?.flavor} variant="divider" />

    default:
      if (process.env.NODE_ENV !== 'production') {
        console.warn(`[BlockRenderer] Unrecognized block_type: "${blockType}"`)
      }
      return null
  }
}
