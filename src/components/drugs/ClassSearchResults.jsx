/**
 * src/components/drugs/ClassSearchResults.jsx
 * Class search mode (CLASS_SEARCH_MODE_PLAN.md, 2026-10-04).
 *
 * 2026-10-04 (Families wording): everything the person reads that said
 * 'subclass' now says 'drug family' / 'drug families' (the group title, the
 * card tag, the counts, 'Show all'). Names in the code are unchanged.
 *
 * The result list of the Drugs screen in Class mode: cards for the classes and
 * subclasses whose names match what was typed. Drug names are never searched
 * in this mode, and the cards never list drugs, only what they are.
 *
 * Class card:    kicker 'Class', the class name, '<n> subclasses' (or 'No
 *                subclasses') underneath, the brand count and a chevron.
 *                Tapping it opens the class sheet on its subclass list (the
 *                screen opens the sheet; a class with no subclasses opens
 *                straight on its drugs, decided by the screen from the
 *                'subclassCount' of the card).
 * Subclass card: kicker 'Subclass', the subclass name, 'in <class name>'
 *                underneath, the brand count of that class only and a chevron.
 *                Tapping it opens the drugs of that subclass in that class.
 *
 * Nothing is merged: a subclass that exists under several classes shows one
 * card per class, each naming its class. Classes come before subclasses; the
 * order inside each group is decided by classSearch.js. A broad search shows
 * the first 5 classes and the first 8 subclasses, each group followed by a
 * 'Show all N' row.
 *
 * Props:
 *   results         { classes, subclasses } from useDrugSearch (Class mode)
 *   query           string: the typed text, only used for the count line
 *   onOpenClass     (className) => void
 *   onOpenSubclass  (className, subclassName) => void
 *
 * The screen gives this component a key that changes with the typed text, so
 * a new search always starts with the groups collapsed.
 */

import { useState } from 'react'
import { ChevronDown, ChevronRight, Layers } from 'lucide-react'
import { CountTag } from './BrandsList.jsx'
import { MoleculeIcon } from './sections/ClassBottomSheet.jsx'
import { titleCaseWords } from '../../utils/classSearch'

// How many cards each group shows before its 'Show all' row.
const CLASS_LIMIT    = 5
const SUBCLASS_LIMIT = 8

const ICON_TILE = 34

// One tappable card. Same look as the subclass cards in the class sheet, with
// a small kicker above the name so a class and a subclass are told apart.
function ResultCard({ kicker, name, detail, count, Icon, onClick }) {
  const [pressed, setPressed] = useState(false)
  return (
    <button
      onClick={onClick}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      onPointerCancel={() => setPressed(false)}
      style={{
        display:         'flex',
        alignItems:      'center',
        gap:             10,
        width:           '100%',
        boxSizing:       'border-box',
        flexShrink:      0,
        minHeight:       64,
        padding:         '12px 16px',
        border:          'none',
        borderRadius:    16,
        backgroundColor: 'var(--color-surface-muted)',
        opacity:         pressed ? 0.8 : 1,
        transform:       pressed ? 'scale(0.985)' : 'scale(1)',
        transition:      'opacity var(--motion-fast) var(--ease-settle), transform var(--motion-fast) var(--ease-settle)',
        fontFamily:      'var(--font-body)',
        textAlign:       'left',
        cursor:          'pointer',
        WebkitTapHighlightColor: 'transparent',
        outline:         'none',
      }}
    >
      <span style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 12 }}>
        <span
          aria-hidden="true"
          style={{
            width:           ICON_TILE,
            height:          ICON_TILE,
            borderRadius:    10,
            backgroundColor: 'var(--color-accent-light)',
            display:         'flex',
            alignItems:      'center',
            justifyContent:  'center',
            flexShrink:      0,
          }}
        >
          <Icon size={17} strokeWidth={1.9} color="var(--color-accent)" />
        </span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{
            display:       'block',
            fontSize:      10.5,
            fontWeight:    600,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color:         'var(--color-accent)',
          }}>
            {kicker}
          </span>
          <span style={{
            display:    'block',
            marginTop:  1,
            fontSize:   15,
            fontWeight: 500,
            lineHeight: 1.3,
            color:      'var(--color-text-primary)',
          }}>
            {name}
          </span>
          <span style={{
            display:    'block',
            marginTop:  2,
            fontSize:   12.5,
            lineHeight: 1.3,
            color:      'var(--color-text-secondary)',
          }}>
            {detail}
          </span>
        </span>
      </span>
      <CountTag
        style={{ minWidth: 20, height: 18, padding: '0 5px', borderRadius: 6, fontSize: 11 }}
      >
        <span aria-label={`${count} ${count === 1 ? 'drug' : 'drugs'}`}>{count}</span>
      </CountTag>
      <ChevronRight
        aria-hidden="true"
        size={16}
        strokeWidth={2}
        color="var(--color-text-tertiary)"
        style={{ flexShrink: 0 }}
      />
    </button>
  )
}

// The 'Show all N ...' row under a group that was cut short.
function ShowAllRow({ label, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        display:         'flex',
        alignItems:      'center',
        justifyContent:  'center',
        gap:             4,
        width:           '100%',
        boxSizing:       'border-box',
        flexShrink:      0,
        minHeight:       44,
        padding:         '10px 16px',
        border:          'none',
        borderRadius:    14,
        backgroundColor: 'transparent',
        fontFamily:      'var(--font-body)',
        fontSize:        13.5,
        fontWeight:      600,
        color:           'var(--color-accent)',
        cursor:          'pointer',
        WebkitTapHighlightColor: 'transparent',
        outline:         'none',
      }}
    >
      {label}
      <ChevronDown size={16} strokeWidth={2} aria-hidden="true" />
    </button>
  )
}

// Small grey label above a group of cards.
function GroupLabel({ children }) {
  return (
    <div style={{
      margin:             'var(--space-3) 2px var(--space-2)',
      fontSize:           12,
      fontWeight:         600,
      fontVariantNumeric: 'tabular-nums',
      color:              'var(--color-text-tertiary)',
    }}>
      {children}
    </div>
  )
}

export default function ClassSearchResults({ results, query = '', onOpenClass, onOpenSubclass }) {
  const [showAllClasses,    setShowAllClasses]    = useState(false)
  const [showAllSubclasses, setShowAllSubclasses] = useState(false)

  const classes    = results?.classes    ?? []
  const subclasses = results?.subclasses ?? []

  const shownClasses    = showAllClasses    ? classes    : classes.slice(0, CLASS_LIMIT)
  const shownSubclasses = showAllSubclasses ? subclasses : subclasses.slice(0, SUBCLASS_LIMIT)

  const parts = []
  if (classes.length > 0)    parts.push(`${classes.length} ${classes.length === 1 ? 'class' : 'classes'}`)
  if (subclasses.length > 0) parts.push(`${subclasses.length} ${subclasses.length === 1 ? 'drug family' : 'drug families'}`)

  return (
    <div>
      <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginBottom: 'var(--space-2)' }}>
        {parts.join(' and ')}
        {query && ` for "${query}"`}
      </div>

      {classes.length > 0 && (
        <>
          {subclasses.length > 0 && <GroupLabel>Classes</GroupLabel>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {shownClasses.map(c => (
              <ResultCard
                key={`class:${c.name}`}
                kicker="Class"
                name={titleCaseWords(c.name)}
                detail={
                  c.subclassCount === 0
                    ? 'No drug families'
                    : `${c.subclassCount} ${c.subclassCount === 1 ? 'drug family' : 'drug families'}`
                }
                count={c.brandCount}
                Icon={Layers}
                onClick={() => onOpenClass(c.name)}
              />
            ))}
            {!showAllClasses && classes.length > CLASS_LIMIT && (
              <ShowAllRow
                label={`Show all ${classes.length} classes`}
                onClick={() => setShowAllClasses(true)}
              />
            )}
          </div>
        </>
      )}

      {subclasses.length > 0 && (
        <>
          {classes.length > 0 && <GroupLabel>Drug families</GroupLabel>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {shownSubclasses.map(s => (
              <ResultCard
                key={`sub:${s.className}\u0000${s.name}`}
                kicker="Family"
                name={titleCaseWords(s.name)}
                detail={`in ${titleCaseWords(s.className)}`}
                count={s.brandCount}
                Icon={MoleculeIcon}
                onClick={() => onOpenSubclass(s.className, s.name)}
              />
            ))}
            {!showAllSubclasses && subclasses.length > SUBCLASS_LIMIT && (
              <ShowAllRow
                label={`Show all ${subclasses.length} drug families`}
                onClick={() => setShowAllSubclasses(true)}
              />
            )}
          </div>
        </>
      )}
    </div>
  )
}
