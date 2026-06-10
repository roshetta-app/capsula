/**
 * TextRow — free-text prescription item.
 *
 * Props:
 *   content  string
 */
export default function TextRow({ content }) {
  if (!content) return null
  return (
    <div
      dir="auto"
      style={{
        fontSize: 14,
        color: 'var(--color-text-primary)',
        lineHeight: 1.7,
        fontStyle: 'normal',
        fontWeight: 400,
        padding: 'var(--space-2) 0',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        overflowWrap: 'break-word',
      }}
    >
      {content}
    </div>
  )
}
