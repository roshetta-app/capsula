import { useState, useEffect, useCallback } from 'react'

export function useSearch(drugs) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState(drugs)

  const search = useCallback((q) => {
    if (!q.trim()) {
      setResults(drugs)
      return
    }
    const lower = q.toLowerCase()
    setResults(drugs.filter(drug =>
      drug.genericName.toLowerCase().includes(lower) ||
      drug.arabicName.includes(q) ||
      drug.brandNames.some(b => b.toLowerCase().includes(lower))
    ))
  }, [drugs])

  useEffect(() => {
    const timer = setTimeout(() => search(query), 150)
    return () => clearTimeout(timer)
  }, [query, search])

  return { query, setQuery, results }
}