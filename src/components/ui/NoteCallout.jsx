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
 * No background, no left border. SVG icon prefix inline.
 *
 * Changes (design pass):
 *   - Replaced unicode/emoji symbols with clean SVG icons
 *   - Removed italic — note text is now upright and clearly readable
 *   - Slightly boosted font size to 13.5px and weight to 450 for legibility
 *   - Icon sits at top-aligned with first line of text
 *
 * Props:
 *   text    string  — markdown-capable note text (required; renders nothing if empty)
 *   flavor  string  — "info" | "warning" | "tip", default "info"
 *   isLast  bool    — when true, suppresses the bottom hairline (used inside PrescriptionSheetBlock)
 */
import ReactMarkdown from 'react-markdown'
import remarkBreaks from 'remark-breaks'

// ─── SVG icon components per flavor ──────────────────────────────────────────

function IconInfo({ color }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      style={{ flexShrink: 0, marginTop: 1 }}>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  )
}

function IconWarning({ color }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      style={{ flexShrink: 0, marginTop: 1 }}>
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
}

function IconTip({ color }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      style={{ flexShrink: 0, marginTop: 1 }}>
      <line x1="12" y1="2" x2="12" y2="6" />
      <line x1="12" y1="18" x2="12" y2="22" />
      <line x1="4.93" y1="4.93" x2="7.76" y2="7.76" />
      <line x1="16.24" y1="16.24" x2="19.07" y2="19.07" />
      <line x1="2" y1="12" x2="6" y2="12" />
      <line x1="18" y1="12" x2="22" y2="12" />
      <line x1="4.93" y1="19.07" x2="7.76" y2="16.24" />
      <line x1="16.24" y1="7.76" x2="19.07" y2="4.93" />
    </svg>
  )
}

const FLAVORS = {
  info: {
    colorLight: '#4B6CB7',
    colorDark:  '#93C5FD',
    Icon: IconInfo,
  },
  warning: {
    colorLight: '#92400E',
    colorDark:  '#FCD34D',
    Icon: IconWarning,
  },
  tip: {
    colorLight: '#3F6212',
    colorDark:  '#86EFAC',
    Icon: IconTip,
  },
}

export default function NoteCallout({ text, flavor = 'info', isLast = false }) {
  if (!text || !text.trim()) return null

  const f = FLAVORS[flavor] ?? FLAVORS.info
  const { Icon } = f

  const components = {
    p: ({ children }) => (
      <span dir="auto" style={{ unicodeBidi: 'plaintext' }}>
        {children}
      </span>
    ),
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
      padding: '10px 0',
      borderBottom: isLast ? 'none' : '0.5px solid var(--color-border-subtle)',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 8,
      }}>
        {/* SVG icon — color-coded per flavor */}
        <Icon color={f.colorLight} />

        {/* Note text — upright, readable, not italic */}
        <span
          dir="auto"
          style={{
            fontSize: 13,
            fontWeight: 450,
            fontStyle: 'normal',
            lineHeight: 1.6,
            color: 'var(--color-text-secondary)',
            unicodeBidi: 'plaintext',
          }}
        >
          <ReactMarkdown remarkPlugins={[remarkBreaks]} components={components}>
            {text}
          </ReactMarkdown>
        </span>
      </div>
    </div>
  )
}
