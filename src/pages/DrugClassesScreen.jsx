/**
 * src/pages/DrugClassesScreen.jsx
 * 2026-10-18 (Drugs groups plan, step 1.2): the Class page. The class list that
 * used to sit inside the Browse card on the Drugs home, now on a page of its
 * own, with the same cards, the same Relevance / A to Z sort button (the choice
 * is still remembered in DrugContext as classSortMode), and the same loading
 * and failed-download states.
 *
 * Tapping a class opens the class sheet right here, exactly as it did on the
 * Drugs home: a class with no subclasses goes straight to its drugs, otherwise
 * the subclass list shows first. Tapping a drug in the sheet opens the drug
 * page and adds it to recently viewed. Back returns to the Drugs home.
 *
 * 2026-10-23: the search box now runs the real Class mode search (useDrugSearch in 'class' mode,
 * its own copy, so the Drugs home mode and text are untouched) and shows the same states as Class
 * mode on the Drugs home: 'Keep typing' for one letter, placeholder rows while the search
 * settles, class and family cards, 'Did you mean', and the no-match card. Brand and Generic are
 * not offered anywhere on this page (no mode switch, no 'found in another mode' cards).
 * 2026-10-20 (Drug groups plan, step 11.4): the page now opens from the 'Browse by class'
 * row on the Drugs home and has a search box under its title. Typing 2 or more letters
 * shows the classes and drug families whose names match (the same name search the Drugs
 * screen uses in Class mode); fewer letters show the full list with its sort button. The
 * search box stays in the same place the whole time, so the keyboard does not close while
 * typing. The title reads 'Browse by class' to match the row.
 */

import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowUpDown } from 'lucide-react'
import useScrollToTopOnOpen from '../hooks/useScrollToTopOnOpen'
import SearchBar from '../components/drugs/DrugSearchBar'
import BrowseHeader from '../components/drugs/home/BrowseHeader'
import ClassSearchResults from '../components/drugs/classes/ClassSearchResults'
import ClassSheet from '../components/drugs/classes/ClassSheet'
import { ALL_KEY as ALL_CLASS_DRUGS_KEY } from '../components/drugs/classes/classKeys'
import { DrugsSkeleton, LibraryErrorState } from '../components/drugs/home/BrowseStates'
import { SearchSwitchingState, TooShortState, EmptyState, DidYouMeanState } from '../components/drugs/search/SearchStates'
import { useDrugSearch } from '../hooks/useDrugSearch'
import { useDrugContext } from '../context/DrugContext'
import { useRecentlyViewed } from '../hooks/useRecentlyViewed'
import { titleCaseWords, buildClassIndex } from '../utils/classSearch'
import { ROUTES } from '../router'
import { useDeepLinkParent } from '../hooks/useDeepLinkParent'

const CLASS_SORT_LABELS = { relevance: 'Relevance', az: 'A \u2013 Z' }

// Same look as the Conditions screen sort button: no box, arrow icon, 13px
// medium text in the secondary colour. Shows the order a tap switches to.
function ClassSortButton({ sortMode, onToggle }) {
  const nextMode = sortMode === 'relevance' ? 'az' : 'relevance'
  return (
    <button
      onClick={onToggle}
      aria-label={`Sort: currently ${CLASS_SORT_LABELS[sortMode]}. Tap to switch to ${CLASS_SORT_LABELS[nextMode]}.`}
      style={{
        display: 'flex', alignItems: 'center', gap: 4,
        background: 'none', border: 'none', cursor: 'pointer',
        padding: '4px 0 4px 8px', fontSize: 13, fontWeight: 500,
        color: 'var(--color-text-secondary)', fontFamily: 'var(--font-body)',
        WebkitTapHighlightColor: 'transparent', outline: 'none',
      }}
    >
      <ArrowUpDown size={13} strokeWidth={1.8} aria-hidden="true" />
      {CLASS_SORT_LABELS[nextMode]}
    </button>
  )
}

export default function DrugClassesScreen() {
  useScrollToTopOnOpen()
  const navigate = useNavigate()
  // Back (arrow and phone button) goes to the real previous screen; if this page
  // is opened straight from a link, the Drugs home is put behind it first.
  useDeepLinkParent(ROUTES.DRUGS)
  const { drugs, loading, error, retry, classSortMode, setClassSortMode, classKeywords } = useDrugContext()
  const { addRecentlyViewed: addRecentDrug } = useRecentlyViewed('drug')

  // The class sheet: 'classTarget' stays after the sheet closes so it can
  // slide out showing the same content; 'classSheetKey' changes on every open
  // so each opening starts fresh (same as the Drugs home).
  const [classSheetOpen, setClassSheetOpen] = useState(false)
  const [classTarget,    setClassTarget]    = useState(null)   // { className, direct }
  const [classSheetKey,  setClassSheetKey]  = useState(0)

  // The Class mode search, same engine as the Drugs home (its own copy of it).
  const { query, setQuery, queryTooShort, suggestions, classResults, searchPending } = useDrugSearch(drugs, 'class', classKeywords)
  const typed    = query.trim()
  const hasQuery = typed.length > 0
  // A search that takes longer than 300ms swaps the cards for placeholder rows.
  const [slowPending, setSlowPending] = useState(false)
  useEffect(() => {
    if (!searchPending) return undefined
    const timer = setTimeout(() => setSlowPending(true), 300)
    return () => { clearTimeout(timer); setSlowPending(false) }
  }, [searchPending])
  const resultsNotReady = hasQuery && !queryTooShort && classResults == null

  const classIndex = useMemo(() => buildClassIndex(drugs), [drugs])
  const allClasses = useMemo(
    () => classIndex.classes.slice().sort((a, b) => a.name.localeCompare(b.name)),
    [classIndex]
  )

  const sortedClasses = useMemo(() => {
    const list   = allClasses.slice()
    const byName = (a, b) => a.name.localeCompare(b.name)
    if (classSortMode === 'az') return list.sort(byName)
    return list.sort((a, b) => (b.brandCount - a.brandCount) || byName(a, b))
  }, [allClasses, classSortMode])

  const classSheetDrugs = useMemo(
    () => (classTarget ? drugs.filter(d => d.class === classTarget.className) : []),
    [drugs, classTarget]
  )

  function openClassSheet(className, direct) {
    setClassTarget({ className, direct })
    setClassSheetKey(k => k + 1)
    setClassSheetOpen(true)
  }

  function handleOpenClass(className) {
    const card = allClasses.find(c => c.name === className)
    openClassSheet(className, card && card.subclassCount === 0 ? ALL_CLASS_DRUGS_KEY : null)
  }

  function handleOpenSubclass(className, subclassName) {
    openClassSheet(className, subclassName)
  }

  function handleDrugTap(drug) {
    addRecentDrug({ id: drug.id, name: drug.genericName, slug: drug.slug || drug.id })
    navigate(ROUTES.DRUG_DETAIL(drug.slug || drug.id))
  }

  const hasDrugs = drugs.length > 0
  let body = null
  if (loading && !hasDrugs) {
    body = <DrugsSkeleton />
  } else if (!loading && !hasDrugs && error) {
    body = <LibraryErrorState onRetry={retry} />
  } else if (!loading && hasQuery) {
    const found = classResults ? classResults.classes.length + classResults.subclasses.length : 0
    if (queryTooShort) {
      body = <TooShortState />
    } else if (resultsNotReady || slowPending) {
      body = <SearchSwitchingState />
    } else if (found > 0) {
      body = (
        <div style={{ opacity: searchPending ? 0.7 : 1, transition: 'opacity 150ms ease' }}>
          <ClassSearchResults
            key={typed}
            results={classResults}
            query={query}
            onOpenClass={handleOpenClass}
            onOpenSubclass={handleOpenSubclass}
          />
        </div>
      )
    } else if (suggestions.length > 0) {
      body = <DidYouMeanState query={query} suggestions={suggestions} onSelect={setQuery} />
    } else {
      body = <EmptyState query={query} mode="class" onClear={() => setQuery('')} />
    }
  } else if (!loading) {
    body = sortedClasses.length > 0 ? (
      <ClassSearchResults
        key="browse-classes"
        results={{ classes: sortedClasses, subclasses: [] }}
        countTrailing={
          <ClassSortButton
            sortMode={classSortMode}
            onToggle={() => setClassSortMode(classSortMode === 'relevance' ? 'az' : 'relevance')}
          />
        }
        startExpanded
        hideKicker
        onOpenClass={handleOpenClass}
        onOpenSubclass={handleOpenSubclass}
      />
    ) : (
      <div style={{ fontSize: 13, color: 'var(--color-text-tertiary)', padding: 'var(--space-4) 0' }}>
        No classes to show yet.
      </div>
    )
  }

  // Side gap and max width come from Layout (Drug groups plan, step 12.0 / F1); this page adds top and bottom space only.
  return (
    <div style={{ padding: '0 0 var(--space-4)' }}>
      <BrowseHeader backLabel="Drugs" onBack={() => navigate(-1)} title="Browse by class">
        {hasDrugs && (
          <SearchBar
            value={query}
            onChange={setQuery}
            placeholder="Search classes or families…"
            tall
          />
        )}
      </BrowseHeader>
      {body}

      <ClassSheet
        key={classSheetKey}
        isOpen={classSheetOpen}
        onClose={() => setClassSheetOpen(false)}
        classLabel={titleCaseWords(classTarget?.className ?? '')}
        classDrugs={classSheetDrugs}
        currentDrug={null}
        onSelectBrand={handleDrugTap}
        directSubclass={classTarget?.direct ?? null}
      />
    </div>
  )
}
