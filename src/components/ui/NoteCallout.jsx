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
 * Icon changes:
 *   - info:    circle-i  → medical pulse / ECG line (clinical feel)
 *   - tip:     lightbulb → medical cross (first-aid / clinical)
 *   - warning: triangle  → triangle (kept — universally understood)
 *
 * RTL/LTR fix:
 *   - Note text is wrapped in a <div dir="auto"> with display:block so each
 *     paragraph / line resolves its own bidi direction independently.
 *   - The ReactMarkdown <p> renderer becomes a block-level <div dir="auto">
 *     instead of an inline <span> so mixed en/ar/emoji content lays out correctly.
 *
 * Props:
 *   text    string  — markdown-capable note text (required; renders nothing if empty)
 *   flavor  string  — "info" | "warning" | "tip", default "info"
 *   isLast  bool    — when true, suppresses the bottom hairline (used inside PrescriptionSheetBlock)
 */
import ReactMarkdown from 'react-markdown'
import remarkBreaks from 'remark-breaks'

// ─── SVG icon components per flavor ──────────────────────────────────────────

/** Medical cross — replaces the generic lightbulb for "tip" */
function IconTip({ color }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
      style={{ flexShrink: 0, marginTop: 2 }}>
      {/* Plus / cross shape */}
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
      {/* Circle border to make it a medical cross badge */}
      <circle cx="12" cy="12" r="10" strokeWidth="1.8" />
    </svg>
  )
}

/** ECG / pulse line — replaces the generic circle-i for "info" */
function IconInfo({ color }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      style={{ flexShrink: 0, marginTop: 2 }}>
      {/* Heartbeat / ECG trace */}
      <polyline points="2,12 6,12 8,6 10,18 13,9 15,14 17,12 22,12" />
    </svg>
  )
}

/** Warning triangle — unchanged, universally understood */
function IconWarning({ color }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      style={{ flexShrink: 0, marginTop: 2 }}>
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
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

  /**
   * RTL/LTR fix:
   *   Each <p> block from ReactMarkdown becomes a <div dir="auto"> so the browser
   *   resolves bidi direction per paragraph rather than inheriting a single direction
   *   for the whole note. This correctly handles mixed Arabic / English / emoji lines.
   *   unicodeBidi: 'plaintext' ensures each run uses its own base direction.
   */
  const components = {
    p: ({ children }) => (
      <div
        dir="auto"
        style={{
          margin: 0,
          unicodeBidi: 'plaintext',
          lineHeight: 1.6,
        }}
      >
        {children}
      </div>
    ),
    h1: ({ children }) => <div dir="auto" style={{ fontWeight: 700, unicodeBidi: 'plaintext' }}>{children}</div>,
    h2: ({ children }) => <div dir="auto" style={{ fontWeight: 700, unicodeBidi: 'plaintext' }}>{children}</div>,
    h3: ({ children }) => <div dir="auto" style={{ fontWeight: 600, unicodeBidi: 'plaintext' }}>{children}</div>,
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

        {/* Note text — block container, each paragraph resolves its own bidi */}
        <div
          style={{
            flex: 1,
            minWidth: 0,
            fontSize: 13,
            fontWeight: 450,
            fontStyle: 'normal',
            color: 'var(--color-text-secondary)',
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
          }}
        >
          <ReactMarkdown remarkPlugins={[remarkBreaks]} components={components}>
            {text}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  )
}
