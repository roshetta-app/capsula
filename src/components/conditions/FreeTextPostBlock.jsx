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
 *   ## → section label: 10px, weight 500, uppercase, letter-spacing 0.06em,
 *          color-text-tertiary, margin-top space-5, margin-bottom 6px
 *   ### → sub-label: 11px, weight 500, color-text-secondary,
 *          margin-top space-3, margin-bottom 4px
 *   #   → reserved / fallback: same as ##
 *
 * Directive cards (Phase 5):
 *   :::type [Optional Title]\n content \n::: blocks render as styled clinical cards.
 *   Card CSS lives in globals.css under the .dir-card-* classes.
 */

import { useEffect, useRef } from 'react'
import { renderDirectiveMarkdown } from '../../lib/directiveRenderer'

export default function FreeTextPostBlock({ block }) {
  const markdown = block?.data?.markdown ?? ''
  const ref = useRef(null)

  useEffect(() => {
    if (!ref.current) return
    ref.current.innerHTML = renderDirectiveMarkdown(markdown)
  }, [markdown])

  if (!markdown.trim()) return null

  return (
    <div
      ref={ref}
      dir="auto"
      className="dir-prose"
    />
  )
}
