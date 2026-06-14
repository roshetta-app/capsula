/**
 * FreeTextPostBlock.jsx — Renderer for `free_text_post` block type.
 *
 * Data shape per Section 3.2:
 *   block.data.markdown: string (may contain markdown syntax and mixed
 *   Arabic/English text)
 *
 * Renders nothing if markdown is empty (per 3.2 spec).
 *
 * Heading hierarchy (Phase 4.1):
 *   ## → section label: 10px, weight 500, uppercase, letter-spacing 0.06em,
 *          color-text-tertiary, margin-top space-5, margin-bottom 6px
 *   ### → sub-label: 11px, weight 500, color-text-secondary,
 *          margin-top space-3, margin-bottom 4px
 *   #   → reserved / fallback: same as ##
 */
import ReactMarkdown from 'react-markdown'
import remarkBreaks from 'remark-breaks'

const bodyText = {
  margin: '0 0 10px',
  fontSize: 14,
  lineHeight: 1.75,
  color: 'var(--color-text-primary)',
  unicodeBidi: 'plaintext',
}

// ## and # — section label
const sectionLabel = {
  margin: 'var(--space-5) 0 6px',
  fontSize: 10,
  fontWeight: 500,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: 'var(--color-text-tertiary)',
  unicodeBidi: 'plaintext',
}

// ### — sub-label
const subLabel = {
  margin: 'var(--space-3) 0 4px',
  fontSize: 11,
  fontWeight: 500,
  color: 'var(--color-text-secondary)',
  unicodeBidi: 'plaintext',
}

const listStyle = {
  margin: '0 0 10px',
  paddingInlineStart: 16,
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
}

const listItemStyle = {
  fontSize: 14,
  lineHeight: 1.6,
  color: 'var(--color-text-primary)',
  unicodeBidi: 'plaintext',
}

const components = {
  p:      ({ children }) => <p      dir="auto" style={bodyText}>{children}</p>,
  h1:     ({ children }) => <h1     dir="auto" style={sectionLabel}>{children}</h1>,
  h2:     ({ children }) => <h2     dir="auto" style={sectionLabel}>{children}</h2>,
  h3:     ({ children }) => <h3     dir="auto" style={subLabel}>{children}</h3>,
  ul:     ({ children }) => <ul     style={listStyle}>{children}</ul>,
  ol:     ({ children }) => <ol     style={listStyle}>{children}</ol>,
  li:     ({ children }) => <li     dir="auto" style={listItemStyle}>{children}</li>,
  strong: ({ children }) => <strong style={{ fontWeight: 700 }}>{children}</strong>,
  em:     ({ children }) => <em>{children}</em>,
}

export default function FreeTextPostBlock({ block }) {
  const markdown = block?.data?.markdown ?? ''
  if (!markdown.trim()) return null

  return (
    <ReactMarkdown remarkPlugins={[remarkBreaks]} components={components}>
      {markdown}
    </ReactMarkdown>
  )
}
