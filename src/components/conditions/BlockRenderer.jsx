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
 *   image_gallery      → ImageGalleryBlock (2.4) — thin wrapper, no card chrome
 *   free_text_post     → FreeTextPostBlock (2.5) — markdown + RTL, wrapped in card
 *   prescription_sheet → PrescriptionSheetBlock (2.7) — wrapped in card
 *                         (data = { label, rows: [...] })
 *   note_callout       → NoteCallout (2.6) — has its own background/border, no extra wrap
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
      return (
        <div style={blockWrap}>
          <FreeTextPostBlock block={block} />
        </div>
      )

    case 'prescription_sheet':
      return (
        <div style={blockWrap}>
          <PrescriptionSheetBlock sheet={data} />
        </div>
      )

    case 'note_callout':
      return (
        <div style={{ marginBottom: 'var(--space-3)' }}>
          <NoteCallout text={data?.text} flavor={data?.flavor} />
        </div>
      )

    default:
      if (process.env.NODE_ENV !== 'production') {
        console.warn(`[BlockRenderer] Unrecognized block_type: "${blockType}"`)
      }
      return null
  }
}

// ─── Shared layout ──────────────────────────────────────────────────────────

const blockWrap = {
  backgroundColor: 'var(--color-surface)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-lg)',
  padding: 'var(--space-3) var(--space-4)',
  boxShadow: 'var(--shadow-card)',
  marginBottom: 'var(--space-3)',
}
