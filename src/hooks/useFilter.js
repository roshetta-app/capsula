import { useState } from 'react'

export function useFilter() {
  const [activeCategory, setActiveCategory] = useState('all')

  const filter = (drugs) => {
    if (activeCategory === 'all') return drugs
    return drugs.filter(d => d.category === activeCategory)
  }

  return { activeCategory, setActiveCategory, filter }
}