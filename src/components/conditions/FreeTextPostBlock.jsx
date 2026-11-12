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
 * Drug and class links (2026-11-12): links saved as capsula:drug/..., capsula:class/... or
 *   capsula:family/... open the drug page or the class sheet (see lib/textLinks.js).
 *
 * Fix (Phase 5 redesign):
 *   Uses dangerouslySetInnerHTML instead of ref+useEffect to avoid first-mount
 *   render failure when markdown content is already present on open.
 */

import { useContext, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { renderTitledMarkdown } from '../../lib/directiveRenderer'
import { resolveTextLinks, fixDrugLinkNames, parseTextLink } from '../../lib/textLinks'
import { PreviewModeContext } from '../../context/PreviewModeContext'
import { useDrugContext } from '../../context/DrugContext'
import ClassSheet from '../drugs/classes/ClassSheet'
import { titleCaseWords } from '../../utils/classSearch'

export default function FreeTextPostBlock({ block }) {
  const markdown = block?.data?.markdown ?? ''
  const title = block?.data?.title ?? ''

  // Drug links and class links (2026-11-12, plan step 4). A link whose drug, class or
  // family is gone (unpublished, renamed) shows as plain text. In the CMS phone preview
  // a tap must not leave the editor.
  const realNavigate = useNavigate()
  const inPreview = useContext(PreviewModeContext)
  const { drugs, loading } = useDrugContext()
  const [classTarget, setClassTarget] = useState(null)   // { className, familyName }
  const [classOpen, setClassOpen] = useState(false)

  const html = useMemo(() => {
    const raw = renderTitledMarkdown(title, markdown)
    return fixDrugLinkNames(resolveTextLinks(raw, drugs, !(loading && (drugs ?? []).length === 0)))
  }, [title, markdown, drugs, loading])

  const classDrugs = useMemo(
    () => (classTarget ? (drugs ?? []).filter(d => d.class === classTarget.className) : []),
    [drugs, classTarget],
  )

  if (!markdown.trim() && !title.trim()) return null

  function handleClick(e) {
    const a = e.target.closest?.('a[href^="capsula:"]')
    if (!a) return
    e.preventDefault()
    if (inPreview) return
    const link = parseTextLink(a.getAttribute('href'))
    if (!link) return
    if (link.kind === 'drug') {
      realNavigate(`/drugs/${link.slug}`)
      return
    }
    if (link.kind === 'generic') {
      realNavigate(`/drugs/generic/${link.slug}`)
      return
    }
    setClassTarget({ className: link.className, familyName: link.kind === 'family' ? link.familyName : null })
    setClassOpen(true)
  }

  return (
    // 2026-11-11: every text block (Clinical, Rx-level, inside a sheet) uses the
    // same tight look the sheet text rows had (rx-prose-tight in globals.css).
    <div className="rx-prose-tight">
      <div
        dir="auto"
        className="dir-prose"
        onClick={handleClick}
        dangerouslySetInnerHTML={{ __html: html }}
      />
      {classTarget && (
        <ClassSheet
          isOpen={classOpen}
          onClose={() => setClassOpen(false)}
          classLabel={titleCaseWords(classTarget.className)}
          classDrugs={classDrugs}
          currentDrug={null}
          onSelectBrand={d => { setClassOpen(false); realNavigate(`/drugs/${d.slug || d.id}`) }}
          directSubclass={classTarget.familyName}
        />
      )}
    </div>
  )
}
