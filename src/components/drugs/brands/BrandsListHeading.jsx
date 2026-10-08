/**
 * src/components/drugs/brands/BrandsListHeading.jsx
 *
 * 2026-10-08 (refactor, phase 3): the title above the filters of BrandsList,
 * moved here from BrandsList.jsx. Same look and behaviour.
 *
 *  - Other families page (groupBySubclass): the title is plain text.
 *  - Alternatives: the whole title is a button that opens a Google search for
 *    the family name, a small search icon follows the name.
 *  - Similar: plain text, 'Other <generic> drugs'.
 *
 * Props: headingName, titleIcon, groupBySubclass, isAlternatives, hideOther
 */
import { Search } from 'lucide-react'
import { openInAppBrowser } from '../../../utils/openInAppBrowser'

export default function BrandsListHeading({ headingName, titleIcon = null, groupBySubclass, isAlternatives, hideOther }) {
  if (!headingName) return null
  const headingStyle = {
    fontSize:   18,
    lineHeight: 1.4,
    color:      'var(--color-text-secondary)',
    margin:     '0 0 var(--space-3)',
  }
  const iconNode = titleIcon ? (
    <span aria-hidden="true" style={{ display: 'inline-block', verticalAlign: '-4px', marginRight: 8, lineHeight: 0 }}>
      {titleIcon}
    </span>
  ) : null
  const nameNode = <strong style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>{headingName}</strong>

  // Opens the Google search for the subclass (Alternatives title, whole title
  // is the button): same opening method as SharedDrugCard.jsx's image-search
  // icon, but a plain web search.
  function searchSubclass() {
    openInAppBrowser(`https://www.google.com/search?q=${encodeURIComponent(headingName)}`)
  }

  if (groupBySubclass) {
    return <p style={headingStyle}>{iconNode}{nameNode}</p>
  }
  if (isAlternatives) {
    return (
      <button
        onClick={searchSubclass}
        aria-label={`Search Google for ${headingName}`}
        style={{
          ...headingStyle,
          display:    'block',
          maxWidth:   '100%',
          padding:    0,
          border:     'none',
          background: 'none',
          textAlign:  'left',
          fontFamily: 'var(--font-body)',
          cursor:     'pointer',
          WebkitTapHighlightColor: 'transparent',
          outline:    'none',
        }}
      >
        {iconNode}{hideOther ? null : 'Other '}{nameNode}
        <Search
          size={11}
          strokeWidth={2.2}
          color="var(--color-accent)"
          aria-hidden="true"
          style={{ display: 'inline-block', marginLeft: 3, verticalAlign: 'top' }}
        />
        {' '}drugs
      </button>
    )
  }
  return (
    <p style={headingStyle}>
      {iconNode}{hideOther ? null : 'Other '}{nameNode} drugs
    </p>
  )
}
