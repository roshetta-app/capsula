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
 * Class card:    kicker 'Class', the class name, '<n> drug families' underneath
 *                (nothing at all for a class with none), the brand count and a
 *                chevron.
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
 * 2026-10-04 (long names): a long class name wraps onto more lines inside its
 * own space (even a single very long word breaks), and the count and the
 * chevron never shrink or get covered. A class with no drug families no longer
 * shows a 'No drug families' line. Names with slashes between words get a
 * space on each side of the slash (display only) so they break between words.
 *
 * 2026-10-04 (plain cards): the cards no longer carry the small 'Class' /
 * 'Family' label above the name, and the class card no longer shows the
 * '<n> drug families' line. A card is now its icon, its name, the brand count
 * and a chevron (a family card still shows 'in <class name>' underneath, to
 * tell apart a family that sits under several classes). The group titles,
 * the count line and the 'Show all' rows are unchanged.
 *
 * 2026-10-04 (highlight): the typed text is shown bold inside each card name,
 * the same way the drug cards do it (highlightMatch, weight 800). Nothing is
 * bolded for a single letter or an empty search.
 *
 * Props:
 *   results         { classes, subclasses } from useDrugSearch (Class mode)
 *   query           string: the typed text, used for the count line and to bold
 *                   the matching part of each card name (same bolding as drug cards)
 *   onOpenClass     (className) => void
 *   onOpenSubclass  (className, subclassName) => void
 *   startExpanded   boolean (default false): show every class from the start,
 *                   with no 'Show all' row. The Drugs home 'Browse by class'
 *                   view uses this to list all classes.
 *   hideKicker      boolean (default false): leave off the small 'Class' label
 *                   above each class name. The 'Browse by class' view uses
 *                   this, since the whole list is classes.
 *   countTrailing   node (optional): drawn at the right end of the count line
 *                   ('42 classes'). The Browse area puts its sort button here.
 *
 * The screen gives this component a key that changes with the typed text, so
 * a new search always starts with the groups collapsed.
 */

import { useState } from 'react'
import { ChevronDown, ChevronRight, Layers } from 'lucide-react'
import CountTag from '../ui/CountTag.jsx'
import { MoleculeIcon } from './sections/ClassBottomSheet.jsx'
import { titleCaseWords } from '../../utils/classSearch'
import { highlightMatch } from '../../utils/highlightMatch'

// Some names are stored with words joined by a slash and no spaces
// ('Alpha/Beta blocker'), which has no place to break, so a long one was cut in
// the middle of a word. Only for display: a space is put on both sides of each
// slash so every word stands alone and the line breaks between words. The
// stored name is not changed and is still what gets passed on when a card is
// tapped.
function spaceSlashes(text) {
  return (text ?? '').replace(/\s*\/\s*/g, ' / ')
}

// How many cards each group shows before its 'Show all' row.
const CLASS_LIMIT    = 5
const SUBCLASS_LIMIT = 8

const ICON_TILE = 34

// One tappable card. Same look as the subclass cards in the class sheet, with
// a small kicker above the name so a class and a subclass are told apart.
function ResultCard({ kicker, name, detail, count, Icon, onClick, highlight = '' }) {
  const [pressed, setPressed] = useState(false)
  // Same bolding the drug cards use: the typed text is drawn heavier inside the name.
  const nameSegments = highlightMatch(name, highlight)
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
        minWidth:        0,
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
          {kicker && (
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
          )}
          <span style={{
            display:    'block',
            marginTop:  kicker ? 1 : 0,
            fontSize:   15,
            fontWeight: 500,
            lineHeight: 1.3,
            color:      'var(--color-text-primary)',
            overflowWrap: 'anywhere',
          }}>
            {nameSegments.map((seg, i) =>
              seg.bold
                ? <strong key={i} style={{ fontWeight: 800 }}>{seg.text}</strong>
                : <span key={i}>{seg.text}</span>
            )}
          </span>
          {detail && (
            <span style={{
              display:    'block',
              marginTop:  2,
              fontSize:   12.5,
              lineHeight: 1.3,
              color:      'var(--color-text-secondary)',
              overflowWrap: 'anywhere',
            }}>
              {detail}
            </span>
          )}
        </span>
      </span>
      <CountTag
        style={{ minWidth: 20, height: 18, padding: '0 5px', borderRadius: 6, fontSize: 11, flexShrink: 0 }}
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
      fontSize:           14.5,
      fontWeight:         600,
      fontVariantNumeric: 'tabular-nums',
      color:              'var(--color-text-primary)',
    }}>
      {children}
    </div>
  )
}

export default function ClassSearchResults({ results, query = '', onOpenClass, onOpenSubclass, startExpanded = false, hideKicker = false, countTrailing = null }) {
  const [showAllClasses,    setShowAllClasses]    = useState(startExpanded)
  const [showAllSubclasses, setShowAllSubclasses] = useState(false)

  const classes    = results?.classes    ?? []
  const subclasses = results?.subclasses ?? []

  const shownClasses    = showAllClasses    ? classes    : classes.slice(0, CLASS_LIMIT)
  const shownSubclasses = showAllSubclasses ? subclasses : subclasses.slice(0, SUBCLASS_LIMIT)

  // The typed text with the same slash spacing the names get, so 'alpha/beta' still
  // lines up with the displayed 'Alpha / Beta'.
  const highlightText = spaceSlashes(query)

  const parts = []
  if (classes.length > 0)    parts.push(`${classes.length} ${classes.length === 1 ? 'class' : 'classes'}`)
  if (subclasses.length > 0) parts.push(`${subclasses.length} ${subclasses.length === 1 ? 'drug family' : 'drug families'}`)

  return (
    <div>
      <div style={{
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'space-between',
        gap:            8,
        fontSize:       12,
        color:          'var(--color-text-tertiary)',
        marginBottom:   'var(--space-2)',
      }}>
        <span>
          {parts.join(' and ')}
          {query && ` for "${query}"`}
        </span>
        {countTrailing}
      </div>

      {classes.length > 0 && (
        <>
          {subclasses.length > 0 && <GroupLabel>Drug classes</GroupLabel>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {shownClasses.map(c => (
              <ResultCard
                key={`class:${c.name}`}
                name={spaceSlashes(titleCaseWords(c.name))}
                count={c.brandCount}
                highlight={highlightText}
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
                name={spaceSlashes(titleCaseWords(s.name))}
                detail={`in ${spaceSlashes(titleCaseWords(s.className))}`}
                count={s.brandCount}
                highlight={highlightText}
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

