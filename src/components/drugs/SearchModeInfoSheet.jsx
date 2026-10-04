/**
 * src/components/drugs/SearchModeInfoSheet.jsx
 *
 * 2026-10-04: opened from the info icon next to the 'Search mode' title on the
 * Drugs screen (see DrugsScreen.jsx). Explains what Brand, Generic and Class
 * search actually look at, using one real example, Controloc, in three
 * stacked sections:
 *   - Brand:   Controloc's drug card, with 'Contro' bold in the brand name.
 *   - Generic: the same card, with 'Panto' bold in the generic line.
 *   - Class:   Controloc's Class/Subclass tree (the one on the generic overview),
 *              with 'Proton pump' bold in the subclass.
 * Each example is the app's own component (SharedDrugCard, CardRow), switched
 * to read-only, so it looks exactly like the real thing and the bold part is
 * drawn the way live search results draw it.
 *
 * The Controloc details below are built into this file on purpose: the pop-up
 * works offline and does not change if the library data does. What the three
 * modes search is taken from useDrugSearch.js, searchUtils.js and
 * classSearch.js.
 *
 * Shell (title + close button pinned, body scrolls) is copied from
 * DrugsInfoSheet.jsx and built on SheetShell.jsx like every other sheet.
 *
 * Props:
 *   isOpen      boolean
 *   onClose     () => void
 *   categories  Category[]  — from useCategories(), for the card's icon badge
 *   isDark      boolean     — from useIsDark(), for the badge's colours
 */

import { Tag, FlaskConical, Layers } from 'lucide-react'
import SheetShell from '../ui/SheetShell'
import SharedDrugCard from '../SharedDrugCard'
import { CardRow } from './sections/GenericOverviewSection.jsx'
import { highlightMatch } from '../../utils/highlightMatch'

// Controloc 40mg tablet, shaped like a real library row.
const CONTROLOC = {
  id:            'search-mode-example',
  tradenameClean: 'controloc',
  concentration: '40mg',
  form:          'tablet',
  formModifier:  ['enteric_coated', 'film_coated'],
  packSize:      null,
  fillVolume:    null,
  ingredients:   ['pantoprazole'],
  genericName:   'pantoprazole',
  category:      'gastrointestinal',
}
const CONTROLOC_CLASS    = 'Antiulcer Agents'
const CONTROLOC_SUBCLASS = 'Proton pump inhibitor'

// Text with the part that matches the typed query in heavy weight, the same
// way the drug card draws a search match.
function Highlighted({ text, query }) {
  return highlightMatch(text, query).map((seg, i) =>
    seg.bold
      ? <strong key={i} style={{ fontWeight: 800 }}>{seg.text}</strong>
      : <span key={i}>{seg.text}</span>
  )
}

// One mode: icon + name, what is typed, one plain sentence, then the example.
function ModeSection({ icon: Icon, title, typed, first = false, children, example, padExample = true }) {
  return (
    <div style={{
      paddingTop:  first ? 0 : 'var(--space-4)',
      marginTop:   first ? 0 : 'var(--space-4)',
      borderTop:   first ? 'none' : '1px solid var(--color-border-subtle)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width:           28,
            height:          28,
            borderRadius:    '50%',
            backgroundColor: 'var(--color-accent-light)',
            display:         'flex',
            alignItems:      'center',
            justifyContent:  'center',
            flexShrink:      0,
          }}>
            <Icon size={14} color="var(--color-accent)" />
          </div>
          <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text-primary)' }}>{title}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>You type</span>
          <span style={{
            fontSize:        13,
            fontWeight:      600,
            color:           'var(--color-accent)',
            backgroundColor: 'var(--color-accent-light)',
            borderRadius:    'var(--radius-full)',
            padding:         '3px 10px',
          }}>
            {typed}
          </span>
        </div>
      </div>

      <p style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--color-text-secondary)', margin: '0 0 var(--space-3)' }}>
        {children}
      </p>

      <div style={{
        border:          '1px solid var(--color-border-subtle)',
        borderRadius:    'var(--radius-md)',
        backgroundColor: 'var(--color-surface)',
        padding:         padExample ? '0 var(--space-3)' : 'var(--space-2) var(--space-3)',
      }}>
        {example}
      </div>
    </div>
  )
}

export default function SearchModeInfoSheet({ isOpen, onClose, categories = [], isDark = false }) {
  return (
    <SheetShell isOpen={isOpen} onClose={onClose} ariaLabel="How search modes work" maxHeight="85dvh">
      {/* Fixed header — title + close button. */}
      <div style={{ flexShrink: 0, padding: '0 var(--space-4)' }}>
        <div style={{
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'space-between',
          gap:            'var(--space-2)',
          marginBottom:   'var(--space-3)',
        }}>
          <h2 style={{
            fontSize:   16,
            fontWeight: 700,
            color:      'var(--color-text-primary)',
            margin:     0,
          }}>
            How search modes work
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              display:                 'flex',
              alignItems:              'center',
              justifyContent:          'center',
              width:                   28,
              height:                  28,
              borderRadius:            '50%',
              background:              'none',
              border:                  'none',
              cursor:                  'pointer',
              color:                   'var(--color-text-tertiary)',
              WebkitTapHighlightColor: 'transparent',
              flexShrink:              0,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Scrollable body */}
      <div style={{
        flex:      1,
        overflowY: 'auto',
        padding:   '0 var(--space-4) var(--space-6)',
      }}>
        <p style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--color-text-secondary)', margin: '0 0 var(--space-4)' }}>
          The mode decides what the search bar looks at. In each example, the bold part is what the typed text matched.
        </p>

        <ModeSection
          first
          icon={Tag}
          title="Brand"
          typed="contro"
          example={
            <SharedDrugCard
              drug={CONTROLOC}
              categories={categories}
              isDark={isDark}
              isLast
              disableTap
              showChevron={false}
              highlight="contro"
              searchMode="brand"
            />
          }
        >
          Looks at the brand name only. Typing the start of a brand name finds it.
        </ModeSection>

        <ModeSection
          icon={FlaskConical}
          title="Generic"
          typed="panto"
          example={
            <SharedDrugCard
              drug={CONTROLOC}
              categories={categories}
              isDark={isDark}
              isLast
              disableTap
              showChevron={false}
              highlight="panto"
              searchMode="generic"
            />
          }
        >
          Looks at the generic name, and at each ingredient inside combination drugs. It finds every brand of that generic, not just one.
        </ModeSection>

        <ModeSection
          icon={Layers}
          title="Class"
          typed="proton pump"
          padExample={false}
          example={
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <CardRow label={CONTROLOC_CLASS} hasChild />
              <CardRow
                label={<Highlighted text={CONTROLOC_SUBCLASS} query="proton pump" />}
                child
              />
            </div>
          }
        >
          Looks at class and drug family names only, never drug names. Part of either name works, like 'antiulcer' or 'proton pump'. Tap a result to see its drugs.
        </ModeSection>

        <p style={{
          fontSize:   12,
          lineHeight: 1.5,
          color:      'var(--color-text-tertiary)',
          margin:     'var(--space-4) 0 0',
        }}>
          In Brand and Generic mode you can add a strength or a form to narrow the list, like 'controloc 40' or 'pantoprazole tablet'.
        </p>
      </div>
    </SheetShell>
  )
}
