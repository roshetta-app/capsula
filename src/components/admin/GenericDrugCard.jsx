/**
 * src/components/admin/GenericDrugCard.jsx
 * 2026-11-10 (CMS drug library search, same look as the app's Drugs search): the row for ONE
 * generic in the Drug Library list. It is the generic twin of SharedDrugCard (which draws one
 * brand per row): same flat row, same fixed height, same category badge on the left, same
 * title and second line, same hairline divider and chevron. The title is the generic name,
 * the second line is the category, the number of formulations and the last update date.
 * A draft generic is dimmed and carries a small Draft tag. Admin buttons (Live / Draft,
 * edit, delete) come in through 'trailing', exactly like the brand rows.
 *
 * Props:
 *   generic     { id, name_en, category, is_published, updated_at, formulationCount }
 *   categories  Category[] from useCategories()
 *   isDark      boolean from useIsDark()
 *   onTap       () => void  opens the generic's editor
 *   isLast      boolean     hides the divider under the last row
 *   highlight   string      the typed search text, bolded inside the name
 *   trailing    ReactNode   the admin buttons
 */

import { useState } from 'react'
import { SpecialtyIcon } from '../../utils/specialtyIcon'
import { resolveToken, FALLBACK_TOKEN } from '../../utils/specialtyTokens'
import { highlightMatch } from '../../utils/highlightMatch'
import { toTitleCase } from '../../utils/drugTitleFormat'

const ROW_HEIGHT = 64 // same as SharedDrugCard

function formatDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })
}

export default function GenericDrugCard({
  generic,
  categories,
  isDark,
  onTap,
  isLast = false,
  trailing = null,
  highlight = '',
}) {
  const [pressed, setPressed] = useState(false)

  const matchedCategory = categories.find(c => c.slug === generic.category)
  const iconType  = matchedCategory?.icon_type || 'lucide'
  const iconValue = iconType === 'custom'
    ? (matchedCategory?.icon_url  || '')
    : (matchedCategory?.icon_name || 'Pill')
  const categoryColors = resolveToken(matchedCategory?.color_token || FALLBACK_TOKEN, isDark)

  const published = generic.is_published
  const titleSegments = highlightMatch(toTitleCase(generic.name_en || ''), highlight)

  const formsCount = generic.formulationCount ?? 0
  const metaParts = [
    matchedCategory?.name_en || generic.category || null,
    `${formsCount} ${formsCount === 1 ? 'form' : 'forms'}`,
    formatDate(generic.updated_at) || null,
  ].filter(Boolean)

  return (
    <div
      onClick={onTap}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onTap()}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      onPointerCancel={() => setPressed(false)}
      style={{
        display:                 'flex',
        alignItems:              'center',
        height:                  ROW_HEIGHT,
        gap:                     'var(--space-3)',
        borderBottom:            isLast ? 'none' : '1px solid var(--color-border-subtle)',
        cursor:                  'pointer',
        outline:                 'none',
        WebkitTapHighlightColor: 'transparent',
        backgroundColor:         pressed ? 'var(--color-surface-muted)' : 'transparent',
        transform:               pressed ? 'scale(0.99)' : 'scale(1)',
        transition:              'background-color var(--motion-fast) var(--ease-settle), transform var(--motion-fast) var(--ease-settle)',
      }}
    >
      {/* Left: category badge, same as the brand rows */}
      <div style={{
        width:           36,
        height:          36,
        flexShrink:      0,
        borderRadius:    'var(--radius-md)',
        backgroundColor: categoryColors.bg,
        display:         'flex',
        alignItems:      'center',
        justifyContent:  'center',
        opacity:         published ? 1 : 0.6,
      }}>
        <SpecialtyIcon iconType={iconType} iconValue={iconValue} size={19} color={categoryColors.fg} />
      </div>

      {/* Middle: generic name, then category, forms and date */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', minWidth: 0 }}>
          <span
            title={generic.name_en}
            style={{
              fontSize:     15,
              fontWeight:   500,
              color:        published ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
              lineHeight:   1.3,
              overflow:     'hidden',
              whiteSpace:   'nowrap',
              textOverflow: 'ellipsis',
              minWidth:     0,
            }}
          >
            {titleSegments.map((seg, i) =>
              seg.bold
                ? <strong key={i} style={{ fontWeight: 800 }}>{seg.text}</strong>
                : <span key={i}>{seg.text}</span>
            )}
          </span>
          {!published && (
            <span style={{
              flexShrink: 0, fontSize: 10, fontWeight: 600, letterSpacing: '0.04em',
              textTransform: 'uppercase', padding: '1px 6px', borderRadius: 'var(--radius-full)',
              color: 'var(--color-text-tertiary)', backgroundColor: 'var(--color-bg)',
              border: '1px solid var(--color-border)',
            }}>
              Draft
            </span>
          )}
        </div>
        <div style={{
          fontSize:     13,
          fontWeight:   500,
          color:        'var(--color-generic-text)',
          opacity:      0.85,
          lineHeight:   1.4,
          marginTop:    2,
          overflow:     'hidden',
          whiteSpace:   'nowrap',
          textOverflow: 'ellipsis',
        }}>
          {metaParts.join(' · ')}
        </div>
      </div>

      {/* Right: admin buttons, then the chevron */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)', flexShrink: 0 }}>
        {trailing}
        <svg
          className="cms-hide-phone"
          width="12" height="12" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" strokeWidth="2.5"
          strokeLinecap="round" strokeLinejoin="round"
          style={{ color: 'var(--color-text-tertiary)', opacity: 0.5, flexShrink: 0 }}
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </div>
    </div>
  )
}
