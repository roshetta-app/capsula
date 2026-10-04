import { createContext, useContext, useState } from 'react'
import { useDrugs } from '../hooks/useDrugs'
import { useDrugSearch } from '../hooks/useDrugSearch'
import { useClassKeywords } from '../hooks/useClassKeywords'

const DrugContext = createContext(null)

/**
 * DrugProvider — wraps the app and makes drug data available everywhere.
 * Uses useDrugs() internally so cache-first logic runs once at the top level.
 *
 * drugs-filter-persist-navigation — also owns 'mode' (Brand/Generic) and
 * 'activeFilters' (Form/Route) for the Drugs screen. These used to live as
 * local useState in DrugsScreen, which meant navigating to a drug detail
 * page (a separate route — DrugsScreen unmounts entirely) or any other tab
 * silently reset them back to defaults. Lifting them here — above the
 * router in App.jsx — means they survive any navigation, same fix as
 * every other piece of state in this app that needs to outlive a screen
 * unmount. Deliberately NOT persisted to localStorage/sessionStorage:
 * this only needs to survive in-app navigation, not a real session end
 * (see DrugFilterPanel.jsx's own header note on filters not persisting
 * between sessions — that decision is unchanged).
 *
 * drug-search-sort-cheapest — 'sortMode' ('relevance' | 'cheapest') joins
 * 'mode' and 'activeFilters' here for the same reason: it needs to survive
 * navigating into a drug's detail page and back, exactly like Search Mode
 * and Form/Route already do, rather than silently resetting to Relevance
 * on every return trip. Same non-persistence rule applies — in-memory only,
 * not saved to localStorage/sessionStorage.
 *
 * drug-search-persist-navigation — 'query'/'setQuery'/'results'/
 * 'queryTooShort'/'suggestions' (from useDrugSearch) join the state above
 * for the exact same reason: useDrugSearch used to be called locally
 * inside DrugsScreen, so opening a drug's detail page (a separate route —
 * DrugsScreen unmounts entirely) and coming back reset the typed query,
 * and everything derived from it, to empty. useDrugSearch itself is
 * unchanged — it's just called here instead, same relocation already done
 * for mode/activeFilters/sortMode.
 *
 * Drug Search Refinement Phase 6, §4.8 (2026-08-29): useDrugSearch's
 * 'suggestion' (string|null) became 'suggestions' (string[]) — this file
 * needed no code change since searchValue is spread through as-is; only
 * this doc comment and useDrugContext's below were updated to match.
 *
 * cross-mode-search-hint (2026-08-29): useDrugSearch now also returns
 * 'crossModeMatch' (boolean) — again no code change needed here, since
 * searchValue is spread through as-is; only this doc comment and
 * useDrugContext's below were updated to match.
 *
 * 2026-10-04 (Class search mode): 'mode' can now also be 'class', and
 * useDrugSearch also returns 'classResults' and 'crossModeTargets' — again
 * nothing to change in the code, searchValue is spread through as-is, and
 * 'mode' already lives here, so the typed text, the mode and the class cards
 * survive opening a drug and coming back like everything else. Only these doc
 * comments were updated.
 *
 * 2026-10-04 (remembered Browse choice): 'browseMode' ('category' | 'class')
 * joins 'mode', 'activeFilters' and 'sortMode' here. It is the Category / Class
 * switch in the title of the Browse area on the Drugs screen. It used to be
 * local to DrugsScreen, so opening a drug or switching tabs reset it to
 * Category. Same rule as the others: in memory only, so it survives moving
 * between screens and resets to Category when the app is fully closed.
 *
 * 2026-10-04 (Class browse sort): 'classSortMode' ('relevance' | 'az') joins
 * them. It is the sort button above the class list of the Browse area. Relevance
 * (the default) puts the classes with the most drugs first; 'az' is A to Z. In
 * memory only, same rule as the others. It is separate from 'sortMode' above,
 * which belongs to drug search.
 *
 * 2026-10-04 (Class keywords, phase B): 'classKeywords' (the active keywords
 * that will let Class search find a class by a common word) is loaded here, once,
 * from its saved copy (works offline), handed to useDrugSearch as its third input
 * (phase C: Class mode now also finds classes and families by keyword) and
 * passed through.
 *
 * 2026-10-05 (Class hint in Brand and Generic mode): useDrugSearch also returns
 * 'classHint' (counts of the classes and families the text clearly means, by a
 * stricter check than Class mode itself, or null). Nothing to change in the code, searchValue is spread through
 * as-is; only these doc comments were updated.
 *
 * 2026-10-05 (Class mode offers Brand and Generic): 'crossModeTarget' (one mode)
 * became 'crossModeTargets' (a list, so a name found under both Brand and
 * Generic offers both). Again only these doc comments changed here.
 */
export function DrugProvider({ children }) {
  const drugsValue = useDrugs()
  const [mode, setMode] = useState('brand')
  const [activeFilters, setActiveFilters] = useState(null)
  const [sortMode, setSortMode] = useState('relevance')
  const [browseMode, setBrowseMode] = useState('category')
  const [classSortMode, setClassSortMode] = useState('relevance')
  const { classKeywords } = useClassKeywords()
  const searchValue = useDrugSearch(drugsValue.drugs, mode, classKeywords)
  const value = { ...drugsValue, mode, setMode, activeFilters, setActiveFilters, sortMode, setSortMode, browseMode, setBrowseMode, classSortMode, setClassSortMode, classKeywords, ...searchValue }
  return <DrugContext.Provider value={value}>{children}</DrugContext.Provider>
}

/**
 * useDrugContext — consume drug data anywhere in the tree.
 * Returns { drugs, loading, error, refresh, mode, setMode, activeFilters,
 * setActiveFilters, sortMode, setSortMode, browseMode, setBrowseMode,
 * classSortMode, setClassSortMode, classKeywords, query,
 * setQuery, results, queryTooShort, suggestions, crossModeMatch, classResults,
 * classHint, crossModeTargets }
 * (mode is 'brand' | 'generic' | 'class'; classResults and crossModeTargets
 * are only filled in Class mode, classHint only in Brand and Generic mode; browseMode is 'category' | 'class';
 * classSortMode is 'relevance' | 'az'; classKeywords is the list of active
 * class keywords, [{ id, keyword, targets: [{ class, subclass }] }])
 */
export function useDrugContext() {
  const ctx = useContext(DrugContext)
  if (!ctx) throw new Error('useDrugContext must be used inside <DrugProvider>')
  return ctx
}
