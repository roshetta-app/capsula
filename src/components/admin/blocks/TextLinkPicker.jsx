/**
 * TextLinkPicker — src/components/admin/blocks/TextLinkPicker.jsx
 *
 * The pop-up behind the Drug and Class buttons of the text toolbar (plan step 4).
 *
 *   kind="drug"   the same drug picker the drug block uses (DrugPickerSearch, brand
 *                 mode). onPick(flatDrug) gets the app's own drug object.
 *   kind="class"  the app's class search (same search, same cards as Class mode on the
 *                 Drugs screen). Tapping a class card gives { className }, tapping a
 *                 drug family card gives { className, familyName }.
 *
 * Props:
 *   kind     'drug' | 'class' | null   (null = closed)
 *   onClose  () => void
 *   onPick   (pick) => void             pick is the flat drug, or { className, familyName? }
 *
 * The pop-up is drawn on the page itself (portal), so the toolbar can sit in a pinned bar.
 */

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Modal from '../Modal'
import SearchBar from '../../ui/SearchBar'
import DrugPickerSearch from '../DrugPickerSearch'
import ClassSearchResults from '../../drugs/classes/ClassSearchResults'
import { SearchSwitchingState, TooShortState, EmptyState, DidYouMeanState } from '../../drugs/search/SearchStates'
import { useDrugContext } from '../../../context/DrugContext'
import { useDrugSearch } from '../../../hooks/useDrugSearch'

const SEARCH_OPTIONS = { logSearches: false }

const hintStyle = {
  padding: 'var(--space-5)', textAlign: 'center', fontSize: 13,
  color: 'var(--color-text-tertiary)',
}

function ClassPickerSearch({ onPick }) {
  const { drugs, loading, classKeywords } = useDrugContext()
  const inputRef = useRef(null)
  const {
    query, setQuery, queryTooShort, suggestions, classResults, searchPending,
  } = useDrugSearch(drugs, 'class', classKeywords, SEARCH_OPTIONS)
  const hasQuery = query.trim().length > 0

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 80)
    return () => clearTimeout(t)
  }, [])

  const found = classResults ? classResults.classes.length + classResults.subclasses.length : 0

  let body
  if (loading && (drugs ?? []).length === 0) {
    body = <SearchSwitchingState />
  } else if (!hasQuery) {
    body = <div style={hintStyle}>Type a class or drug family name…</div>
  } else if (queryTooShort) {
    body = <TooShortState />
  } else if (classResults == null || (searchPending && found === 0)) {
    body = <SearchSwitchingState />
  } else if (found === 0) {
    body = suggestions.length > 0
      ? <DidYouMeanState query={query} suggestions={suggestions} onSelect={setQuery} />
      : <EmptyState query={query} mode="class" onClear={() => setQuery('')} />
  } else {
    body = (
      <div style={{ opacity: searchPending ? 0.7 : 1, transition: 'opacity var(--motion-fast) var(--ease-reveal)' }}>
        <ClassSearchResults
          results={classResults}
          query={query}
          startExpanded
          onOpenClass={name => onPick({ className: name })}
          onOpenSubclass={(className, name) => onPick({ className, familyName: name })}
        />
      </div>
    )
  }

  return (
    <div>
      <div style={{ marginBottom: 'var(--space-3)' }}>
        <SearchBar ref={inputRef} value={query} onChange={setQuery} placeholder="Search classes and drug families…" />
      </div>
      <div style={{ maxHeight: 'min(60dvh, 460px)', overflowY: 'auto', overscrollBehavior: 'contain' }}>
        {body}
      </div>
    </div>
  )
}

export default function TextLinkPicker({ kind, onClose, onPick }) {
  // A fresh search every time the pop-up opens.
  const [openCount, setOpenCount] = useState(0)
  useEffect(() => { if (kind) setOpenCount(n => n + 1) }, [kind])

  if (!kind) return null
  const title = kind === 'drug' ? 'Link a drug' : 'Link a class or drug family'

  return createPortal(
    <Modal isOpen onClose={onClose} title={title} size="md">
      {kind === 'drug'
        ? <DrugPickerSearch key={openCount} mode="brand" onPick={onPick} />
        : <ClassPickerSearch key={openCount} onPick={onPick} />}
    </Modal>,
    document.body,
  )
}
