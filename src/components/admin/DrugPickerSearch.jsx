/**
 * src/components/admin/DrugPickerSearch.jsx
 * 2026-11-07 (CMS drug picker matches the app search): the search inside the CMS drug pop-up
 * (DrugPickerModal, Pick a brand and Pick a formulation). It is the app's own Add drugs search
 * brought into a pop-up: the same search bar, the same search engine and drug list the app uses
 * (useDrugSearch on the DrugContext list), the same result cards and the same messages
 * (Keep typing, Did you mean, No drugs match).
 *
 * Differences from the app screen, on purpose:
 *   - No Brand / Generic switch. The button the admin pressed already decides: Brand mode for
 *     Pick a brand, Generic mode for Pick a formulation (one row per formulation).
 *   - No Form / Route filter. That filter is a Pro feature (it shows a paywall to a non-Pro
 *     account), and in the CMS the admin is finding one drug, not narrowing a list.
 *   - No recent searches, no + / tick. A tap on a card picks that drug and the pop-up closes.
 *   - The search is not logged: the admin's searches must not count as real user searches or as
 *     missing drugs (useDrugSearch option logSearches false).
 *
 * The drug list is the app's saved list (published drugs only, same as the old live search).
 * The CMS already refreshes it after saving a drug; the Refresh list button at the bottom does it
 * by hand (it is a full download, so it is never run automatically).
 *
 * Props:
 *   mode    'brand' | 'generic'
 *   onPick  (flatDrug) => void  — the app's drug object for the tapped card
 *
 * DrugPickerModal turns that drug into the shapes the CMS already expects from the pop-up, so
 * nothing that uses the pop-up has to change.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import SearchBar from '../ui/SearchBar'
import SharedDrugCard from '../SharedDrugCard'
import {
  SearchSwitchingState, TooShortState, EmptyState, DidYouMeanState,
} from '../drugs/search/SearchStates'
import { useDrugContext } from '../../context/DrugContext'
import { useDrugSearch } from '../../hooks/useDrugSearch'
import { useCategories } from '../../hooks/useCategories'

// Class does not exist here, and the admin's searches are not logged.
const SEARCH_OPTIONS = { allowClass: false, logSearches: false }
const NO_KEYWORDS = []
const MAX_ROWS = 100

// Generic mode can list the same formulation once per brand; the admin picks a formulation, so
// keep the first row of each.
function oneRowPerFormulation(list) {
  const seen = new Set()
  const out = []
  for (const d of list) {
    const key = d.formulationId ?? d.id
    if (seen.has(key)) continue
    seen.add(key)
    out.push(d)
  }
  return out
}

const hintStyle = {
  padding: 'var(--space-5)', textAlign: 'center', fontSize: 13,
  color: 'var(--color-text-tertiary)',
}

export default function DrugPickerSearch({ mode = 'brand', onPick }) {
  const { drugs, loading: drugsLoading, refresh } = useDrugContext()
  const { categories } = useCategories()
  const inputRef = useRef(null)

  const {
    query, setQuery, results, queryTooShort, suggestions, searchPending,
  } = useDrugSearch(drugs, mode, NO_KEYWORDS, SEARCH_OPTIONS)
  const hasQuery = query.trim().length > 0

  // The keyboard opens by itself when the pop-up opens (as the old pop-up did).
  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 80)
    return () => clearTimeout(t)
  }, [])

  // Typing: only a search that takes longer than 300 ms swaps the cards for placeholder rows.
  const [slowPending, setSlowPending] = useState(false)
  useEffect(() => {
    if (!searchPending) return undefined
    const timer = setTimeout(() => setSlowPending(true), 300)
    return () => { clearTimeout(timer); setSlowPending(false) }
  }, [searchPending])

  const rows = useMemo(
    () => (mode === 'generic' ? oneRowPerFormulation(results) : results),
    [results, mode],
  )

  // Refresh by hand: a full download of the drug list.
  const [refreshing, setRefreshing] = useState(false)
  async function handleRefresh() {
    if (refreshing) return
    setRefreshing(true)
    try { await refresh() } finally { setRefreshing(false) }
  }

  const placeholder = mode === 'generic' ? 'Search generic names…' : 'Search brand names…'
  const waitingForDrugs = drugsLoading && (drugs ?? []).length === 0

  let body
  if (waitingForDrugs) {
    body = <SearchSwitchingState />
  } else if (!hasQuery) {
    body = <div style={hintStyle}>{mode === 'generic' ? 'Type a generic name…' : 'Type a brand name…'}</div>
  } else if (queryTooShort) {
    body = <TooShortState />
  } else if (slowPending) {
    body = <SearchSwitchingState />
  } else if (rows.length === 0) {
    body = suggestions.length > 0
      ? <DidYouMeanState query={query} suggestions={suggestions} onSelect={setQuery} />
      : <EmptyState query={query} mode={mode} onClear={() => setQuery('')} allowClass={false} />
  } else {
    const shown = rows.slice(0, MAX_ROWS)
    body = (
      <div style={{ opacity: searchPending ? 0.7 : 1, transition: 'opacity var(--motion-fast) var(--ease-reveal)' }}>
        <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 'var(--space-2)' }}>
          {rows.length} result{rows.length !== 1 ? 's' : ''} for &quot;{query}&quot;
          {rows.length > MAX_ROWS && ' · type more to narrow'}
        </div>
        {shown.map((drug, i) => (
          <SharedDrugCard
            key={drug.id}
            drug={drug}
            categories={categories}
            isDark={false}
            onTap={() => onPick(drug)}
            isLast={i === shown.length - 1}
            searchMode={mode}
            highlight={query}
          />
        ))}
      </div>
    )
  }

  return (
    <div>
      <div style={{ marginBottom: 'var(--space-3)' }}>
        <SearchBar
          ref={inputRef}
          value={query}
          onChange={setQuery}
          placeholder={placeholder}
        />
      </div>

      <div style={{ maxHeight: 'min(60dvh, 460px)', overflowY: 'auto', overscrollBehavior: 'contain' }}>
        {body}
      </div>

      <div style={{ marginTop: 'var(--space-3)', textAlign: 'center', fontSize: 12, color: 'var(--color-text-tertiary)' }}>
        Can&apos;t find a drug you just added?{' '}
        <button
          type="button"
          onClick={handleRefresh}
          disabled={refreshing}
          style={{
            background: 'none', border: 'none', padding: 0,
            color: refreshing ? 'var(--color-text-tertiary)' : 'var(--color-accent)',
            fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-body)',
            cursor: refreshing ? 'default' : 'pointer',
          }}
        >
          {refreshing ? 'Updating…' : 'Refresh list'}
        </button>
      </div>
    </div>
  )
}
