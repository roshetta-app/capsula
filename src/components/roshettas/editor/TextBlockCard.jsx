/**
 * src/components/roshettas/editor/TextBlockCard.jsx
 * 2026-11-14 (Roshetta plan, step 5.1b): one text block of a roshetta in the editor. A card
 * with a small "Text" title, move up, move down and delete buttons (44 px each), a text box
 * and a counter ("12/1000"). The text is plain text: no markdown, no HTML, line breaks kept,
 * and it follows its own direction (Arabic from the right).
 *
 * Props:
 *   block       { id, content }   the text block row
 *   index       number            its place among all the entries of the roshetta
 *   count       number            how many entries the roshetta has (for the move buttons)
 *   onChange    (text) => void    typing; the text is already cut to the limit
 *   onMoveUp    () => void
 *   onMoveDown  () => void
 *   onDelete    () => void        asks nothing itself; the screen decides about a question
 *   disabled    boolean           read only: the text cannot be typed or moved, delete stays
 *
 * Not placed on any screen yet: the editor screen (Phase D) uses it.
 */

import Icon from '../../ui/Icon'
import IconButton from './EditorIconButton'
import { moveState, textBlockCounter, typedTextBlock } from '../../../utils/roshettaTextBlockText'

const font = 'var(--font-body)'

export default function TextBlockCard({
  block, index = 0, count = 1, onChange, onMoveUp, onMoveDown, onDelete, disabled = false,
}) {
  const content = typeof block?.content === 'string' ? block.content : ''
  const { canUp, canDown } = moveState(index, count)
  const fieldId = `roshetta-text-${block?.id ?? index}`

  return (
    <div
      style={{
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-2) var(--space-4) var(--space-3)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <label
          htmlFor={fieldId}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)', fontFamily: font,
          }}
        >
          <Icon name="FileText" size={15} />
          Text
        </label>
        <div style={{ display: 'flex', alignItems: 'center', marginInlineEnd: -10 }}>
          <IconButton label="Move up" name="ChevronUp" onClick={() => onMoveUp?.()} disabled={disabled || !canUp} />
          <IconButton label="Move down" name="ChevronDown" onClick={() => onMoveDown?.()} disabled={disabled || !canDown} />
          <IconButton label="Delete text" name="Trash2" onClick={() => onDelete?.()} danger />
        </div>
      </div>

      <textarea
        id={fieldId}
        value={content}
        onChange={e => onChange?.(typedTextBlock(e.target.value))}
        readOnly={disabled}
        rows={4}
        dir="auto"
        placeholder="Write an instruction, a reminder or a note"
        style={{
          width: '100%', boxSizing: 'border-box', resize: 'none',
          fontSize: 15, lineHeight: 1.4, textAlign: 'start',
          color: 'var(--color-text-primary)', backgroundColor: 'var(--color-surface-muted)',
          border: '1.5px solid transparent', borderRadius: 12, padding: '12px 14px',
          fontFamily: font, outline: 'none',
        }}
      />
      <div
        style={{
          marginTop: 4, textAlign: 'end', fontSize: 12,
          color: 'var(--color-text-secondary)', fontFamily: font,
        }}
      >
        {textBlockCounter(content)}
      </div>
    </div>
  )
}
