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
        color: 'var(--color-text-secondary)',
        lineHeight: 1.6,
        fontStyle: 'italic',
        padding: 'var(--space-2) 0',
      }}
    >
      {content}
    </div>
  )
}
