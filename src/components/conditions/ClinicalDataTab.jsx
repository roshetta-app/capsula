import BlockRenderer from './BlockRenderer'
import { getClinicalDataBlocks } from '../../utils/blockFilters'

/**
 * ClinicalDataTab — Clinical Data tab container (Phase 2.9).
 *
 * Calls getClinicalDataBlocks() (2.2) to get the ordered block list
 * for this tab (image_gallery blocks first, then all other clinical
 * types sorted by orderIndex — per algorithm in Section 2.3).
 *
 * Each block is rendered via BlockRenderer (2.3), which handles
 * image_gallery, free_text_post, note_callout, and prescription_sheet
 * (the last is filtered out by getClinicalDataBlocks, but BlockRenderer
 * handles it defensively regardless).
 *
 * Empty state (2.10): if getClinicalDataBlocks() returns 0 blocks,
 * shows "No clinical information yet." — no CTA needed (admin concern).
 *
 * Props:
 *   blocks  Block[]  — condition.blocks (Phase 2.1 shape)
 */
export default function ClinicalDataTab({ blocks }) {
  const clinicalBlocks = getClinicalDataBlocks(blocks)

  if (clinicalBlocks.length === 0) {
    return (
      <div style={{
        textAlign: 'center',
        padding: 'var(--space-12) var(--space-4)',
        color: 'var(--color-text-tertiary)',
      }}>
        <div style={{ fontSize: 14, fontWeight: 500 }}>
          No clinical information yet.
        </div>
      </div>
    )
  }

  return (
    <div>
      {clinicalBlocks.map(block => (
        <BlockRenderer key={block.id} block={block} />
      ))}
    </div>
  )
}
