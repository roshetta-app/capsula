/**
 * NoteCallout.jsx — reusable presentational component for note-style content.
 *
 * Used in two contexts (per Section 2.8):
 *   1. Standalone `note_callout` block (Section 3.4) — rendered by BlockRenderer
 *   2. `row_type: "note"` row inside a `prescription_sheet` block (Section 2.7)
 *
 * Both contexts use this SAME component with the SAME flavor color scheme.
 *
 * Props:
 *   text    string  — markdown-capable note text (required; renders nothing if empty)
 *   flavor  string  — "info" | "warning" | "tip", default "info" (per 3.4)
 *
 * Markdown support matches Section 2.5 (bold, italic, headers, lists, line
 * breaks, RTL auto-detect via dir="auto" + unicode-bidi: plaintext).
 */
import ReactMarkdown from 'react-markdown'
import remarkBreaks from 'remark-breaks'
import Icon from './Icon'

const FLAVORS = {
  info: {
    icon: 'Info',
    background: '#EFF6FF',
    border: '#2563EB',
    iconColor: '#2563EB',
    text: '#1E40AF',
  },
  warning: {
    icon: 'AlertTriangle',
    background: '#FEF2F2',
    border: '#DC2626',
    iconColor: '#DC2626',
    text: '#991B1B',
  },
  tip: {
    icon: 'Lightbulb',
    background: '#FFFBEB',
    border: '#D97706',
    iconColor: '#D97706',
    text: '#78350F',
  },
}

export default function NoteCallout({ text, flavor = 'info' }) {
  if (!text || !text.trim()) return null

  const colors = FLAVORS[flavor] ?? FLAVORS.info

  const components = {
    p: ({ children }) => (
      <p dir="auto" style={{ margin: 0, fontSize: 14, lineHeight: 1.7, color: colors.text, unicodeBidi: 'plaintext' }}>
        {children}
      </p>
    ),
    h1: ({ children }) => (
      <h1 dir="auto" style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 700, color: colors.text, unicodeBidi: 'plaintext' }}>
        {children}
      </h1>
    ),
    h2: ({ children }) => (
      <h2 dir="auto" style={{ margin: '0 0 6px', fontSize: 15, fontWeight: 700, color: colors.text, unicodeBidi: 'plaintext' }}>
        {children}
      </h2>
    ),
    h3: ({ children }) => (
      <h3 dir="auto" style={{ margin: '0 0 6px', fontSize: 14, fontWeight: 700, color: colors.text, unicodeBidi: 'plaintext' }}>
        {children}
      </h3>
    ),
    ul: ({ children }) => (
      <ul style={{ margin: 0, padding: 0, paddingInlineStart: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>
        {children}
      </ul>
    ),
    ol: ({ children }) => (
      <ol style={{ margin: 0, padding: 0, paddingInlineStart: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>
        {children}
      </ol>
    ),
    li: ({ children }) => (
      <li dir="auto" style={{ fontSize: 14, lineHeight: 1.6, color: colors.text, unicodeBidi: 'plaintext' }}>
        {children}
      </li>
    ),
    strong: ({ children }) => <strong style={{ fontWeight: 700 }}>{children}</strong>,
    em: ({ children }) => <em>{children}</em>,
  }

  return (
    <div style={{
      backgroundColor: colors.background,
      borderLeft: `3px solid ${colors.border}`,
      borderRadius: 'var(--radius-lg)',
      padding: 'var(--space-3) var(--space-4)',
      display: 'flex',
      gap: 'var(--space-2)',
      alignItems: 'flex-start',
    }}>
      <Icon name={colors.icon} size={16} color={colors.iconColor} className="flex-shrink-0" />
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <ReactMarkdown remarkPlugins={[remarkBreaks]} components={components}>
          {text}
        </ReactMarkdown>
      </div>
    </div>
  )
}
