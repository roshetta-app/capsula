import BlockRenderer from './BlockRenderer'
import { blockGap, blockKind } from '../../utils/blockSpacing'

/**
 * BlockStack — stacks condition blocks (Clinical tab, and the Rx tab below
 * the sheet) with one consistent gap between neighbours. Blocks have no
 * outer spacing of their own; the gap above each one comes from
 * blockGap() in utils/blockSpacing.js.
 *
 * Props:
 *   blocks  Block[]  — already filtered and ordered for the tab
 */
export default function BlockStack({ blocks }) {
  return (
    <div>
      {blocks.map((block, i) => (
        <div
          key={block.id}
          style={{
            marginTop: i === 0
              ? 0
              : blockGap(blockKind(blocks[i - 1].blockType), blockKind(block.blockType)),
          }}
        >
          <BlockRenderer block={block} />
        </div>
      ))}
    </div>
  )
}
