/**
 * FreeTextPostBlock.jsx — src/components/conditions/FreeTextPostBlock.jsx
 *
 * Renderer for `free_text_post` block type.
 *
 * Data shape per Section 3.2:
 *   block.data.markdown: string (may contain markdown syntax, ::: directive cards,
 *   and mixed Arabic/English text)
 *
 * Renders nothing if markdown is empty (per 3.2 spec).
 *
 * Heading hierarchy (Phase 4.1) — preserved exactly:
 *   ## → section label: rendered via .dir-prose h2 styles in globals.css
 *   ### → sub-label: rendered via .dir-prose h3 styles in globals.css
 *
 * Directive cards (Phase 5 redesign — 8 types):
 *   :::type [Optional Title]\n content \n::: blocks render as styled clinical cards.
 *   Card CSS lives in globals.css under the .dir-card-* classes.
 *   Active types: danger, warning, redflags, contraindications, dose, criteria, tip, pearls
 *
 * Fix (Phase 5 redesign):
 *   Uses dangerouslySetInnerHTML instead of ref+useEffect to avoid first-mount
 *   render failure when markdown content is already present on open.
 */

import { renderDirectiveMarkdown } from '../../lib/directiveRenderer'

export default function FreeTextPostBlock({ block }) {
  const markdown = block?.data?.markdown ?? ''

  if (!markdown.trim()) return null

  return (
    <div
      dir="auto"
      className="dir-prose"
      dangerouslySetInnerHTML={{ __html: renderDirectiveMarkdown(markdown) }}
    />
  )
}
