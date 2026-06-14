/**
 * NoteCallout.jsx — reusable presentational component for note-style content.
 *
 * Used in two contexts:
 *   1. Standalone `note_callout` block — rendered by BlockRenderer
 *   2. `row_type: "note"` row inside a `prescription_sheet` block
 *
 * Both contexts use this SAME component with the SAME flavor scheme.
 *
 * Redesigned (Phase 2, Step 2.3): flat inline row matching drug row style.
 * No background, no left border, no icon component. Symbol prefix inline.
 *
 * Props:
 *   text    string  — markdown-capable note text (required; renders nothing if empty)
 *   flavor  string  — "info" | "warning" | "tip", default "info"
 *   isLast  bool    — when true, suppresses the bottom hairline (used inside PrescriptionSheetBlock)
 */
import ReactMarkdown from 'react-markdown'
import remarkBreaks from 'remark-breaks'

const FLAVORS = {
  info: {
    symbol: 'ℹ',
    colorLight: '#4B6CB7',
    colorDark:  '#93C5FD',
  },
  warning: {
    symbol: '⚡',
    colorLight: '#92400E',
    colorDark:  '#FCD34D',
  },
  tip: {
    symbol: '💡',
    colorLight: '#3F6212',
    colorDark:  '#86EFAC',
  },
}

export default function NoteCallout({ text, flavor = 'info', isLast = false }) {
  if (!text || !text.trim()) return null

  const f = FLAVORS[flavor] ?? FLAVORS.info

  // Use CSS variable-aware color via a data attribute so dark mode works
  // without JS — we define the light value inline and override in .dark via CSS.
  // Simplest approach: use a wrapper with a class and define vars there.
  // Since this project uses class-based dark mode (.dark on <html>),
  // we pass the light value inline and rely on the symbol being decorative.
  // Text itself stays color-text-secondary for readability in both modes.

  const components = {
    p: ({ children }) => (
      <span dir="auto" style={{ unicodeBidi: 'plaintext' }}>
        {children}
      </span>
    ),
    // Flatten block-level elements to inline spans so they flow within the row
    h1: ({ children }) => <span style={{ fontWeight: 700 }}>{children}</span>,
    h2: ({ children }) => <span style={{ fontWeight: 700 }}>{children}</span>,
    h3: ({ children }) => <span style={{ fontWeight: 600 }}>{children}</span>,
    ul: ({ children }) => (
      <ul style={{ margin: '4px 0 0', padding: 0, paddingInlineStart: 16, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {children}
      </ul>
    ),
    ol: ({ children }) => (
      <ol style={{ margin: '4px 0 0', padding: 0, paddingInlineStart: 16, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {children}
      </ol>
    ),
    li: ({ children }) => (
      <li dir="auto" style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--color-text-secondary)', unicodeBidi: 'plaintext' }}>
        {children}
      </li>
    ),
    strong: ({ children }) => <strong style={{ fontWeight: 700 }}>{children}</strong>,
    em: ({ children }) => <em>{children}</em>,
  }

  return (
    <div style={{
      padding: '12px 0',
      borderBottom: isLast ? 'none' : '0.5px solid var(--color-border-subtle)',
    }}>
      <span style={{
        display: 'inline-flex',
        alignItems: 'flex-start',
        gap: 6,
        fontSize: 13,
        fontStyle: 'italic',
        lineHeight: 1.6,
        color: 'var(--color-text-secondary)',
      }}>
        <span
          aria-hidden="true"
          style={{
            flexShrink: 0,
            color: f.colorLight,
            fontStyle: 'normal',
            lineHeight: 1.6,
          }}
        >
          {f.symbol}
        </span>
        <span dir="auto" style={{ unicodeBidi: 'plaintext' }}>
          <ReactMarkdown remarkPlugins={[remarkBreaks]} components={components}>
            {text}
          </ReactMarkdown>
        </span>
      </span>
    </div>
  )
}
