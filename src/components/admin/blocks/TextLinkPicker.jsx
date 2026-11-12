/**
 * TextLinkPicker — src/components/admin/blocks/TextLinkPicker.jsx
 *
 * The pop-up behind the Drug and Class buttons of the text toolbar (plan step 4).
 *
 *   kind="drug"   the same drug picker the drug block uses (DrugPickerSearch, brand or
 *                 generic mode, chosen with the Brand / Generic switch). onPick(flatDrug) gets the app's own drug object.
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

// The "name only" choice is remembered while the page stays open, so several drugs in a row
// can be added the same way.
const remembered = { nameOnly: false, generic: false }   // Brand / Generic choice too
function remember(key, value) { remembered[key] = value }

export default function TextLinkPicker({ kind, onClose, onPick }) {
  // A fresh search every time the pop-up opens.
  const [openCount, setOpenCount] = useState(0)
  const [nameOnly, setNameOnly] = useState(remembered.nameOnly)
  const [generic, setGeneric] = useState(remembered.generic)
  useEffect(() => { if (kind) setOpenCount(n => n + 1) }, [kind])
  function toggleNameOnly(v) { remember('nameOnly', v); setNameOnly(v) }
  function chooseGeneric(v) { remember('generic', v); setGeneric(v) }

  if (!kind) return null
  const title = kind === 'drug' ? 'Link a drug' : 'Link a class or drug family'

  return createPortal(
    <Modal isOpen onClose={onClose} title={title} size="md">
      {kind === 'drug' && (
        <>
          <div role="tablist" style={{ display: 'flex', gap: 6, margin: '0 0 var(--space-3)' }}>
            {[['Brand', false], ['Generic', true]].map(([label, isGeneric]) => (
              <button
                key={label} type="button" role="tab" aria-selected={generic === isGeneric}
                onClick={() => chooseGeneric(isGeneric)}
                style={{
                  flex: 1, padding: '8px 0', borderRadius: 8, fontSize: 13, fontWeight: 600,
                  fontFamily: 'var(--font-body)', cursor: 'pointer',
                  border: '1px solid var(--color-border)',
                  background: generic === isGeneric ? 'var(--color-text-primary)' : 'transparent',
                  color: generic === isGeneric ? 'var(--color-surface, #fff)' : 'var(--color-text-primary)',
                }}
              >{label}</button>
            ))}
          </div>
          {!generic && <label style={{
            display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 var(--space-3)', fontSize: 13,
            fontFamily: 'var(--font-body)', color: 'var(--color-text-primary)', cursor: 'pointer',
          }}>
            <input type="checkbox" checked={nameOnly} onChange={e => toggleNameOnly(e.target.checked)} />
            Name only (leave out the strength and form)
          </label>}
        </>
      )}
      {kind === 'drug'
        ? <DrugPickerSearch key={`${openCount}-${generic ? 'g' : 'b'}`} mode={generic ? 'generic' : 'brand'} uniqueBy={generic ? 'generic' : 'formulation'} onPick={drug => onPick(drug, { nameOnly, generic })} />
        : <ClassPickerSearch key={openCount} onPick={onPick} />}
    </Modal>,
    document.body,
  )
}
