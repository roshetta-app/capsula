/**
 * NoteCallout.jsx — reusable presentational component for note-style content.
 *
 * Used in two contexts:
 *   1. Standalone `note_callout` block — rendered by BlockRenderer
 *      → uses variant='divider': icon on its own row above the text, lighter bg
 *   2. Inline note row inside a PrescriptionSheetBlock sheet
 *      → uses variant='inline' (default): icon + text side-by-side, current behavior
 *
 * Props:
 *   text     string  — markdown-capable note text (required; renders nothing if empty)
 *   flavor   string  — 'info' | 'warning' | 'tip', default 'info'
 *   variant  string  — 'inline' (default) | 'divider'
 *   isLast   bool    — accepted but unused; kept so callers don't need updating
 *
 * Icon legend:
 *   - info:    ECG / pulse line (clinical feel)
 *   - tip:     medical cross badge (first-aid / clinical)
 *   - warning: triangle (universally understood, unchanged)
 */
import ReactMarkdown from 'react-markdown'
import remarkBreaks from 'remark-breaks'

// ─── SVG icon components per flavor ──────────────────────────────────────────

/** Medical cross — replaces the generic lightbulb for 'tip' */
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

/** ECG / pulse line — replaces the generic circle-i for 'info' */
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

// Matches Arabic + Arabic Supplement Unicode blocks — used to detect
// Arabic-leading text so the icon side can follow text direction.
const ARABIC_RE = /[\u0600-\u06FF\u0750-\u077F]/

export default function NoteCallout({ text, flavor = 'info', variant = 'inline', isLast = false }) {
  if (!text || !text.trim()) return null

  const f = FLAVORS[flavor] ?? FLAVORS.info
  const { Icon } = f

  // Direction is resolved from the first strong character so the icon's
  // flex order flips for Arabic-leading notes: icon on the RIGHT for
  // Arabic, LEFT for English (previously always left, ignoring direction).
  const isArabic = ARABIC_RE.test(text.trim().charAt(0))
  const direction = isArabic ? 'rtl' : 'ltr'

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

  const textContent = (
    <div
      style={{
        flex: 1,
        minWidth: 0,
        fontSize: 14,
        fontWeight: 600,
        fontStyle: 'normal',
        color: 'var(--color-text-primary)',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
      }}
    >
      <ReactMarkdown remarkPlugins={[remarkBreaks]} components={components}>
        {text}
      </ReactMarkdown>
    </div>
  )

  // ── variant='divider': icon on its own row above text, lighter bg ─────────
  if (variant === 'divider') {
    return (
      <div style={{
        background: 'var(--color-surface-muted)',
        borderRadius: 'var(--radius-md)',
        padding: '10px 12px',
      }}>
        {/* Icon row — sits above the text block */}
        <div style={{ marginBottom: 6 }}>
          <Icon color={f.colorLight} />
        </div>
        {textContent}
      </div>
    )
  }

  // ── variant='inline' (default): icon + text side-by-side ─────────────────
  return (
    <div style={{
      background: 'var(--color-note-bg)',
      borderRadius: 'var(--radius-md)',
      padding: '10px 12px',
    }}>
      <div
        dir={direction}
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: 8,
        }}
      >
        {/* SVG icon — color-coded per flavor; side follows text direction */}
        <Icon color={f.colorLight} />

        {/* Note text — block container, each paragraph resolves its own bidi.
            Color bumped to text-primary (black) and weight/size increased
            for legibility — was text-secondary (grey) at 13px/450. */}
        {textContent}
      </div>
    </div>
  )
}
