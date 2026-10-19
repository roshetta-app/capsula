/**
 * src/components/drugs/groups/GroupDrugSearch.jsx
 * 2026-10-19 (Drug groups plan, step 4.2): search and add drugs inside the
 * group editor. Uses the app's own drug search (searchDrugsTiered, brand
 * mode) on the already loaded drug list, so spelling and Arabic matching
 * behave as in the main search. It has its own text box and never touches
 * the Drugs screen's search.
 *
 * Props:
 *   addedIds  brand ids already in the group (draft). Those rows show
 *             "Added" instead of the plus.
 *   onAdd     (brandId) => void
 *
 * States: nothing typed (a hint), 1 character ("Type at least 2 characters
 * to search", the main search wording), no match ("No drugs match" and what
 * was typed), results with a plus or "Added". The plus keeps the keyboard up
 * (no blur on press) so adding several drugs in a row is one tap each.
 * Shows the first 25 matches; typing more narrows them.
 */

import { useEffect, useMemo, useState } from 'react'
import { Check, Plus, Search } from 'lucide-react'
import { useDrugContext } from '../../../context/DrugContext'
import { searchDrugsTiered } from '../../../utils/searchUtils'
import { toTitleCase, getDrugTitleSuffix, TITLE_HIDDEN_MODIFIER_TAGS } from '../../../utils/drugTitleFormat'
import { formatArabicFullName } from '../../../utils/arabicName'

const MAX_SHOWN = 25
const DEBOUNCE_MS = 180

const HINT_STYLE = {
  padding: 'var(--space-3) var(--space-1)', fontSize: 13, textAlign: 'center',
  color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-body)',
}

function genericLine(drug) {
  if (drug.ingredients?.length > 0) {
    return drug.ingredients.length > 2
      ? `${drug.ingredients.slice(0, 2).map(toTitleCase).join(', ')} +${drug.ingredients.length - 2}`
      : drug.ingredients.map(toTitleCase).join(', ')
  }
  return toTitleCase(drug.genericName || '')
}

function ResultRow({ drug, added, onAdd }) {
  const suffix = getDrugTitleSuffix(drug, { omitModifierTags: TITLE_HIDDEN_MODIFIER_TAGS })
  const title = [toTitleCase(drug.tradenameClean || ''), suffix].filter(Boolean).join(' ')
  const generic = genericLine(drug)
  const arabic = formatArabicFullName(drug.nameAr, drug.nameArFull)

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
      padding: '10px var(--space-1)',
      borderBottom: '1px solid var(--color-border)',
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 14, fontWeight: 600, lineHeight: 1.3, color: 'var(--color-text-primary)',
          fontFamily: 'var(--font-body)', overflowWrap: 'anywhere',
        }}>
          {title}
        </div>
        {generic && (
          <div style={{
            fontSize: 12, lineHeight: 1.35, color: 'var(--color-text-secondary)',
            fontFamily: 'var(--font-body)', overflowWrap: 'anywhere',
          }}>
            {generic}
          </div>
        )}
        {arabic && (
          <div dir="ltr" style={{
            fontSize: 12, lineHeight: 1.35, color: 'var(--color-text-tertiary)',
            fontFamily: 'var(--font-body)', overflowWrap: 'anywhere',
          }}>
            {arabic}
          </div>
        )}
      </div>

      {added ? (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0,
          fontSize: 12, fontWeight: 600, color: 'var(--color-text-tertiary)',
          fontFamily: 'var(--font-body)',
        }}>
          <Check size={14} strokeWidth={2.2} aria-hidden="true" />
          Added
        </div>
      ) : (
        <button
          onMouseDown={e => e.preventDefault()}
          onClick={onAdd}
          aria-label={`Add ${title} to this group`}
          style={{
            width: 36, height: 36, borderRadius: '50%', border: 'none', flexShrink: 0,
            backgroundColor: 'var(--color-accent-light)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            WebkitTapHighlightColor: 'transparent', outline: 'none',
          }}
        >
          <Plus size={18} strokeWidth={2.2} color="var(--color-accent)" aria-hidden="true" />
        </button>
      )}
    </div>
  )
}

export default function GroupDrugSearch({ addedIds = [], onAdd }) {
  const { drugs } = useDrugContext()
  const [text, setText] = useState('')
  const [query, setQuery] = useState('')

  // Search a moment after typing stops, like the main search.
  useEffect(() => {
    const t = setTimeout(() => setQuery(text.trim()), DEBOUNCE_MS)
    return () => clearTimeout(t)
  }, [text])

  const results = useMemo(() => {
    if (query.length < 2) return []
    return searchDrugsTiered(drugs ?? [], query, 'brand') ?? []
  }, [drugs, query])

  const added = useMemo(() => new Set(addedIds), [addedIds])
  const typed = text.trim()
  const waiting = typed !== query

  let body = null
  if (typed.length === 0) {
    body = <div style={HINT_STYLE}>Search a drug by name to add it</div>
  } else if (typed.length === 1) {
    body = <div style={HINT_STYLE}>Type at least 2 characters to search</div>
  } else if (!waiting && results.length === 0) {
    body = <div style={HINT_STYLE}>No drugs match &ldquo;{typed}&rdquo;</div>
  } else if (!waiting) {
    body = (
      <div>
        {results.slice(0, MAX_SHOWN).map(d => (
          <ResultRow key={d.id} drug={d} added={added.has(d.id)} onAdd={() => onAdd?.(d.id)} />
        ))}
        {results.length > MAX_SHOWN && (
          <div style={HINT_STYLE}>Showing the first {MAX_SHOWN}. Keep typing to narrow it.</div>
        )}
      </div>
    )
  }

  return (
    <div>
      <div style={{ position: 'relative' }}>
        <Search
          size={16}
          color="var(--color-text-tertiary)"
          aria-hidden="true"
          style={{ position: 'absolute', insetInlineStart: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
        />
        <input
          type="text"
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Search drugs to add"
          aria-label="Search drugs to add"
          dir="ltr"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="search"
          style={{
            width: '100%', boxSizing: 'border-box',
            fontSize: 15, lineHeight: 1.4,
            color: 'var(--color-text-primary)',
            backgroundColor: 'var(--color-surface-muted)',
            border: '1.5px solid transparent', borderRadius: 12,
            padding: '12px 14px 12px 38px',
            fontFamily: 'var(--font-body)', outline: 'none',
          }}
        />
      </div>
      {body}
    </div>
  )
}
