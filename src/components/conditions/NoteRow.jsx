/**
 * NoteRow — clinical note prescription item.
 * Left accent border + light background tint.
 *
 * Props:
 *   content  string
 */
export default function NoteRow({ content }) {
  if (!content) return null
  return (
    <div
      dir="auto"
      style={{
        fontSize: 13,
        color: 'var(--color-text-secondary)',
        lineHeight: 1.6,
        borderLeft: '3px solid var(--color-accent)',
        backgroundColor: 'var(--color-accent-light)',
        borderRadius: '0 var(--radius-sm) var(--radius-sm) 0',
        padding: 'var(--space-2) var(--space-3)',
        margin: 'var(--space-1) 0',
      }}
    >
      {content}
    </div>
  )
}
