/**
 * FreeTextPostBlock.jsx — Renderer for `free_text_post` block type.
 *
 * Data shape per Section 3.2:
 *   block.data.markdown: string (may contain markdown syntax and mixed
 *   Arabic/English text)
 *
 * Renders nothing if markdown is empty (per 3.2 spec — empty string is
 * valid but does not count toward "has content").
 *
 * Markdown support (per Section 2.5): bold, italic, headers (#/##/###),
 * unordered/ordered lists, line breaks, RTL (Arabic) auto-detected per
 * element via dir="auto" + unicode-bidi: plaintext.
 */
import ReactMarkdown from 'react-markdown'
import remarkBreaks from 'remark-breaks'

const textStyle = {
  margin: '0 0 10px',
  fontSize: 14,
  lineHeight: 1.75,
  color: 'var(--color-text-primary)',
  unicodeBidi: 'plaintext',
}

const headingStyle = {
  margin: '0 0 8px',
  fontWeight: 700,
  color: 'var(--color-text-primary)',
  unicodeBidi: 'plaintext',
}

const listStyle = {
  margin: '0 0 10px',
  paddingInlineStart: 20,
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
  p: ({ children }) => <p dir="auto" style={textStyle}>{children}</p>,
  h1: ({ children }) => <h1 dir="auto" style={{ ...headingStyle, fontSize: 20 }}>{children}</h1>,
  h2: ({ children }) => <h2 dir="auto" style={{ ...headingStyle, fontSize: 17 }}>{children}</h2>,
  h3: ({ children }) => <h3 dir="auto" style={{ ...headingStyle, fontSize: 15 }}>{children}</h3>,
  ul: ({ children }) => <ul style={listStyle}>{children}</ul>,
  ol: ({ children }) => <ol style={listStyle}>{children}</ol>,
  li: ({ children }) => <li dir="auto" style={listItemStyle}>{children}</li>,
  strong: ({ children }) => <strong style={{ fontWeight: 700 }}>{children}</strong>,
  em: ({ children }) => <em>{children}</em>,
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
