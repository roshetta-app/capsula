/**
 * FreeTextPostBlock.jsx — src/components/conditions/FreeTextPostBlock.jsx
 *
 * Renderer for `free_text_post` block type.
 *
 * Data shape per Section 3.2:
 *   block.data.markdown: string (may contain markdown syntax, ::: directive cards,
 *   and mixed Arabic/English text)
 *   block.data.title: optional plain-text title, shown as a bold line above the
 *   body. Title and body can each be used without the other.
 *
 * Renders nothing if both title and markdown are empty (per 3.2 spec).
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

import { renderTitledMarkdown } from '../../lib/directiveRenderer'

export default function FreeTextPostBlock({ block }) {
  const markdown = block?.data?.markdown ?? ''
  const title = block?.data?.title ?? ''

  if (!markdown.trim() && !title.trim()) return null

  return (
    // 2026-11-11: every text block (Clinical, Rx-level, inside a sheet) uses the
    // same tight look the sheet text rows had (rx-prose-tight in globals.css).
    <div className="rx-prose-tight">
      <div
        dir="auto"
        className="dir-prose"
        dangerouslySetInnerHTML={{ __html: renderTitledMarkdown(title, markdown) }}
      />
    </div>
  )
}
