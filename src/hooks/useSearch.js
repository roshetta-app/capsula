import { useState, useEffect, useCallback } from 'react'

/**
 * useSearch — works with FlatDrug[] from Supabase.
 *
 * Searches across:
 *   - genericName  (English)
 *   - arabicName
 *   - brands[].name  (brand names)
 *
 * 150ms debounce so typing feels instant.
 */
export function useSearch(drugs) {
  const [query, setQuery]     = useState('')
  const [results, setResults] = useState(drugs)

  const search = useCallback((q) => {
    if (!q.trim()) {
      setResults(drugs)
      return
    }
    const lower = q.toLowerCase()
    setResults(drugs.filter(drug =>
      drug.genericName?.toLowerCase().includes(lower) ||
      drug.arabicName?.includes(q) ||
      drug.brands?.some(b => b.name?.toLowerCase().includes(lower))
    ))
  }, [drugs])

  useEffect(() => {
    const timer = setTimeout(() => search(query), 150)
    return () => clearTimeout(timer)
  }, [query, search])

  // Reset results when the drugs list itself changes (e.g. after cache refresh)
  useEffect(() => {
    setResults(drugs)
  }, [drugs])

  return { query, setQuery, results }
}
