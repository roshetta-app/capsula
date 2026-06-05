import { useState } from 'react'

/**
 * useFilter — category filter for FlatDrug[].
 * Filters on drug.category which is the mapped DRUG_CATEGORIES value.
 */
export function useFilter() {
  const [activeCategory, setActiveCategory] = useState('all')

  const filter = (drugs) => {
    if (activeCategory === 'all') return drugs
    return drugs.filter(d => d.category === activeCategory)
  }

  return { activeCategory, setActiveCategory, filter }
}
