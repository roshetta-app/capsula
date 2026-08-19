/**
 * src/components/admin/ConditionPickerModal.jsx
 * Phase F9 Stage 2 (D28) — Notifications CMS deep-link picker.
 *
 * Modal for selecting a published condition to link a notification to.
 * Mirrors DrugPickerModal.jsx's modal/search/debounce/result-row shape
 * (mode="brand"), since no equivalent condition picker existed yet.
 *
 * Props:
 *   isOpen     boolean
 *   onClose    () => void
 *   onSelect   (condition: { id, name, slug }) => void
 */

import { useState, useEffect, useRef } from 'react'
import Modal from './Modal'
import SearchBar from '../ui/SearchBar'
import { searchConditionsForPicker } from '../../lib/adminQueries'

function ConditionResultRow({ condition, onSelect }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={() => onSelect(condition)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display:         'block',
        width:           '100%',
        textAlign:       'left',
        padding:         '10px 14px',
        background:      hovered ? 'var(--color-bg)' : 'transparent',
        border:          'none',
        borderBottom:    '1px solid var(--color-border)',
        cursor:          'pointer',
        fontFamily:      'var(--font-body)',
        transition:      'background-color 0.1s',
      }}
    >
      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)' }}>
        {condition.name}
      </span>
    </button>
  )
}

export default function ConditionPickerModal({ isOpen, onClose, onSelect }) {
  const [query,   setQuery]   = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)
  const inputRef = useRef(null)

  // Focus input on open, same as DrugPickerModal
  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setResults([])
      setError(null)
      const t = setTimeout(() => inputRef.current?.focus(), 80)
      return () => clearTimeout(t)
    }
  }, [isOpen])

  // Search on query change (debounced 250ms), same timing as DrugPickerModal
  useEffect(() => {
    if (!isOpen) return
    setLoading(true)
    setError(null)
    const timer = setTimeout(async () => {
      const { data, error: err } = await searchConditionsForPicker(query)
      if (err) {
        setError(err.message ?? 'Search failed')
        setResults([])
      } else {
        setResults(data ?? [])
      }
      setLoading(false)
    }, 250)
    return () => clearTimeout(timer)
  }, [query, isOpen])

  function handleSelect(item) {
    onSelect(item)
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Pick a condition" size="md">

      {/* Search input — shared SearchBar component, same as DrugPickerModal */}
      <div style={{ marginBottom: 'var(--space-3)' }}>
        <SearchBar
          ref={inputRef}
          value={query}
          onChange={setQuery}
          placeholder="Search conditions…"
        />
      </div>

      {/* Results list */}
      <div style={{
        border:          '1.5px solid var(--color-border)',
        borderRadius:    'var(--radius-md)',
        maxHeight:       360,
        overflowY:       'auto',
        backgroundColor: 'var(--color-surface)',
      }}>
        {loading && (
          <div style={{
            padding:   'var(--space-5)',
            textAlign: 'center',
            fontSize:  13,
            color:     'var(--color-text-tertiary)',
          }}>
            Searching…
          </div>
        )}

        {!loading && error && (
          <div style={{
            padding:   'var(--space-4)',
            fontSize:  13,
            color:     'var(--color-error, #ef4444)',
            textAlign: 'center',
          }}>
            {error}
          </div>
        )}

        {!loading && !error && results.length === 0 && (
          <div style={{
            padding:   'var(--space-5)',
            textAlign: 'center',
            fontSize:  13,
            color:     'var(--color-text-tertiary)',
          }}>
            {query.trim() ? `No conditions found for "${query}"` : 'Type to search conditions…'}
          </div>
        )}

        {!loading && !error && results.map(item => (
          <ConditionResultRow key={item.id} condition={item} onSelect={handleSelect} />
        ))}
      </div>

      {/* Footer hint */}
      <div style={{
        marginTop: 'var(--space-3)',
        fontSize:  12,
        color:     'var(--color-text-tertiary)',
        textAlign: 'center',
      }}>
        Select a condition to link this notification to it
      </div>
    </Modal>
  )
}
