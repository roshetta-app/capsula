import { useState, useEffect, useCallback } from 'react'

/**
 * useConditionSearch — search + specialty filter for ConditionFull[].
 *
 * Searches: condition name + specialtyName
 * Filter:   activeSpecialty (specialty id or 'all')
 * Debounce: 150ms
 *
 * Exposes:
 *   query           — string
 *   setQuery        — setter
 *   activeSpecialty — string ('all' | specialty id)
 *   setActiveSpecialty
 *   results         — ConditionFull[]
 */
export function useConditionSearch(conditions) {
  const [query,           setQuery]           = useState('')
  const [activeSpecialty, setActiveSpecialty] = useState('all')
  const [results,         setResults]         = useState(conditions)

  const search = useCallback((q, specialty) => {
    let filtered = conditions

    // Specialty filter
    if (specialty !== 'all') {
      filtered = filtered.filter(c => c.specialtyId === specialty)
    }

    // Text search
    if (q.trim()) {
      const lower = q.toLowerCase()
      filtered = filtered.filter(c =>
        c.name?.toLowerCase().includes(lower) ||
        c.specialtyName?.toLowerCase().includes(lower)
      )
    }

    setResults(filtered)
  }, [conditions])

  useEffect(() => {
    const timer = setTimeout(() => search(query, activeSpecialty), 150)
    return () => clearTimeout(timer)
  }, [query, activeSpecialty, search])

  // Reset when conditions list changes (cache refresh)
  useEffect(() => {
    setResults(conditions)
  }, [conditions])

  return { query, setQuery, activeSpecialty, setActiveSpecialty, results }
}
